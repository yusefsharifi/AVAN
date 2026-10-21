// ═══════════════════════════════════════════════════════════════════════════════
// Logistics + M8: Waybill Workflow Integration — Bridging Logistics with Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService } from '../../workflow/services/workflow-engine.service';
import { WorkflowIntegrationService } from '../../workflow/services/workflow-integration.service';

@Injectable()
export class WaybillWorkflowIntegration {
  private readonly logger = new Logger(WaybillWorkflowIntegration.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly integrationService: WorkflowIntegrationService,
  ) {}

  // ─── Start Workflow on Waybill Creation ───────────────────────────────────────

  async startWaybillApprovalWorkflow(waybillId: string): Promise<void> {
    try {
      const waybill = await this.prisma.waybill.findUnique({
        where: { id: waybillId },
        include: { company: { select: { nameFa: true } } },
      });

      if (!waybill) {
        this.logger.warn(`Waybill not found: ${waybillId}`);
        return;
      }

      // Determine workflow code based on waybill type
      const subtype = waybill.isHazmat ? 'HAZMAT' : waybill.type || 'STANDARD';
      const workflowCode = this.integrationService.getWorkflowCode(
        'WAYBILL',
        subtype,
      ) || undefined;

      if (!workflowCode) {
        this.logger.warn(
          `No workflow definition for waybill type: ${subtype}`,
        );
        return;
      }

      // Build variables for the workflow
      const variables = this.integrationService.buildWaybillVariables(waybill);

      // Start workflow instance
      const instance = await this.workflowEngine.startInstance({
        definitionCode: workflowCode,
        entityType: 'WAYBILL',
        entityId: waybillId,
        zoneId: waybill.zoneId,
        variables,
        triggeredBy: waybill.createdBy || undefined,
        notes: `Waybill ${waybill.waybillNumber}`,
      });

      // Link workflow instance to waybill
      await this.prisma.waybill.update({
        where: { id: waybillId },
        data: {
          metadata: {
            ...((waybill.metadata as Record<string, unknown>) || {}),
            workflowInstanceId: instance.id,
            workflowStartedAt: new Date().toISOString(),
          } as any,
        },
      });

      this.logger.log(
        `Workflow started for waybill ${waybill.waybillNumber}: ${instance.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to start workflow for waybill ${waybillId}`,
        err,
      );
    }
  }

  // ─── Handle Workflow Completion ───────────────────────────────────────────────

  @OnEvent('waybill.workflow.completed')
  async handleWaybillWorkflowCompleted(event: {
    entityId: string;
    outcome: string;
    zoneId: string;
    variables: Record<string, unknown>;
  }): Promise<void> {
    const { entityId, outcome } = event;

    this.logger.log(
      `Waybill workflow completed: ${entityId} → ${outcome}`,
    );

    try {
      if (outcome === 'APPROVED') {
        await this.prisma.waybill.update({
          where: { id: entityId },
          data: { status: 'APPROVED' },
        });

        // Emit event for downstream processing (weighing, gate control, etc.)
      } else if (outcome === 'REJECTED') {
        await this.prisma.waybill.update({
          where: { id: entityId },
          data: {
            status: 'REJECTED',
            rejectionReason: 'Workflow rejected',
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle workflow completion for waybill ${entityId}`,
        err,
      );
    }
  }

  // ─── Get Workflow Status for Waybill ─────────────────────────────────────────

  async getWaybillWorkflowStatus(waybillId: string): Promise<any> {
    return this.integrationService.getWorkflowInstanceForEntity(
      'WAYBILL',
      waybillId,
    );
  }
}
