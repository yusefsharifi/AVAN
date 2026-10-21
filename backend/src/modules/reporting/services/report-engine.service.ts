// M18: Reporting & BI — Report Engine Service
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { ReportingGatewayService } from './reporting-gateway.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { RunReportDto } from '../dto/create-dtos';
import type {
  ReportResult,
  QueryPlan,
  ResolvedDates,
  RunReportParams,
  ReportConfig,
} from '../dto/enums';
import { ExecutionStatus } from '@prisma/client';
import {
  resolveRelativeDates,
  mapDataSourceToModel,
  buildAggFunction,
  sanitizeFilterValue,
  sanitizeFieldName,
} from '../utils/reporting.utils';

@Injectable()
export class ReportEngineService {
  private readonly logger = new Logger(ReportEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: ReportingGatewayService,
  ) {}

  async runReport(
    dto: RunReportDto,
    requestedBy: string,
    zoneId?: string,
  ): Promise<ReportResult> {
    const report = await this.prisma.reportDefinition.findUnique({
      where: { code: dto.reportCode },
    });
    if (!report) {
      throw new AppException('REPORT_NOT_FOUND');
    }

    // Access control
    if (report.allowedRoles.length > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: requestedBy },
      });
      if (user && !report.allowedRoles.includes(user.role)) {
        throw new AppException('REPORT_ACCESS_DENIED');
      }
    }

    // Merge parameters
    const mergedParams: RunReportParams = {
      ...((report.config as Record<string, unknown>).defaultParameters as RunReportParams),
      ...dto.parameters,
      zoneId: dto.parameters?.zoneId || zoneId || report.zoneId || undefined,
    };

    // Resolve dates
    const resolvedDates = mergedParams.period
      ? resolveRelativeDates(mergedParams.period)
      : { fromDate: mergedParams.fromDate || '', toDate: mergedParams.toDate || '' };

    // Create execution record
    const execution = await this.prisma.reportExecution.create({
      data: {
        reportId: report.id,
        zoneId: mergedParams.zoneId || report.zoneId || undefined,
        status: ExecutionStatus.RUNNING,
        parameters: mergedParams as any,
        triggeredBy: requestedBy,
      },
    });

    this.gateway.emitExecutionStarted(requestedBy, {
      executionId: execution.id,
      reportCode: report.code,
      reportTitle: report.nameFa,
    });

    const startTime = Date.now();

    try {
      // Build and execute query
      const config = report.config as unknown as ReportConfig;
      const queryPlan = this.buildQuery(config, mergedParams, resolvedDates);
      const rawData = await this.executeQuery(queryPlan);

      const rowCount = rawData.length;
      const durationMs = Date.now() - startTime;

      // Update execution
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.COMPLETED,
          rowCount,
          completedAt: new Date(),
          durationSeconds: durationMs / 1000,
        },
      });

      // Update report stats
      await this.prisma.reportDefinition.update({
        where: { id: report.id },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
          avgRunSeconds: durationMs / 1000,
        },
      });

      // Audit log
      await this.audit.log({
        action: 'REPORT_EXECUTED',
        targetType: 'ReportExecution',
        targetId: execution.id,
        userId: requestedBy,
        metadata: { reportCode: report.code, rowCount, durationMs },
      });

      const result: ReportResult = {
        executionId: execution.id,
        status: ExecutionStatus.COMPLETED,
        rowCount,
        data: dto.returnData !== false ? rawData : undefined,
        duration: durationMs,
        generatedAt: new Date(),
      };

      this.gateway.emitExecutionCompleted(requestedBy, {
        executionId: execution.id,
        rowCount,
        duration: durationMs,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          durationSeconds: durationMs / 1000,
        },
      });

      this.gateway.emitExecutionFailed(requestedBy, {
        executionId: execution.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  buildQuery(
    config: ReportConfig,
    parameters: RunReportParams,
    resolvedDates: ResolvedDates,
  ): QueryPlan {
    // Build a SQL query plan from config
    const primarySource = config.dataSources[0];
    const tableName = mapDataSourceToModel(primarySource);

    const selectParts: string[] = [];
    for (const field of config.fields) {
      const alias = field.alias || `${field.source}_${field.field}`;
      // NEW-002: Sanitize field names to prevent SQL injection
      selectParts.push(`"${sanitizeFieldName(field.field)}" AS "${sanitizeFieldName(alias)}"`);
    }

    // Add aggregations
    if (config.aggregations) {
      for (const agg of config.aggregations) {
        // NEW-002: Sanitize field names to prevent SQL injection
        selectParts.push(`${buildAggFunction(agg.function, sanitizeFieldName(agg.field))} AS "${sanitizeFieldName(agg.alias)}"`);
      }
    }

    let sql = `SELECT ${selectParts.length > 0 ? selectParts.join(', ') : '*'} FROM "${tableName}"`;

    const bindings: unknown[] = [];
    const conditions: string[] = [];

    // Zone filter
    if (parameters.zoneId) {
      conditions.push(`"zoneId" = $${bindings.length + 1}`);
      bindings.push(parameters.zoneId);
    }

    // Date range
    if (resolvedDates.fromDate) {
      conditions.push(`"createdAt"::text >= $${bindings.length + 1}`);
      bindings.push(resolvedDates.fromDate);
    }
    if (resolvedDates.toDate) {
      conditions.push(`"createdAt"::text <= $${bindings.length + 1}`);
      bindings.push(resolvedDates.toDate + 'T23:59:59');
    }

    // Custom filters
    if (config.filters) {
      for (const filter of config.filters) {
        const val = sanitizeFilterValue(filter.value);
        switch (filter.operator) {
          case 'eq':
            conditions.push(`"${sanitizeFieldName(filter.field)}" = $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'ne':
            conditions.push(`"${sanitizeFieldName(filter.field)}" != $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'gt':
            conditions.push(`"${sanitizeFieldName(filter.field)}" > $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'lt':
            conditions.push(`"${sanitizeFieldName(filter.field)}" < $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'gte':
            conditions.push(`"${sanitizeFieldName(filter.field)}" >= $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'lte':
            conditions.push(`"${sanitizeFieldName(filter.field)}" <= $${bindings.length + 1}`);
            bindings.push(val);
            break;
          case 'in':
            if (Array.isArray(val)) {
              conditions.push(`"${sanitizeFieldName(filter.field)}" = ANY($${bindings.length + 1})`);
              bindings.push(val);
            }
            break;
          case 'like':
            conditions.push(`"${sanitizeFieldName(filter.field)}" ILIKE $${bindings.length + 1}`);
            bindings.push(`%${val}%`);
            break;
        }
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Group by
    if (config.groupBy && config.groupBy.length > 0) {
      sql += ` GROUP BY ${config.groupBy.map((g) => `"${sanitizeFieldName(g)}"`).join(', ')}`;
    }

    // Order by
    if (config.orderBy && config.orderBy.length > 0) {
      const orderParts = config.orderBy.map(
        (o) => `"${sanitizeFieldName(o.field)}" ${o.direction.toUpperCase()}`,
      );
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // Limit
    if (parameters.limit) {
      sql += ` LIMIT ${Math.min(parameters.limit, 10000)}`;
    }

    return { sql, bindings, model: tableName };
  }

  async executeQuery(queryPlan: QueryPlan): Promise<unknown[]> {
    try {
      const result = await this.prisma.$queryRawUnsafe(
        queryPlan.sql,
        ...queryPlan.bindings,
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      this.logger.error(
        `Query execution failed for ${queryPlan.model}: ${error}`,
      );
      throw new AppException('REPORT_NOT_FOUND');
    }
  }

  resolveRelativeDates(
    parameters: RunReportParams,
    zoneId?: string,
  ): ResolvedDates {
    if (parameters.period) {
      return resolveRelativeDates(parameters.period);
    }
    return {
      fromDate: parameters.fromDate || '',
      toDate: parameters.toDate || '',
    };
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.prisma.reportExecution.findUnique({
      where: { id: executionId },
    });
    if (!execution) {
      throw new AppException('REPORT_EXECUTION_NOT_FOUND');
    }
    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new AppException('REPORT_EXECUTION_CANCELLED');
    }
    await this.prisma.reportExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  async getExecutionHistory(
    reportCode: string,
    limit = 20,
  ): Promise<any[]> {
    const report = await this.prisma.reportDefinition.findUnique({
      where: { code: reportCode },
    });
    if (!report) {
      throw new AppException('REPORT_EXECUTION_NOT_FOUND');
    }
    return this.prisma.reportExecution.findMany({
      where: { reportId: report.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async downloadReport(executionId: string): Promise<{
    fileKey: string;
    presignedUrl: string;
    expiresAt: Date;
  }> {
    const execution = await this.prisma.reportExecution.findUnique({
      where: { id: executionId },
    });
    if (!execution) {
      throw new AppException('REPORT_EXECUTION_NOT_FOUND');
    }
    if (!execution.fileKey) {
      throw new AppException('REPORT_DOWNLOAD_EXPIRED');
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const cacheKey = `report:presigned:${executionId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { fileKey: execution.fileKey, presignedUrl: cached, expiresAt };
    }

    // In production, generate MinIO presigned URL
    const presignedUrl = `/api/v1/reports/download/${executionId}`;
    await this.redis.set(cacheKey, presignedUrl, 900);

    return { fileKey: execution.fileKey, presignedUrl, expiresAt };
  }
}
