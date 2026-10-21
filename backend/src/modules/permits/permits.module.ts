import { Module } from '@nestjs/common';
import { PermitRequestService } from './services/permit-request.service';
import { IssuedPermitService } from './services/issued-permit.service';
import { PermitInspectionService } from './services/permit-inspection.service';
import { PermitTemplateService } from './services/permit-template.service';
import { PermitWorkflowIntegration } from './services/permit-workflow.integration';
import { PermitRequestController } from './controllers/permit-request.controller';
import { IssuedPermitController } from './controllers/issued-permit.controller';
import { InspectionController } from './controllers/inspection.controller';
import { TemplateController } from './controllers/template.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [
    PermitRequestController,
    IssuedPermitController,
    InspectionController,
    TemplateController,
  ],
  providers: [
    PermitRequestService,
    IssuedPermitService,
    PermitInspectionService,
    PermitTemplateService,
    PermitWorkflowIntegration,
  ],
  exports: [
    PermitRequestService,
    IssuedPermitService,
    PermitInspectionService,
    PermitTemplateService,
    PermitWorkflowIntegration,
  ],
})
export class PermitsModule {}
