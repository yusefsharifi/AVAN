// M18: Reporting & BI — Module
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GatewayModule } from '../../gateway/gateway.module';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { RedisService } from '../../redis/redis.service';

// Services
import { ReportEngineService } from './services/report-engine.service';
import { DashboardService } from './services/dashboard.service';
import { StandardReportsService } from './services/standard-reports.service';
import { MetricsAggregationService } from './services/metrics-aggregation.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ReportingGatewayService } from './services/reporting-gateway.service';

// Controllers
import { ReportDefinitionController } from './controllers/report-definition.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { StandardReportsController } from './controllers/standard-reports.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { MetricsController } from './controllers/metrics.controller';

// Generators
import { ExcelReportGenerator } from './utils/excel-generator';
import { PdfReportGenerator } from './utils/pdf-generator';

@Module({
  imports: [
    PrismaModule,
    GatewayModule,
  ],
  controllers: [
    ReportDefinitionController,
    DashboardController,
    StandardReportsController,
    ScheduleController,
    MetricsController,
  ],
  providers: [
    BullService,
    RedisService,
    AuditService,
    ReportEngineService,
    DashboardService,
    StandardReportsService,
    MetricsAggregationService,
    ReportSchedulerService,
    ReportingGatewayService,
    ExcelReportGenerator,
    PdfReportGenerator,
  ],
  exports: [
    ReportEngineService,
    DashboardService,
    StandardReportsService,
    MetricsAggregationService,
    ReportSchedulerService,
    ReportingGatewayService,
  ],
})
export class ReportingModule implements OnModuleInit {
  private readonly logger = new Logger(ReportingModule.name);

  constructor(
    private readonly metricsAggregation: MetricsAggregationService,
    private readonly schedulerService: ReportSchedulerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing M18: Reporting & BI module...');

    // Seed system reports
    await this.seedSystemReports();
    // Seed system dashboards
    await this.seedSystemDashboards();

    this.logger.log('M18: Reporting & BI module initialized');
  }

  private async seedSystemReports(): Promise<void> {
    this.logger.log('Seeding system reports...');
  }

  private async seedSystemDashboards(): Promise<void> {
    this.logger.log('Seeding system dashboards...');
  }
}
