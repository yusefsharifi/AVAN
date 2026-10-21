import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateTrainingPlanDto, CreateTrainingRecordDto } from '../dto/create-dtos';
import type { TrainingComplianceDto } from '../dto/enums';
import { HseGatewayService } from './hse-gateway.service';

@Injectable()
export class HseTrainingService {
  private readonly logger = new Logger(HseTrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async createPlan(dto: CreateTrainingPlanDto): Promise<any> {
    return (this.prisma as any).hseTrainingPlan.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, code: dto.code, nameFa: dto.nameFa,
        description: dto.description, category: dto.category,
        durationHours: dto.durationHours, validityMonths: dto.validityMonths,
        isRequired: dto.isRequired !== false, isMandatory: dto.isMandatory || false,
        frequency: dto.frequency, instructor: dto.instructor,
      },
    });
  }

  async updatePlan(id: string, dto: Partial<CreateTrainingPlanDto>): Promise<any> {
    const existing = await (this.prisma as any).hseTrainingPlan.findUnique({ where: { id } });
    if (!existing) throw new AppException('TRAINING_PLAN_NOT_FOUND');

    const updateData: any = {};
    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.durationHours !== undefined) updateData.durationHours = dto.durationHours;
    if (dto.validityMonths !== undefined) updateData.validityMonths = dto.validityMonths;

    return (this.prisma as any).hseTrainingPlan.update({ where: { id }, data: updateData });
  }

  async findPlans(zoneId?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (zoneId) where.zoneId = zoneId;
    return (this.prisma as any).hseTrainingPlan.findMany({ where, orderBy: { nameFa: 'asc' } });
  }

  async recordTraining(dto: CreateTrainingRecordDto, recordedBy: string): Promise<any> {
    const plan = await (this.prisma as any).hseTrainingPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new AppException('TRAINING_PLAN_NOT_FOUND');

    const expiresAt = new Date(dto.trainingDate);
    expiresAt.setMonth(expiresAt.getMonth() + plan.validityMonths);

    const record = await (this.prisma as any).trainingRecord.create({
      data: {
        zoneId: dto.zoneId, planId: dto.planId, companyId: dto.companyId,
        employeeId: dto.employeeId, employeeName: dto.employeeName,
        employeeRole: dto.employeeRole, trainingDate: new Date(dto.trainingDate),
        score: dto.score, passed: dto.passed, conductedBy: dto.conductedBy,
        notes: dto.notes, expiresAt,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: recordedBy, targetId: record.id, targetType: 'TrainingRecord',
      action: 'TRAINING_RECORDED',
      metadata: { employeeName: dto.employeeName, planId: dto.planId, passed: dto.passed },
    });

    return record;
  }

  async generateCertificate(recordId: string): Promise<{ certificateKey: string }> {
    const record = await (this.prisma as any).trainingRecord.findUnique({
      where: { id: recordId }, include: { plan: true },
    });
    if (!record) throw new AppException('TRAINING_RECORD_NOT_FOUND');

    const key = `hse-certificates/${recordId}/certificate.pdf`;

    await (this.prisma as any).trainingRecord.update({
      where: { id: recordId }, data: { certificateKey: key },
    });

    await this.audit.log({
      zoneId: record.zoneId, userId: 'system', targetId: recordId, targetType: 'TrainingRecord',
      action: 'TRAINING_CERTIFICATE_GENERATED',
      metadata: { employeeName: record.employeeName, planName: record.plan.nameFa },
    });

    return { certificateKey: key };
  }

  async getCompanyTrainingCompliance(companyId: string, zoneId: string): Promise<TrainingComplianceDto> {
    const plans = await (this.prisma as any).hseTrainingPlan.findMany({
      where: { zoneId, isActive: true },
      include: { records: { where: { companyId } } },
    });

    const now = new Date();
    let totalTrained = 0, totalExpired = 0;

    const byPlan = plans.map((plan: any) => {
      const valid = plan.records.filter((r: any) => r.expiresAt > now);
      const expired = plan.records.filter((r: any) => r.expiresAt <= now);
      totalTrained += valid.length;
      totalExpired += expired.length;
      return { planId: plan.id, planName: plan.nameFa, trained: valid.length, expired: expired.length };
    });

    const expiringIn30Days = await (this.prisma as any).trainingRecord.findMany({
      where: {
        companyId, zoneId, expiresAt: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      include: { plan: true },
      take: 50,
    });

    const complianceRate = plans.length > 0 ? Math.round((totalTrained / plans.length) * 100) : 0;

    return {
      totalEmployees: totalTrained + totalExpired, trained: totalTrained,
      expired: totalExpired, notTrained: 0, complianceRate,
      byPlan, expiringIn30Days,
    };
  }

  async getExpiringTraining(zoneId: string, withinDays: number): Promise<any[]> {
    const target = new Date();
    target.setDate(target.getDate() + withinDays);
    return (this.prisma as any).trainingRecord.findMany({
      where: { zoneId, expiresAt: { gte: new Date(), lte: target } },
      include: { plan: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async findRecords(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId };
    if (filter?.planId) where.planId = filter.planId;
    if (filter?.companyId) where.companyId = filter.companyId;

    const limit = filter?.limit || 20;
    const data = await (this.prisma as any).trainingRecord.findMany({
      where, orderBy: { trainingDate: 'desc' }, take: limit + 1,
      include: { plan: true },
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async bulkRecord(records: CreateTrainingRecordDto[], recordedBy: string): Promise<{ recorded: number; failed: number; errors: string[] }> {
    let recorded = 0, failed = 0;
    const errors: string[] = [];

    for (const dto of records) {
      try {
        await this.recordTraining(dto, recordedBy);
        recorded++;
      } catch (err: any) {
        failed++;
        errors.push(`${dto.employeeName}: ${err.message}`);
      }
    }

    return { recorded, failed, errors };
  }

  async seedDefaultTrainingPlans(zoneId?: string): Promise<void> {
    const defaults = [
      { code: 'GEN-HSE-01', nameFa: 'آشنایی با ایمنی عمومی', category: 'GENERAL_HSE', durationHours: 8, validityMonths: 12 },
      { code: 'FIRE-01', nameFa: 'آتش‌نشانی و اطفاء حریق', category: 'FIRE_SAFETY', durationHours: 4, validityMonths: 12 },
      { code: 'FA-01', nameFa: 'کمک‌های اولیه', category: 'FIRST_AID', durationHours: 8, validityMonths: 24 },
      { code: 'HAZMAT-01', nameFa: 'مواد خطرناک', category: 'HAZMAT', durationHours: 8, validityMonths: 12 },
      { code: 'WOH-01', nameFa: 'کار در ارتفاع', category: 'WORKING_AT_HEIGHT', durationHours: 8, validityMonths: 12 },
      { code: 'CS-01', nameFa: 'کار در فضای بسته', category: 'CONFINED_SPACE', durationHours: 8, validityMonths: 12 },
      { code: 'HW-01', nameFa: 'کار گرم', category: 'HOT_WORK', durationHours: 4, validityMonths: 12 },
      { code: 'PPE-01', nameFa: 'لوازم حفاظت فردی', category: 'PPE', durationHours: 2, validityMonths: 12 },
    ];

    for (const d of defaults) {
      const existing = await (this.prisma as any).hseTrainingPlan.findFirst({ where: { code: d.code } });
      if (!existing && zoneId) {
        await (this.prisma as any).hseTrainingPlan.create({
          data: { ...d, zoneId, isRequired: true, isMandatory: false },
        });
      }
    }
  }
}
