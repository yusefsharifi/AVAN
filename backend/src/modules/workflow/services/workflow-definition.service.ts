// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowDefinitionService — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { WorkflowCategory } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  DuplicateDefinitionDto,
} from '../dto/create-definition.dto';
import {
  WorkflowDefinitionJson,
  WorkflowStepDef,
  GatewayDef,
  FlowDef,
  StartEventDef,
  EndEventDef,
  ValidationResult,
} from '../types/workflow-definition.types';
import { WORKFLOW_DEFINITIONS_SEED, WorkflowDefinitionSeed } from '../data/workflow-definitions.seed';

const DEF_CACHE_TTL = 600; // 10 min

@Injectable()
export class WorkflowDefinitionService {
  private readonly logger = new Logger(WorkflowDefinitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(
    dto: CreateWorkflowDefinitionDto,
    createdBy: string,
  ): Promise<any> {
    // 1. Check code uniqueness
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new AppException('WORKFLOW_DEF_CODE_TAKEN');
    }

    // 2. Validate definition structure
    const validation = this.validate(dto.definition as unknown as WorkflowDefinitionJson);
    if (!validation.isValid) {
      throw new AppException('WORKFLOW_DEF_INVALID');
    }

    // 3. Create definition
    const definition = await this.prisma.workflowDefinition.create({
      data: {
        zoneId: dto.zoneId || null,
        code: dto.code,
        nameFa: dto.nameFa,
        descriptionFa: dto.descriptionFa || null,
        category: dto.category,
        definition: dto.definition as any,
        defaultSlaHours: dto.defaultSlaHours || 72,
        allowReassign: dto.allowReassign ?? true,
        allowDelegate: dto.allowDelegate ?? true,
        requireComment: dto.requireComment ?? false,
        notifyOnEachStep: dto.notifyOnEachStep ?? true,
        isSystem: false,
        createdBy,
      },
    });

    this.logger.log(`Workflow definition created: ${dto.code}`);
    return definition;
  }

  async update(
    id: string,
    dto: UpdateWorkflowDefinitionDto,
    updatedBy: string,
  ): Promise<any> {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException('WORKFLOW_DEF_NOT_FOUND');
    }

    // Save version before update
    await this.prisma.workflowDefinitionVersion.create({
      data: {
        definitionId: id,
        version: existing.version,
        definition: existing.definition as any,
        changedBy: updatedBy,
        changeNote: dto.changeNote || null,
      },
    });

    // Validate new definition if provided
    if (dto.definition) {
      const validation = this.validate(dto.definition as unknown as WorkflowDefinitionJson);
      if (!validation.isValid) {
        throw new AppException('WORKFLOW_DEF_INVALID');
      }
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: {
        nameFa: dto.nameFa,
        descriptionFa: dto.descriptionFa,
        definition: dto.definition as any,
        defaultSlaHours: dto.defaultSlaHours,
        allowReassign: dto.allowReassign,
        allowDelegate: dto.allowDelegate,
        requireComment: dto.requireComment,
        notifyOnEachStep: dto.notifyOnEachStep,
        version: existing.version + 1,
      },
    });

    await this.invalidateCache(existing.code, existing.zoneId);
    this.logger.log(`Workflow definition updated: ${existing.code} v${updated.version}`);
    return updated;
  }

  async activate(id: string): Promise<any> {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException('WORKFLOW_DEF_NOT_FOUND');
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: true },
    });

    await this.invalidateCache(existing.code, existing.zoneId);
    return updated;
  }

  async deactivate(id: string): Promise<any> {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException('WORKFLOW_DEF_NOT_FOUND');
    }

    // Cannot deactivate if there are running instances
    const runningCount = await this.prisma.workflowInstance.count({
      where: {
        definitionId: id,
        status: 'RUNNING',
      },
    });
    if (runningCount > 0) {
      throw new AppException('WORKFLOW_DEF_HAS_RUNNING_INSTANCES');
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateCache(existing.code, existing.zoneId);
    return updated;
  }

  validate(definition: WorkflowDefinitionJson): ValidationResult {
    const errors: { node: string; message: string }[] = [];
    const warnings: { node: string; message: string }[] = [];

    if (!definition.startEvent) {
      errors.push({ node: 'root', message: 'startEvent is required' });
      return { isValid: false, errors, warnings };
    }

    const allNodeIds = new Set<string>();

    // Validate start event
    allNodeIds.add(definition.startEvent.id);

    // Validate steps
    for (const step of definition.steps) {
      if (allNodeIds.has(step.id)) {
        errors.push({ node: step.id, message: 'Duplicate node ID' });
      }
      allNodeIds.add(step.id);

      if (!step.nameFa) {
        errors.push({ node: step.id, message: 'nameFa is required' });
      }
      if (!step.type) {
        errors.push({ node: step.id, message: 'type is required' });
      }
      if (!step.incoming || step.incoming.length === 0) {
        errors.push({ node: step.id, message: 'At least one incoming flow required' });
      }
      if (!step.outgoing || step.outgoing.length === 0) {
        errors.push({ node: step.id, message: 'At least one outgoing flow required' });
      }
    }

    // Validate gateways
    for (const gw of definition.gateways) {
      if (allNodeIds.has(gw.id)) {
        errors.push({ node: gw.id, message: 'Duplicate node ID' });
      }
      allNodeIds.add(gw.id);

      if (!gw.type || !['EXCLUSIVE', 'PARALLEL', 'INCLUSIVE'].includes(gw.type)) {
        errors.push({ node: gw.id, message: 'Invalid gateway type' });
      }
    }

    // Validate end events
    for (const end of definition.endEvents) {
      if (allNodeIds.has(end.id)) {
        errors.push({ node: end.id, message: 'Duplicate node ID' });
      }
      allNodeIds.add(end.id);

      if (!end.outcome) {
        errors.push({ node: end.id, message: 'outcome is required' });
      }
    }

    // Validate flows
    const flowIds = new Set<string>();
    for (const flow of definition.flows) {
      if (flowIds.has(flow.id)) {
        errors.push({ node: flow.id, message: 'Duplicate flow ID' });
      }
      flowIds.add(flow.id);

      if (!allNodeIds.has(flow.source)) {
        errors.push({ node: flow.id, message: `Source '${flow.source}' does not exist` });
      }
      if (!allNodeIds.has(flow.target)) {
        errors.push({ node: flow.id, message: `Target '${flow.target}' does not exist` });
      }
    }

    // Check for circular references using DFS
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const adjacency = new Map<string, string[]>();

    for (const flow of definition.flows) {
      if (!adjacency.has(flow.source)) {
        adjacency.set(flow.source, []);
      }
      adjacency.get(flow.source)!.push(flow.target);
    }

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      inStack.add(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (inStack.has(neighbor)) {
          return true;
        }
        if (!visited.has(neighbor) && hasCycle(neighbor)) {
          return true;
        }
      }

      inStack.delete(node);
      return false;
    };

    for (const nodeId of allNodeIds) {
      if (!visited.has(nodeId) && hasCycle(nodeId)) {
        errors.push({ node: nodeId, message: 'Circular reference detected' });
        break;
      }
    }

    // Check that each step has both incoming and outgoing connections in flows
    const incomingFlows = new Map<string, number>();
    const outgoingFlows = new Map<string, number>();
    for (const flow of definition.flows) {
      incomingFlows.set(flow.target, (incomingFlows.get(flow.target) || 0) + 1);
      outgoingFlows.set(flow.source, (outgoingFlows.get(flow.source) || 0) + 1);
    }

    for (const step of definition.steps) {
      if ((incomingFlows.get(step.id) || 0) === 0) {
        errors.push({ node: step.id, message: 'Step has no incoming flows' });
      }
    }

    for (const gw of definition.gateways) {
      if ((outgoingFlows.get(gw.id) || 0) === 0) {
        warnings.push({ node: gw.id, message: 'Gateway has no outgoing flows' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async findAll(zoneId?: string, category?: WorkflowCategory): Promise<any[]> {
    const where: any = { deletedAt: null };
    if (zoneId) {
      where.OR = [{ zoneId }, { zoneId: null }];
    }
    if (category) {
      where.category = category;
    }

    return this.prisma.workflowDefinition.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async findByCode(code: string, zoneId?: string): Promise<any> {
    // Try zone-specific first, then global
    if (zoneId) {
      const zoneSpecific = await this.prisma.workflowDefinition.findFirst({
        where: { code, zoneId, isActive: true, deletedAt: null },
      });
      if (zoneSpecific) return zoneSpecific;
    }

    const global = await this.prisma.workflowDefinition.findFirst({
      where: { code, zoneId: null, isActive: true, deletedAt: null },
    });
    if (global) return global;

    // Try any zone-specific
    const anyZone = await this.prisma.workflowDefinition.findFirst({
      where: { code, isActive: true, deletedAt: null },
    });
    if (anyZone) return anyZone;

    throw new AppException('WORKFLOW_DEF_NOT_FOUND');
  }

  async getVersionHistory(id: string): Promise<any[]> {
    return this.prisma.workflowDefinitionVersion.findMany({
      where: { definitionId: id },
      orderBy: { version: 'desc' },
    });
  }

  async duplicate(
    id: string,
    dto: DuplicateDefinitionDto,
    createdBy: string,
  ): Promise<any> {
    const existing = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException('WORKFLOW_DEF_NOT_FOUND');
    }

    // Check new code uniqueness
    const codeExists = await this.prisma.workflowDefinition.findUnique({
      where: { code: dto.newCode },
    });
    if (codeExists) {
      throw new AppException('WORKFLOW_DEF_CODE_TAKEN');
    }

    const definition = await this.prisma.workflowDefinition.create({
      data: {
        zoneId: dto.newZoneId || existing.zoneId,
        code: dto.newCode,
        nameFa: existing.nameFa + ' (کپی)',
        descriptionFa: existing.descriptionFa,
        category: existing.category,
        definition: existing.definition as any,
        defaultSlaHours: existing.defaultSlaHours,
        allowReassign: existing.allowReassign,
        allowDelegate: existing.allowDelegate,
        requireComment: existing.requireComment,
        notifyOnEachStep: existing.notifyOnEachStep,
        isSystem: false,
        createdBy,
      },
    });

    this.logger.log(`Workflow definition duplicated: ${dto.newCode}`);
    return definition;
  }

  async seedSystemDefinitions(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of WORKFLOW_DEFINITIONS_SEED) {
      const existing = await this.prisma.workflowDefinition.findUnique({
        where: { code: seed.code },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.prisma.workflowDefinition.create({
        data: {
          code: seed.code,
          nameFa: seed.nameFa,
          descriptionFa: seed.descriptionFa,
          category: seed.category,
          definition: seed.definition as any,
          defaultSlaHours: seed.defaultSlaHours,
          isSystem: true,
          createdBy: 'system',
        },
      });

      created++;
    }

    this.logger.log(`Seeded ${created} workflow definitions, skipped ${skipped}`);
    return { created, skipped };
  }

  private async invalidateCache(code: string, zoneId: string | null): Promise<void> {
    try {
      const key = REDIS_KEYS.workflowDef(code, zoneId || 'global');
      await this.redis.del(key);
    } catch {
      // cache invalidation best effort
    }
  }
}
