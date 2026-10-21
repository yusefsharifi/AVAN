import { Module } from '@nestjs/common';
import { WaybillService } from './services/waybill.service';
import { AppointmentService } from './services/appointment.service';
import { WeighScaleService } from './services/weigh-scale.service';
import { DockService } from './services/dock.service';
import { CarrierService } from './services/carrier.service';
import { WaybillWorkflowIntegration } from './services/waybill-workflow.integration';
import { WaybillController } from './controllers/waybill.controller';
import { AppointmentController } from './controllers/appointment.controller';
import { WeighController } from './controllers/weigh.controller';
import { DockController } from './controllers/dock.controller';
import { CarrierController } from './controllers/carrier.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  controllers: [
    WaybillController,
    AppointmentController,
    WeighController,
    DockController,
    CarrierController,
  ],
  providers: [
    WaybillService,
    AppointmentService,
    WeighScaleService,
    DockService,
    CarrierService,
    WaybillWorkflowIntegration,
  ],
  exports: [
    WaybillService,
    AppointmentService,
    WeighScaleService,
    DockService,
    CarrierService,
    WaybillWorkflowIntegration,
  ],
})
export class LogisticsModule {}
