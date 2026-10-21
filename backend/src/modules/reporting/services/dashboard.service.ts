// M18: Reporting & BI — Dashboard Service
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { ReportingGatewayService } from './reporting-gateway.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { CreateDashboardDto } from '../dto/create-dtos';
import type { ZoneManagerDashboardDto, CompanyDashboardDto, SuperAdminDashboardDto, WidgetDataDto } from '../dto/enums';


@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: ReportingGatewayService,
  ) {}

  async getZoneManagerDashboard(
    zoneId: string,
    userId: string,
  ): Promise<ZoneManagerDashboardDto> {
    const cacheKey = `dashboard:zone:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ZoneManagerDashboardDto;
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's metrics from DailyMetricSnapshot
    const gateSnapshot = await this.prisma.dailyMetricSnapshot.findUnique({
      where: {
        zoneId_companyId_date_module: {
          zoneId,
          companyId: null as any,
          date: today,
          module: 'GATE',
        },
      },
    });

    const gateMetrics = (gateSnapshot?.metrics as Record<string, unknown>) || {};

    const logisticSnapshot = await this.prisma.dailyMetricSnapshot.findUnique({
      where: {
        zoneId_companyId_date_module: {
          zoneId,
          companyId: null as any,
          date: today,
          module: 'LOGISTICS',
        },
      },
    });
    const logisticsMetrics = (logisticSnapshot?.metrics as Record<string, unknown>) || {};

    const hseSnapshot = await this.prisma.dailyMetricSnapshot.findUnique({
      where: {
        zoneId_companyId_date_module: {
          zoneId,
          companyId: null as any,
          date: today,
          module: 'HSE',
        },
      },
    });
    const hseMetrics = (hseSnapshot?.metrics as Record<string, unknown>) || {};

    // Get trends (last 7 days)
    const trendData = await this.prisma.dailyMetricSnapshot.findMany({
      where: {
        zoneId,
        module: 'GATE',
      },
      orderBy: { date: 'desc' },
      take: 7,
    });

    const trafficByDay = trendData.map((t) => {
      const m = (t.metrics as Record<string, unknown>) || {};
      return {
        date: t.date,
        entries: Number(m.total_entries || 0),
        exits: Number(m.total_exits || 0),
      };
    });

    // Pending counts
    const pendingPermits = await this.prisma.permitRequest.count({
      where: { zoneId } as any,
    });

    const pendingWaybills = await this.prisma.waybill.count({
      where: { zoneId } as any,
    });

    const pendingVisitors = await this.prisma.visitorRequest.count({
      where: { zoneId, status: 'PENDING' as any },
    });

    const dashboard: ZoneManagerDashboardDto = {
      live: {
        vehiclesInside: Number(gateMetrics.vehicles_inside || 0),
        visitorsInside: Number(gateMetrics.visitors_inside || 0),
        activeTrucks: Number(gateMetrics.active_trucks || 0),
        barrierStatus: [],
        openAlerts: Number(hseMetrics.open_capas || 0),
      },
      today: {
        entries: Number(gateMetrics.total_entries || 0),
        exits: Number(gateMetrics.total_exits || 0),
        uniqueVehicles: Number(gateMetrics.unique_vehicles || 0),
        weighings: Number(logisticsMetrics.weigh_revenue ? 1 : 0),
        weighRevenue: BigInt(0),
        approvedPermits: Number(gateMetrics.approved_permits || 0),
        openWorkOrders: 0,
        attendanceRate: 0,
      },
      trends: {
        trafficByDay: trafficByDay.reverse(),
        revenueByDay: [],
        incidentsByDay: trendData.map((t) => ({
          date: t.date,
          count: Number(((t.metrics as Record<string, unknown>)?.incidents || 0)),
        })).reverse(),
      },
      alerts: {
        overdueWO: 0,
        slaBreaches: 0,
        expiringPermits: Number(hseMetrics.open_capas || 0),
        lowStock: 0,
        overdueCapas: Number(hseMetrics.open_capas || 0),
      },
      topCompanies: [],
      pendingApprovals: {
        permits: pendingPermits,
        waybills: pendingWaybills,
        visitors: pendingVisitors,
        requisitions: 0,
        letters: 0,
      },
    };

    // Cache for 1 minute
    await this.redis.set(cacheKey, JSON.stringify(dashboard), 60);
    return dashboard;
  }

  async getCompanyDashboard(
    companyId: string,
    zoneId: string,
  ): Promise<CompanyDashboardDto> {
    const cacheKey = `dashboard:company:${companyId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as CompanyDashboardDto;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new AppException('COMPANY_NOT_FOUND');
    }

    const today = new Date().toISOString().split('T')[0];

    const snapshot = await this.prisma.dailyMetricSnapshot.findUnique({
      where: {
        zoneId_companyId_date_module: {
          zoneId,
          companyId,
          date: today,
          module: 'HR',
        },
      },
    });
    const hrMetrics = (snapshot?.metrics as Record<string, unknown>) || {};

    const dashboard: CompanyDashboardDto = {
      companyId,
      companyName: company.nameFa,
      healthScore: company.healthScore ?? undefined,
      hseScore: undefined,
      today: {
        employeesPresent: Number(hrMetrics.attendance_rate || 0),
        trucksInside: 0,
        visitorsInside: 0,
        pendingApprovals: 0,
      },
      activePermits: await this.prisma.issuedPermit.count({
        where: { companyId },
      }),
      upcomingMaintenance: 0,
      openIncidents: 0,
      pendingRequisitions: 0,
      recentLetters: await this.prisma.letter.count({
        where: { companyId },
      }),
      balanceDue: BigInt(0),
    };

    await this.redis.set(cacheKey, JSON.stringify(dashboard), 120);
    return dashboard;
  }

  async getSuperAdminDashboard(superAdminId: string): Promise<SuperAdminDashboardDto> {
    const cacheKey = 'dashboard:superadmin';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SuperAdminDashboardDto;
    }

    const totalZones = await this.prisma.zone.count({
      where: { deletedAt: null },
    });

    const totalCompanies = await this.prisma.company.count({
      where: { isActive: true },
    });

    const today = new Date().toISOString().split('T')[0];

    const todaySnapshots = await this.prisma.dailyMetricSnapshot.findMany({
      where: { date: today, module: 'GATE', companyId: null },
    });

    let totalEntries = 0;
    let totalExits = 0;
    for (const snap of todaySnapshots) {
      const m = (snap.metrics as Record<string, unknown>) || {};
      totalEntries += Number(m.total_entries || 0);
      totalExits += Number(m.total_exits || 0);
    }

    const zoneComparison = await Promise.all(
      (await this.prisma.zone.findMany({ where: { deletedAt: null } })).map(
        async (z) => {
          const snap = todaySnapshots.find((s) => s.zoneId === z.id);
          const m = (snap?.metrics as Record<string, unknown>) || {};
          return {
            zoneId: z.id,
            zoneName: z.nameFa,
            entries: Number(m.total_entries || 0),
            companies: await this.prisma.company.count({
              where: { zoneId: z.id, isActive: true },
            }),
            revenue: BigInt(0),
            occupancyRate: 0,
          };
        },
      ),
    );

    const dashboard: SuperAdminDashboardDto = {
      totalZones,
      activeZones: totalZones,
      totalCompanies,
      totalVehiclesNow: 0,
      todayNational: {
        entries: totalEntries,
        exits: totalExits,
        revenues: BigInt(0),
        incidents: 0,
      },
      zoneComparison,
      alerts: {
        offlineDevices: 0,
        criticalIncidents: 0,
        systemErrors: 0,
      },
      systemHealth: {
        dbResponseMs: 0,
        redisLatencyMs: 0,
        apiSuccessRate: 100,
        activeWebSockets: 0,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(dashboard), 30);
    return dashboard;
  }

  async getFinancialDashboard(zoneId: string, period: string): Promise<Record<string, unknown>> {
    const cacheKey = `dashboard:finance:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = { totalRevenue: BigInt(0), outstanding: BigInt(0), period };
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getHseDashboard(zoneId: string): Promise<Record<string, unknown>> {
    const cacheKey = `dashboard:hse:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const totalIncidents = await this.prisma.hseIncident.count({
      where: { zoneId },
    });

    const openCapas = await this.prisma.riskAssessment.count({
      where: { zoneId, status: 'OPEN' as any },
    });

    const result = { totalIncidents, openCapas, zoneId };
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getOperationalDashboard(zoneId: string): Promise<Record<string, unknown>> {
    const cacheKey = `dashboard:operations:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = {
      zoneId,
      gates: 0,
      workOrders: 0,
      inventory: 0,
    };
    await this.redis.set(cacheKey, JSON.stringify(result), 120);
    return result;
  }

  async createCustomDashboard(
    dto: CreateDashboardDto,
    createdBy: string,
  ): Promise<any> {
    // Check code uniqueness
    const existing = await this.prisma.dashboard.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new AppException('DASHBOARD_CODE_DUPLICATE');
    }

    const dashboard = await this.prisma.dashboard.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        code: dto.code,
        nameFa: dto.nameFa,
        type: dto.type,
        isDefault: dto.isDefault || false,
        isSystem: false,
        layout: {},
        createdBy,
        widgets: dto.widgets
          ? {
              create: dto.widgets.map((w) => ({
                widgetType: w.widgetType,
                title: w.title,
                reportCode: w.reportCode,
                config: w.config as any,
                position: w.position as any,
                sortOrder: w.sortOrder || 0,
              })),
            }
          : undefined,
      },
      include: { widgets: true },
    });

    await this.audit.log({
      action: 'DASHBOARD_CREATED',
      targetType: 'Dashboard',
      targetId: dashboard.id,
      userId: createdBy,
      
    });

    return dashboard;
  }

  async getWidgetData(
    widgetId: string,
    zoneId: string,
    parameters?: Record<string, unknown>,
  ): Promise<WidgetDataDto> {
    const widget = await this.prisma.dashboardWidget.findUnique({
      where: { id: widgetId },
    });
    if (!widget) {
      throw new AppException('WIDGET_NOT_FOUND');
    }

    // Return widget data based on type
    const data: WidgetDataDto = {
      widgetId,
      data: {},
      chartConfig: widget.config as Record<string, unknown>,
      refreshedAt: new Date(),
    };

    return data;
  }

  async updateWidgetLayout(
    dashboardId: string,
    widgets: { id: string; position: Record<string, unknown> }[],
  ): Promise<void> {
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard) {
      throw new AppException('DASHBOARD_NOT_FOUND');
    }

    for (const w of widgets) {
      await this.prisma.dashboardWidget.update({
        where: { id: w.id },
        data: { position: w.position as any },
      });
    }
  }

  async getDashboard(code: string): Promise<any> {
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { code },
      include: { widgets: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dashboard) {
      throw new AppException('DASHBOARD_NOT_FOUND');
    }
    return dashboard;
  }

  async getUserDashboards(userId: string, zoneId?: string): Promise<any[]> {
    return this.prisma.dashboard.findMany({
      where: {
        OR: [
          { userId },
          { isSystem: true },
          zoneId ? { zoneId } : undefined,
        ].filter(Boolean) as any,
      },
      include: { widgets: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
