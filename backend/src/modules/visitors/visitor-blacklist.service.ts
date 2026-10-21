import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { RedisKeys } from '../../common/utils/redis-keys';
import { AddVisitorBlacklistDto } from './dto/add-visitor-blacklist.dto';

@Injectable()
export class VisitorBlacklistService {
  private readonly logger = new Logger(VisitorBlacklistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async addToBlacklist(zoneId: string, dto: AddVisitorBlacklistDto, addedBy: string) {
    // Check if already exists
    if (dto.nationalId) {
      const existing = await this.prisma.visitorBlacklist.findFirst({
        where: { zoneId, nationalId: dto.nationalId, isActive: true },
      });
      if (existing) throw new AppException('BLACKLIST_ENTRY_EXISTS');
    }

    const entry = await this.prisma.visitorBlacklist.create({
      data: {
        zoneId,
        nationalId: dto.nationalId,
        phone: dto.phone,
        name: dto.name,
        reason: dto.reason,
        severity: dto.severity,
        addedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      zoneId,
      userId: addedBy,
      targetId: entry.id,
      targetType: 'VisitorBlacklist',
      action: 'VISITOR_BLACKLISTED',
      metadata: { nationalId: dto.nationalId, reason: dto.reason, severity: dto.severity },
    });

    return entry;
  }

  async removeFromBlacklist(id: string, removedBy: string) {
    const entry = await this.prisma.visitorBlacklist.findUnique({ where: { id } });
    if (!entry) throw new AppException('DOCUMENT_NOT_FOUND');

    await this.prisma.visitorBlacklist.update({
      where: { id },
      data: { isActive: false, revokedBy: removedBy, revokedAt: new Date() },
    });

    await this.audit.log({
      zoneId: entry.zoneId,
      userId: removedBy,
      targetId: id,
      targetType: 'VisitorBlacklist',
      action: 'VISITOR_UNBLACKLISTED',
    });
  }

  async check(zoneId: string, nationalId?: string, phone?: string, name?: string) {
    if (!nationalId && !phone && !name) {
      return { isBlacklisted: false, entry: null, severity: null };
    }

    // Check cache
    const cacheKey = RedisKeys.visitorBlacklist(zoneId, nationalId || phone || name || '');
    const cached = await this.redis.get(cacheKey);
    if (cached === 'BLOCKED') {
      return { isBlacklisted: true, entry: null, severity: 'DENY' };
    }
    if (cached === 'CLEAR') {
      return { isBlacklisted: false, entry: null, severity: null };
    }

    const where: any = { zoneId, isActive: true };
    if (nationalId) where.nationalId = nationalId;
    else if (phone) where.phone = phone;
    else if (name) where.name = name;

    const entry = await this.prisma.visitorBlacklist.findFirst({ where });

    if (entry) {
      // Check expiry
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        await this.redis.set(cacheKey, 'CLEAR', 300);
        return { isBlacklisted: false, entry: null, severity: null };
      }
      await this.redis.set(cacheKey, 'BLOCKED', 300);
      return { isBlacklisted: true, entry, severity: entry.severity };
    }

    await this.redis.set(cacheKey, 'CLEAR', 300);
    return { isBlacklisted: false, entry: null, severity: null };
  }

  async getBlacklist(zoneId: string, isActive?: boolean) {
    const where: any = { zoneId };
    if (isActive !== undefined) where.isActive = isActive;
    return this.prisma.visitorBlacklist.findMany({
      where,
      orderBy: { addedAt: 'desc' },
    });
  }
}
