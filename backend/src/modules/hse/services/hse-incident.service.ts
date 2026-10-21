import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ReportIncidentDto, InvestigateIncidentDto, FilterIncidentsDto } from '../dto/create-dtos';
import type { IncidentStatsDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';
import * as crypto from 'crypto';

@Injectable()
export class HseIncidentService {
  private readonly logger = new Logger(HseIncidentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async report(dto: ReportIncidentDto, reportedBy: string): Promise<any> {
    // 1. Generate incident number
    const year = new Date().getFullYear().toString();
    const seqKey = `hse:incident:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const incidentNumber = `INC-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

    // 2. Create incident
    const incident = await (this.prisma as any).hseIncident.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        incidentNumber,
        type: dto.type,
        category: dto.category,
        severity: dto.severity,
        status: 'REPORTED',
        location: dto.location,
        block: dto.block,
        unit: dto.unit,
        occurredAt: new Date(dto.occurredAt),
        reportedBy,
        reportedByName: reportedBy,
        injuredPersonName: dto.injuredPersonName,
        injuredPersonRole: dto.injuredPersonRole,
        injuredPersonCompany: dto.injuredPersonCompany,
        witnessNames: dto.witnessNames || [],
        firstAidGiven: dto.firstAidGiven || false,
        firstAidBy: dto.firstAidBy,
        hospitalRequired: dto.hospitalRequired || false,
        hospitalName: dto.hospitalName,
        description: dto.description,
        immediateActions: dto.immediateActions,
        hazmatInvolved: dto.hazmatInvolved || false,
        hazmatType: dto.hazmatType,
        propertyDamage: dto.propertyDamage || false,
        propertyDamageValue: dto.propertyDamageValue ? BigInt(dto.propertyDamageValue) : null,
        environmentalImpact: dto.environmentalImpact || false,
        environmentalDetails: dto.environmentalDetails,
        isLostTime: dto.isLostTime || false,
        lostTimeDays: dto.lostTimeDays || 0,
        isWorkRelated: dto.isWorkRelated !== false,
        imageKeys: dto.imageKeys || [],
        notes: dto.notes,
        createdBy: reportedBy,
      },
    });

    // 3. Emit socket event
    this.gateway.emitIncidentReported({
      zoneId: dto.zoneId, incidentId: incident.id, incidentNumber,
      type: dto.type, severity: dto.severity, location: dto.location,
      occurredAt: new Date(dto.occurredAt), reportedByName: reportedBy,
    });

    // 4. For CRITICAL/MAJOR severity: emit critical event
    if (dto.severity === 'CATASTROPHIC' || dto.severity === 'MAJOR') {
      this.gateway.emitIncidentCritical({
        zoneId: dto.zoneId, incidentId: incident.id,
        type: dto.type, severity: dto.severity, location: dto.location,
      });
    }

    // 5. Audit
    await this.audit.log({
      zoneId: dto.zoneId, userId: reportedBy, targetId: incident.id, targetType: 'HseIncident',
      action: 'INCIDENT_REPORTED',
      metadata: { incidentNumber, type: dto.type, severity: dto.severity, category: dto.category },
    });

    return incident;
  }

  async assignInvestigator(incidentId: string, investigatorId: string, assignedBy: string): Promise<any> {
    const incident = await this.findById(incidentId);

    const updated = await (this.prisma as any).hseIncident.update({
      where: { id: incidentId },
      data: { investigatorId, status: 'UNDER_INVESTIGATION' },
    });

    await this.audit.log({
      zoneId: incident.zoneId, userId: assignedBy, targetId: incidentId, targetType: 'HseIncident',
      action: 'INCIDENT_INVESTIGATOR_ASSIGNED',
      metadata: { incidentNumber: incident.incidentNumber, investigatorId },
    });

    return updated;
  }

  async submitInvestigation(dto: InvestigateIncidentDto, submittedBy: string): Promise<any> {
    const incident = await this.findById(dto.incidentId);

    const updated = await (this.prisma as any).hseIncident.update({
      where: { id: dto.incidentId },
      data: {
        status: 'INVESTIGATION_COMPLETE',
        rootCause: dto.rootCause,
        rootCauseCategory: dto.rootCauseCategory,
        contributingFactors: dto.contributingFactors || [],
        investigationReport: dto.investigationReport,
        investigationImageKeys: dto.investigationImageKeys || [],
        investigatedAt: new Date(),
      },
    });

    // Create CAPA records
    for (const capaDto of dto.correctiveActions) {
      const year = new Date().getFullYear().toString();
      const seqKey = `hse:capa:seq:${capaDto.zoneId}:${year}`;
      const seq = await this.redis.incr(seqKey);
      const zone = await this.prisma.zone.findUnique({ where: { id: capaDto.zoneId } });
      const zoneCode = (zone as any)?.code || 'Z';
      const actionNumber = `CAPA-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

      await (this.prisma as any).correctiveAction.create({
        data: {
          incidentId: dto.incidentId,
          zoneId: capaDto.zoneId,
          companyId: capaDto.companyId,
          actionNumber,
          type: capaDto.type,
          title: capaDto.title,
          description: capaDto.description,
          priority: capaDto.priority,
          status: 'OPEN',
          assignedTo: capaDto.assignedTo,
          assignedToName: capaDto.assignedToName,
          assignedByName: submittedBy,
          dueDate: new Date(capaDto.dueDate),
          createdBy: submittedBy,
        },
      });
    }

    // If CAPAs created, update incident status
    if (dto.correctiveActions.length > 0) {
      await (this.prisma as any).hseIncident.update({
        where: { id: dto.incidentId },
        data: { status: 'CAPA_IN_PROGRESS' },
      });
    }

    await this.audit.log({
      zoneId: incident.zoneId, userId: submittedBy, targetId: dto.incidentId, targetType: 'HseIncident',
      action: 'INCIDENT_INVESTIGATION_SUBMITTED',
      metadata: { incidentNumber: incident.incidentNumber, rootCauseCategory: dto.rootCauseCategory, capaCount: dto.correctiveActions.length },
    });

    return updated;
  }

  async close(incidentId: string, closedBy: string, closureNotes: string): Promise<any> {
    const incident = await this.findById(incidentId);

    // Check for open CAPAs
    const openCapas = await (this.prisma as any).correctiveAction.findMany({
      where: { incidentId, status: { notIn: ['VERIFIED_EFFECTIVE', 'CANCELLED'] } },
    });

    if (openCapas.length > 0) {
      throw new AppException('INCIDENT_OPEN_CAPAS_EXIST');
    }

    const updated = await (this.prisma as any).hseIncident.update({
      where: { id: incidentId },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy, closureNotes },
    });

    await this.audit.log({
      zoneId: incident.zoneId, userId: closedBy, targetId: incidentId, targetType: 'HseIncident',
      action: 'INCIDENT_CLOSED', metadata: { incidentNumber: incident.incidentNumber },
    });

    return updated;
  }

  async findAll(filter: FilterIncidentsDto): Promise<any> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.type) where.type = filter.type;
    if (filter.severity) where.severity = filter.severity;
    if (filter.status) where.status = filter.status;
    if (filter.isLostTime !== undefined) where.isLostTime = filter.isLostTime;
    if (filter.hazmatInvolved !== undefined) where.hazmatInvolved = filter.hazmatInvolved;
    if (filter.fromDate || filter.toDate) {
      where.occurredAt = {};
      if (filter.fromDate) where.occurredAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.occurredAt.lte = new Date(filter.toDate);
    }
    if (filter.search) {
      where.OR = [
        { incidentNumber: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { location: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;
    const data = await (this.prisma as any).hseIncident.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const incident = await (this.prisma as any).hseIncident.findUnique({
      where: { id },
      include: { correctiveActions: true },
    });
    if (!incident) throw new AppException('INCIDENT_NOT_FOUND');
    return incident;
  }

  async uploadImage(incidentId: string, file: Express.Multer.File): Promise<string> {
    const incident = await this.findById(incidentId);
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `hse-incidents/${incidentId}/${crypto.randomUUID()}.${ext}`;
    await (this.prisma as any).hseIncident.update({
      where: { id: incidentId },
      data: { imageKeys: { push: key } },
    });
    return key;
  }

  async reportToAuthority(incidentId: string, reportedBy: string, refNumber?: string): Promise<any> {
    const incident = await this.findById(incidentId);
    const updated = await (this.prisma as any).hseIncident.update({
      where: { id: incidentId },
      data: { reportedToAuthority: true, authorityReportDate: new Date(), authorityRefNumber: refNumber },
    });

    await this.audit.log({
      zoneId: incident.zoneId, userId: reportedBy, targetId: incidentId, targetType: 'HseIncident',
      action: 'INCIDENT_REPORTED_TO_AUTHORITY',
      metadata: { incidentNumber: incident.incidentNumber, refNumber },
    });

    return updated;
  }

  async getIncidentStats(zoneId: string, fromDate: string, toDate: string, companyId?: string): Promise<IncidentStatsDto> {
    const where: any = { zoneId, occurredAt: { gte: new Date(fromDate), lte: new Date(toDate) } };
    if (companyId) where.companyId = companyId;

    const incidents = await (this.prisma as any).hseIncident.findMany({ where });

    const byTypeMap = new Map<string, number>();
    const bySeverityMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    const byMonthMap = new Map<string, number>();
    const byCompanyMap = new Map<string, number>();

    let lostTimeIncidents = 0;
    let totalLostDays = 0;
    let nearMisses = 0;
    let hazmatIncidents = 0;
    let totalPropertyDamageCost = 0;

    for (const inc of incidents) {
      byTypeMap.set(inc.type, (byTypeMap.get(inc.type) || 0) + 1);
      bySeverityMap.set(inc.severity, (bySeverityMap.get(inc.severity) || 0) + 1);
      byCategoryMap.set(inc.category, (byCategoryMap.get(inc.category) || 0) + 1);

      const month = inc.occurredAt.toISOString().substring(0, 7);
      byMonthMap.set(month, (byMonthMap.get(month) || 0) + 1);

      if (inc.companyId) byCompanyMap.set(inc.companyId, (byCompanyMap.get(inc.companyId) || 0) + 1);

      if (inc.isLostTime) { lostTimeIncidents++; totalLostDays += inc.lostTimeDays; }
      if (inc.type === 'NEAR_MISS') nearMisses++;
      if (inc.hazmatInvolved) hazmatIncidents++;
      if (inc.propertyDamageValue) totalPropertyDamageCost += Number(inc.propertyDamageValue);
    }

    return {
      total: incidents.length,
      byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
      bySeverity: Array.from(bySeverityMap.entries()).map(([severity, count]) => ({ severity, count })),
      byCategory: Array.from(byCategoryMap.entries()).map(([category, count]) => ({ category, count })),
      lostTimeIncidents, totalLostDays, nearMisses, hazmatIncidents, totalPropertyDamageCost,
      byMonth: Array.from(byMonthMap.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
      byCompany: Array.from(byCompanyMap.entries()).map(([companyId, count]) => ({ companyId, count })),
    };
  }
}
