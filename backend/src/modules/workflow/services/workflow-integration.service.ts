// ═══════════════════════════════════════════════════════════════════════════════
// M8: Workflow Integration Service — Cross-Module Event Handling
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

// ─── Event Payload Types ─────────────────────────────────────────────────────

export interface WorkflowCompletionEvent {
  instanceId: string;
  definitionCode: string;
  entityType: string;
  entityId: string;
  zoneId: string;
  outcome: string;
  outcomeReason?: string;
  completedAt: string;
  variables: Record<string, unknown>;
}

export interface WorkflowTaskCompletedEvent {
  instanceId: string;
  taskId: string;
  stepId: string;
  stepNameFa: string;
  decision: string;
  completedBy: string;
  entityType: string;
  entityId: string;
  zoneId: string;
  variables: Record<string, unknown>;
}

// ─── Entity Status Mapping ───────────────────────────────────────────────────

const ENTITY_STATUS_MAP: Record<string, Record<string, string>> = {
  PERMIT_REQUEST: {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN',
    TERMINATED_BY_ADMIN: 'REJECTED',
  },
  WAYBILL: {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'CANCELLED',
    TERMINATED_BY_ADMIN: 'CANCELLED',
  },
  LETTER: {
    APPROVED: 'APPROVED',
    SIGNED: 'SIGNED',
    REJECTED: 'RETURNED',
    WITHDRAWN: 'CANCELLED',
    TERMINATED_BY_ADMIN: 'CANCELLED',
  },
  COMPANY: {
    APPROVED: 'ACTIVE',
    REJECTED: 'REJECTED',
    TERMINATED_BY_ADMIN: 'SUSPENDED',
  },
};

// ─── Workflow Definition Code Mapping ────────────────────────────────────────

const WORKFLOW_CODE_MAP: Record<string, Record<string, string>> = {
  PERMIT: {
    CONSTRUCTION: 'PERMIT_CONSTRUCTION_APPROVAL',
    NIGHT_TRAFFIC: 'PERMIT_STANDARD_APPROVAL',
    HAZMAT_TRANSPORT: 'PERMIT_HAZMAT_APPROVAL',
    ACTIVITY_LICENSE: 'PERMIT_STANDARD_APPROVAL',
    ENVIRONMENTAL: 'PERMIT_ENV_APPROVAL',
    FIRE_SAFETY: 'PERMIT_STANDARD_APPROVAL',
    EMERGENCY_POWER: 'PERMIT_STANDARD_APPROVAL',
    WASTE_DISPOSAL: 'PERMIT_STANDARD_APPROVAL',
    WORKING_AT_HEIGHT: 'PERMIT_STANDARD_APPROVAL',
    HOT_WORK: 'PERMIT_HOT_WORK_APPROVAL',
    CONFINED_SPACE: 'PERMIT_CONFINED_SPACE_APPROVAL',
    EXCAVATION: 'PERMIT_STANDARD_APPROVAL',
    CUSTOM: 'PERMIT_STANDARD_APPROVAL',
  },
  WAYBILL: {
    STANDARD: 'STANDARD_WAYBILL_APPROVAL',
    HAZMAT: 'HAZMAT_WAYBILL_APPROVAL',
    OVERSIZE: 'STANDARD_WAYBILL_APPROVAL',
  },
  LETTER: {
    SECRET: 'LETTER_STANDARD_APPROVAL',
    CONFIDENTIAL: 'LETTER_STANDARD_APPROVAL',
    UNCLASSIFIED: 'LETTER_STANDARD_APPROVAL',
    RESTRICTED: 'LETTER_STANDARD_APPROVAL',
  },
};

@Injectable()
export class WorkflowIntegrationService {
  private readonly logger = new Logger(WorkflowIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Workflow Completion Handler ─────────────────────────────────────────────

  @OnEvent('workflow.instance.completed')
  async handleWorkflowCompleted(event: WorkflowCompletionEvent): Promise<void> {
    const { entityType, entityId, outcome, zoneId, instanceId } = event;

    this.logger.log(
      `Workflow completed: ${entityType}#${entityId} → ${outcome}`,
    );

    try {
      // 1. Update entity status based on workflow outcome
      await this.updateEntityStatus(entityType, entityId, outcome, event);

      // 2. Emit entity-specific completion event
      this.emitEntityCompletionEvent(entityType, entityId, outcome, event);

      // 3. Cache completion in Redis for quick lookups
      const cacheKey = `workflow:completion:${entityType}:${entityId}`;
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          instanceId,
          outcome,
          completedAt: event.completedAt,
          definitionCode: event.definitionCode,
        }),
        300, // 5 min TTL
      );

      // 4. If APPROVED and entity has correspondence requirements, emit letter event
      if (outcome === 'APPROVED' || outcome === 'REJECTED') {
        this.eventEmitter.emit('workflow.entity.completed', {
          entityType,
          entityId,
          outcome,
          zoneId,
          variables: event.variables,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to process workflow completion for ${entityType}#${entityId}`,
        err,
      );
    }
  }

  // ─── Task Completion Handler ─────────────────────────────────────────────────

  @OnEvent('workflow.task.completed')
  async handleTaskCompleted(event: WorkflowTaskCompletedEvent): Promise<void> {
    const { entityType, entityId, taskId, decision, stepId, variables } = event;

    this.logger.log(
      `Workflow task completed: ${taskId} → ${decision} for ${entityType}#${entityId}`,
    );

    try {
      // Emit entity-specific task event for module handlers
      this.eventEmitter.emit('workflow.entity.task.completed', {
        entityType,
        entityId,
        taskId,
        stepId,
        decision,
        variables,
      });
    } catch (err) {
      this.logger.error(
        `Failed to process task completion for ${entityType}#${entityId}`,
        err,
      );
    }
  }

  // ─── Entity Status Update ────────────────────────────────────────────────────

  private async updateEntityStatus(
    entityType: string,
    entityId: string,
    outcome: string,
    event: WorkflowCompletionEvent,
  ): Promise<void> {
    const statusMap = ENTITY_STATUS_MAP[entityType];
    if (!statusMap) {
      this.logger.warn(`No status mapping for entity type: ${entityType}`);
      return;
    }

    const newStatus = statusMap[outcome];
    if (!newStatus) {
      this.logger.warn(
        `No status mapping for outcome ${outcome} on ${entityType}`,
      );
      return;
    }

    // Route to the appropriate model update
    switch (entityType) {
      case 'PERMIT_REQUEST':
        await this.prisma.permitRequest.update({
          where: { id: entityId },
          data: {
            status: newStatus as any,
            ...(outcome === 'REJECTED'
              ? { rejectionReason: event.outcomeReason || 'Workflow rejected' }
              : {}),
            ...(outcome === 'APPROVED'
              ? { currentStepIndex: -1 }
              : {}),
          },
        });
        break;

      case 'WAYBILL':
        await this.prisma.waybill.update({
          where: { id: entityId },
          data: {
            status: newStatus as any,
            ...(outcome === 'REJECTED'
              ? { rejectionReason: event.outcomeReason || 'Workflow rejected' }
              : {}),
          },
        });
        break;

      case 'LETTER':
        await this.prisma.letter.update({
          where: { id: entityId },
          data: {
            status: newStatus as any,
          },
        });
        break;

      case 'COMPANY':
        await this.prisma.company.update({
          where: { id: entityId },
          data: {
            lifecycleStatus: newStatus as any,
          },
        });
        break;

      default:
        this.logger.warn(`Unknown entity type for status update: ${entityType}`);
    }
  }

  // ─── Emit Entity-Specific Completion Events ──────────────────────────────────

  private emitEntityCompletionEvent(
    entityType: string,
    entityId: string,
    outcome: string,
    event: WorkflowCompletionEvent,
  ): void {
    // Emit per-module events that other services can listen to
    switch (entityType) {
      case 'PERMIT_REQUEST':
        this.eventEmitter.emit('permit.workflow.completed', {
          entityId,
          outcome,
          zoneId: event.zoneId,
          variables: event.variables,
        });
        break;

      case 'WAYBILL':
        this.eventEmitter.emit('waybill.workflow.completed', {
          entityId,
          outcome,
          zoneId: event.zoneId,
          variables: event.variables,
        });
        break;

      case 'LETTER':
        this.eventEmitter.emit('letter.workflow.completed', {
          entityId,
          outcome,
          zoneId: event.zoneId,
          variables: event.variables,
        });
        break;

      case 'COMPANY':
        this.eventEmitter.emit('company.workflow.completed', {
          entityId,
          outcome,
          zoneId: event.zoneId,
          variables: event.variables,
        });
        break;
    }
  }

  // ─── Helper: Get Workflow Code for Entity ────────────────────────────────────

  getWorkflowCode(entityType: string, entitySubtype?: string): string | null {
    const typeMap = WORKFLOW_CODE_MAP[entityType];
    if (!typeMap) return null;

    if (entitySubtype && typeMap[entitySubtype]) {
      return typeMap[entitySubtype];
    }

    // Return default if available
    return typeMap['STANDARD'] || typeMap['UNCLASSIFIED'] || Object.values(typeMap)[0] || null;
  }

  // ─── Helper: Build Variables for Workflow Start ──────────────────────────────

  buildPermitVariables(permit: any): Record<string, unknown> {
    return {
      companyId: permit.companyId,
      companyName: permit.company?.nameFa || '',
      permitType: permit.type,
      isHazmat: permit.type === 'HAZMAT_TRANSPORT',
      isHotWork: permit.type === 'HOT_WORK',
      isConfinedSpace: permit.type === 'CONFINED_SPACE',
      isWorkingAtHeight: permit.type === 'WORKING_AT_HEIGHT',
      requiresEnvApproval: permit.requiresEnvApproval || false,
      requiresHSEApproval: permit.requiresHSEApproval || false,
      requiresFireApproval: permit.requiresFireApproval || false,
      requiresInspection: permit.requiresInspection || false,
      estimatedValue: permit.estimatedValue || 0,
      isUrgent: permit.isUrgent || false,
      locationBlock: permit.locationBlock || '',
      requestedFrom: permit.requestedFrom,
      requestedUntil: permit.requestedUntil,
    };
  }

  buildWaybillVariables(waybill: any): Record<string, unknown> {
    return {
      companyId: waybill.companyId,
      companyName: waybill.company?.nameFa || '',
      isHazmat: waybill.isHazmat || false,
      isOversize: waybill.type === 'OVERSIZE',
      hazmatClass: waybill.hazmatClass || null,
      direction: waybill.direction,
      grandTotal: waybill.grandTotal || 0,
      carrierName: waybill.carrierName || '',
    };
  }

  buildLetterVariables(letter: any): Record<string, unknown> {
    return {
      companyId: letter.companyId,
      direction: letter.direction,
      type: letter.type,
      classification: letter.classification,
      priority: letter.priority,
      grandTotal: 0,
      senderOrgName: letter.senderOrgName,
      recipientCount: Array.isArray(letter.recipients) ? letter.recipients.length : 0,
    };
  }

  // ─── Query Helpers ───────────────────────────────────────────────────────────

  async getWorkflowInstanceForEntity(
    entityType: string,
    entityId: string,
  ): Promise<any> {
    return this.prisma.workflowInstance.findFirst({
      where: {
        entityType,
        entityId,
        status: { in: ['RUNNING', 'PAUSED', 'WAITING_TIMER'] },
      },
      include: {
        definition: { select: { code: true, nameFa: true } },
        tasks: {
          where: { status: { in: ['ACTIVE', 'PENDING', 'CLAIMED'] } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEntityWorkflowHistory(
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    if (!instance) return [];

    return this.prisma.workflowEvent.findMany({
      where: { instanceId: instance.id },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
