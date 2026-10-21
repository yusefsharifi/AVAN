// ═══════════════════════════════════════════════════════════════════════════════
// M7: Correspondence Module — Module Wiring
// ═══════════════════════════════════════════════════════════════════════════════

import { Module, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LetterService } from './services/letter.service';
import { PhysicalArchiveService } from './services/physical-archive.service';
import { LetterTemplateService } from './services/letter-template.service';
import { AutoLetterGenerator } from './services/auto-letter.generator';
import { LetterWorkflowIntegration } from './services/letter-workflow.integration';
import { LetterPdfGenerator } from './utils/letter-pdf.generator';
import { LetterController } from './controllers/letter.controller';
import { TemplateController } from './controllers/template.controller';
import { PhysicalArchiveController } from './controllers/physical-archive.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  providers: [
    LetterService,
    PhysicalArchiveService,
    LetterTemplateService,
    AutoLetterGenerator,
    LetterWorkflowIntegration,
    LetterPdfGenerator,
  ],
  controllers: [LetterController, TemplateController, PhysicalArchiveController],
  exports: [LetterService, PhysicalArchiveService, LetterTemplateService, AutoLetterGenerator, LetterWorkflowIntegration],
})
export class CorrespondenceModule {
  constructor(private readonly autoLetterGenerator: AutoLetterGenerator) {}

  // ─── Event Listeners for Auto-Letter Generation ──────────────────────────

  @OnEvent('permit.submitted')
  async handlePermitSubmitted(payload: any) {
    await this.autoLetterGenerator.fromPermitSubmitted(payload);
  }

  @OnEvent('permit.issued')
  async handlePermitIssued(payload: any) {
    await this.autoLetterGenerator.fromPermitIssued(payload);
  }

  @OnEvent('permit.rejected')
  async handlePermitRejected(payload: any) {
    await this.autoLetterGenerator.fromPermitRejected(payload);
  }

  @OnEvent('waybill.approved')
  async handleWaybillApproved(payload: any) {
    await this.autoLetterGenerator.fromWaybillApproved(payload);
  }

  @OnEvent('visitor.approved.vip')
  async handleVisitorApprovedVip(payload: any) {
    await this.autoLetterGenerator.fromVisitorApprovedVip(payload);
  }

  @OnEvent('company.activated')
  async handleCompanyActivated(payload: any) {
    await this.autoLetterGenerator.fromCompanyActivated(payload);
  }

  @OnEvent('finance.overdue')
  async handleFinanceOverdue(payload: any) {
    await this.autoLetterGenerator.fromPaymentOverdue(
      payload.company,
      payload.amount,
      payload.daysOverdue,
    );
  }
}
