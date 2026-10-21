// M21: Super Admin Panel — Audit & Compliance Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import type { PaginatedResult, SuspiciousActivityDto, DataRetentionDto, PurgeResult, IntegrityCheckResult } from '../dto/enums';
import { RETENTION_POLICIES } from '../utils/super-admin.utils';

@Injectable()
export class AuditComplianceService {
  private readonly logger = new Logger(AuditComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async logGlobalEvent(action: string, module: string, userId?: string, zoneId?: string, entityType?: string, entityId?: string, metadata?: object, ipAddress?: string): Promise<void> {
    try {
      await (this.prisma as any).globalAuditLog.create({
        data: { action, module, userId, zoneId, entityType, entityId, metadata: metadata || {}, ipAddress, isSuper: true },
      });
    } catch (err) {
      this.logger.error(`Failed to write global audit log: ${err}`);
    }
  }

  async getGlobalAuditLog(filter: any): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.action) where.action = filter.action;
    if (filter.userId) where.userId = filter.userId;

    const limit = filter.limit || 50;
    try {
      const [data, total] = await Promise.all([
        (this.prisma as any).globalAuditLog.findMany({ where, take: limit, orderBy: { timestamp: 'desc' } }),
        (this.prisma as any).globalAuditLog.count({ where }),
      ]);
      return { data, meta: { total, hasMore: data.length === limit } };
    } catch {
      return { data: [], meta: { total: 0, hasMore: false } };
    }
  }

  async getSuperAdminActions(days: number): Promise<any[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    try {
      return await (this.prisma as any).globalAuditLog.findMany({ where: { isSuper: true, timestamp: { gte: since } }, orderBy: { timestamp: 'desc' }, take: 100 });
    } catch { return []; }
  }

  async detectSuspiciousActivity(zoneId?: string): Promise<SuspiciousActivityDto[]> {
    const findings: SuspiciousActivityDto[] = [];
    const now = new Date();

    // Time-based: logins outside 7:00-22:00 Tehran time
    try {
      const lateLogins = await (this.prisma as any).globalAuditLog.findMany({
        where: { action: 'LOGIN', timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        take: 50,
      });
      for (const log of lateLogins) {
        const hour = new Date(log.timestamp).getHours();
        if (hour < 7 || hour > 22) {
          findings.push({ type: 'UNUSUAL_LOGIN_TIME', severity: 'WARNING', description: `Login outside business hours at ${hour}:00`, userId: log.userId, zoneId: log.zoneId, timestamp: log.timestamp, details: {} });
        }
      }
    } catch { /* audit log table may not exist */ }

    return findings;
  }

  async getDataRetentionStatus(zoneId: string): Promise<DataRetentionDto> {
    return {
      oldestRecord: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      totalRecords: 0,
      recordsByModule: {},
      retentionPolicy: RETENTION_POLICIES,
      estimatedDeleteNext: 0,
    };
  }

  async purgeOldData(zoneId: string, module: string, olderThanDays: number, purgedBy: string): Promise<PurgeResult> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let recordsDeleted = 0;

    try {
      if (module === 'DEVICE_READING') {
        const result = await this.prisma.deviceReading.deleteMany({ where: { zoneId, createdAt: { lt: cutoff } } });
        recordsDeleted = result.count;
      } else if (module === 'VEHICLE_TRACKING') {
        const result = await this.prisma.vehicleTrackingPoint.deleteMany({ where: { zoneId, recordedAt: { lt: cutoff } } });
        recordsDeleted = result.count;
      }
    } catch (err) {
      this.logger.error(`Purge failed for ${module}: ${err}`);
    }

    await this.logGlobalEvent('DATA_PURGED', 'SUPER_ADMIN', purgedBy, zoneId, 'Data', undefined, { module, olderThanDays, recordsDeleted });
    return { recordsDeleted, storageFreedGb: recordsDeleted * 0.0001 };
  }

  async runDataIntegrityCheck(zoneId?: string): Promise<IntegrityCheckResult> {
    const issues: { table: string; type: string; count: number; description: string }[] = [];

    // Check for orphaned stock entries
    try {
      const orphanedStock = await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM "StockEntry" se LEFT JOIN "Item" i ON se."itemId" = i.id WHERE i.id IS NULL`,
      ) as any[];
      if (orphanedStock[0]?.cnt > 0) {
        issues.push({ table: 'StockEntry', type: 'ORPHANED_FK', count: Number(orphanedStock[0].cnt), description: 'Stock entries referencing deleted items' });
      }
    } catch { /* table may not exist */ }

    return { totalChecks: 1, issuesFound: issues.length, issues };
  }
}
