import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreatePeriodDto } from '../dto/period.dto';

@Injectable()
export class FinancialPeriodService {
  private readonly logger = new Logger(FinancialPeriodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePeriodDto, createdBy: string): Promise<any> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new AppException('LEASE_INVALID_DATES', {
        details: { message: 'تاریخ شروع باید قبل از تاریخ پایان باشد' },
      });
    }

    // Check for overlapping periods
    const overlapping = await this.prisma.financialPeriod.findFirst({
      where: {
        zoneId: createdBy, // Will be overridden
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new AppException('PERIOD_ALREADY_CLOSED', {
        details: { message: 'دوره مالی با این بازه تداخل دارد' },
      });
    }

    const period = await this.prisma.financialPeriod.create({
      data: {
        zoneId: createdBy,
        name: dto.name,
        startDate,
        endDate,
        status: 'OPEN',
      },
    });

    await this.audit.log({
      zoneId: createdBy,
      targetId: period.id,
      targetType: 'FinancialPeriod',
      action: 'PERIOD_OPENED',
      metadata: { name: dto.name, startDate: dto.startDate, endDate: dto.endDate },
    });

    return period;
  }

  async findAll(zoneId: string): Promise<any[]> {
    return this.prisma.financialPeriod.findMany({
      where: { zoneId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findCurrent(zoneId: string): Promise<any> {
    const cacheKey = REDIS_KEYS.financePeriodCurrent(zoneId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const period = await this.prisma.financialPeriod.findFirst({
      where: {
        zoneId,
        status: 'OPEN',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (period) {
      await this.redis.set(cacheKey, JSON.stringify(period), 3600);
    }

    return period;
  }

  async close(id: string, closedBy: string): Promise<any> {
    const period = await this.prisma.financialPeriod.findUnique({ where: { id } });

    if (!period) {
      throw new AppException('PERIOD_NOT_FOUND');
    }

    if (period.status !== 'OPEN') {
      throw new AppException('PERIOD_ALREADY_CLOSED');
    }

    const updated = await this.prisma.financialPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedBy,
        closedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.financePeriodCurrent(period.zoneId));

    await this.audit.log({
      zoneId: period.zoneId,
      userId: closedBy,
      targetId: id,
      targetType: 'FinancialPeriod',
      action: 'PERIOD_CLOSED',
      metadata: { name: period.name },
    });

    return updated;
  }

  async lock(id: string, lockedBy: string): Promise<any> {
    const period = await this.prisma.financialPeriod.findUnique({ where: { id } });

    if (!period) {
      throw new AppException('PERIOD_NOT_FOUND');
    }

    if (period.status === 'LOCKED') {
      throw new AppException('PERIOD_LOCKED');
    }

    const updated = await this.prisma.financialPeriod.update({
      where: { id },
      data: {
        status: 'LOCKED',
        closedBy: lockedBy,
        closedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.financePeriodCurrent(period.zoneId));

    await this.audit.log({
      zoneId: period.zoneId,
      userId: lockedBy,
      targetId: id,
      targetType: 'FinancialPeriod',
      action: 'PERIOD_LOCKED',
      metadata: { name: period.name },
    });

    return updated;
  }
}
