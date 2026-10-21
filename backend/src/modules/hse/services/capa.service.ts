import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateCapaDto, CompleteCapaDto, VerifyCapaDto, FilterCapaDto } from '../dto/create-dtos';
import type { CapaStatsDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';

@Injectable()
export class CapaService {
  private readonly logger = new Logger(CapaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async create(dto: CreateCapaDto, createdBy: string, createdByName: string): Promise<any> {
    const year = new Date().getFullYear().toString();
    const seqKey = `hse:capa:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const actionNumber = `CAPA-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

    const capa = await (this.prisma as any).correctiveAction.create({
      data: {
        incidentId: dto.incidentId, inspectionId: dto.inspectionId, riskId: dto.riskId,
        zoneId: dto.zoneId, companyId: dto.companyId, actionNumber,
        type: dto.type, title: dto.title, description: dto.description,
        priority: dto.priority, status: 'OPEN',
        assignedTo: dto.assignedTo, assignedToName: dto.assignedToName,
        assignedByName: createdByName, dueDate: new Date(dto.dueDate),
        createdBy,
      },
    });

    this.gateway.emitCapaAssigned({
      assignedTo: dto.assignedTo, capaId: capa.id, actionNumber,
      title: dto.title, priority: dto.priority, dueDate: new Date(dto.dueDate),
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: createdBy, targetId: capa.id, targetType: 'CorrectiveAction',
      action: 'CAPA_CREATED', metadata: { actionNumber, title: dto.title, type: dto.type, priority: dto.priority },
    });

    return capa;
  }

  async startWork(id: string, startedBy: string): Promise<any> {
    const capa = await this.findById(id);
    if (capa.status !== 'OPEN') throw new AppException('CAPA_INVALID_STATUS');

    return (this.prisma as any).correctiveAction.update({
      where: { id }, data: { status: 'IN_PROGRESS' },
    });
  }

  async complete(id: string, dto: CompleteCapaDto, completedBy: string): Promise<any> {
    const capa = await this.findById(id);
    if (capa.status !== 'IN_PROGRESS') throw new AppException('CAPA_INVALID_STATUS');

    const updated = await (this.prisma as any).correctiveAction.update({
      where: { id },
      data: {
        status: 'COMPLETED_PENDING_VERIFICATION',
        completedAt: new Date(), completedBy, completionNotes: dto.completionNotes,
        evidenceKeys: dto.evidenceKeys || [],
      },
    });

    await this.audit.log({
      zoneId: capa.zoneId, userId: completedBy, targetId: id, targetType: 'CorrectiveAction',
      action: 'CAPA_COMPLETED', metadata: { actionNumber: capa.actionNumber },
    });

    return updated;
  }

  async verify(id: string, dto: VerifyCapaDto, verifiedBy: string): Promise<any> {
    const capa = await this.findById(id);
    if (capa.status !== 'COMPLETED_PENDING_VERIFICATION') throw new AppException('CAPA_INVALID_STATUS');

    const newStatus = dto.isEffective ? 'VERIFIED_EFFECTIVE' : 'VERIFIED_INEFFECTIVE';

    const updated = await (this.prisma as any).correctiveAction.update({
      where: { id },
      data: { status: newStatus, verifiedAt: new Date(), verifiedBy, verificationNotes: dto.verificationNotes, isEffective: dto.isEffective },
    });

    const action = dto.isEffective ? 'CAPA_VERIFIED_EFFECTIVE' : 'CAPA_VERIFIED_INEFFECTIVE';
    await this.audit.log({
      zoneId: capa.zoneId, userId: verifiedBy, targetId: id, targetType: 'CorrectiveAction',
      action, metadata: { actionNumber: capa.actionNumber, isEffective: dto.isEffective },
    });

    return updated;
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const capa = await this.findById(id);
    return (this.prisma as any).correctiveAction.update({
      where: { id }, data: { status: 'CANCELLED', completionNotes: reason },
    });
  }

  async findAll(filter: FilterCapaDto): Promise<any> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;
    if (filter.overdue) { where.status = { in: ['OPEN', 'IN_PROGRESS'] }; where.dueDate = { lt: new Date() }; }

    const limit = filter.limit || 20;
    const data = await (this.prisma as any).correctiveAction.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const capa = await (this.prisma as any).correctiveAction.findUnique({ where: { id } });
    if (!capa) throw new AppException('CAPA_NOT_FOUND');
    return capa;
  }

  async getMyActions(userId: string, zoneId: string): Promise<any[]> {
    return (this.prisma as any).correctiveAction.findMany({
      where: { assignedTo: userId, zoneId, status: { notIn: ['VERIFIED_EFFECTIVE', 'CANCELLED'] } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueCAPAs(zoneId: string): Promise<any[]> {
    return (this.prisma as any).correctiveAction.findMany({
      where: { zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async checkAndMarkOverdue(zoneId: string): Promise<void> {
    const overdue = await (this.prisma as any).correctiveAction.findMany({
      where: { zoneId, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } },
    });

    for (const capa of overdue) {
      await (this.prisma as any).correctiveAction.update({
        where: { id: capa.id }, data: { status: 'OVERDUE' },
      });

      const overdueDays = Math.ceil((Date.now() - new Date(capa.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      this.gateway.emitCapaOverdue({
        zoneId, assignedTo: capa.assignedTo, capaId: capa.id, actionNumber: capa.actionNumber,
        title: capa.title, dueDate: capa.dueDate, overdueDays,
      });
    }
  }

  async getCapaStats(zoneId: string): Promise<CapaStatsDto> {
    const all = await (this.prisma as any).correctiveAction.findMany({ where: { zoneId } });
    const total = all.length;
    const open = all.filter((c: any) => c.status === 'OPEN').length;
    const inProgress = all.filter((c: any) => c.status === 'IN_PROGRESS').length;
    const completed = all.filter((c: any) => c.status === 'COMPLETED_PENDING_VERIFICATION').length;
    const verified = all.filter((c: any) => c.status === 'VERIFIED_EFFECTIVE').length;
    const overdue = all.filter((c: any) => c.status === 'OVERDUE').length;

    const completedWithDays = all.filter((c: any) => c.completedAt);
    const avgCompletionDays = completedWithDays.length > 0
      ? Math.round(completedWithDays.reduce((sum: number, c: any) => {
          const days = (new Date(c.completedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedWithDays.length)
      : 0;

    const effectivenessRate = verified > 0
      ? Math.round((all.filter((c: any) => c.status === 'VERIFIED_EFFECTIVE').length / verified) * 100)
      : 0;

    return { total, open, inProgress, completed, verified, overdue, overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0, avgCompletionDays, effectivenessRate };
  }
}
