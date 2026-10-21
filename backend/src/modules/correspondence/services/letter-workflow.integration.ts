// ═══════════════════════════════════════════════════════════════════════════════
// M7 + M8: Letter Workflow Integration — Bridging Correspondence with Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowEngineService } from '../../workflow/services/workflow-engine.service';
import { WorkflowIntegrationService } from '../../workflow/services/workflow-integration.service';

@Injectable()
export class LetterWorkflowIntegration {
  private readonly logger = new Logger(LetterWorkflowIntegration.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly integrationService: WorkflowIntegrationService,
  ) {}

  // ─── Start Workflow on Letter Submission ──────────────────────────────────────

  async startLetterApprovalWorkflow(letterId: string): Promise<void> {
    try {
      const letter = await this.prisma.letter.findUnique({
        where: { id: letterId },
      });

      if (!letter) {
        this.logger.warn(`Letter not found: ${letterId}`);
        return;
      }

      // Determine workflow code based on letter classification
      const workflowCode = this.integrationService.getWorkflowCode(
        'LETTER',
        letter.classification,
      );

      if (!workflowCode) {
        this.logger.warn(
          `No workflow definition for letter classification: ${letter.classification}`,
        );
        return;
      }

      // Build variables for the workflow
      const variables = this.integrationService.buildLetterVariables(letter);

      // Start workflow instance
      const instance = await this.workflowEngine.startInstance({
        definitionCode: workflowCode,
        entityType: 'LETTER',
        entityId: letterId,
        zoneId: letter.zoneId,
        variables,
        triggeredBy: letter.senderId || letter.createdBy,
        notes: `Letter ${letter.registryNumber}`,
      });

      // Link workflow instance to letter
      await this.prisma.letter.update({
        where: { id: letterId },
        data: {
          metadata: {
            ...((letter.metadata as Record<string, unknown>) || {}),
            workflowInstanceId: instance.id,
            workflowStartedAt: new Date().toISOString(),
          } as any,
        },
      });

      this.logger.log(
        `Workflow started for letter ${letter.registryNumber}: ${instance.id}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to start workflow for letter ${letterId}`,
        err,
      );
    }
  }

  // ─── Handle Workflow Completion ───────────────────────────────────────────────

  @OnEvent('letter.workflow.completed')
  async handleLetterWorkflowCompleted(event: {
    entityId: string;
    outcome: string;
    zoneId: string;
    variables: Record<string, unknown>;
  }): Promise<void> {
    const { entityId, outcome } = event;

    this.logger.log(
      `Letter workflow completed: ${entityId} → ${outcome}`,
    );

    try {
      if (outcome === 'APPROVED' || outcome === 'REJECTED') {
        const newStatus = outcome === 'APPROVED' ? 'APPROVED' : 'RETURNED';

        await this.prisma.letter.update({
          where: { id: entityId },
          data: { status: newStatus as any },
        });

        // If approved and letter needs to be signed
        if (outcome === 'APPROVED') {
          // Check if there's a signer step in the workflow
          // If yes, the workflow continues to the signer step
          // If no, the letter is fully approved
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle workflow completion for letter ${entityId}`,
        err,
      );
    }
  }

  // ─── Get Workflow Status for Letter ──────────────────────────────────────────

  async getLetterWorkflowStatus(letterId: string): Promise<any> {
    return this.integrationService.getWorkflowInstanceForEntity(
      'LETTER',
      letterId,
    );
  }

  // ─── Get Workflow History for Letter ─────────────────────────────────────────

  async getLetterWorkflowHistory(letterId: string): Promise<any[]> {
    return this.integrationService.getEntityWorkflowHistory(
      'LETTER',
      letterId,
    );
  }
}
