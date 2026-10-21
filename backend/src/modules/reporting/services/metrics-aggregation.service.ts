// M18: Reporting & BI — Metrics Aggregation Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ReportingGatewayService } from './reporting-gateway.service';
import type { KpiProgressDto, MetricHistoryDto, TrendDto } from '../dto/enums';
import { SetKpiTargetDto } from '../dto/create-dtos';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';

@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: ReportingGatewayService,
  ) {}

  async computeDailySnapshot(zoneId: string, date: string): Promise<void> {
    this.logger.log(`Computing daily snapshot for zone ${zoneId} on ${date}`);

    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // GATE metrics
    const trafficLogs = await this.prisma.trafficLog.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const gateMetrics = {
      total_entries: trafficLogs.filter((l) => l.direction === 'ENTRY').length,
      total_exits: trafficLogs.filter((l) => l.direction === 'EXIT').length,
      unique_vehicles: new Set(trafficLogs.map((l) => l.plate).filter(Boolean)).size,
      denied_count: trafficLogs.filter((l) => l.accessResult === 'DENIED_BLACKLIST').length,
      override_count: 0,
      peak_hour: 0,
    };

    // LOGISTICS metrics
    const waybills = await this.prisma.waybill.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const logisticsMetrics = {
      waybills_created: waybills.length,
      waybills_approved: waybills.filter((w) => w.status === 'APPROVED').length,
      total_weight: 0,
      weigh_revenue: 0,
    };

    // PERMIT metrics
    const permitRequests = await this.prisma.permitRequest.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const permitMetrics = {
      requests_created: permitRequests.length,
      permits_issued: permitRequests.filter((p) => p.status === 'APPROVED').length,
      permits_expiring: 0,
      compliance_rate: 100,
    };

    // FINANCE metrics
    const invoices = await this.prisma.invoice.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const financeMetrics = {
      revenue: invoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0),
      ar_balance: 0,
      collections: 0,
      invoices_issued: invoices.length,
      invoices_paid: invoices.filter((i) => i.status === 'PAID').length,
    };

    // HSE metrics
    const incidents = await this.prisma.hseIncident.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const hseMetrics = {
      incidents: incidents.length,
      near_misses: incidents.filter((i) => i.type === 'NEAR_MISS').length,
      open_capas: 0,
      inspections_done: 0,
      trir: 0,
    };

    // HR metrics
    const hrMetrics = {
      attendance_rate: 0,
      overtime_hours: 0,
      leaves_approved: 0,
      new_hires: 0,
    };

    // INVENTORY metrics
    const inventoryMetrics = {
      stock_received_value: 0,
      stock_issued_value: 0,
      low_stock_items: 0,
      reorders: 0,
    };

    // MAINTENANCE metrics
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        zoneId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const maintenanceMetrics = {
      work_orders_created: workOrders.length,
      work_orders_completed: workOrders.filter((w) => w.status === 'COMPLETED').length,
      emergency_count: workOrders.filter((w) => w.priority === 'EMERGENCY').length,
      sla_compliance_rate: 100,
    };

    // Store all snapshots
    const modules: [string, Record<string, unknown>][] = [
      ['GATE', gateMetrics],
      ['LOGISTICS', logisticsMetrics],
      ['PERMITS', permitMetrics],
      ['FINANCE', financeMetrics],
      ['HSE', hseMetrics],
      ['HR', hrMetrics],
      ['INVENTORY', inventoryMetrics],
      ['MAINTENANCE', maintenanceMetrics],
    ];

    for (const [module, metrics] of modules) {
      await this.prisma.dailyMetricSnapshot.upsert({
        where: {
          zoneId_companyId_date_module: {
            zoneId,
            companyId: null as any,
            date,
            module,
          },
        },
        create: {
          zoneId,
          date,
          module,
          metrics: JSON.parse(JSON.stringify(metrics)),
        },
        update: {
          metrics: JSON.parse(JSON.stringify(metrics)) as any,
          computedAt: new Date(),
        },
      });
    }

    this.gateway.emitSnapshotCompleted(zoneId, {
      date,
      modulesProcessed: modules.length,
    });
  }

  async getMetricHistory(
    zoneId: string,
    module: string,
    metric: string,
    fromDate: string,
    toDate: string,
  ): Promise<MetricHistoryDto[]> {
    const snapshots = await this.prisma.dailyMetricSnapshot.findMany({
      where: {
        zoneId,
        module,
        date: { gte: fromDate, lte: toDate },
      },
      orderBy: { date: 'asc' },
    });

    return snapshots.map((s) => {
      const m = (s.metrics as Record<string, unknown>) || {};
      return { date: s.date, value: m[metric] || 0 };
    });
  }

  async getMetricTrend(
    zoneId: string,
    module: string,
    metric: string,
    periods: number,
    periodType: 'day' | 'week' | 'month',
  ): Promise<TrendDto> {
    const now = new Date();
    const currentPeriodStart = new Date(now);
    const previousPeriodStart = new Date(now);

    switch (periodType) {
      case 'day':
        currentPeriodStart.setDate(currentPeriodStart.getDate() - periods);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - periods * 2);
        break;
      case 'week':
        currentPeriodStart.setDate(currentPeriodStart.getDate() - periods * 7);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - periods * 14);
        break;
      case 'month':
        currentPeriodStart.setMonth(currentPeriodStart.getMonth() - periods);
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - periods * 2);
        break;
    }

    const currentSnaps = await this.prisma.dailyMetricSnapshot.findMany({
      where: {
        zoneId,
        module,
        date: { gte: currentPeriodStart.toISOString().split('T')[0], lte: now.toISOString().split('T')[0] },
      },
      orderBy: { date: 'asc' },
    });

    const previousSnaps = await this.prisma.dailyMetricSnapshot.findMany({
      where: {
        zoneId,
        module,
        date: {
          gte: previousPeriodStart.toISOString().split('T')[0],
          lt: currentPeriodStart.toISOString().split('T')[0],
        },
      },
      orderBy: { date: 'asc' },
    });

    const extractValue = (snaps: typeof currentSnaps): number =>
      snaps.reduce((sum, s) => {
        const m = (s.metrics as Record<string, unknown>) || {};
        return sum + Number(m[metric] || 0);
      }, 0);

    const current = extractValue(currentSnaps);
    const previous = extractValue(previousSnaps);
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    const trend: 'UP' | 'DOWN' | 'STABLE' =
      changePercent > 5 ? 'UP' : changePercent < -5 ? 'DOWN' : 'STABLE';

    const data = currentSnaps.map((s) => {
      const m = (s.metrics as Record<string, unknown>) || {};
      return { date: s.date, value: Number(m[metric] || 0) };
    });

    return { current, previous, change, changePercent, trend, data };
  }

  async setKpiTarget(dto: SetKpiTargetDto): Promise<any> {
    const existing = await this.prisma.kpiTarget.findFirst({
      where: {
        zoneId: dto.zoneId,
        module: dto.module,
        kpiCode: dto.kpiCode,
        year: dto.year,
        period: dto.period,
        month: dto.month ?? undefined,
        quarter: dto.quarter ?? undefined,
      },
    });

    if (existing) {
      return this.prisma.kpiTarget.update({
        where: { id: existing.id },
        data: { targetValue: dto.targetValue },
      });
    }

    return this.prisma.kpiTarget.create({
      data: {
        zoneId: dto.zoneId,
        module: dto.module,
        kpiCode: dto.kpiCode,
        targetValue: dto.targetValue,
        period: dto.period,
        year: dto.year,
        month: dto.month,
        quarter: dto.quarter,
        createdBy: 'system',
      },
    });
  }

  async getKpiProgress(
    zoneId: string,
    module: string,
    kpiCode: string,
    year: number,
    month?: number,
  ): Promise<KpiProgressDto> {
    const target = await this.prisma.kpiTarget.findFirst({
      where: {
        zoneId,
        module,
        kpiCode,
        year,
        month: month ?? undefined,
      },
    });

    if (!target) {
      throw new AppException('KPI_TARGET_NOT_FOUND');
    }

    const targetVal = Number(target.targetValue);
    // Compute actual from daily snapshots
    const monthStr = month ? String(month).padStart(2, '0') : null;
    const snapshots = await this.prisma.dailyMetricSnapshot.findMany({
      where: {
        zoneId,
        module,
        date: { startsWith: monthStr ? `${year}-${monthStr}` : String(year) },
      },
    });

    const actual = snapshots.reduce((sum, s) => {
      const m = (s.metrics as Record<string, unknown>) || {};
      return sum + Number(m[kpiCode] || 0);
    }, 0);

    const progressPercent = targetVal > 0 ? (actual / targetVal) * 100 : 0;

    return {
      kpiCode,
      module,
      target: targetVal,
      actual: actual ?? 0,
      progressPercent: progressPercent ?? 0,
      isAtRisk: (progressPercent ?? 0) < 80,
      period: target.period ?? 'monthly',
    };
  }
}
