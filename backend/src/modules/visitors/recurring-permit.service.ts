import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { RedisKeys } from '../../common/utils/redis-keys';
import { CreateRecurringPermitDto } from './dto/create-recurring-permit.dto';
import * as crypto from 'crypto';
import { getCurrentJalaliYear } from '../../common/utils/jalali';

@Injectable()
export class RecurringPermitService {
  private readonly logger = new Logger(RecurringPermitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateRecurringPermitDto, issuedBy: string) {
    // Validate nationalId required
    if (!dto.visitorNationalId) {
      throw new AppException('NATIONAL_ID_REQUIRED_FOR_RECURRING');
    }

    // Check blacklist
    const blacklistEntry = await this.prisma.visitorBlacklist.findFirst({
      where: {
        zoneId: dto.zoneId,
        isActive: true,
        OR: [
          ...(dto.visitorNationalId ? [{ nationalId: dto.visitorNationalId }] : []),
          ...(dto.visitorPhone ? [{ phone: dto.visitorPhone }] : []),
        ],
      },
    });
    if (blacklistEntry) {
      throw new AppException('VISITOR_BLACKLISTED');
    }

    // Generate permit number (BUG-002: dynamic Jalali year)
    const year = getCurrentJalaliYear();
    const seqKey = `recurring:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    // Counter is persistent - no expiry needed
    const permitNumber = `RVP-${dto.zoneId.substring(0, 4)}-${year}-${String(seq).padStart(5, '0')}`;

    // Generate QR
    const secret = 'idop-zone-secret';
    const permitId = crypto.randomUUID();
    const hmac = crypto.createHmac('sha256', secret).update(`RECURRING:${permitId}:${dto.zoneId}`).digest('base64');
    const qrPayload = `IDOP:RECURRING:${permitId}:${hmac}`;

    const permit = await this.prisma.recurringVisitorPermit.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        permitNumber,
        visitorName: dto.visitorName,
        visitorNationalId: dto.visitorNationalId,
        visitorPhone: dto.visitorPhone,
        visitorCompany: dto.visitorCompany,
        permitType: dto.permitType,
        allowedDays: dto.allowedDays,
        allowedTimeStart: dto.allowedTimeStart,
        allowedTimeEnd: dto.allowedTimeEnd,
        allowedGates: dto.allowedGates || [],
        allowedZones: dto.allowedZones || [],
        vehiclePlate: dto.vehiclePlate,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        maxVisitsPerDay: dto.maxVisitsPerDay || 1,
        issuedBy,
        notes: dto.notes,
        qrPayload,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: issuedBy,
      targetId: permit.id,
      targetType: 'RecurringVisitorPermit',
      action: 'RECURRING_PERMIT_CREATED',
      metadata: { permitNumber, visitorName: dto.visitorName },
    });

    return permit;
  }

  async validate(qrPayload: string, gateId: string, zoneId: string) {
    // Parse QR
    if (!qrPayload.startsWith('IDOP:RECURRING:')) {
      return { isValid: false, reason: 'فرمت QR نامعتبر است' };
    }

    const parts = qrPayload.split(':');
    if (parts.length < 4) return { isValid: false, reason: 'فرمت QR نامعتبر است' };

    const permitId = parts[2];

    // Find permit
    const permit = await this.prisma.recurringVisitorPermit.findFirst({
      where: { qrPayload },
    });
    if (!permit) {
      return { isValid: false, reason: 'مجوز یافت نشد' };
    }

    // Check active
    if (!permit.isActive) {
      return { isValid: false, reason: 'مجوز غیرفعال است' };
    }

    // Check validity period
    const now = new Date();
    if (now < permit.validFrom || now > permit.validUntil) {
      return { isValid: false, reason: 'مجوز منقضی شده است' };
    }

    // Check allowed gate
    if (permit.allowedGates.length > 0 && !permit.allowedGates.includes(gateId)) {
      return { isValid: false, reason: 'مجوز برای این ورودی معتبر نیست' };
    }

    // Check max visits per day
    const todayVisits = await this.prisma.visitorTracking.count({
      where: {
        visitorRequest: { visitorNationalId: permit.visitorNationalId },
        eventType: 'CHECKED_IN',
        occurredAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    if (todayVisits >= permit.maxVisitsPerDay) {
      return { isValid: false, reason: 'حداکثر تعداد مراجعات امروز رسیده است' };
    }

    return { isValid: true, permit, reason: undefined };
  }

  async recordVisit(permitId: string, gateId: string) {
    await this.prisma.recurringVisitorPermit.update({
      where: { id: permitId },
      data: {
        totalVisits: { increment: 1 },
        lastVisitAt: new Date(),
      },
    });
  }

  async revoke(id: string, reason: string, revokedBy: string) {
    const permit = await this.prisma.recurringVisitorPermit.findUnique({ where: { id } });
    if (!permit) throw new AppException('RECURRING_PERMIT_NOT_FOUND');

    const updated = await this.prisma.recurringVisitorPermit.update({
      where: { id },
      data: {
        isActive: false,
        revokedBy,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    await this.audit.log({
      zoneId: permit.zoneId,
      userId: revokedBy,
      targetId: id,
      targetType: 'RecurringVisitorPermit',
      action: 'RECURRING_PERMIT_REVOKED',
      metadata: { permitNumber: permit.permitNumber, reason },
    });

    return updated;
  }

  async renew(id: string, newValidUntil: string, renewedBy: string) {
    const permit = await this.prisma.recurringVisitorPermit.findUnique({ where: { id } });
    if (!permit) throw new AppException('RECURRING_PERMIT_NOT_FOUND');

    const updated = await this.prisma.recurringVisitorPermit.update({
      where: { id },
      data: {
        validUntil: new Date(newValidUntil),
        isActive: true,
      },
    });

    await this.audit.log({
      zoneId: permit.zoneId,
      userId: renewedBy,
      targetId: id,
      targetType: 'RecurringVisitorPermit',
      action: 'RECURRING_PERMIT_RENEWED',
      metadata: { permitNumber: permit.permitNumber, newValidUntil },
    });

    return updated;
  }

  async findAll(zoneId: string, isActive?: boolean) {
    const where: any = { zoneId };
    if (isActive !== undefined) where.isActive = isActive;
    return this.prisma.recurringVisitorPermit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const permit = await this.prisma.recurringVisitorPermit.findUnique({ where: { id } });
    if (!permit) throw new AppException('RECURRING_PERMIT_NOT_FOUND');
    return permit;
  }

  async getExpiringPermits(zoneId: string, withinDays: number) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return this.prisma.recurringVisitorPermit.findMany({
      where: {
        zoneId,
        isActive: true,
        validUntil: { lte: futureDate },
      },
    });
  }
}
