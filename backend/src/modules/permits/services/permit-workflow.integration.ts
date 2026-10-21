// ═══════════════════════════════════════════════════════════════════════════════
// M6 + M8: Permit Workflow Integration — Bridging Permit Module with Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService } from '../../workflow/services/workflow-engine.service';
import { WorkflowIntegrationService } from '../../workflow/services/workflow-integration.service';

@Injectable()
export class PermitWorkflowIntegration {
  private readonly logger = new Logger(PermitWorkflowIntegration.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly integrationService: WorkflowIntegrationService,
  ) {}

  // ─── Start Workflow on Permit Submission ──────────────────────────────────────

  async startPermitApprovalWorkflow(permitRequestId: string): Promise<void> {
    try {
      const permit = await this.prisma.permitRequest.findUnique({
        where: { id: permitRequestId },
        include: { company: { select: { nameFa: true } } },
      });

      if (!permit) {
        this.logger.warn(`Permit not found: ${permitRequestId}`);
        return;
      }

      // Determine workflow code based on permit type
      const workflowCode = this.integrationService.getWorkflowCode(
        'PERMIT',
        permit.type,
      );

      if (!workflowCode) {
        this.logger.warn(
          `No workflow definition for permit type: ${permit.type}`,
        );
        return;
      }

      // Build variables for the workflow
      const variables = this.integrationService.buildPermitVariables(permit);

      // Start workflow instance
      const instance = await this.workflowEngine.startInstance({
        definitionCode: workflowCode,
        entityType: 'PERMIT_REQUEST',
        entityId: permitRequestId,
        zoneId: permit.zoneId,
        variables,
        triggeredBy: permit.applicantId,
        notes: `Permit request ${permit.requestNumber}`,
      });

      // Link workflow instance to permit request
      await this.prisma.permitRequest.update({
        where: { id: permitRequestId },
        data: {
          metadata: {
            ...((permit.metadata as Record<string, unknown>) || {}),
            workflowInstanceId: instance.id,
            workflowStartedAt: new Date().toISOString(),
          } as any,
        },
      });

      this.logger.log(
        `Workflow started for permit ${permit.requestNumber}: ${instance.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to start workflow for permit ${permitRequestId}`,
        err,
      );
    }
  }

  // ─── Handle Workflow Completion ───────────────────────────────────────────────

  @OnEvent('permit.workflow.completed')
  async handlePermitWorkflowCompleted(event: {
    entityId: string;
    outcome: string;
    zoneId: string;
    variables: Record<string, unknown>;
  }): Promise<void> {
    const { entityId, outcome, variables } = event;

    this.logger.log(
      `Permit workflow completed: ${entityId} → ${outcome}`,
    );

    try {
      if (outcome === 'APPROVED') {
        // Trigger permit issuance process
        await this.prisma.permitRequest.update({
          where: { id: entityId },
          data: {
            status: 'APPROVED',
            currentStepIndex: -1, // All steps completed
          },
        });

        // Emit event for permit issuance service to handle
        // The IssuedPermitService will create the actual permit
      } else if (outcome === 'REJECTED') {
        await this.prisma.permitRequest.update({
          where: { id: entityId },
          data: {
            status: 'REJECTED',
            rejectionReason: (variables.outcomeReason as string) || 'درخواست رد شد',
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle workflow completion for permit ${entityId}`,
        err,
      );
    }
  }

  // ─── Get Workflow Status for Permit ──────────────────────────────────────────

  async getPermitWorkflowStatus(permitRequestId: string): Promise<any> {
    return this.integrationService.getWorkflowInstanceForEntity(
      'PERMIT_REQUEST',
      permitRequestId,
    );
  }

  // ─── Get Workflow History for Permit ─────────────────────────────────────────

  async getPermitWorkflowHistory(permitRequestId: string): Promise<any[]> {
    return this.integrationService.getEntityWorkflowHistory(
      'PERMIT_REQUEST',
      permitRequestId,
    );
  }
}
