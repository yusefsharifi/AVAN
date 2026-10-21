// M18: Reporting & BI — Standard Reports Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import type {
  TrafficReportDto,
  RevenueReportDto,
  HseReportDto,
  AttendanceReportDto,
  MaintenanceReportDto,
  ExecutiveSummaryDto,
  ZoneComparisonDto,
  CompanyScorecardDto,
  TrafficReportFilter,
} from '../dto/enums';
import { determineOverallRating } from '../utils/reporting.utils';

@Injectable()
export class StandardReportsService {
  private readonly logger = new Logger(StandardReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── GATE & TRAFFIC REPORTS ───────────────────────────────────────────────

  async getTrafficReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
    filter?: TrafficReportFilter,
  ): Promise<TrafficReportDto> {
    const where: Record<string, unknown> = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };
    if (filter?.gateId) where.gateId = filter.gateId;
    if (filter?.companyId) where.companyId = filter.companyId;

    const logs = await this.prisma.trafficLog.findMany({ where });

    const entries = logs.filter((l) => l.direction === 'ENTRY');
    const exits = logs.filter((l) => l.direction === 'EXIT');
    const denied = logs.filter((l) => l.accessResult?.includes('DENIED'));

    const uniquePlates = new Set(logs.map((l) => l.plate).filter(Boolean));
    const hours = Array(24).fill(0);
    const daysOfWeek = Array(7).fill(0);

    for (const log of entries) {
      const h = new Date(log.createdAt).getHours();
      hours[h]++;
      const d = new Date(log.createdAt).getDay();
      daysOfWeek[d]++;
    }

    // Group by gate
    const gateMap = new Map<string, { gateName: string; entries: number; exits: number }>();
    for (const log of logs) {
      const key = log.gateId;
      if (!gateMap.has(key)) {
        gateMap.set(key, { gateName: key, entries: 0, exits: 0 });
      }
      const g = gateMap.get(key)!;
      if (log.direction === 'ENTRY') g.entries++;
      else g.exits++;
    }

    return {
      summary: {
        totalEntries: entries.length,
        totalExits: exits.length,
        uniqueVehicles: uniquePlates.size,
        deniedCount: denied.length,
        overrideCount: 0,
        avgDwellMinutes: 0,
        peakHour: hours.indexOf(Math.max(...hours)),
        peakDay: String(daysOfWeek.indexOf(Math.max(...daysOfWeek))),
      },
      byGate: Array.from(gateMap.entries()).map(([gateId, data]) => ({
        gateId,
        ...data,
      })),
      byHour: hours,
      byDayOfWeek: daysOfWeek,
      byVehicleType: {},
      byCompany: [],
      trend: [],
      denialReasons: [],
    };
  }

  async getGateReport(
    zoneId: string,
    gateId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const logs = await this.prisma.trafficLog.findMany({
      where: {
        zoneId,
        gateId,
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });
    return { gateId, totalLogs: logs.length, entries: logs.filter((l) => l.direction === 'ENTRY').length, exits: logs.filter((l) => l.direction === 'EXIT').length };
  }

  // ─── LOGISTICS REPORTS ────────────────────────────────────────────────────

  async getWaybillReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const where = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };

    const totalWaybills = await this.prisma.waybill.count({ where });
    const approved = await this.prisma.waybill.count({
      where: { ...where, status: 'APPROVED' as any },
    });
    const pending = await this.prisma.waybill.count({
      where: { ...where, status: 'PENDING_APPROVAL' as any },
    });

    return { totalWaybills, approved, pending, zoneId, fromDate, toDate };
  }

  async getWeighScaleReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const logs = await this.prisma.weighRecord.findMany({
      where: {
        zoneId,
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });
    return { totalWeighings: logs.length, totalWeight: logs.reduce((s, l) => s + Number(l.netWeight || 0), 0) };
  }

  // ─── PERMIT REPORTS ───────────────────────────────────────────────────────

  async getPermitReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const where = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };

    const totalRequests = await this.prisma.permitRequest.count({ where });
    const approved = await this.prisma.permitRequest.count({
      where: { ...where, status: 'APPROVED' as any },
    });
    const rejected = await this.prisma.permitRequest.count({
      where: { ...where, status: 'REJECTED' as any },
    });
    const pending = await this.prisma.permitRequest.count({
      where: { ...where, status: 'PENDING' as any },
    });

    return { totalRequests, approved, rejected, pending };
  }

  // ─── CORRESPONDENCE REPORTS ───────────────────────────────────────────────

  async getCorrespondenceReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const where = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };
    const totalLetters = await this.prisma.letter.count({ where });
    return { totalLetters };
  }

  // ─── FINANCIAL REPORTS ────────────────────────────────────────────────────

  async getRevenueReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<RevenueReportDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        zoneId,
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });

    const totalRevenue = invoices.reduce((s, i) => s + (i.grandTotal || BigInt(0)), BigInt(0));

    return {
      totalRevenue,
      bySource: [],
      topPayingCompanies: [],
      monthlyTrend: [],
    };
  }

  async getArAgingReport(zoneId: string): Promise<Record<string, unknown>> {
    const invoices = await this.prisma.invoice.findMany({
      where: { zoneId, status: 'UNPAID' as any },
    });
    return {
      totalOutstanding: invoices.reduce((s, i) => s + (i.grandTotal || BigInt(0)), BigInt(0)),
      invoiceCount: invoices.length,
    };
  }

  async getPayrollSummaryReport(
    zoneId: string,
    companyId?: string,
    year?: number,
    month?: number,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { zoneId };
    if (companyId) where.companyId = companyId;

    const payrolls = await this.prisma.payroll.findMany({ where });
    const totalGross = payrolls.reduce((s, p) => s + (p.totalGross || BigInt(0)), BigInt(0));

    return { totalGross, payrollCount: payrolls.length };
  }

  // ─── HSE REPORTS ──────────────────────────────────────────────────────────

  async getHseReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
    companyId?: string,
  ): Promise<HseReportDto> {
    const where: Record<string, unknown> = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };
    if (companyId) where.companyId = companyId;

    const incidents = await this.prisma.hseIncident.findMany({ where });

    // Days since last incident
    const lastIncident = incidents.length > 0
      ? incidents.reduce((latest, i) => i.createdAt > latest.createdAt ? i : latest)
      : null;
    const daysSinceLast = lastIncident
      ? Math.floor((Date.now() - lastIncident.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const byTypeMap = new Map<string, number>();
    const bySeverityMap = new Map<string, number>();
    for (const inc of incidents) {
      byTypeMap.set(inc.type, (byTypeMap.get(inc.type) || 0) + 1);
      bySeverityMap.set(inc.severity, (bySeverityMap.get(inc.severity) || 0) + 1);
    }

    return {
      daysSinceLastIncident: daysSinceLast,
      totalIncidents: incidents.length,
      byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
      bySeverity: Array.from(bySeverityMap.entries()).map(([severity, count]) => ({ severity, count })),
      openCapas: await this.prisma.riskAssessment.count({
        where: { zoneId, status: 'OPEN' as any },
      }),
      overdueCapas: 0,
      trend: [],
    };
  }

  // ─── HR REPORTS ───────────────────────────────────────────────────────────

  async getAttendanceReport(
    zoneId: string,
    companyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AttendanceReportDto> {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });

    const byEmployee = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const present = empRecords.filter((r) => r.status === 'PRESENT').length;
      const absent = empRecords.filter((r) => r.status === 'ABSENT').length;
      const leaveDays = empRecords.filter((r) => r.status === 'ON_LEAVE').length;
      const overtime = empRecords.reduce((s, r) => s + (r.overtimeMinutes || 0), 0);
      const lateCount = 0; // LATE tracked via lateMinutes field

      return {
        employeeId: emp.id,
        employeeName: emp.firstNameFa + ' ' + emp.lastNameFa,
        presentDays: present,
        absentDays: absent,
        leaveDays,
        overtimeHours: overtime / 60,
        lateCount,
      };
    });

    const totalEmployees = employees.length;
    const totalPresentDays = byEmployee.reduce((s, e) => s + e.presentDays, 0);
    const totalAbsentDays = byEmployee.reduce((s, e) => s + e.absentDays, 0);
    const totalDays = totalPresentDays + totalAbsentDays;

    return {
      totalEmployees,
      avgPresentDays: totalEmployees > 0 ? totalPresentDays / totalEmployees : 0,
      absentRate: totalDays > 0 ? (totalAbsentDays / totalDays) * 100 : 0,
      overtimeHours: byEmployee.reduce((s, e) => s + e.overtimeHours, 0),
      byEmployee,
    };
  }

  async getLeaveReport(
    zoneId: string,
    companyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        companyId: companyId,
        startDate: { gte: fromDate },
        endDate: { lte: toDate },
      },
    });
    return {
      totalLeaves: leaves.length,
      approved: leaves.filter((l) => l.status === 'APPROVED').length,
      pending: leaves.filter((l) => l.status === 'PENDING').length,
    };
  }

  // ─── INVENTORY REPORTS ────────────────────────────────────────────────────

  async getInventoryReport(
    zoneId: string,
    companyId?: string,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { zoneId };
    if (companyId) where.companyId = companyId;

    const items = await this.prisma.item.findMany({ where });
    const totalValue = items.reduce((s, i) => s + i.avgCost, BigInt(0));

    const lowStock = items.filter(
      (i) => Number(i.minStock) > 0 && Number(i.reorderPoint) > 0,
    );

    return {
      totalItems: items.length,
      totalValue: totalValue.toString(),
      lowStockCount: lowStock.length,
    };
  }

  async getProcurementReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, unknown>> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        zoneId,
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });
    return {
      totalPOs: pos.length,
      totalValue: pos.reduce((s, p) => s + p.grandTotal, BigInt(0)).toString(),
    };
  }

  // ─── MAINTENANCE REPORTS ──────────────────────────────────────────────────

  async getMaintenanceReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<MaintenanceReportDto> {
    const where = {
      zoneId,
      createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
    };

    const workOrders = await this.prisma.workOrder.findMany({ where });
    const byTypeMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();

    for (const wo of workOrders) {
      byTypeMap.set(wo.type, (byTypeMap.get(wo.type) || 0) + 1);
      byStatusMap.set(wo.status, (byStatusMap.get(wo.status) || 0) + 1);
    }

    return {
      totalWorkOrders: workOrders.length,
      byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
      byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
      avgCompletionHours: 0,
      totalCost: BigInt(0),
      slaComplianceRate: 100,
    };
  }

  // ─── EXECUTIVE SUMMARY ────────────────────────────────────────────────────

  async getExecutiveSummary(
    zoneId: string,
    period: string,
  ): Promise<ExecutiveSummaryDto> {
    return {
      zoneId,
      period,
      generatedAt: new Date(),
      kpis: [
        { module: 'GATE', label: 'Today Entries', value: 0, status: 'ON_TRACK' },
        { module: 'LOGISTICS', label: 'Waybills', value: 0, status: 'ON_TRACK' },
        { module: 'HSE', label: 'Incidents', value: 0, target: 0, status: 'ON_TRACK' },
      ],
      highlights: [],
      risks: [],
    };
  }

  async compareZones(
    zoneIds: string[],
    metric: string,
    period: string,
  ): Promise<ZoneComparisonDto> {
    const zones = await this.prisma.zone.findMany({
      where: { id: { in: zoneIds } },
    });

    const data = zones.map((z, i) => ({
      zoneId: z.id,
      zoneName: z.nameFa,
      value: 0,
      rank: i + 1,
    }));

    return { metric, period, zones: data };
  }

  async getCompanyScorecard(
    companyId: string,
    zoneId: string,
    period: string,
  ): Promise<CompanyScorecardDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const scores = [
      { category: 'Traffic', score: 80, weight: 20 },
      { category: 'HSE', score: company?.healthScore || 70, weight: 25 },
      { category: 'Finance', score: 75, weight: 30 },
      { category: 'Operations', score: 85, weight: 25 },
    ];

    return {
      companyId,
      companyName: company?.nameFa || '',
      overallRating: determineOverallRating(scores),
      scores,
      recommendations: [],
    };
  }
}
