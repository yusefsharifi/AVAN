import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

// Services
import { HseIncidentService } from './services/hse-incident.service';
import { CapaService } from './services/capa.service';
import { HseInspectionService } from './services/hse-inspection.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { SafetyStatisticsService } from './services/safety-statistics.service';
import { HseTrainingService } from './services/hse-training.service';
import { EnvironmentalService } from './services/environmental.service';
import { EmergencyResponseService } from './services/emergency-response.service';
import { HseGatewayService } from './services/hse-gateway.service';

// Controllers
import { IncidentController } from './controllers/incident.controller';
import { CapaController } from './controllers/capa.controller';
import { InspectionController } from './controllers/inspection.controller';
import { RiskController } from './controllers/risk.controller';
import { StatisticsController } from './controllers/statistics.controller';
import { TrainingController } from './controllers/training.controller';
import { EnvironmentalController } from './controllers/environmental.controller';
import { EmergencyController } from './controllers/emergency.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    IncidentController,
    CapaController,
    InspectionController,
    RiskController,
    StatisticsController,
    TrainingController,
    EnvironmentalController,
    EmergencyController,
  ],
  providers: [
    HseIncidentService,
    CapaService,
    HseInspectionService,
    RiskAssessmentService,
    SafetyStatisticsService,
    HseTrainingService,
    EnvironmentalService,
    EmergencyResponseService,
    HseGatewayService,
  ],
  exports: [
    HseIncidentService,
    CapaService,
    HseInspectionService,
    RiskAssessmentService,
    SafetyStatisticsService,
    HseTrainingService,
    EnvironmentalService,
    EmergencyResponseService,
    HseGatewayService,
  ],
})
export class HseModule implements OnModuleInit {
  private readonly logger = new Logger(HseModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly prisma: PrismaService,
    private readonly capaService: CapaService,
    private readonly inspectionService: HseInspectionService,
    private readonly trainingService: HseTrainingService,
    private readonly riskService: RiskAssessmentService,
  ) {}

  async onModuleInit() {
    // Seed default checklists
    await this.inspectionService.seedDefaultChecklists();
    this.logger.log('Default HSE checklists seeded');

    this.registerHseJobs();
    this.logger.log('HSE BullMQ jobs registered');
  }

  private registerHseJobs(): void {
    this.bull.registerWorker('hse', async (job) => {
      this.logger.debug(`Processing HSE job: ${job.name}`);

      switch (job.name) {
        case 'check-capa-overdue':
          await this.processCapaOverdue(job.data);
          break;
        case 'check-training-expiry':
          await this.processTrainingExpiry(job.data);
          break;
        case 'check-inspection-overdue':
          await this.processInspectionOverdue(job.data);
          break;
        case 'compute-safety-statistics':
          await this.processSafetyStats(job.data);
          break;
        case 'check-risk-expiry':
          await this.processRiskExpiry(job.data);
          break;
        case 'monthly-hse-report':
          await this.processMonthlyReport(job.data);
          break;
        case 'check-environmental-compliance':
          await this.processEnvironmentalCheck(job.data);
          break;
      }
    });

    const queue = this.bull.getQueue('hse');

    // check-capa-overdue: daily at 08:00 Tehran
    queue.add('check-capa-overdue', {}, { repeat: { pattern: '0 4 * * *' } });

    // check-training-expiry: daily at 09:00 Tehran
    queue.add('check-training-expiry', {}, { repeat: { pattern: '30 5 * * *' } });

    // check-inspection-overdue: daily at 07:00 Tehran
    queue.add('check-inspection-overdue', {}, { repeat: { pattern: '0 3 * * *' } });

    // compute-safety-statistics: daily at 23:00 Tehran
    queue.add('compute-safety-statistics', {}, { repeat: { pattern: '0 19 * * *' } });

    // check-risk-expiry: weekly Sunday
    queue.add('check-risk-expiry', {}, { repeat: { pattern: '0 0 * * 0' } });

    // monthly-hse-report: 1st of month at 07:00 Tehran
    queue.add('monthly-hse-report', {}, { repeat: { pattern: '0 3 1 * *' } });

    // check-environmental-compliance: daily at 10:00 Tehran
    queue.add('check-environmental-compliance', {}, { repeat: { pattern: '0 6 * * *' } });
  }

  private async processCapaOverdue(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        await this.capaService.checkAndMarkOverdue(zone.id);
      } catch (err) {
        this.logger.error(`Error checking CAPA overdue for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processTrainingExpiry(_data: any): Promise<void> {
    // Find training records expiring in 30, 14, 7 days
    const now = new Date();
    for (const days of [30, 14, 7]) {
      const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const records = await (this.prisma as any).trainingRecord.findMany({
        where: { expiresAt: { gte: now, lte: target } },
        include: { plan: true },
      });

      for (const record of records) {
        this.logger.log(`Training expiring in ${days} days: ${record.employeeName} - ${record.plan?.nameFa}`);
      }
    }
  }

  private async processInspectionOverdue(_data: any): Promise<void> {
    const now = new Date();
    const overdue = await (this.prisma as any).hseInspection.findMany({
      where: { status: 'SCHEDULED', scheduledDate: { lt: now } },
    });

    for (const insp of overdue) {
      await (this.prisma as any).hseInspection.update({
        where: { id: insp.id }, data: { status: 'OVERDUE' },
      });
    }
  }

  private async processSafetyStats(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      // Clear cache to force recomputation
      await (this as any).redis.del(`hse:dashboard:${zone.id}`);
      await (this as any).redis.del(`hse:days-since-incident:${zone.id}`);
    }
  }

  private async processRiskExpiry(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        await this.riskService.checkExpiry(zone.id);
      } catch (err) {
        this.logger.error(`Error checking risk expiry for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processMonthlyReport(_data: any): Promise<void> {
    this.logger.log('Monthly HSE report generation triggered');
    // Generate comprehensive HSE reports for each zone
  }

  private async processEnvironmentalCheck(_data: any): Promise<void> {
    this.logger.log('Environmental compliance check triggered');
    // Check if all required measurements are submitted
  }
}
