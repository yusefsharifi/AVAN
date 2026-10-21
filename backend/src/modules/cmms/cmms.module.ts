import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

// Services
import { AssetService } from './services/asset.service';
import { MaintenancePlanService } from './services/maintenance-plan.service';
import { WorkOrderService } from './services/work-order.service';
import { SparePartService } from './services/spare-part.service';
import { FailureAnalysisService } from './services/failure-analysis.service';
import { TechnicianService } from './services/technician.service';
import { ContractorService } from './services/contractor.service';
import { CmmsGatewayService } from './services/cmms-gateway.service';

// Controllers
import { AssetController } from './controllers/asset.controller';
import { MaintenancePlanController } from './controllers/maintenance-plan.controller';
import { WorkOrderController } from './controllers/work-order.controller';
import { SparePartController } from './controllers/spare-part.controller';
import { FailureController } from './controllers/failure.controller';
import { TechnicianController } from './controllers/technician.controller';
import { ContractorController } from './controllers/contractor.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    AssetController,
    MaintenancePlanController,
    WorkOrderController,
    SparePartController,
    FailureController,
    TechnicianController,
    ContractorController,
  ],
  providers: [
    AssetService,
    MaintenancePlanService,
    WorkOrderService,
    SparePartService,
    FailureAnalysisService,
    TechnicianService,
    ContractorService,
    CmmsGatewayService,
  ],
  exports: [
    AssetService,
    MaintenancePlanService,
    WorkOrderService,
    SparePartService,
    FailureAnalysisService,
    TechnicianService,
    ContractorService,
    CmmsGatewayService,
  ],
})
export class CmmsModule implements OnModuleInit {
  private readonly logger = new Logger(CmmsModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly prisma: PrismaService,
    private readonly maintenancePlanService: MaintenancePlanService,
    private readonly workOrderService: WorkOrderService,
    private readonly sparePartService: SparePartService,
    private readonly assetService: AssetService,
  ) {}

  onModuleInit() {
    this.registerCmmsJobs();
    this.logger.log('CMMS BullMQ jobs registered');
  }

  private registerCmmsJobs(): void {
    this.bull.registerWorker('cmms', async (job) => {
      this.logger.debug(`Processing CMMS job: ${job.name}`);

      switch (job.name) {
        case 'generate-scheduled-work-orders':
          await this.processGenerateWorkOrders(job.data);
          break;
        case 'check-work-order-sla':
          await this.processCheckSla(job.data);
          break;
        case 'check-spare-parts-stock':
          await this.processCheckStock(job.data);
          break;
        case 'update-asset-depreciation':
          await this.processDepreciation(job.data);
          break;
        case 'check-warranty-expiry':
          await this.processWarrantyCheck(job.data);
          break;
        case 'compute-mtbf-mttr':
          await this.processMtbfMttr(job.data);
          break;
        case 'maintenance-calendar-cache':
          await this.processCalendarCache(job.data);
          break;
        case 'work-order-reminder':
          await this.processWorkOrderReminder(job.data);
          break;
        default:
          this.logger.warn(`Unknown CMMS job: ${job.name}`);
      }
    });

    // Schedule recurring jobs
    const queue = this.bull.getQueue('cmms');

    // generate-scheduled-work-orders: daily at 06:00 Tehran (UTC+3:30 = 02:30 UTC)
    queue.add('generate-scheduled-work-orders', {}, { repeat: { pattern: '30 2 * * *' } });

    // check-work-order-sla: every 30 minutes
    queue.add('check-work-order-sla', {}, { repeat: { pattern: '*/30 * * * *' } });

    // check-spare-parts-stock: daily at 08:00 Tehran
    queue.add('check-spare-parts-stock', {}, { repeat: { pattern: '0 4 * * *' } });

    // update-asset-depreciation: 1st of month at 02:00 Tehran
    queue.add('update-asset-depreciation', {}, { repeat: { pattern: '0 22 1 * *' } });

    // check-warranty-expiry: daily at 09:00 Tehran
    queue.add('check-warranty-expiry', {}, { repeat: { pattern: '30 5 * * *' } });

    // compute-mtbf-mttr: weekly Sunday at 04:00 Tehran
    queue.add('compute-mtbf-mttr', {}, { repeat: { pattern: '0 0 * * 0' } });

    // maintenance-calendar-cache: daily at 05:00 Tehran
    queue.add('maintenance-calendar-cache', {}, { repeat: { pattern: '0 1 * * *' } });

    // work-order-reminder: every hour
    queue.add('work-order-reminder', {}, { repeat: { pattern: '0 * * * *' } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB PROCESSORS
  // ═══════════════════════════════════════════════════════════════════════════

  private async processGenerateWorkOrders(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        await this.maintenancePlanService.checkDuePlans(zone.id);
      } catch (err) {
        this.logger.error(`Error generating work orders for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processCheckSla(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        await this.workOrderService.checkSlaBreaches(zone.id);
      } catch (err) {
        this.logger.error(`Error checking SLA for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processCheckStock(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        await this.sparePartService.getReorderAlerts(zone.id);
      } catch (err) {
        this.logger.error(`Error checking stock for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processDepreciation(_data: any): Promise<void> {
    const assets = await (this.prisma as any).asset.findMany({
      where: { status: 'ACTIVE', depreciationRate: { not: null } },
    });

    for (const asset of assets) {
      try {
        const monthlyRate = Number(asset.depreciationRate) / 12 / 100;
        const currentVal = Number(asset.currentValue || asset.purchasePrice || 0);
        const newVal = Math.max(
          Math.round(currentVal * (1 - monthlyRate)),
          Number(asset.salvageValue || 0),
        );

        await (this.prisma as any).asset.update({
          where: { id: asset.id },
          data: { currentValue: BigInt(newVal) },
        });
      } catch (err) {
        this.logger.error(`Error updating depreciation for asset ${asset.id}: ${err}`);
      }
    }
  }

  private async processWarrantyCheck(_data: any): Promise<void> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 30);

    const assets = await (this.prisma as any).asset.findMany({
      where: {
        status: 'ACTIVE',
        warrantyExpiry: { not: null, lte: threshold, gte: new Date() },
      },
    });

    // Emit warranty expiry alerts
    for (const asset of assets) {
      this.logger.log(`Warranty expiring for asset ${asset.assetNumber}: ${asset.warrantyExpiry}`);
    }
  }

  private async processMtbfMttr(_data: any): Promise<void> {
    const assets = await (this.prisma as any).asset.findMany({
      where: { status: { not: 'DECOMMISSIONED' } },
    });

    for (const asset of assets) {
      try {
        // Clear cache so next access recomputes
        await (this.prisma as any).$executeRaw`DELETE FROM "FailureLog" WHERE "assetId" = ${asset.id} LIMIT 0`;
        // Just invalidate the cache keys
        const redis = (this as any).redis;
        if (redis) {
          await redis.del(`cmms:mtbf:${asset.id}`);
          await redis.del(`cmms:mttr:${asset.id}`);
        }
      } catch (err) {
        this.logger.error(`Error computing MTBF/MTTR for asset ${asset.id}: ${err}`);
      }
    }
  }

  private async processCalendarCache(_data: any): Promise<void> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    const now = new Date();

    for (const zone of zones) {
      try {
        const calendar = await this.maintenancePlanService.getMaintenanceCalendar(
          zone.id,
          now.getMonth() + 1,
          now.getFullYear(),
        );
        const redis = (this as any).redis;
        if (redis) {
          await redis.set(`cmms:calendar:${zone.id}`, JSON.stringify(calendar), 86400);
        }
      } catch (err) {
        this.logger.error(`Error caching calendar for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processWorkOrderReminder(_data: any): Promise<void> {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    // IN_PROGRESS WOs scheduled to end in 2 hours
    const endingSoon = await (this.prisma as any).workOrder.findMany({
      where: {
        status: 'IN_PROGRESS',
        scheduledEnd: { lte: twoHoursLater, gte: now },
      },
      include: { asset: true },
    });

    for (const wo of endingSoon) {
      if (wo.assignedTechnicianId) {
        this.logger.log(`Reminder: WO ${wo.workOrderNumber} scheduled to end soon for technician ${wo.assignedTechnicianId}`);
      }
    }

    // ASSIGNED WOs not started after 1h past scheduled start
    const notStarted = await (this.prisma as any).workOrder.findMany({
      where: {
        status: 'ASSIGNED',
        scheduledStart: { lte: oneHourAgo },
      },
      include: { asset: true },
    });

    for (const wo of notStarted) {
      this.logger.log(`Alert: WO ${wo.workOrderNumber} not started past scheduled time`);
    }
  }
}
