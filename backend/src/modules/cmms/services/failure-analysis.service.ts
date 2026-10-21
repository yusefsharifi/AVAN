import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ReportFailureDto } from '../dto/create-dtos';
import type { FailureReportDto, ParetoDto } from '../dto/enums';
import { CmmsGatewayService } from './cmms-gateway.service';
import { computeMTBF as computeMTBFUtil, computeMTTR as computeMTTRUtil } from '../utils/cmms.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class FailureAnalysisService {
  private readonly logger = new Logger(FailureAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CmmsGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT FAILURE
  // ═══════════════════════════════════════════════════════════════════════════

  async reportFailure(dto: ReportFailureDto, reportedBy: string): Promise<any> {
    const asset = await (this.prisma as any).asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');

    // Create failure log
    const log = await (this.prisma as any).failureLog.create({
      data: {
        zoneId: dto.zoneId,
        assetId: dto.assetId,
        reportedBy,
        reportedByName: reportedBy,
        failedAt: new Date(dto.failedAt),
        failureMode: dto.failureMode,
        failureCause: dto.failureCause,
        description: dto.description,
        impact: dto.impact,
        impactLevel: dto.impactLevel,
        imageKeys: dto.imageKeys || [],
      },
    });

    // Update asset condition based on impactLevel
    let newCondition = asset.condition;
    if (dto.impactLevel === 'CRITICAL' || dto.impactLevel === 'MAJOR') {
      newCondition = 'CRITICAL';
    } else if (dto.impactLevel === 'MODERATE') {
      newCondition = 'POOR';
    }

    if (newCondition !== asset.condition) {
      await (this.prisma as any).asset.update({
        where: { id: dto.assetId },
        data: { condition: newCondition },
      });
    }

    // Auto-create corrective work order if requested
    if (dto.createWorkOrder) {
      const year = new Date().getFullYear().toString();
      const seqKey = `cmms:wo:seq:${dto.zoneId}:${year}`;
      const seq = await this.redis.incr(seqKey);

      const wo = await (this.prisma as any).workOrder.create({
        data: {
          zoneId: dto.zoneId,
          assetId: dto.assetId,
          companyId: asset.companyId,
          workOrderNumber: `WO-${year}-${seq.toString().padStart(6, '0')}`,
          type: 'CORRECTIVE',
          category: 'GENERAL',
          priority: dto.impactLevel === 'CRITICAL' ? 'EMERGENCY' : 'HIGH',
          status: 'APPROVED',
          failureLogId: log.id,
          title: `تعمیرات اصلاحی: ${asset.nameFa}`,
          description: dto.description,
          isEmergency: dto.impactLevel === 'CRITICAL',
          slaHours: dto.impactLevel === 'CRITICAL' ? 2 : 24,
          createdBy: reportedBy,
        },
      });

      // Link back
      await (this.prisma as any).failureLog.update({
        where: { id: log.id },
        data: { workOrderId: wo.id },
      });
    }

    // Emit failure event
    this.gateway.emitFailureReported({
      zoneId: dto.zoneId,
      failureLogId: log.id,
      assetName: asset.nameFa,
      assetCategory: asset.category,
      impactLevel: dto.impactLevel || 'MINOR',
      failedAt: new Date(dto.failedAt),
    });

    // If CRITICAL, emit critical condition event
    if (dto.impactLevel === 'CRITICAL') {
      this.gateway.emitAssetConditionCritical({
        zoneId: dto.zoneId,
        assetId: dto.assetId,
        assetName: asset.nameFa,
        condition: newCondition,
        criticality: asset.criticality,
      });
    }

    await this.audit.log({
      zoneId: dto.zoneId, userId: reportedBy, targetId: log.id, targetType: 'FailureLog',
      action: 'FAILURE_REPORTED',
      metadata: {
        assetNumber: asset.assetNumber,
        failureMode: dto.failureMode,
        impactLevel: dto.impactLevel,
        createWorkOrder: dto.createWorkOrder,
      },
    });

    return log;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLVE FAILURE
  // ═══════════════════════════════════════════════════════════════════════════

  async resolveFailure(failureLogId: string, workOrderId: string, restoredAt: Date): Promise<any> {
    const log = await (this.prisma as any).failureLog.findUnique({ where: { id: failureLogId } });
    if (!log) throw new AppException('FAILURE_LOG_NOT_FOUND');
    if (log.restoredAt) throw new AppException('FAILURE_ALREADY_RESOLVED');

    const downtime = Math.round((restoredAt.getTime() - log.failedAt.getTime()) / (1000 * 60));

    return (this.prisma as any).failureLog.update({
      where: { id: failureLogId },
      data: { restoredAt, downtime, workOrderId },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MTBF / MTTR
  // ═══════════════════════════════════════════════════════════════════════════

  async computeMTBF(assetId: string, fromDate?: Date, toDate?: Date): Promise<number> {
    const cacheKey = `cmms:mtbf:${assetId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    const asset = await (this.prisma as any).asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');

    const where: any = { assetId };
    if (fromDate || toDate) {
      where.failedAt = {};
      if (fromDate) where.failedAt.gte = fromDate;
      if (toDate) where.failedAt.lte = toDate;
    }

    const failures = await (this.prisma as any).failureLog.findMany({
      where,
      orderBy: { failedAt: 'asc' },
    });

    const failureDates = failures.map((f: any) => f.failedAt);
    const start = asset.createdAt;
    const end = toDate || new Date();

    const mtbf = computeMTBFUtil(failureDates, start, end);

    await this.redis.set(cacheKey, mtbf.toString(), 604800); // 7 days
    return mtbf;
  }

  async computeMTTR(assetId: string, fromDate?: Date, toDate?: Date): Promise<number> {
    const cacheKey = `cmms:mttr:${assetId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return parseFloat(cached);

    const where: any = { assetId, restoredAt: { not: null } };
    if (fromDate || toDate) {
      where.failedAt = {};
      if (fromDate) where.failedAt.gte = fromDate;
      if (toDate) where.failedAt.lte = toDate;
    }

    const records = await (this.prisma as any).failureLog.findMany({ where });

    const repairRecords = records.map((r: any) => ({
      failedAt: r.failedAt,
      restoredAt: r.restoredAt,
    }));

    const mttr = computeMTTRUtil(repairRecords);

    await this.redis.set(cacheKey, mttr.toString(), 604800);
    return mttr;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAILURE REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  async getFailureReport(zoneId: string, fromDate: string, toDate: string): Promise<FailureReportDto> {
    const failures = await (this.prisma as any).failureLog.findMany({
      where: {
        zoneId,
        failedAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
      include: { asset: true },
    });

    const byAssetMap = new Map<string, { assetName: string; count: number; downtime: number }>();
    const byCauseMap = new Map<string, number>();
    const byModeMap = new Map<string, number>();
    let totalDowntime = 0;
    let criticalCount = 0;

    for (const f of failures) {
      // By asset
      const existing = byAssetMap.get(f.assetId) || { assetName: f.asset?.nameFa || 'Unknown', count: 0, downtime: 0 };
      existing.count++;
      existing.downtime += f.downtime || 0;
      byAssetMap.set(f.assetId, existing);

      // By cause
      if (f.failureCause) {
        byCauseMap.set(f.failureCause, (byCauseMap.get(f.failureCause) || 0) + 1);
      }

      // By mode
      byModeMap.set(f.failureMode, (byModeMap.get(f.failureMode) || 0) + 1);

      totalDowntime += f.downtime || 0;
      if (f.impactLevel === 'CRITICAL') criticalCount++;
    }

    // Most failed assets
    const mostFailedAssets = Array.from(byAssetMap.entries())
      .map(([assetId, data]) => ({ assetId, assetName: data.assetName, count: data.count, downtime: data.downtime }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Compute avg MTBF and MTTR across all assets with failures
    const uniqueAssetIds = [...new Set<string>(failures.map((f: any) => String(f.assetId)))];
    let avgMTBF = 0;
    let avgMTTR = 0;

    if (uniqueAssetIds.length > 0) {
      let totalMTBF = 0;
      let totalMTTR = 0;
      for (const aid of uniqueAssetIds) {
        totalMTBF += await this.computeMTBF(aid);
        totalMTTR += await this.computeMTTR(aid);
      }
      avgMTBF = totalMTBF / uniqueAssetIds.length;
      avgMTTR = totalMTTR / uniqueAssetIds.length;
    }

    return {
      totalFailures: failures.length,
      byAsset: Array.from(byAssetMap.entries()).map(([assetId, data]) => ({
        assetId, assetName: data.assetName, count: data.count,
      })),
      byFailureCause: Array.from(byCauseMap.entries()).map(([cause, count]) => ({ cause, count })),
      byFailureMode: Array.from(byModeMap.entries()).map(([mode, count]) => ({ mode, count })),
      totalDowntime,
      criticalFailures: criticalCount,
      avgMTBF: Math.round(avgMTBF * 100) / 100,
      avgMTTR: Math.round(avgMTTR * 100) / 100,
      mostFailedAssets,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARETO ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  async getParetoAnalysis(zoneId: string): Promise<ParetoDto[]> {
    const failures = await (this.prisma as any).failureLog.findMany({
      where: { zoneId },
      include: { asset: true },
    });

    const assetCountMap = new Map<string, { assetNumber: string; assetName: string; count: number }>();
    let totalCount = 0;

    for (const f of failures) {
      const existing = assetCountMap.get(f.assetId) || {
        assetNumber: f.asset?.assetNumber || '',
        assetName: f.asset?.nameFa || '',
        count: 0,
      };
      existing.count++;
      totalCount++;
      assetCountMap.set(f.assetId, existing);
    }

    const sorted = Array.from(assetCountMap.entries())
      .map(([assetId, data]) => ({ assetId, ...data }))
      .sort((a, b) => b.count - a.count);

    let cumulative = 0;
    return sorted.map((item) => {
      cumulative += item.count;
      return {
        assetId: item.assetId,
        assetNumber: item.assetNumber,
        assetName: item.assetName,
        failureCount: item.count,
        cumulativePercent: totalCount > 0 ? Math.round((cumulative / totalCount) * 10000) / 100 : 0,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY
  // ═══════════════════════════════════════════════════════════════════════════

  async getFailureLogs(assetId: string, filter?: any): Promise<any> {
    const limit = filter?.limit || 20;

    const data = await (this.prisma as any).failureLog.findMany({
      where: { assetId },
      orderBy: { failedAt: 'desc' },
      take: limit + 1,
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }
}
