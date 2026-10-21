import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import type { HseDashboardDto, CompanyHseProfileDto } from '../dto/enums';
import {
  computeTRIR, computeLTIFR, computeNearMissRate,
  estimateTotalHoursWorked, daysSinceIncident, isRecordableIncident, computeHseScore,
} from '../utils/hse.utils';

@Injectable()
export class SafetyStatisticsService {
  private readonly logger = new Logger(SafetyStatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async computeTRIR(zoneId: string, fromDate: string, toDate: string, companyId?: string): Promise<number> {
    const cacheKey = `hse:trir:${zoneId}:${fromDate}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    const where: any = { zoneId, occurredAt: { gte: new Date(fromDate), lte: new Date(toDate) } };
    if (companyId) where.companyId = companyId;

    const incidents = await (this.prisma as any).hseIncident.findMany({ where });
    const recordableCount = incidents.filter((i: any) => isRecordableIncident(i.type)).length;

    // Estimate total hours: assume 100 employees × 8 hrs/day × working days
    const totalHours = estimateTotalHoursWorked(100, new Date(fromDate), new Date(toDate));

    const trir = computeTRIR(recordableCount, totalHours);
    await this.redis.set(cacheKey, trir.toString(), 3600);
    return trir;
  }

  async computeLTIFR(zoneId: string, fromDate: string, toDate: string, companyId?: string): Promise<number> {
    const where: any = { zoneId, occurredAt: { gte: new Date(fromDate), lte: new Date(toDate) } };
    if (companyId) where.companyId = companyId;

    const incidents = await (this.prisma as any).hseIncident.findMany({ where });
    const ltiCount = incidents.filter((i: any) => i.type === 'LOST_TIME_INJURY').length;
    const totalHours = estimateTotalHoursWorked(100, new Date(fromDate), new Date(toDate));

    return computeLTIFR(ltiCount, totalHours);
  }

  async computeNearMissRate(zoneId: string, fromDate: string, toDate: string): Promise<number> {
    const where: any = { zoneId, type: 'NEAR_MISS', occurredAt: { gte: new Date(fromDate), lte: new Date(toDate) } };
    const count = await (this.prisma as any).hseIncident.count({ where });
    const totalHours = estimateTotalHoursWorked(100, new Date(fromDate), new Date(toDate));
    return computeNearMissRate(count, totalHours);
  }

  async getDaysSinceLastIncident(zoneId: string, severity?: string, companyId?: string): Promise<number> {
    const cacheKey = `hse:days-since-incident:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseInt(cached);

    const where: any = { zoneId };
    if (severity) where.severity = severity;
    if (companyId) where.companyId = companyId;

    const latest = await (this.prisma as any).hseIncident.findFirst({
      where, orderBy: { occurredAt: 'desc' },
    });

    const days = latest ? daysSinceIncident(latest.occurredAt) : -1;
    await this.redis.set(cacheKey, days.toString(), 86400);
    return days;
  }

  async getHseDashboard(zoneId: string): Promise<HseDashboardDto> {
    const cacheKey = `hse:dashboard:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const daysSinceLast = await this.getDaysSinceLastIncident(zoneId);
    const daysSinceLastLTI = await this.getDaysSinceLastIncident(zoneId, 'LOST_TIME_INJURY');
    const trir = await this.computeTRIR(zoneId, yearStart.toISOString(), now.toISOString());
    const ltifr = await this.computeLTIFR(zoneId, yearStart.toISOString(), now.toISOString());
    const nearMissRate = await this.computeNearMissRate(zoneId, yearStart.toISOString(), now.toISOString());

    const openCapas = await (this.prisma as any).correctiveAction.count({
      where: { zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    });
    const overdueCapas = await (this.prisma as any).correctiveAction.count({
      where: { zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } },
    });

    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingInspections = await (this.prisma as any).hseInspection.count({
      where: { zoneId, status: 'SCHEDULED', scheduledDate: { gte: now, lte: weekLater } },
    });

    const openIncidents = await (this.prisma as any).hseIncident.count({
      where: { zoneId, status: { notIn: ['CLOSED'] } },
    });

    const highRisks = await (this.prisma as any).riskHazard.count({
      where: { assessment: { zoneId, status: 'APPROVED' }, initialRiskLevel: { in: ['HIGH', 'VERY_HIGH'] } },
    });

    // Training compliance (simplified)
    const totalTrainingPlans = await (this.prisma as any).hseTrainingPlan.count({ where: { zoneId, isActive: true } });
    const trainingCompliance = totalTrainingPlans > 0 ? Math.min(100, Math.round((totalTrainingPlans / Math.max(totalTrainingPlans, 1)) * 100)) : 0;

    const recentIncidents = await (this.prisma as any).hseIncident.findMany({
      where: { zoneId }, orderBy: { occurredAt: 'desc' }, take: 5,
    });

    // Open CAPAs by priority
    const capasByPriority = await (this.prisma as any).correctiveAction.groupBy({
      by: ['priority'], where: { zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    });
    const openCapasByPriority: Record<string, number> = { LOW: 0, NORMAL: 0, HIGH: 0, CRITICAL: 0 };
    for (const g of capasByPriority) openCapasByPriority[g.priority] = g._count;

    // Incident trend (last 12 months)
    const incidentTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = await (this.prisma as any).hseIncident.count({
        where: { zoneId, occurredAt: { gte: mStart, lte: mEnd } },
      });
      incidentTrend.push({ month: mStart.toISOString().substring(0, 7), count });
    }

    const dashboard: HseDashboardDto = {
      daysSinceLastIncident: daysSinceLast, daysSinceLastLTI: daysSinceLastLTI,
      trir, ltifr, nearMissRate,
      openCAPAs: openCapas, overdueCapas, upcomingInspections,
      openIncidents, highRisks, trainingCompliance,
      recentIncidents, openCapasByPriority, incidentTrend,
    };

    await this.redis.set(cacheKey, JSON.stringify(dashboard), 600);
    return dashboard;
  }

  async getCompanyHseProfile(companyId: string, zoneId: string): Promise<CompanyHseProfileDto> {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const now = new Date();

    const incidents = await (this.prisma as any).hseIncident.count({
      where: { companyId, zoneId, occurredAt: { gte: yearStart } },
    });

    const capas = await (this.prisma as any).correctiveAction.count({
      where: { companyId, zoneId, status: { notIn: ['VERIFIED_EFFECTIVE', 'CANCELLED'] } },
    });

    const inspections = await (this.prisma as any).hseInspection.count({
      where: { companyId, zoneId },
    });

    const trir = await this.computeTRIR(zoneId, yearStart.toISOString(), now.toISOString(), companyId);
    const ltifr = await this.computeLTIFR(zoneId, yearStart.toISOString(), now.toISOString(), companyId);

    const hseScore = await this.computeHseScore(companyId, zoneId);

    return {
      company: { id: companyId }, incidents, capas, inspections,
      trir, ltifr, trainingCompliance: 0, openRisks: 0, hseScore,
    };
  }

  async computeHseScore(companyId: string, zoneId: string): Promise<number> {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const now = new Date();

    const incidentCount = await (this.prisma as any).hseIncident.count({
      where: { companyId, zoneId, occurredAt: { gte: yearStart } },
    });

    const overdueCapas = await (this.prisma as any).correctiveAction.count({
      where: { companyId, zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } },
    });

    const inspections = await (this.prisma as any).hseInspection.findMany({
      where: { companyId, zoneId, status: 'COMPLETED' },
    });
    const avgInspectionScore = inspections.length > 0
      ? inspections.reduce((s: number, i: any) => s + Number(i.complianceScore || 0), 0) / inspections.length
      : 0;

    return computeHseScore({ incidentCount, overdueCapas, avgInspectionScore, trainingComplianceRate: 0 });
  }
}
