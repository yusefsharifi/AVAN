// M21: Super Admin Panel — Subscription Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateSubscriptionPlanDto, AssignPlanDto } from '../dto/create-dtos';
import type { UsageLimitCheckDto, PlanComparisonDto } from '../dto/enums';
import { AuditComplianceService } from './audit-compliance.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async createPlan(dto: CreateSubscriptionPlanDto, createdBy: string): Promise<any> {
    const existing = await this.prisma.subscriptionPlan.findFirst({ where: { code: dto.code } });
    if (existing) throw new AppException('PLAN_CODE_DUPLICATE');

    return this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code, nameFa: dto.nameFa, nameEn: dto.nameEn, descriptionFa: dto.descriptionFa,
        price: BigInt(dto.price), annualPrice: dto.annualPrice ? BigInt(dto.annualPrice) : null,
        billingCycle: dto.billingCycle, maxCompanies: dto.maxCompanies, maxUsers: dto.maxUsers,
        maxGates: dto.maxGates, maxDevices: dto.maxDevices, storageGb: dto.storageGb,
        apiCallsPerDay: dto.apiCallsPerDay, smsCredits: dto.smsCredits, features: dto.features,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updatePlan(id: string, dto: Partial<CreateSubscriptionPlanDto>): Promise<any> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.nameFa && { nameFa: dto.nameFa }),
        ...(dto.nameEn && { nameEn: dto.nameEn }),
        ...(dto.price !== undefined && { price: BigInt(dto.price) }),
        ...(dto.features && { features: dto.features }),
      },
    });
  }

  async assignPlan(dto: AssignPlanDto, assignedBy: string): Promise<any> {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { code: dto.planCode, isActive: true } });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');

    const existing = await this.prisma.zoneSubscription.findUnique({ where: { zoneId: dto.zoneId } });
    if (existing && existing.status === 'ACTIVE') throw new AppException('SUBSCRIPTION_ALREADY_ACTIVE');

    const subscription = await this.prisma.zoneSubscription.upsert({
      where: { zoneId: dto.zoneId },
      create: {
        zoneId: dto.zoneId, planId: plan.id, status: dto.isTrial ? 'TRIAL' : 'ACTIVE',
        startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : null,
        isTrial: dto.isTrial || false, trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
        autoRenew: dto.autoRenew ?? true, customLimits: dto.customLimits, customFeatures: dto.customFeatures,
        notes: dto.notes, createdBy: assignedBy,
      },
      update: {
        planId: plan.id, status: dto.isTrial ? 'TRIAL' : 'ACTIVE',
        startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });

    await this.auditCompliance.logGlobalEvent('PLAN_ASSIGNED', 'SUPER_ADMIN', assignedBy, dto.zoneId, 'ZoneSubscription', subscription.id, { planCode: dto.planCode });
    return subscription;
  }

  async findAll(): Promise<any[]> {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getZoneSubscription(zoneId: string): Promise<any> {
    return this.prisma.zoneSubscription.findUnique({ where: { zoneId }, include: { plan: true } });
  }

  async getInvoices(zoneId: string): Promise<any[]> {
    const sub = await this.prisma.zoneSubscription.findUnique({ where: { zoneId } });
    if (!sub) return [];
    return this.prisma.zoneInvoice.findMany({ where: { subscriptionId: sub.id }, orderBy: { createdAt: 'desc' } });
  }

  async getPlanComparison(): Promise<PlanComparisonDto> {
    const cacheKey = 'plan:comparison';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const plans = await this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const result = { plans, features: ['ANPR', 'IoT', 'B2B', 'CMMS', 'HSE', 'HR', 'BI', 'API_ACCESS', 'WHITE_LABEL', 'PRIORITY_SUPPORT'] };
    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async checkUsageLimits(zoneId: string): Promise<UsageLimitCheckDto> {
    const sub = await this.prisma.zoneSubscription.findUnique({ where: { zoneId }, include: { plan: true } });
    if (!sub) return { isOverLimit: false, violations: [], warnings: [] };

    const plan = sub.plan;
    const violations: any[] = [];
    const warnings: any[] = [];

    const checks = [
      { resource: 'companies', current: sub.usageCompanies, limit: plan.maxCompanies },
      { resource: 'users', current: sub.usageUsers, limit: plan.maxUsers },
    ];

    for (const check of checks) {
      if (check.limit > 0 && check.current > check.limit) {
        violations.push({ resource: check.resource, current: check.current, limit: check.limit });
      } else if (check.limit > 0 && check.current / check.limit > 0.8) {
        warnings.push({ resource: check.resource, current: check.current, limit: check.limit, percent: Math.round((check.current / check.limit) * 100) });
      }
    }

    return { isOverLimit: violations.length > 0, violations, warnings };
  }

  async generateMonthlyInvoices(): Promise<any[]> {
    const activeSubs = await this.prisma.zoneSubscription.findMany({
      where: { status: 'ACTIVE', nextBillingAt: { lte: new Date() } },
      include: { plan: true },
    });

    const invoices: any[] = [];
    for (const sub of activeSubs) {
      const invoiceNumber = `ZINV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(5, '0')}`;
      const invoice = await (this.prisma as any).zoneInvoice.create({
        data: {
          zoneId: sub.zoneId, subscriptionId: sub.id, invoiceNumber,
          period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          amount: BigInt(sub.plan.price), status: 'ISSUED', issuedAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      invoices.push(invoice);
      await this.prisma.zoneSubscription.update({ where: { id: sub.id }, data: { lastBilledAt: new Date(), nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    }
    return invoices;
  }
}
