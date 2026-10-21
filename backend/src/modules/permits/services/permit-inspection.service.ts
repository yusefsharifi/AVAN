import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { CreatePermitInspectionDto } from '../dto/create-inspection.dto';
import { CompleteInspectionDto } from '../dto/complete-inspection.dto';
import { InspectionStatus, ApprovalStatus } from '../dto/create-permit-request.dto';

@Injectable()
export class PermitInspectionService {
  private readonly logger = new Logger(PermitInspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async schedule(dto: CreatePermitInspectionDto, scheduledBy: string, zoneId: string): Promise<any> {
    const inspection = await this.prisma.permitInspection.create({
      data: {
        zoneId,
        permitRequestId: dto.permitRequestId,
        issuedPermitId: dto.issuedPermitId,
        inspectorId: dto.inspectorId,
        inspectorName: dto.inspectorId,
        scheduledAt: new Date(dto.scheduledAt),
      },
    });

    await this.audit.log({
      zoneId,
      userId: scheduledBy,
      targetId: inspection.id,
      targetType: 'PermitInspection',
      action: 'PERMIT_INSPECTION_SCHEDULED',
      metadata: { permitRequestId: dto.permitRequestId, inspectorId: dto.inspectorId },
    });

    return inspection;
  }

  async reschedule(id: string, newDate: string, reason: string): Promise<any> {
    const inspection = await this.findById(id);

    const updated = await this.prisma.permitInspection.update({
      where: { id },
      data: {
        scheduledAt: new Date(newDate),
        status: InspectionStatus.RESCHEDULED,
      },
    });

    return updated;
  }

  async complete(id: string, dto: CompleteInspectionDto, inspectorId: string): Promise<any> {
    const inspection = await this.findById(id);

    if (inspection.status === InspectionStatus.COMPLETED) {
      throw new AppException('INSPECTION_ALREADY_COMPLETED');
    }

    const updated = await this.prisma.permitInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.COMPLETED,
        conductedAt: new Date(),
        result: dto.result,
        findings: dto.findings,
        recommendations: dto.recommendations,
        imageKeys: dto.imageKeys || [],
        nextInspectionAt: dto.nextInspectionAt ? new Date(dto.nextInspectionAt) : null,
      },
    });

    // If PASS: advance permit approval
    if (dto.result === 'PASS' || dto.result === 'PASS_WITH_CONDITIONS') {
      if (inspection.permitRequestId) {
        await this.prisma.permitRequest.update({
          where: { id: inspection.permitRequestId },
          data: { status: 'UNDER_REVIEW' },
        });
      }
    } else if (dto.result === 'FAIL') {
      if (inspection.permitRequestId) {
        await this.prisma.permitRequest.update({
          where: { id: inspection.permitRequestId },
          data: {
            status: 'REJECTED',
            rejectionReason: `بازرسی ناموفق: ${dto.findings}`,
          },
        });
      }
    }

    // If PASS_WITH_CONDITIONS, add conditions
    if (dto.result === 'PASS_WITH_CONDITIONS' && dto.recommendations) {
      if (inspection.permitRequestId) {
        await this.prisma.permitCondition.create({
          data: {
            permitRequestId: inspection.permitRequestId,
            description: dto.recommendations,
            isMandatory: true,
          },
        });
      }
    }

    // Schedule next inspection if provided
    if (dto.nextInspectionAt) {
      await this.prisma.permitInspection.create({
        data: {
          zoneId: inspection.zoneId,
          permitRequestId: inspection.permitRequestId,
          issuedPermitId: inspection.issuedPermitId,
          inspectorId,
          inspectorName: inspectorId,
          scheduledAt: new Date(dto.nextInspectionAt),
        },
      });
    }

    await this.audit.log({
      zoneId: inspection.zoneId,
      userId: inspectorId,
      targetId: id,
      targetType: 'PermitInspection',
      action: 'PERMIT_INSPECTION_COMPLETED',
      metadata: { result: dto.result, permitRequestId: inspection.permitRequestId },
    });

    return updated;
  }

  async cancel(id: string, reason: string): Promise<any> {
    const inspection = await this.findById(id);

    if (inspection.status === InspectionStatus.COMPLETED) {
      throw new AppException('INSPECTION_CANNOT_CANCEL');
    }

    const updated = await this.prisma.permitInspection.update({
      where: { id },
      data: { status: InspectionStatus.CANCELLED },
    });

    await this.audit.log({
      zoneId: inspection.zoneId,
      targetId: id,
      targetType: 'PermitInspection',
      action: 'PERMIT_INSPECTION_CANCELLED',
      metadata: { reason },
    });

    return updated;
  }

  async getByPermit(permitRequestId?: string, issuedPermitId?: string): Promise<any[]> {
    const where: any = {};
    if (permitRequestId) where.permitRequestId = permitRequestId;
    if (issuedPermitId) where.issuedPermitId = issuedPermitId;

    return this.prisma.permitInspection.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getInspectorSchedule(inspectorId: string, fromDate: string, toDate: string): Promise<any[]> {
    return this.prisma.permitInspection.findMany({
      where: {
        inspectorId,
        scheduledAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
        status: { not: InspectionStatus.CANCELLED },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        permitRequest: { select: { requestNumber: true, title: true } },
        issuedPermit: { select: { permitNumber: true, title: true } },
      },
    });
  }

  private async findById(id: string): Promise<any> {
    const inspection = await this.prisma.permitInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new AppException('INSPECTION_NOT_FOUND');
    }

    return inspection;
  }
}
