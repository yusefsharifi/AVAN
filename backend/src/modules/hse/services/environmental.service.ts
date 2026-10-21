import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { RecordEnvironmentalMeasurementDto } from '../dto/create-dtos';
import type { EnvironmentalReportDto, EnvironmentalComplianceSummaryDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EnvironmentalService {
  private readonly logger = new Logger(EnvironmentalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async recordMeasurement(dto: RecordEnvironmentalMeasurementDto, recordedBy: string): Promise<any> {
    const isCompliant = !dto.permittedLimit || dto.value <= dto.permittedLimit;

    const record = await (this.prisma as any).environmentalRecord.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, type: dto.type,
        parameter: dto.parameter, value: new Prisma.Decimal(dto.value),
        unit: dto.unit, measuredAt: new Date(dto.measuredAt),
        measuredBy: recordedBy, device: dto.device,
        isCompliant, permittedLimit: dto.permittedLimit ? new Prisma.Decimal(dto.permittedLimit) : null,
        notes: dto.notes,
      },
    });

    // Non-compliant alert
    if (!isCompliant) {
      this.gateway.emitEnvironmentalExceedance({
        zoneId: dto.zoneId, parameter: dto.parameter,
        value: dto.value, limit: dto.permittedLimit || 0,
        companyName: dto.companyId, measuredAt: new Date(dto.measuredAt),
      });
    }

    await this.audit.log({
      zoneId: dto.zoneId, userId: recordedBy, targetId: record.id, targetType: 'EnvironmentalRecord',
      action: isCompliant ? 'ENVIRONMENTAL_RECORDED' : 'ENVIRONMENTAL_EXCEEDANCE_DETECTED',
      metadata: { parameter: dto.parameter, value: dto.value, isCompliant },
    });

    return record;
  }

  async getEnvironmentalReport(zoneId: string, type: string, fromDate: string, toDate: string): Promise<EnvironmentalReportDto> {
    const where: any = { zoneId, type, measuredAt: { gte: new Date(fromDate), lte: new Date(toDate) } };
    const records = await (this.prisma as any).environmentalRecord.findMany({ where });

    const compliant = records.filter((r: any) => r.isCompliant).length;
    const nonCompliant = records.length - compliant;

    const byParamMap = new Map<string, { count: number; compliant: number }>();
    for (const r of records) {
      const existing = byParamMap.get(r.parameter) || { count: 0, compliant: 0 };
      existing.count++;
      if (r.isCompliant) existing.compliant++;
      byParamMap.set(r.parameter, existing);
    }

    const byParameter = Array.from(byParamMap.entries()).map(([param, data]) => ({
      parameter: param, count: data.count,
      complianceRate: Math.round((data.compliant / data.count) * 100),
    }));

    return {
      totalMeasurements: records.length, compliant, nonCompliant,
      complianceRate: records.length > 0 ? Math.round((compliant / records.length) * 100) : 100,
      byParameter, trend: [],
    };
  }

  async getComplianceSummary(zoneId: string, companyId?: string): Promise<EnvironmentalComplianceSummaryDto> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;

    const records = await (this.prisma as any).environmentalRecord.findMany({
      where, orderBy: { measuredAt: 'desc' }, take: 100,
    });

    const compliant = records.filter((r: any) => r.isCompliant).length;
    const nonCompliant = records.length - compliant;

    const byParamMap = new Map<string, { total: number; compliant: number }>();
    for (const r of records) {
      const existing = byParamMap.get(r.parameter) || { total: 0, compliant: 0 };
      existing.total++;
      if (r.isCompliant) existing.compliant++;
      byParamMap.set(r.parameter, existing);
    }

    const byParameter = Array.from(byParamMap.entries()).map(([param, data]) => ({
      parameter: param, rate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 100,
    }));

    const recentExceedances = records.filter((r: any) => !r.isCompliant).slice(0, 10);

    return {
      totalMeasurements: records.length, compliant, nonCompliant,
      complianceRate: records.length > 0 ? Math.round((compliant / records.length) * 100) : 100,
      byParameter, recentExceedances,
    };
  }
}
