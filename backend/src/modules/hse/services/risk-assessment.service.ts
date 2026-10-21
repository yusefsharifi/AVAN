import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateRiskAssessmentDto } from '../dto/create-dtos';
import type { RiskMatrixDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';
import { computeRiskScore, determineRiskLevel, buildRiskMatrix } from '../utils/hse.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async create(dto: CreateRiskAssessmentDto, createdBy: string): Promise<any> {
    const year = new Date().getFullYear().toString();
    const seqKey = `hse:ra:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const assessmentNumber = `RA-${zoneCode}-${year}-${seq.toString().padStart(4, '0')}`;

    const assessment = await (this.prisma as any).riskAssessment.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, assessmentNumber,
        title: dto.title, area: dto.area, activity: dto.activity,
        assessedBy: createdBy, assessedByName: createdBy,
        status: 'DRAFT', validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        notes: dto.notes,
      },
    });

    for (const h of dto.hazards) {
      const score = computeRiskScore(h.initialLikelihood, h.initialSeverity);
      const level = determineRiskLevel(score);

      const residualScore = (h.residualLikelihood && h.residualSeverity)
        ? computeRiskScore(h.residualLikelihood, h.residualSeverity) : null;
      const residualLevel = residualScore ? determineRiskLevel(residualScore) : null;

      await (this.prisma as any).riskHazard.create({
        data: {
          assessmentId: assessment.id, hazardDescription: h.hazardDescription,
          hazardType: h.hazardType, affectedPersons: h.affectedPersons,
          initialLikelihood: h.initialLikelihood, initialSeverity: h.initialSeverity,
          initialRiskScore: score, initialRiskLevel: level,
          existingControls: h.existingControls, additionalControls: h.additionalControls || [],
          residualLikelihood: h.residualLikelihood, residualSeverity: h.residualSeverity,
          residualRiskScore: residualScore, residualRiskLevel: residualLevel,
          actionRequired: h.actionRequired || false, actionOwner: h.actionOwner,
          actionDue: h.actionDue ? new Date(h.actionDue) : null,
        },
      });
    }

    // Emit for high risks
    const hazards = await (this.prisma as any).riskHazard.findMany({ where: { assessmentId: assessment.id } });
    for (const hz of hazards) {
      if (hz.initialRiskLevel === 'HIGH' || hz.initialRiskLevel === 'VERY_HIGH') {
        this.gateway.emitRiskHighDetected({
          zoneId: dto.zoneId, assessmentId: assessment.id,
          hazardDescription: hz.hazardDescription, riskLevel: hz.initialRiskLevel, location: dto.area,
        });
      }
    }

    await this.audit.log({
      zoneId: dto.zoneId, userId: createdBy, targetId: assessment.id, targetType: 'RiskAssessment',
      action: 'RISK_ASSESSMENT_CREATED',
      metadata: { assessmentNumber, title: dto.title, hazardCount: dto.hazards.length },
    });

    return assessment;
  }

  async approve(id: string, approvedBy: string): Promise<any> {
    const ra = await this.findById(id);
    const updated = await (this.prisma as any).riskAssessment.update({
      where: { id }, data: { status: 'APPROVED', approvedBy },
    });

    await this.audit.log({
      zoneId: ra.zoneId, userId: approvedBy, targetId: id, targetType: 'RiskAssessment',
      action: 'RISK_ASSESSMENT_APPROVED', metadata: { assessmentNumber: ra.assessmentNumber },
    });

    return updated;
  }

  async review(id: string, reviewedBy: string, comments?: string): Promise<any> {
    return (this.prisma as any).riskAssessment.update({
      where: { id }, data: { status: 'UNDER_REVIEW', reviewedBy },
    });
  }

  async expire(id: string): Promise<any> {
    const updated = await (this.prisma as any).riskAssessment.update({
      where: { id }, data: { status: 'EXPIRED' },
    });

    await this.audit.log({
      zoneId: updated.zoneId, userId: 'system', targetId: id, targetType: 'RiskAssessment',
      action: 'RISK_ASSESSMENT_EXPIRED', metadata: { assessmentNumber: updated.assessmentNumber },
    });

    return updated;
  }

  async updateHazardControls(hazardId: string, residualLikelihood: number, residualSeverity: number, controls: string[]): Promise<any> {
    const score = computeRiskScore(residualLikelihood, residualSeverity);
    const level = determineRiskLevel(score);

    return (this.prisma as any).riskHazard.update({
      where: { id: hazardId },
      data: {
        residualLikelihood, residualSeverity, residualRiskScore: score, residualRiskLevel: level,
        additionalControls: controls,
      },
    });
  }

  async findAll(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId };
    if (filter?.status) where.status = filter.status;
    if (filter?.companyId) where.companyId = filter.companyId;

    const limit = filter?.limit || 20;
    const data = await (this.prisma as any).riskAssessment.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit + 1,
      include: { hazards: true },
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const ra = await (this.prisma as any).riskAssessment.findUnique({
      where: { id }, include: { hazards: true },
    });
    if (!ra) throw new AppException('RISK_ASSESSMENT_NOT_FOUND');
    return ra;
  }

  async getHighRisks(zoneId: string): Promise<any[]> {
    return (this.prisma as any).riskHazard.findMany({
      where: { assessment: { zoneId, status: 'APPROVED' }, initialRiskLevel: { in: ['HIGH', 'VERY_HIGH'] } },
      include: { assessment: true },
    });
  }

  async getRiskMatrix(zoneId: string): Promise<RiskMatrixDto> {
    const hazards = await (this.prisma as any).riskHazard.findMany({
      where: { assessment: { zoneId, status: 'APPROVED' } },
    });

    const { matrix, distribution } = buildRiskMatrix(
      hazards.map((h: any) => ({ initialLikelihood: h.initialLikelihood, initialSeverity: h.initialSeverity }))
    );

    const highRiskHazards = hazards.filter((h: any) => h.initialRiskLevel === 'HIGH' || h.initialRiskLevel === 'VERY_HIGH');

    return { matrix, highRiskHazards, distribution };
  }

  async checkExpiry(zoneId: string): Promise<void> {
    const expired = await (this.prisma as any).riskAssessment.findMany({
      where: { zoneId, status: 'APPROVED', validUntil: { lt: new Date() } },
    });

    for (const ra of expired) {
      await this.expire(ra.id);
    }
  }
}
