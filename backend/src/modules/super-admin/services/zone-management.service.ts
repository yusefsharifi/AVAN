// M21: Super Admin Panel — Zone Management Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { OnboardZoneDto } from '../dto/create-dtos';
import type { ZoneOverviewDto, ZoneUsageReportDto } from '../dto/enums';
import { SuperAdminGatewayService } from './super-admin-gateway.service';
import { AuditComplianceService } from './audit-compliance.service';
import { generateTempPassword, hashPassword } from '../utils/super-admin.utils';

@Injectable()
export class ZoneManagementService {
  private readonly logger = new Logger(ZoneManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: SuperAdminGatewayService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async onboardZone(dto: OnboardZoneDto, onboardedBy: string): Promise<any> {
    // Check code uniqueness
    const existing = await this.prisma.zone.findFirst({ where: { code: dto.code } });
    if (existing) throw new AppException('ZONE_ALREADY_EXISTS');

    // Create zone
    const zone = await this.prisma.zone.create({
      data: {
        code: dto.code,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        province: dto.province,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        mapCenterLat: dto.mapCenterLat,
        mapCenterLng: dto.mapCenterLng,
        totalAreaHectares: dto.totalAreaHectares,
        status: 'ACTIVE',
        settings: dto.settings || {},
      },
    });

    // Create manager user
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const manager = await this.prisma.user.create({
      data: {
        zoneId: zone.id,
        firstName: dto.managerFirstName,
        lastName: dto.managerLastName,
        email: dto.managerEmail,
        phone: dto.managerPhone,
        nationalId: dto.managerNationalId,
        passwordHash,
        role: 'ZONE_MANAGER',
        mustChangePassword: true,
      },
    });

    // Assign subscription
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { code: dto.planCode, isActive: true } });
    let subscription: any = null;
    if (plan) {
      subscription = await this.prisma.zoneSubscription.create({
        data: {
          zoneId: zone.id,
          planId: plan.id,
          status: dto.isTrial ? 'TRIAL' : 'ACTIVE',
          startDate: new Date(),
          trialEndsAt: dto.isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          isTrial: dto.isTrial || false,
          createdBy: onboardedBy,
        },
      });
    }

    await this.auditCompliance.logGlobalEvent('ZONE_ONBOARDED', 'SUPER_ADMIN', onboardedBy, zone.id, 'Zone', zone.id, { zoneCode: dto.code, planCode: dto.planCode });

    return { zone, manager: { ...manager, tempPassword }, subscription, tempPassword };
  }

  async suspendZone(zoneId: string, reason: string, suspendedBy: string, notifyUsers?: boolean): Promise<any> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');

    const updated = await this.prisma.zone.update({ where: { id: zoneId }, data: { status: 'SUSPENDED' } });

    if (notifyUsers) {
      // Notification would be sent via notification service
      this.logger.warn(`Zone suspended notification should be sent to zone ${zoneId}`);
    }

    await this.auditCompliance.logGlobalEvent('ZONE_SUSPENDED', 'SUPER_ADMIN', suspendedBy, zoneId, 'Zone', zoneId, { reason });
    this.gateway.emitZoneStatusChanged({ zoneId, zoneName: zone.nameFa, newStatus: 'SUSPENDED', changedBy: suspendedBy });
    return updated;
  }

  async reactivateZone(zoneId: string, reactivatedBy: string): Promise<any> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');

    const updated = await this.prisma.zone.update({ where: { id: zoneId }, data: { status: 'ACTIVE' } });
    await this.auditCompliance.logGlobalEvent('ZONE_REACTIVATED', 'SUPER_ADMIN', reactivatedBy, zoneId, 'Zone', zoneId, {});
    this.gateway.emitZoneStatusChanged({ zoneId, zoneName: zone.nameFa, newStatus: 'ACTIVE', changedBy: reactivatedBy });
    return updated;
  }

  async getZoneOverview(zoneId: string): Promise<ZoneOverviewDto> {
    const cacheKey = `zone:overview:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');

    const [companies, users, devices, subscription] = await Promise.all([
      this.prisma.company.count({ where: { zoneId } }),
      this.prisma.user.count({ where: { zoneId } }),
      this.prisma.ioTDevice.count({ where: { zoneId } }),
      this.prisma.zoneSubscription.findUnique({ where: { zoneId }, include: { plan: true } }),
    ]);

    const result: ZoneOverviewDto = {
      zone, subscription,
      manager: null,
      stats: { companies, users, devices, storage: 0 },
      usage: { companies, users, storage: 0, api: subscription?.usageApiCalls || 0, sms: subscription?.usageSmsCredits || 0 },
      healthScore: 85,
      lastActivity: zone.updatedAt,
      alerts: [],
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getAllZonesOverview(): Promise<ZoneOverviewDto[]> {
    const zones = await this.prisma.zone.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(zones.map((z) => this.getZoneOverview(z.id)));
  }

  async getZoneUsageReport(zoneId: string): Promise<ZoneUsageReportDto> {
    const subscription = await this.prisma.zoneSubscription.findUnique({ where: { zoneId }, include: { plan: true } });
    if (!subscription) throw new AppException('SUBSCRIPTION_NOT_FOUND');

    const plan = subscription.plan;
    const limits = { maxCompanies: plan.maxCompanies, maxUsers: plan.maxUsers, storageGb: plan.storageGb, apiCallsPerDay: plan.apiCallsPerDay, smsCredits: plan.smsCredits };
    const currentUsage = { companies: subscription.usageCompanies, users: subscription.usageUsers, storage: Number(subscription.usageStorageGb), api: subscription.usageApiCalls, sms: subscription.usageSmsCredits };
    const usagePercent = {
      companies: limits.maxCompanies > 0 ? (currentUsage.companies / limits.maxCompanies) * 100 : 0,
      users: limits.maxUsers > 0 ? (currentUsage.users / limits.maxUsers) * 100 : 0,
      storage: limits.storageGb > 0 ? (currentUsage.storage / limits.storageGb) * 100 : 0,
      api: limits.apiCallsPerDay > 0 ? (currentUsage.api / limits.apiCallsPerDay) * 100 : 0,
      sms: limits.smsCredits > 0 ? (currentUsage.sms / limits.smsCredits) * 100 : 0,
    };

    return { plan, limits, currentUsage, usagePercent, trend: [] };
  }

  async updateZoneFeatures(zoneId: string, features: object, updatedBy: string): Promise<void> {
    const subscription = await this.prisma.zoneSubscription.findUnique({ where: { zoneId } });
    if (!subscription) throw new AppException('SUBSCRIPTION_NOT_FOUND');
    await this.prisma.zoneSubscription.update({ where: { zoneId }, data: { customFeatures: features } });
    await this.auditCompliance.logGlobalEvent('ZONE_FEATURES_UPDATED', 'SUPER_ADMIN', updatedBy, zoneId, 'Zone', zoneId, { features });
  }
}
