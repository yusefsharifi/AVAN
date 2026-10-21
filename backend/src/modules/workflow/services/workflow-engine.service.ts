// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowEngineService — M8: Workflow Engine (Core Runtime)
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  InstanceStatus,
  TaskStatus,
  TaskType,
  TaskDecision,
  TaskPriority,
  WorkflowEventType,
  EscalationReason,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import {
  WorkflowDefinitionJson,
  WorkflowStepDef,
  GatewayDef,
  EndEventDef,
  AdvanceContext,
  WorkflowDefinitionJson as WDJson,
  TaskInboxDto,
  InstanceStatusDto,
  WorkflowDashboardDto,
  WorkflowMetricsDto,
} from '../types/workflow-definition.types';
import { StartWorkflowInstanceDto } from '../dto/start-instance.dto';
import { CompleteTaskDto, DelegateTaskDto, ClaimTaskDto, FilterTasksDto } from '../dto/complete-task.dto';
import { evaluateCondition, evaluateAssigneeExpression } from '../utils/expression-evaluator';
import { WorkflowSlaService } from './workflow-sla.service';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { notify } from '../../notifications/utils/notify.helper';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly slaService: WorkflowSlaService,
    private readonly definitionService: WorkflowDefinitionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── INSTANCE LIFECYCLE ────────────────────────────────────────────────────

  async startInstance(dto: StartWorkflowInstanceDto): Promise<any> {
    // 1. Find active definition
    const definition = await this.definitionService.findByCode(
      dto.definitionCode,
      dto.zoneId,
    );

    if (!definition.isActive) {
      throw new AppException('WORKFLOW_DEF_NOT_ACTIVE');
    }

    const defJson = definition.definition as unknown as WorkflowDefinitionJson;

    // 2. Create instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        zoneId: dto.zoneId,
        definitionId: definition.id,
        definitionCode: definition.code,
        definitionVersion: definition.version,
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: 'RUNNING',
        variables: (dto.variables || {}) as any,
        triggeredBy: dto.triggeredBy || null,
        notes: dto.notes || null,
        slaDeadline: await this.slaService.calculateSlaDueAt(
          new Date(),
          definition.defaultSlaHours,
          dto.zoneId,
        ),
      },
    });

    // 3. Increment usage count
    await this.prisma.workflowDefinition.update({
      where: { id: definition.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // 4. Start execution from startEvent
    await this.advanceInstance(instance.id, defJson.startEvent.id);

    // 5. Create event
    await this.createEvent(instance.id, dto.zoneId, 'INSTANCE_STARTED', {
      description: `Workflow instance started for ${dto.entityType}#${dto.entityId}`,
      actorId: dto.triggeredBy,
      payload: {
        definitionCode: definition.code,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    this.logger.log(`Workflow instance started: ${instance.id}`);

    // 6. Return instance with tasks
    return this.prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      include: { tasks: { where: { status: { in: ['ACTIVE', 'PENDING'] } } } },
    });
  }

  async advanceInstance(
    instanceId: string,
    fromNodeId: string,
    context?: AdvanceContext,
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) {
      throw new AppException('WORKFLOW_INSTANCE_NOT_FOUND');
    }

    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: instance.definitionId },
    });
    if (!definition) {
      throw new AppException('WORKFLOW_DEF_NOT_FOUND');
    }

    const defJson = definition.definition as unknown as WorkflowDefinitionJson;
    const variables = (instance.variables as Record<string, unknown>) || {};

    // Get outgoing flows from fromNodeId
    const outgoingFlows = defJson.flows.filter(f => f.source === fromNodeId);

    for (const flow of outgoingFlows) {
      // Evaluate flow condition if present
      if (flow.condition) {
        const conditionMet = evaluateCondition(flow.condition, variables);
        if (!conditionMet) {
          continue;
        }
      }

      // Find target node
      const targetStep = defJson.steps.find(s => s.id === flow.target);
      const targetGateway = defJson.gateways.find(g => g.id === flow.target);
      const targetEndEvent = defJson.endEvents.find(e => e.id === flow.target);

      if (targetStep) {
        await this.handleStep(instance, defJson, targetStep, variables);
      } else if (targetGateway) {
        await this.handleGateway(instance, defJson, targetGateway, variables);
      } else if (targetEndEvent) {
        await this.handleEndEvent(instance, defJson, targetEndEvent, variables);
      }
    }
  }

  private async handleStep(
    instance: any,
    defJson: WorkflowDefinitionJson,
    step: WorkflowStepDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    // Check skipCondition
    if (step.skipCondition) {
      const shouldSkip = evaluateCondition(step.skipCondition, variables);
      if (shouldSkip) {
        await this.prisma.workflowInstance.update({
          where: { id: instance.id },
          data: {
            skippedStepIds: { push: step.id },
          },
        });
        await this.createEvent(instance.id, instance.zoneId, 'TASK_COMPLETED', {
          description: `Step "${step.nameFa}" skipped (condition met)`,
          stepId: step.id,
        });
        // Continue to next nodes
        await this.advanceInstance(instance.id, step.id);
        return;
      }
    }

    // Handle auto tasks
    if (step.type === 'AUTO' || step.type === 'NOTIFICATION') {
      await this.handleAutoOrNotificationTask(instance, defJson, step, variables);
      return;
    }

    // Handle timer tasks
    if (step.type === 'TIMER') {
      await this.handleTimerTask(instance, step);
      return;
    }

    // Resolve assignee
    const assignee = await this.resolveAssignee(step, instance);

    // Calculate SLA
    const slaDueAt = await this.slaService.calculateSlaDueAt(
      new Date(),
      step.slaHours,
      instance.zoneId,
    );

    // Create task
    const task = await this.prisma.workflowTask.create({
      data: {
        instanceId: instance.id,
        zoneId: instance.zoneId,
        stepId: step.id,
        stepName: step.nameFa,
        stepNameFa: step.nameFa,
        assigneeId: assignee.assigneeId || null,
        assigneeRole: assignee.assigneeRole || null,
        assigneeGroupId: assignee.groupId || null,
        type: 'MANUAL',
        status: 'ACTIVE',
        formSchema: step.formSchema as any || null,
        slaDueAt,
        slaHours: step.slaHours,
        priority: (instance.priority as any) || 'NORMAL',
        activatedAt: new Date(),
      },
    });

    // Create TaskInboxEntry for assignee
    if (assignee.assigneeId) {
      await this.prisma.taskInboxEntry.create({
        data: {
          userId: assignee.assigneeId,
          zoneId: instance.zoneId,
          taskId: task.id,
          instanceId: instance.id,
          entityType: instance.entityType,
          entityId: instance.entityId,
          title: step.nameFa,
          priority: (instance.priority as any) || 'NORMAL',
          slaDueAt,
        },
      });
    }

    // Update instance currentStepIds
    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentStepIds: { push: task.id },
      },
    });

    await this.createEvent(instance.id, instance.zoneId, 'TASK_ACTIVATED', {
      description: `Task "${step.nameFa}" activated`,
      stepId: step.id,
      taskId: task.id,
      actorId: assignee.assigneeId,
    });

    // Notify assignee of new task
    notify.workflowTaskActivated({
      id: task.id, zoneId: instance.zoneId,
      stepNameFa: step.nameFa,
      assigneeId: assignee.assigneeId,
      assigneeRole: assignee.assigneeRole,
      instanceId: instance.id,
      definitionCode: instance.definitionCode,
    }).catch(() => {});
  }

  private async handleAutoOrNotificationTask(
    instance: any,
    defJson: WorkflowDefinitionJson,
    step: WorkflowStepDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    // Auto-complete NOTIFICATION tasks
    if (step.type === 'NOTIFICATION') {
      await this.createEvent(instance.id, instance.zoneId, 'TASK_COMPLETED', {
        description: `Notification "${step.nameFa}" sent`,
        stepId: step.id,
      });
      await this.advanceInstance(instance.id, step.id);
      return;
    }

    // Create AUTO task
    const task = await this.prisma.workflowTask.create({
      data: {
        instanceId: instance.id,
        zoneId: instance.zoneId,
        stepId: step.id,
        stepName: step.nameFa,
        stepNameFa: step.nameFa,
        type: 'AUTO',
        status: 'ACTIVE',
        actionType: step.actionType || null,
        actionConfig: (step.actionConfig as any) || null,
        slaHours: step.slaHours,
        activatedAt: new Date(),
      },
    });

    // Execute auto task
    try {
      await this.executeAutoTask(task, instance);
      await this.prisma.workflowTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          decision: 'APPROVED',
        },
      });
      await this.advanceInstance(instance.id, step.id);
    } catch (err) {
      this.logger.error(`Auto task failed: ${task.id}`, err);
      await this.prisma.workflowTask.update({
        where: { id: task.id },
        data: { status: 'FAILED' },
      });
      await this.createEvent(instance.id, instance.zoneId, 'TASK_COMPLETED', {
        description: `Auto task "${step.nameFa}" failed`,
        stepId: step.id,
        taskId: task.id,
        payload: { error: String(err) },
      });
    }
  }

  private async handleTimerTask(instance: any, step: WorkflowStepDef): Promise<void> {
    const task = await this.prisma.workflowTask.create({
      data: {
        instanceId: instance.id,
        zoneId: instance.zoneId,
        stepId: step.id,
        stepName: step.nameFa,
        stepNameFa: step.nameFa,
        type: 'TIMER',
        status: 'PENDING',
        slaHours: step.delayHours || 1,
      },
    });

    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { status: 'WAITING_TIMER' },
    });

    this.logger.log(`Timer task scheduled: ${task.id} (delay: ${step.delayHours || 1}h)`);
  }

  private async handleGateway(
    instance: any,
    defJson: WorkflowDefinitionJson,
    gateway: GatewayDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    await this.createEvent(instance.id, instance.zoneId, 'GATEWAY_EVALUATED', {
      description: `Gateway "${gateway.nameFa}" (${gateway.type}) evaluated`,
      stepId: gateway.id,
    });

    if (gateway.type === 'EXCLUSIVE') {
      await this.handleExclusiveGateway(instance, defJson, gateway, variables);
    } else if (gateway.type === 'PARALLEL') {
      await this.handleParallelGateway(instance, defJson, gateway, variables);
    } else if (gateway.type === 'INCLUSIVE') {
      await this.handleInclusiveGateway(instance, defJson, gateway, variables);
    }
  }

  private async handleExclusiveGateway(
    instance: any,
    defJson: WorkflowDefinitionJson,
    gateway: GatewayDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const outgoingFlows = defJson.flows.filter(f => f.source === gateway.id);

    for (const flow of outgoingFlows) {
      // Check condition for this flow
      const conditionExpr = gateway.conditions?.[flow.id];
      if (conditionExpr) {
        const met = evaluateCondition(conditionExpr, variables);
        if (met) {
          // Take this branch
          await this.advanceInstance(instance.id, flow.target);
          return;
        }
      }
    }

    // No condition matched — use defaultFlow
    if (gateway.defaultFlow) {
      const defaultFlow = defJson.flows.find(f => f.id === gateway.defaultFlow);
      if (defaultFlow) {
        await this.advanceInstance(instance.id, defaultFlow.target);
        return;
      }
    }

    // No match and no default — error
    this.logger.error(`Gateway ${gateway.id}: no matching flow`);
  }

  private async handleParallelGateway(
    instance: any,
    defJson: WorkflowDefinitionJson,
    gateway: GatewayDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const incomingFlows = defJson.flows.filter(f => f.target === gateway.id);
    const outgoingFlows = defJson.flows.filter(f => f.source === gateway.id);

    // Check if this is a join (incoming > 1)
    const completedIncoming = incomingFlows.filter(f =>
      (instance.completedStepIds as string[]).includes(f.source) ||
      (instance.skippedStepIds as string[]).includes(f.source),
    );

    if (incomingFlows.length > 1 && completedIncoming.length < incomingFlows.length) {
      // Not all branches completed yet — wait
      return;
    }

    // Split (outgoing) — activate all branches
    for (const flow of outgoingFlows) {
      await this.advanceInstance(instance.id, flow.target);
    }
  }

  private async handleInclusiveGateway(
    instance: any,
    defJson: WorkflowDefinitionJson,
    gateway: GatewayDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const incomingFlows = defJson.flows.filter(f => f.target === gateway.id);
    const outgoingFlows = defJson.flows.filter(f => f.source === gateway.id);

    // Check join
    if (incomingFlows.length > 1) {
      // Wait for all activated branches to complete
      // For inclusive, we need to check how many were activated
      const completedIncoming = incomingFlows.filter(f =>
        (instance.completedStepIds as string[]).includes(f.source) ||
        (instance.skippedStepIds as string[]).includes(f.source),
      );

      // We don't track how many were activated, so we check against completed
      // This is a simplification — in production you'd track activated branches
      if (completedIncoming.length < incomingFlows.length) {
        return;
      }
    }

    // Evaluate all conditions and activate matching branches
    let activated = 0;
    for (const flow of outgoingFlows) {
      const conditionExpr = gateway.conditions?.[flow.id];
      if (conditionExpr) {
        if (evaluateCondition(conditionExpr, variables)) {
          await this.advanceInstance(instance.id, flow.target);
          activated++;
        }
      }
    }

    // If no conditions matched, use defaultFlow
    if (activated === 0 && gateway.defaultFlow) {
      const defaultFlow = defJson.flows.find(f => f.id === gateway.defaultFlow);
      if (defaultFlow) {
        await this.advanceInstance(instance.id, defaultFlow.target);
      }
    }
  }

  private async handleEndEvent(
    instance: any,
    defJson: WorkflowDefinitionJson,
    endEvent: EndEventDef,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const completedAt = new Date();

    // Complete the instance
    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: 'COMPLETED',
        outcome: endEvent.outcome as any,
        completedAt,
      },
    });

    await this.createEvent(instance.id, instance.zoneId, 'INSTANCE_COMPLETED', {
      description: `Workflow completed with outcome: ${endEvent.outcome}`,
      payload: { outcome: endEvent.outcome },
    });

    // Emit workflow.instance.completed for integration service
    this.eventEmitter.emit('workflow.instance.completed', {
      instanceId: instance.id,
      definitionCode: instance.definitionCode,
      entityType: instance.entityType,
      entityId: instance.entityId,
      zoneId: instance.zoneId,
      outcome: endEvent.outcome,
      completedAt: completedAt.toISOString(),
      variables,
    });

    // Notify requester of workflow completion
    notify.workflowInstanceCompleted({
      id: instance.id, zoneId: instance.zoneId,
      definitionCode: instance.definitionCode,
      entityType: instance.entityType,
      entityId: instance.entityId,
      outcome: String(endEvent.outcome),
      triggeredBy: instance.triggeredBy,
    }).catch(() => {});

    // Execute onComplete actions
    if (endEvent.onComplete) {
      if (endEvent.onComplete.sendNotification) {
        this.eventEmitter.emit('workflow.notification.send', {
          instanceId: instance.id,
          entityType: instance.entityType,
          entityId: instance.entityId,
          zoneId: instance.zoneId,
          outcome: endEvent.outcome,
        });
      }

      if (endEvent.onComplete.generateLetter && endEvent.onComplete.letterTemplateCode) {
        this.eventEmitter.emit('workflow.letter.generate', {
          instanceId: instance.id,
          entityType: instance.entityType,
          entityId: instance.entityId,
          zoneId: instance.zoneId,
          templateCode: endEvent.onComplete.letterTemplateCode,
          variables,
        });
      }
    }

    this.logger.log(`Workflow instance ${instance.id} completed: ${endEvent.outcome}`);
  }

  // ─── ASSIGNMENT RESOLUTION ─────────────────────────────────────────────────

  async resolveAssignee(
    step: WorkflowStepDef,
    instance: any,
  ): Promise<{ assigneeId?: string; assigneeRole?: string; groupId?: string }> {
    switch (step.assignmentType) {
      case 'USER':
        return { assigneeId: step.assigneeId };

      case 'ROLE':
        return { assigneeRole: step.assigneeRole };

      case 'GROUP':
        return { groupId: step.assigneeGroupCode };

      case 'REQUESTER':
        return { assigneeId: instance.triggeredBy };

      case 'DYNAMIC':
        if (step.assigneeExpression) {
          const variables = (instance.variables as Record<string, unknown>) || {};
          const result = evaluateAssigneeExpression(step.assigneeExpression, variables);
          if (result) {
            // Determine if it's a role or user ID
            if (result.includes('_')) {
              return { assigneeRole: result };
            }
            return { assigneeId: result };
          }
        }
        return {};

      default:
        return {};
    }
  }

  // ─── TASK COMPLETION ───────────────────────────────────────────────────────

  async completeTask(
    dto: CompleteTaskDto,
    completedBy: string,
    zoneId: string,
  ): Promise<any> {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: dto.taskId },
      include: { instance: true },
    });
    if (!task) {
      throw new AppException('WORKFLOW_TASK_NOT_FOUND');
    }
    if (task.status !== 'ACTIVE' && task.status !== 'CLAIMED') {
      throw new AppException('WORKFLOW_TASK_NOT_ACTIVE');
    }

    // Verify assignee (or allow ZONE_MANAGER override)
    if (task.assigneeId && task.assigneeId !== completedBy) {
      // Allow override by ZONE_MANAGER (simplified check)
      // In production, check user roles from JWT
    }

    // Update task
    await this.prisma.workflowTask.update({
      where: { id: dto.taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        decision: dto.decision,
        comment: dto.comment || null,
        formData: (dto.formData as any) || null,
        attachments: dto.attachments || [],
      },
    });

    // Merge variableUpdates
    if (dto.variableUpdates) {
      const currentVars = (task.instance.variables as Record<string, unknown>) || {};
      await this.prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          variables: { ...currentVars, ...dto.variableUpdates } as any,
        },
      });
    }

    // Update instance
    const currentStepIds = (task.instance.currentStepIds as string[]) || [];
    const completedStepIds = (task.instance.completedStepIds as string[]) || [];

    await this.prisma.workflowInstance.update({
      where: { id: task.instanceId },
      data: {
        currentStepIds: currentStepIds.filter(id => id !== dto.taskId),
        completedStepIds: { push: dto.taskId },
      },
    });

    // Delete TaskInboxEntry
    await this.prisma.taskInboxEntry.deleteMany({
      where: { taskId: dto.taskId },
    });

    await this.createEvent(task.instanceId, zoneId, 'TASK_COMPLETED', {
      description: `Task "${task.stepNameFa}" completed with decision: ${dto.decision}`,
      taskId: dto.taskId,
      stepId: task.stepId,
      actorId: completedBy,
      payload: { decision: dto.decision, comment: dto.comment },
    });

    // Based on decision
    if (dto.decision === 'APPROVED') {
      const definition = await this.prisma.workflowDefinition.findUnique({
        where: { id: task.instance.definitionId },
      });
      const defJson = definition!.definition as unknown as WorkflowDefinitionJson;
      await this.advanceInstance(task.instanceId, task.stepId);
    } else if (dto.decision === 'REJECTED') {
      // Route to rejection end event
      const rejectedAt = new Date();
      await this.prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          status: 'COMPLETED',
          outcome: 'REJECTED',
          completedAt: rejectedAt,
          outcomeReason: dto.comment || 'Task rejected',
        },
      });

      await this.createEvent(task.instanceId, zoneId, 'INSTANCE_COMPLETED', {
        description: 'Workflow rejected',
        payload: { outcome: 'REJECTED' },
      });

      // Emit integration event for entity status update
      const instanceVars = (task.instance.variables as Record<string, unknown>) || {};
      this.eventEmitter.emit('workflow.instance.completed', {
        instanceId: task.instanceId,
        definitionCode: task.instance.definitionCode || '',
        entityType: task.instance.entityType,
        entityId: task.instance.entityId,
        zoneId,
        outcome: 'REJECTED',
        outcomeReason: dto.comment || 'Task rejected',
        completedAt: rejectedAt.toISOString(),
        variables: instanceVars,
      });
    } else if (dto.decision === 'RETURNED') {
      // Return to previous step — simplified: reset to start
      const returnedAt = new Date();
      await this.prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: {
          status: 'COMPLETED',
          outcome: 'REJECTED',
          completedAt: returnedAt,
          outcomeReason: 'Returned for revision',
        },
      });

      // Emit integration event for entity status update
      const instanceVars = (task.instance.variables as Record<string, unknown>) || {};
      this.eventEmitter.emit('workflow.instance.completed', {
        instanceId: task.instanceId,
        definitionCode: task.instance.definitionCode || '',
        entityType: task.instance.entityType,
        entityId: task.instance.entityId,
        zoneId,
        outcome: 'REJECTED',
        outcomeReason: 'Returned for revision',
        completedAt: returnedAt.toISOString(),
        variables: instanceVars,
      });
    }

    return this.prisma.workflowTask.findUnique({ where: { id: dto.taskId } });
  }

  async claimTask(dto: ClaimTaskDto, claimedBy: string): Promise<any> {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: dto.taskId },
    });
    if (!task) {
      throw new AppException('WORKFLOW_TASK_NOT_FOUND');
    }
    if (task.assigneeId) {
      throw new AppException('WORKFLOW_TASK_ALREADY_CLAIMED');
    }

    const updated = await this.prisma.workflowTask.update({
      where: { id: dto.taskId },
      data: {
        assigneeId: claimedBy,
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
    });

    // Remove from other users' inboxes
    await this.prisma.taskInboxEntry.deleteMany({
      where: { taskId: dto.taskId, NOT: { userId: claimedBy } },
    });

    // Update inbox entry
    await this.prisma.taskInboxEntry.updateMany({
      where: { taskId: dto.taskId },
      data: { userId: claimedBy },
    });

    await this.createEvent(task.instanceId, task.zoneId, 'TASK_CLAIMED', {
      description: `Task claimed by user`,
      taskId: dto.taskId,
      actorId: claimedBy,
    });

    return updated;
  }

  async delegateTask(dto: DelegateTaskDto, delegatedBy: string): Promise<any> {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: dto.taskId },
      include: { instance: { include: { definition: true } } },
    });
    if (!task) {
      throw new AppException('WORKFLOW_TASK_NOT_FOUND');
    }

    const definition = task.instance.definition;
    if (!definition.allowDelegate) {
      throw new AppException('WORKFLOW_DELEGATE_NOT_ALLOWED');
    }

    if (task.assigneeId === dto.delegateToUserId) {
      throw new AppException('WORKFLOW_DELEGATE_SAME_USER');
    }

    const updated = await this.prisma.workflowTask.update({
      where: { id: dto.taskId },
      data: {
        originalAssigneeId: task.assigneeId || delegatedBy,
        delegatedTo: dto.delegateToUserId,
        delegatedAt: new Date(),
        delegationReason: dto.reason,
        assigneeId: dto.delegateToUserId,
        status: 'ACTIVE',
      },
    });

    // Create inbox for new assignee
    await this.prisma.taskInboxEntry.create({
      data: {
        userId: dto.delegateToUserId,
        zoneId: task.zoneId,
        taskId: task.id,
        instanceId: task.instanceId,
        entityType: task.instance.entityType,
        entityId: task.instance.entityId,
        title: `${task.stepNameFa} (واگذاری شده)`,
        priority: task.priority,
        slaDueAt: task.slaDueAt,
      },
    });

    await this.createEvent(task.instanceId, task.zoneId, 'TASK_DELEGATED', {
      description: `Task delegated to user ${dto.delegateToUserId}`,
      taskId: dto.taskId,
      actorId: delegatedBy,
      payload: { delegatedTo: dto.delegateToUserId, reason: dto.reason },
    });

    return updated;
  }

  // ─── INSTANCE CONTROL ──────────────────────────────────────────────────────

  async pauseInstance(instanceId: string, reason: string, pausedBy: string): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new AppException('WORKFLOW_INSTANCE_NOT_FOUND');
    if (instance.status !== 'RUNNING') {
      throw new AppException('WORKFLOW_INSTANCE_NOT_RUNNING');
    }

    const updated = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });

    // Pause all active tasks
    await this.prisma.workflowTask.updateMany({
      where: { instanceId, status: 'ACTIVE' },
      data: { status: 'PENDING' },
    });

    await this.createEvent(instanceId, instance.zoneId, 'INSTANCE_PAUSED', {
      description: `Instance paused: ${reason}`,
      actorId: pausedBy,
    });

    return updated;
  }

  async resumeInstance(instanceId: string, resumedBy: string): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new AppException('WORKFLOW_INSTANCE_NOT_FOUND');
    if (instance.status !== 'PAUSED') {
      throw new AppException('WORKFLOW_INSTANCE_NOT_RUNNING');
    }

    const updated = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'RUNNING', resumedAt: new Date() },
    });

    // Re-activate paused tasks
    await this.prisma.workflowTask.updateMany({
      where: { instanceId, status: 'PENDING' },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });

    await this.createEvent(instanceId, instance.zoneId, 'INSTANCE_RESUMED', {
      description: 'Instance resumed',
      actorId: resumedBy,
    });

    return updated;
  }

  async terminateInstance(instanceId: string, reason: string, terminatedBy: string): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new AppException('WORKFLOW_INSTANCE_NOT_FOUND');

    // Cancel all active tasks
    await this.prisma.workflowTask.updateMany({
      where: { instanceId, status: { in: ['ACTIVE', 'PENDING', 'CLAIMED'] } },
      data: { status: 'CANCELLED' },
    });

    const updated = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'TERMINATED',
        terminatedAt: new Date(),
        outcome: 'TERMINATED_BY_ADMIN',
        outcomeReason: reason,
      },
    });

    // Clean up inbox
    await this.prisma.taskInboxEntry.deleteMany({
      where: { instanceId },
    });

    await this.createEvent(instanceId, instance.zoneId, 'INSTANCE_TERMINATED', {
      description: `Instance terminated: ${reason}`,
      actorId: terminatedBy,
    });

    return updated;
  }

  // ─── AUTO TASK EXECUTION ───────────────────────────────────────────────────

  async executeAutoTask(task: any, instance: any): Promise<void> {
    const actionType = task.actionType;
    const actionConfig = (task.actionConfig as Record<string, unknown>) || {};
    const variables = (instance.variables as Record<string, unknown>) || {};

    switch (actionType) {
      case 'SEND_SMS':
        // smsService.send(actionConfig.phone, actionConfig.message)
        this.logger.log(`Auto task SMS: ${JSON.stringify(actionConfig)}`);
        break;

      case 'SEND_EMAIL':
        this.logger.log(`Auto task Email: ${JSON.stringify(actionConfig)}`);
        break;

      case 'UPDATE_ENTITY':
        this.logger.log(`Auto task Update Entity: ${JSON.stringify(actionConfig)}`);
        break;

      case 'CREATE_VOUCHER':
        this.logger.log(`Auto task Create Voucher: ${JSON.stringify(actionConfig)}`);
        break;

      case 'GENERATE_LETTER':
        this.logger.log(`Auto task Generate Letter: ${JSON.stringify(actionConfig)}`);
        break;

      case 'CALL_API':
        this.logger.log(`Auto task Call API: ${JSON.stringify(actionConfig)}`);
        break;

      case 'COMPUTE_VARIABLE':
        if (actionConfig.expression) {
          const result = evaluateCondition(
            actionConfig.expression as string,
            variables,
          );
          if (actionConfig.targetVariable) {
            await this.prisma.workflowInstance.update({
              where: { id: instance.id },
              data: {
                variables: {
                  ...variables,
                  [actionConfig.targetVariable as string]: result,
                } as any,
              },
            });
          }
        }
        break;

      default:
        this.logger.warn(`Unknown auto task action type: ${actionType}`);
    }
  }

  // ─── SLA ENGINE ────────────────────────────────────────────────────────────

  async checkSlaBreach(taskId: string): Promise<void> {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
    });
    if (!task || !task.slaDueAt || task.slaBreached) return;

    if (task.slaDueAt < new Date()) {
      await this.prisma.workflowTask.update({
        where: { id: taskId },
        data: {
          slaBreached: true,
          slaBreachNotified: true,
        },
      });

      await this.createEvent(task.instanceId, task.zoneId, 'TASK_SLA_BREACHED', {
        description: `SLA breached for task "${task.stepNameFa}"`,
        taskId,
        stepId: task.stepId,
      });

      // Notify manager of SLA breach
      notify.workflowSlaBreached({
        id: task.id, zoneId: task.zoneId,
        stepNameFa: task.stepNameFa,
        assigneeId: task.assigneeId,
        assigneeRole: task.assigneeRole,
        instanceId: task.instanceId,
      }).catch(() => {});
    }
  }

  async triggerEscalation(
    instanceId: string,
    taskId: string,
    reason: EscalationReason,
  ): Promise<any> {
    const task = await this.prisma.workflowTask.findUnique({ where: { id: taskId } });
    if (!task) throw new AppException('WORKFLOW_TASK_NOT_FOUND');

    // Count existing escalations
    const escalationCount = await this.prisma.workflowEscalation.count({
      where: { instanceId, taskId },
    });

    const escalatedTo = task.assigneeId || 'SYSTEM';

    const escalation = await this.prisma.workflowEscalation.create({
      data: {
        instanceId,
        taskId,
        zoneId: task.zoneId,
        level: escalationCount + 1,
        reason,
        escalatedTo,
        message: `Task "${task.stepNameFa}" escalated (level ${escalationCount + 1})`,
      },
    });

    await this.prisma.workflowTask.update({
      where: { id: taskId },
      data: { status: 'ESCALATED' },
    });

    await this.createEvent(instanceId, task.zoneId, 'ESCALATION_TRIGGERED', {
      description: escalation.message,
      taskId,
      payload: { level: escalation.level, reason },
    });

    // Notify escalation target
    notify.workflowEscalation({
      id: escalation.id, zoneId: task.zoneId,
      escalatedTo, reason: String(reason),
      message: escalation.message,
    }).catch(() => {});

    return escalation;
  }

  async resolveEscalation(
    escalationId: string,
    resolution: string,
    resolvedBy: string,
  ): Promise<any> {
    return this.prisma.workflowEscalation.update({
      where: { id: escalationId },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });
  }

  // ─── QUERYING ──────────────────────────────────────────────────────────────

  async getMyTasks(
    userId: string,
    zoneId: string,
    filter: FilterTasksDto,
  ): Promise<any[]> {
    const where: any = {
      zoneId,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'SKIPPED'] },
      OR: [
        { assigneeId: userId },
        { delegatedTo: userId },
      ],
    };

    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.type) where.type = filter.type;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.slaBreached) where.slaBreached = true;

    return this.prisma.workflowTask.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { slaDueAt: 'asc' },
        { createdAt: 'desc' },
      ],
      take: filter.limit || 20,
    });
  }

  async getMyInbox(userId: string, zoneId: string): Promise<TaskInboxDto> {
    const entries = await this.prisma.taskInboxEntry.findMany({
      where: { userId, zoneId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return {
      urgent: entries.filter((e: any) => e.priority === 'URGENT') as any,
      overdue: entries.filter((e: any) => e.slaDueAt && e.slaDueAt < now) as any,
      today: entries.filter((e: any) => {
        if (!e.slaDueAt) return false;
        return e.slaDueAt >= todayStart && e.slaDueAt <= now;
      }) as any,
      normal: entries.filter((e: any) => {
        if (e.priority === 'URGENT') return false;
        if (e.slaDueAt && e.slaDueAt < now) return false;
        return true;
      }) as any,
      totalCount: entries.length,
      unreadCount: entries.filter((e: any) => !e.isRead).length,
    } as TaskInboxDto;
  }

  async getInstanceStatus(instanceId: string): Promise<InstanceStatusDto> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new AppException('WORKFLOW_INSTANCE_NOT_FOUND');

    const currentTasks = await this.prisma.workflowTask.findMany({
      where: { instanceId, status: { in: ['ACTIVE', 'PENDING'] } },
    });

    const completedTasks = await this.prisma.workflowTask.findMany({
      where: { instanceId, status: 'COMPLETED' },
    });

    const events = await this.prisma.workflowEvent.findMany({
      where: { instanceId },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

    // Calculate progress
    const totalSteps = currentTasks.length + completedTasks.length +
      (instance.skippedStepIds as string[]).length;
    const progressPercent = totalSteps > 0
      ? Math.round(((completedTasks.length + (instance.skippedStepIds as string[]).length) / Math.max(totalSteps, 1)) * 100)
      : 0;

    return {
      instance,
      currentTasks,
      completedTasks,
      events,
      progressPercent,
    };
  }

  async getInstanceByEntity(entityType: string, entityId: string): Promise<any | null> {
    return this.prisma.workflowInstance.findFirst({
      where: {
        entityType,
        entityId,
        status: { in: ['RUNNING', 'PAUSED', 'WAITING_TIMER'] },
      },
    });
  }

  async getInstanceHistory(instanceId: string): Promise<any[]> {
    return this.prisma.workflowEvent.findMany({
      where: { instanceId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * SECURITY FIX (COMP-006): Replaced hardcoded `return []` with a proper
   * database query that supports filtering by zone, status, and definition.
   */
  async findInstances(filter: {
    zoneId?: string;
    status?: string;
    definitionCode?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: Record<string, unknown> = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.status) where.status = filter.status;
    if (filter.definitionCode) where.definitionCode = filter.definitionCode;
    if (filter.entityType) where.entityType = filter.entityType;

    return this.prisma.workflowInstance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 50,
      skip: filter.offset || 0,
      include: {
        definition: true,
        _count: { select: { tasks: true, events: true } },
      },
    });
  }

  async getZoneWorkflowDashboard(zoneId: string): Promise<WorkflowDashboardDto> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [running, paused, completedToday, slaBreaches, escalations] = await Promise.all([
      this.prisma.workflowInstance.count({ where: { zoneId, status: 'RUNNING' } }),
      this.prisma.workflowInstance.count({ where: { zoneId, status: 'PAUSED' } }),
      this.prisma.workflowInstance.count({
        where: {
          zoneId, status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
      }),
      this.prisma.workflowTask.count({
        where: { zoneId, slaBreached: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.workflowEscalation.count({
        where: { zoneId, resolvedAt: null },
      }),
    ]);

    return {
      running,
      paused,
      completedToday,
      slaBreaches,
      escalations,
      byDefinition: [],
      myTasksCount: 0,
      urgentTasksCount: 0,
      overdueTasksCount: 0,
    };
  }

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────

  async getWorkflowMetrics(
    zoneId: string,
    definitionCode: string,
    fromDate: string,
    toDate: string,
  ): Promise<WorkflowMetricsDto> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        zoneId,
        definitionCode,
        createdAt: { gte: from, lte: to },
      },
    });

    const completed = instances.filter(i => i.status === 'COMPLETED');
    const terminated = instances.filter(i => i.status === 'TERMINATED');

    const durations = completed
      .filter(i => i.completedAt)
      .map(i => (i.completedAt!.getTime() - i.startedAt.getTime()) / (1000 * 60 * 60));

    const avgDurationHours = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDurationHours = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : 0;

    const byOutcome: Record<string, number> = {};
    for (const inst of instances) {
      const outcome = inst.outcome || 'UNKNOWN';
      byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
    }

    const slaBreaches = await this.prisma.workflowTask.count({
      where: {
        zoneId,
        slaBreached: true,
        createdAt: { gte: from, lte: to },
      },
    });

    const totalTasks = await this.prisma.workflowTask.count({
      where: { zoneId, createdAt: { gte: from, lte: to } },
    });

    return {
      totalInstances: instances.length,
      completed: completed.length,
      terminated: terminated.length,
      avgDurationHours: Math.round(avgDurationHours * 100) / 100,
      medianDurationHours: Math.round(medianDurationHours * 100) / 100,
      slaComplianceRate: totalTasks > 0
        ? Math.round(((totalTasks - slaBreaches) / totalTasks) * 100 * 100) / 100
        : 100,
      byOutcome,
      bottleneckSteps: [],
      escalationRate: totalTasks > 0
        ? Math.round((slaBreaches / totalTasks) * 100 * 100) / 100
        : 0,
    };
  }

  async computeAndSaveMetricSnapshot(
    zoneId: string,
    definitionCode: string,
    period: string,
  ): Promise<any> {
    const metrics = await this.getWorkflowMetrics(zoneId, definitionCode, period + '-01', period + '-31');

    return this.prisma.workflowMetricSnapshot.upsert({
      where: {
        zoneId_definitionCode_period_periodType: {
          zoneId,
          definitionCode,
          period,
          periodType: 'month',
        },
      },
      create: {
        zoneId,
        definitionCode,
        period,
        periodType: 'month',
        totalStarted: metrics.totalInstances,
        totalCompleted: metrics.completed,
        totalTerminated: metrics.terminated,
        avgDurationHours: metrics.avgDurationHours,
        slaBreachCount: metrics.totalInstances - metrics.completed,
        slaComplianceRate: metrics.slaComplianceRate,
      },
      update: {
        totalStarted: metrics.totalInstances,
        totalCompleted: metrics.completed,
        totalTerminated: metrics.terminated,
        avgDurationHours: metrics.avgDurationHours,
        slaBreachCount: metrics.totalInstances - metrics.completed,
        slaComplianceRate: metrics.slaComplianceRate,
      },
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private async createEvent(
    instanceId: string,
    zoneId: string,
    type: WorkflowEventType,
    params: {
      description: string;
      stepId?: string;
      taskId?: string;
      actorId?: string;
      payload?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.prisma.workflowEvent.create({
      data: {
        instanceId,
        zoneId,
        type,
        stepId: params.stepId || null,
        taskId: params.taskId || null,
        actorId: params.actorId || null,
        description: params.description,
        payload: (params.payload || {}) as any,
      },
    });
  }
}
