import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CreateInspectionDto, SubmitInspectionResultsDto, AddFindingDto,
  CreateChecklistDto, ChecklistResultItemDto,
} from '../dto/create-dtos';
import type { ComplianceTrendDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';
import { computeComplianceScore, getDefaultChecklistItems } from '../utils/hse.utils';

@Injectable()
export class HseInspectionService {
  private readonly logger = new Logger(HseInspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async schedule(dto: CreateInspectionDto, scheduledBy: string): Promise<any> {
    const year = new Date().getFullYear().toString();
    const seqKey = `hse:inspection:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const inspectionNumber = `INS-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

    let totalItems = 0;
    if (dto.checklistId) {
      const checklist = await (this.prisma as any).hseChecklist.findUnique({ where: { id: dto.checklistId } });
      if (checklist) totalItems = (checklist.items as any[])?.length || 0;
    }

    const inspection = await (this.prisma as any).hseInspection.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, inspectionNumber,
        type: dto.type, category: dto.category, title: dto.title,
        status: 'SCHEDULED', inspectorId: dto.inspectorId, inspectorName: dto.inspectorName,
        companyContact: dto.companyContact, scheduledDate: new Date(dto.scheduledDate),
        location: dto.location, block: dto.block, checklistId: dto.checklistId,
        totalItems, createdBy: scheduledBy,
      },
    });

    this.gateway.emitInspectionScheduled({
      inspectorId: dto.inspectorId, companyId: dto.companyId,
      inspectionId: inspection.id, inspectionNumber, type: dto.type,
      scheduledDate: new Date(dto.scheduledDate), location: dto.location,
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: scheduledBy, targetId: inspection.id, targetType: 'HseInspection',
      action: 'INSPECTION_SCHEDULED', metadata: { inspectionNumber, type: dto.type },
    });

    return inspection;
  }

  async start(id: string, startedBy: string): Promise<any> {
    const insp = await this.findById(id);
    if (insp.status !== 'SCHEDULED') throw new AppException('INSPECTION_INVALID_STATUS');

    return (this.prisma as any).hseInspection.update({
      where: { id }, data: { status: 'IN_PROGRESS', conductedAt: new Date() },
    });
  }

  async submitResults(id: string, dto: SubmitInspectionResultsDto, submittedBy: string): Promise<any> {
    const insp = await this.findById(id);

    let passedItems = 0, failedItems = 0, naItems = 0, observationItems = 0;
    for (const item of dto.checklistResults) {
      switch (item.result) {
        case 'PASS': passedItems++; break;
        case 'FAIL': failedItems++; break;
        case 'NA': naItems++; break;
        case 'OBS': observationItems++; break;
      }
    }

    const complianceScore = computeComplianceScore(passedItems, insp.totalItems, naItems);

    const updated = await (this.prisma as any).hseInspection.update({
      where: { id },
      data: {
        status: 'COMPLETED', completedAt: new Date(),
        checklistResults: dto.checklistResults, reportNotes: dto.reportNotes,
        passedItems, failedItems, naItems, observationItems,
        complianceScore,
      },
    });

    // Save findings
    for (const findingDto of dto.findings) {
      await (this.prisma as any).inspectionFinding.create({
        data: {
          inspectionId: id, severity: findingDto.severity, category: findingDto.category,
          description: findingDto.description, location: findingDto.location,
          imageKeys: findingDto.imageKeys || [], recommendation: findingDto.recommendation,
          status: 'OPEN',
        },
      });
    }

    // Auto-create CAPA for CRITICAL findings
    const criticalFindings = dto.findings.filter(f => f.severity === 'CRITICAL');
    this.gateway.emitInspectionCompleted({
      zoneId: insp.zoneId, companyId: insp.companyId, inspectionId: id,
      complianceScore, findingsCount: dto.findings.length,
      criticalFindings: criticalFindings.length,
    });

    await this.audit.log({
      zoneId: insp.zoneId, userId: submittedBy, targetId: id, targetType: 'HseInspection',
      action: 'INSPECTION_COMPLETED',
      metadata: { inspectionNumber: insp.inspectionNumber, complianceScore, findingsCount: dto.findings.length },
    });

    return updated;
  }

  async cancel(id: string, reason: string): Promise<any> {
    return (this.prisma as any).hseInspection.update({
      where: { id }, data: { status: 'CANCELLED' },
    });
  }

  async reschedule(id: string, newDate: Date): Promise<any> {
    return (this.prisma as any).hseInspection.update({
      where: { id }, data: { status: 'RESCHEDULED', scheduledDate: newDate },
    });
  }

  async addFinding(inspectionId: string, dto: AddFindingDto, addedBy: string): Promise<any> {
    const finding = await (this.prisma as any).inspectionFinding.create({
      data: {
        inspectionId, severity: dto.severity, category: dto.category,
        description: dto.description, location: dto.location,
        imageKeys: dto.imageKeys || [], recommendation: dto.recommendation, status: 'OPEN',
      },
    });

    await this.audit.log({
      zoneId: '', userId: addedBy, targetId: finding.id, targetType: 'InspectionFinding',
      action: 'FINDING_ADDED', metadata: { inspectionId, severity: dto.severity },
    });

    return finding;
  }

  async resolveFinding(findingId: string, resolvedBy: string, notes?: string): Promise<any> {
    return (this.prisma as any).inspectionFinding.update({
      where: { id: findingId }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy },
    });
  }

  async findAll(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId };
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;

    const limit = filter?.limit || 20;
    const data = await (this.prisma as any).hseInspection.findMany({
      where, orderBy: { scheduledDate: 'desc' }, take: limit + 1,
      include: { findings: true },
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const insp = await (this.prisma as any).hseInspection.findUnique({
      where: { id }, include: { findings: true, correctiveActions: true },
    });
    if (!insp) throw new AppException('INSPECTION_NOT_FOUND');
    return insp;
  }

  async getUpcomingInspections(zoneId: string, withinDays: number): Promise<any[]> {
    const target = new Date();
    target.setDate(target.getDate() + withinDays);
    return (this.prisma as any).hseInspection.findMany({
      where: { zoneId, status: 'SCHEDULED', scheduledDate: { gte: new Date(), lte: target } },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async getComplianceTrend(zoneId: string, months: number): Promise<ComplianceTrendDto[]> {
    const results: ComplianceTrendDto[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const inspections = await (this.prisma as any).hseInspection.findMany({
        where: { zoneId, status: 'COMPLETED', completedAt: { gte: monthStart, lte: monthEnd } },
      });

      const avgScore = inspections.length > 0
        ? inspections.reduce((sum: number, i: any) => sum + Number(i.complianceScore || 0), 0) / inspections.length
        : 0;

      results.push({
        month: monthStart.toISOString().substring(0, 7),
        avgScore: Math.round(avgScore * 100) / 100,
        inspectionCount: inspections.length,
      });
    }

    return results;
  }

  // CHECKLIST MANAGEMENT
  async createChecklist(dto: CreateChecklistDto): Promise<any> {
    return (this.prisma as any).hseChecklist.create({
      data: {
        zoneId: dto.zoneId, code: dto.code, nameFa: dto.nameFa,
        type: dto.type, items: dto.items, createdBy: 'system',
      },
    });
  }

  async getChecklist(code: string): Promise<any> {
    const cl = await (this.prisma as any).hseChecklist.findUnique({ where: { code } });
    if (!cl) throw new AppException('CHECKLIST_NOT_FOUND');
    return cl;
  }

  async getChecklists(zoneId?: string, type?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (zoneId) where.OR = [{ zoneId }, { zoneId: null }];
    if (type) where.type = type;
    return (this.prisma as any).hseChecklist.findMany({ where });
  }

  async seedDefaultChecklists(zoneId?: string): Promise<void> {
    const types = ['GENERAL_HSE', 'FIRE_SAFETY', 'HAZMAT'];
    for (const type of types) {
      const code = `STD-${type}`;
      const existing = await (this.prisma as any).hseChecklist.findUnique({ where: { code } });
      if (!existing) {
        const items = getDefaultChecklistItems(type);
        await (this.prisma as any).hseChecklist.create({
          data: { zoneId: zoneId || null, code, nameFa: `چک‌لیست استاندارد ${type}`, type, items, createdBy: 'system' },
        });
      }
    }
  }
}
