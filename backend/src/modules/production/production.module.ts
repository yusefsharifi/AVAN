import { Module } from '@nestjs/common';

import { ProductionLineService } from './services/production-line.service';
import { ProductionSalesOrderService } from './services/production-sales-order.service';
import { ProductionWorkOrderService } from './services/production-work-order.service';
import { ProductionBomService } from './services/production-bom.service';
import { QualityCheckService } from './services/quality-check.service';
import { NcrService } from './services/ncr.service';
import { ScrapRecordService } from './services/scrap-record.service';

import { ProductionLineController } from './controllers/production-line.controller';
import { ProductionSalesOrderController } from './controllers/production-sales-order.controller';
import { ProductionWorkOrderController } from './controllers/production-work-order.controller';
import { ProductionBomController } from './controllers/production-bom.controller';
import { QualityCheckController } from './controllers/quality-check.controller';
import { NcrController } from './controllers/ncr.controller';
import { ScrapRecordController } from './controllers/scrap-record.controller';

@Module({
  controllers: [
    ProductionLineController,
    ProductionSalesOrderController,
    ProductionWorkOrderController,
    ProductionBomController,
    QualityCheckController,
    NcrController,
    ScrapRecordController,
  ],
  providers: [
    ProductionLineService,
    ProductionSalesOrderService,
    ProductionWorkOrderService,
    ProductionBomService,
    QualityCheckService,
    NcrService,
    ScrapRecordService,
  ],
  exports: [
    ProductionLineService,
    ProductionSalesOrderService,
    ProductionWorkOrderService,
    ProductionBomService,
    QualityCheckService,
    NcrService,
    ScrapRecordService,
  ],
})
export class ProductionModule {}
