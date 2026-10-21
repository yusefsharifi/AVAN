import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { IssuePermitDto } from '../dto/issue-permit.dto';
import { SuspendPermitDto } from '../dto/suspend-permit.dto';
import { RenewPermitDto } from '../dto/renew-permit.dto';
import { FulfillConditionDto } from '../dto/fulfill-condition.dto';
import { FilterIssuedPermitsDto } from '../dto/filter-permits.dto';
import { IssuedPermitStatus, PermitType } from '../dto/create-permit-request.dto';
import { PERMIT_TYPE_CONFIG } from '../config/permit-type.config';
import { notify } from '../../notifications/utils/notify.helper';

@Injectable()
export class IssuedPermitService {
  private readonly logger = new Logger(IssuedPermitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async issue(dto: IssuePermitDto, issuedBy: string, zoneId: string): Promise<any> {
    // 1. Find PermitRequest, verify APPROVED
    const request = await this.prisma.permitRequest.findUnique({
      where: { id: dto.requestId },
      include: { company: true, zone: true },
    });

    if (!request) {
      throw new AppException('PERMIT_REQUEST_NOT_FOUND');
    }

    if (request.status !== 'APPROVED' && request.status !== 'CONDITIONALLY_APPROVED') {
      throw new AppException('PERMIT_INVALID_STATUS');
    }

    // 2. Generate permit number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.permitIssuedSeq(zoneId, year);
    const seq = await this.redis.incr(seqKey);
    const config = PERMIT_TYPE_CONFIG[request.type as PermitType];
    const abbrev = config.abbreviation;
    const permitNumber = `PRM-${abbrev}-${year}-${seq.toString().padStart(5, '0')}`;

    // 3. Generate QR hash
    const qrHash = createHash('sha256')
      .update(`${permitNumber}${new Date().toISOString()}${zoneId}`)
      .digest('hex');

    // 4. Set verifyUrl
    const verifyUrl = `https://idop.ir/verify?mode=permit&hash=${qrHash}`;

    // 5. Copy conditions from request
    const requestConditions = await this.prisma.permitCondition.findMany({
      where: { permitRequestId: dto.requestId },
    });

    // 6. Create IssuedPermit
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);

    const issuedPermit = await this.prisma.issuedPermit.create({
      data: {
        zoneId,
        companyId: request.companyId,
        permitNumber,
        requestId: dto.requestId,
        type: request.type as PermitType,
        subType: request.subType,
        title: request.title,
        validFrom,
        validUntil,
        isIndefinite: dto.isIndefinite || false,
        locationDescription: request.locationDescription,
        locationBlock: request.locationBlock,
        locationUnit: request.locationUnit,
        affectedArea: request.affectedArea,
        allowedActivities: dto.allowedActivities || [],
        holderName: request.company.nameFa,
        holderNationalId: request.company.nationalId,
        holderPhone: request.company.phone,
        responsibleName: request.responsibleName,
        responsiblePhone: request.responsiblePhone,
        issuedBy,
        issuedByName: issuedBy,
        signatoryName: dto.signatoryName,
        signatoryRole: dto.signatoryRole,
        qrHash,
        verifyUrl,
        notes: dto.notes,
      },
    });

    // 7. Update PermitRequest
    await this.prisma.permitRequest.update({
      where: { id: dto.requestId },
      data: {
        status: 'ISSUED',
        issuedPermitId: issuedPermit.id,
      },
    });

    // 8. Create AuditLog
    await this.audit.log({
      zoneId,
      userId: issuedBy,
      targetId: issuedPermit.id,
      targetType: 'IssuedPermit',
      action: 'PERMIT_ISSUED',
      metadata: { permitNumber, type: request.type, companyId: request.companyId },
    });

    // Notify company admin that permit has been issued
    notify.permitIssued({
      id: issuedPermit.id, zoneId, companyId: request.companyId,
      permitNumber, type: request.type,
    }).catch(() => {});

    return issuedPermit;
  }

  async findAll(filter: FilterIssuedPermitsDto): Promise<{ data: any[]; meta: any }> {
    const where: any = {};

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    if (filter.expiringWithin30Days) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.validUntil = { lte: thirtyDaysFromNow };
      where.status = 'ACTIVE';
    }

    if (filter.search) {
      where.OR = [
        { permitNumber: { contains: filter.search, mode: 'insensitive' } },
        { title: { contains: filter.search, mode: 'insensitive' } },
        { holderName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;

    const data = await this.prisma.issuedPermit.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: {
        conditions: true,
        attachments: true,
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string, zoneId?: string): Promise<any> {
    const where: any = { id };
    if (zoneId) where.zoneId = zoneId;

    const permit = await this.prisma.issuedPermit.findFirst({
      where,
      include: {
        conditions: true,
        attachments: true,
        inspections: true,
        request: true,
      },
    });

    if (!permit) {
      throw new AppException('PERMIT_NOT_FOUND');
    }

    return permit;
  }

  async findByPermitNumber(permitNumber: string, zoneId: string): Promise<any> {
    const permit = await this.prisma.issuedPermit.findFirst({
      where: { permitNumber, zoneId },
      include: { conditions: true },
    });

    if (!permit) {
      throw new AppException('PERMIT_NOT_FOUND');
    }

    return permit;
  }

  async verifyByQrHash(qrHash: string): Promise<any> {
    // Check cache
    const cacheKey = REDIS_KEYS.permitVerify(qrHash);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const permit = await this.prisma.issuedPermit.findFirst({
      where: { qrHash },
      include: {
        conditions: true,
        company: { select: { nameFa: true } },
      },
    });

    if (!permit) {
      const result = { isValid: false, permit: null, message: 'مجوز یافت نشد' };
      await this.redis.set(cacheKey, JSON.stringify(result), 300);
      return result;
    }

    const now = new Date();
    const isActive = permit.status === 'ACTIVE';
    const isWithinValidity = now >= permit.validFrom && now <= permit.validUntil;

    // Check overdue mandatory conditions
    const overdueConditions = permit.conditions.filter(
      (c) => c.isMandatory && c.status === 'PENDING' && c.dueDate && c.dueDate < now,
    );

    const isValid = isActive && isWithinValidity && overdueConditions.length === 0;

    let message = '';
    if (!isActive) message = 'مجوز غیرفعال است';
    else if (!isWithinValidity) message = now < permit.validFrom ? 'مجوز هنوز فعال نشده' : 'مجوز منقضی شده';
    else if (overdueConditions.length > 0) message = 'شرایط الزامی انجام نشده دارد';
    else message = 'مجوز معتبر است';

    const result = {
      isValid,
      permit: {
        permitNumber: permit.permitNumber,
        type: permit.type,
        holderName: permit.holderName,
        companyName: permit.company.nameFa,
        validFrom: permit.validFrom,
        validUntil: permit.validUntil,
        status: permit.status,
        conditions: permit.conditions,
        issuedByName: permit.issuedByName,
        qrHash: permit.qrHash,
      },
      message,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async suspend(id: string, dto: SuspendPermitDto, suspendedBy: string): Promise<any> {
    const permit = await this.findById(id);

    if (permit.status !== 'ACTIVE') {
      throw new AppException('PERMIT_INVALID_STATUS');
    }

    const updated = await this.prisma.issuedPermit.update({
      where: { id },
      data: {
        status: IssuedPermitStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy,
        suspendReason: dto.reason,
      },
    });

    await this.audit.log({
      zoneId: permit.zoneId,
      userId: suspendedBy,
      targetId: id,
      targetType: 'IssuedPermit',
      action: 'PERMIT_SUSPENDED',
      metadata: { permitNumber: permit.permitNumber, reason: dto.reason },
    });

    return updated;
  }

  async reinstate(id: string, notes: string, reinstatedBy: string): Promise<any> {
    const permit = await this.findById(id);

    if (permit.status !== 'SUSPENDED') {
      throw new AppException('PERMIT_CANNOT_REINSTATE');
    }

    const updated = await this.prisma.issuedPermit.update({
      where: { id },
      data: {
        status: IssuedPermitStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
    });

    await this.audit.log({
      zoneId: permit.zoneId,
      userId: reinstatedBy,
      targetId: id,
      targetType: 'IssuedPermit',
      action: 'PERMIT_REINSTATED',
      metadata: { permitNumber: permit.permitNumber, notes },
    });

    return updated;
  }

  async revoke(id: string, reason: string, revokedBy: string): Promise<any> {
    const permit = await this.findById(id);

    if (permit.status === 'REVOKED') {
      throw new AppException('PERMIT_ALREADY_REVOKED');
    }

    const updated = await this.prisma.issuedPermit.update({
      where: { id },
      data: {
        status: IssuedPermitStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });

    await this.audit.log({
      zoneId: permit.zoneId,
      userId: revokedBy,
      targetId: id,
      targetType: 'IssuedPermit',
      action: 'PERMIT_REVOKED',
      metadata: { permitNumber: permit.permitNumber, reason },
    });

    return updated;
  }

  async renew(dto: RenewPermitDto, renewedBy: string, zoneId: string): Promise<any> {
    const existingPermit = await this.findById(dto.existingPermitId);

    if (!['ACTIVE', 'EXPIRED'].includes(existingPermit.status)) {
      throw new AppException('PERMIT_INVALID_STATUS');
    }

    // Create renewal request
    const { PermitRequestService } = await import('./permit-request.service');
    // Use the existing request data to create a renewal
    const originalRequest = await this.prisma.permitRequest.findUnique({
      where: { id: existingPermit.requestId },
    });

    if (!originalRequest) {
      throw new AppException('PERMIT_REQUEST_NOT_FOUND');
    }

    const renewalRequest = await this.prisma.permitRequest.create({
      data: {
        zoneId,
        companyId: existingPermit.companyId,
        requestNumber: `${originalRequest.requestNumber}-R`, // renewal marker
        type: existingPermit.type,
        subType: existingPermit.subType,
        title: `${existingPermit.title} (تمدید)`,
        description: originalRequest.description,
        justification: `تمدید مجوز ${existingPermit.permitNumber}`,
        locationDescription: existingPermit.locationDescription,
        locationBlock: existingPermit.locationBlock,
        locationUnit: existingPermit.locationUnit,
        affectedArea: existingPermit.affectedArea,
        requestedFrom: new Date(dto.newValidFrom),
        requestedUntil: new Date(dto.newValidUntil),
        isRecurring: originalRequest.isRecurring,
        applicantId: renewedBy,
        applicantName: originalRequest.applicantName,
        applicantPhone: originalRequest.applicantPhone,
        applicantEmail: originalRequest.applicantEmail,
        applicantRole: originalRequest.applicantRole,
        responsibleName: existingPermit.responsibleName,
        responsiblePhone: existingPermit.responsiblePhone,
        status: 'SUBMITTED',
        priority: originalRequest.priority,
        requiresHSEApproval: originalRequest.requiresHSEApproval,
        requiresEnvApproval: originalRequest.requiresEnvApproval,
        requiresFireApproval: originalRequest.requiresFireApproval,
        requiresInspection: originalRequest.requiresInspection,
        notes: dto.notes,
        createdBy: renewedBy,
      },
    });

    // Update existing permit
    await this.prisma.issuedPermit.update({
      where: { id: dto.existingPermitId },
      data: {
        status: IssuedPermitStatus.RENEWED,
        renewedToId: renewalRequest.id,
      },
    });

    await this.audit.log({
      zoneId,
      userId: renewedBy,
      targetId: dto.existingPermitId,
      targetType: 'IssuedPermit',
      action: 'PERMIT_RENEWED',
      metadata: { permitNumber: existingPermit.permitNumber, renewalRequestId: renewalRequest.id },
    });

    return renewalRequest;
  }

  async getExpiringPermits(zoneId: string, withinDays: number): Promise<any[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + withinDays);

    return this.prisma.issuedPermit.findMany({
      where: {
        zoneId,
        status: 'ACTIVE',
        validUntil: { lte: targetDate, gte: new Date() },
      },
      orderBy: { validUntil: 'asc' },
    });
  }

  async getOpenConditions(permitId: string): Promise<any[]> {
    return this.prisma.permitCondition.findMany({
      where: {
        issuedPermitId: permitId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async fulfillCondition(dto: FulfillConditionDto, fulfilledBy: string): Promise<any> {
    const condition = await this.prisma.permitCondition.findUnique({
      where: { id: dto.conditionId },
      include: { issuedPermit: true },
    });

    if (!condition) {
      throw new AppException('CONDITION_NOT_FOUND');
    }

    if (condition.status !== 'PENDING') {
      throw new AppException('CONDITION_ALREADY_FULFILLED');
    }

    const updated = await this.prisma.permitCondition.update({
      where: { id: dto.conditionId },
      data: {
        status: 'FULFILLED',
        verifiedBy: fulfilledBy,
        verifiedAt: new Date(),
        evidenceKey: dto.evidenceKey,
        notes: dto.notes,
      },
    });

    // Check if all mandatory conditions are fulfilled for the permit
    if (condition.issuedPermitId) {
      const pendingMandatory = await this.prisma.permitCondition.findMany({
        where: {
          issuedPermitId: condition.issuedPermitId,
          isMandatory: true,
          status: 'PENDING',
        },
      });

      // If all conditions fulfilled, update permit request status if conditionally approved
      if (pendingMandatory.length === 0 && condition.issuedPermit) {
        await this.prisma.permitRequest.update({
          where: { id: condition.issuedPermit.requestId },
          data: { status: 'APPROVED' },
        });
      }
    }

    await this.audit.log({
      userId: fulfilledBy,
      targetId: dto.conditionId,
      targetType: 'PermitCondition',
      action: 'PERMIT_CONDITION_FULFILLED',
      metadata: { permitId: condition.issuedPermitId, description: condition.description },
    });

    return updated;
  }

  async getPermitStats(zoneId: string, companyId?: string): Promise<any> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);

    const [totalActive, totalExpired, totalSuspended, totalRevoked, expiringIn30, expiringIn7, byType, openConditions, overdueConditions, pendingRequests] =
      await Promise.all([
        this.prisma.issuedPermit.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.issuedPermit.count({ where: { ...where, status: 'EXPIRED' } }),
        this.prisma.issuedPermit.count({ where: { ...where, status: 'SUSPENDED' } }),
        this.prisma.issuedPermit.count({ where: { ...where, status: 'REVOKED' } }),
        this.prisma.issuedPermit.count({
          where: { ...where, status: 'ACTIVE', validUntil: { lte: thirtyDays, gte: new Date() } },
        }),
        this.prisma.issuedPermit.count({
          where: { ...where, status: 'ACTIVE', validUntil: { lte: sevenDays, gte: new Date() } },
        }),
        this.prisma.issuedPermit.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
        this.prisma.permitCondition.count({
          where: {
            issuedPermit: { zoneId, ...(companyId ? { companyId } : {}) },
            isMandatory: true,
            status: 'PENDING',
          },
        }),
        this.prisma.permitCondition.count({
          where: {
            issuedPermit: { zoneId, ...(companyId ? { companyId } : {}) },
            isMandatory: true,
            status: 'PENDING',
            dueDate: { lt: new Date() },
          },
        }),
        this.prisma.permitRequest.count({
          where: {
            zoneId,
            ...(companyId ? { companyId } : {}),
            status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
            deletedAt: null,
          },
        }),
      ]);

    return {
      totalActive,
      totalExpired,
      totalSuspended,
      totalRevoked,
      expiringIn30Days: expiringIn30,
      expiringIn7Days: expiringIn7,
      byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count.type }), {}),
      openConditionsCount: openConditions,
      overdueConditionsCount: overdueConditions,
      pendingRequestsCount: pendingRequests,
    };
  }

  async getCompanyPermitDashboard(companyId: string, zoneId: string): Promise<any> {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [activePermits, expiringPermits, pendingRequests, recentlyIssued, openConditions, stats] =
      await Promise.all([
        this.prisma.issuedPermit.findMany({
          where: { companyId, zoneId, status: 'ACTIVE' },
          orderBy: { validUntil: 'asc' },
        }),
        this.prisma.issuedPermit.findMany({
          where: {
            companyId,
            zoneId,
            status: 'ACTIVE',
            validUntil: { lte: thirtyDays, gte: new Date() },
          },
          orderBy: { validUntil: 'asc' },
        }),
        this.prisma.permitRequest.findMany({
          where: {
            companyId,
            zoneId,
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CONDITIONALLY_APPROVED'] },
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.issuedPermit.findMany({
          where: { companyId, zoneId },
          orderBy: { issuedAt: 'desc' },
          take: 5,
        }),
        this.prisma.permitCondition.findMany({
          where: {
            issuedPermit: { companyId, zoneId },
            isMandatory: true,
            status: 'PENDING',
          },
          include: { issuedPermit: { select: { permitNumber: true, type: true } } },
        }),
        this.getPermitStats(zoneId, companyId),
      ]);

    return {
      activePermits,
      expiringPermits,
      pendingRequests,
      recentlyIssued,
      openConditions,
      stats,
    };
  }
}
