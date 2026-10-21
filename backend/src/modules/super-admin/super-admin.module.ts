// M21: Super Admin Panel — Module
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { SuperAdminGatewayService } from './services/super-admin-gateway.service';
import { ZoneManagementService } from './services/zone-management.service';
import { SubscriptionService } from './services/subscription.service';
import { FeatureFlagService, FeatureFlagGuard } from './services/feature-flag.service';
import { SystemHealthService } from './services/system-health.service';
import { SystemConfigService } from './services/system-config.service';
import { GlobalUserManagementService } from './services/global-user-management.service';
import { AnnouncementService } from './services/announcement.service';
import { AuditComplianceService } from './services/audit-compliance.service';
import { PlatformMetricsService } from './services/platform-metrics.service';
import {
  SuperZoneController, SuperSubscriptionController, SuperFeatureFlagController,
  SuperUserController, SuperHealthController, SuperConfigController,
  SuperAnnouncementController, SuperAuditController, SuperMetricsController,
} from './controllers/super-admin.controller';

@Module({
  providers: [
    PrismaService, RedisService, AuditService,
    SuperAdminGatewayService, ZoneManagementService, SubscriptionService,
    FeatureFlagService, FeatureFlagGuard, SystemHealthService, SystemConfigService,
    GlobalUserManagementService, AnnouncementService, AuditComplianceService,
    PlatformMetricsService,
  ],
  controllers: [
    SuperZoneController, SuperSubscriptionController, SuperFeatureFlagController,
    SuperUserController, SuperHealthController, SuperConfigController,
    SuperAnnouncementController, SuperAuditController, SuperMetricsController,
  ],
  exports: [
    FeatureFlagService, FeatureFlagGuard, SubscriptionService,
    SystemConfigService, AuditComplianceService, AnnouncementService,
    SuperAdminGatewayService, PlatformMetricsService,
  ],
})
export class SuperAdminModule implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminModule.name);

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly configService: SystemConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly platformMetrics: PlatformMetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Super Admin module...');
    // Seed default feature flags
    await this.featureFlagService.seedDefaultFlags().catch((e) => this.logger.error(`Flag seed error: ${e}`));
    // Seed default system configuration
    await this.configService.seedDefaults().catch((e) => this.logger.error(`Config seed error: ${e}`));
    // Seed default subscription plans
    await this.seedDefaultPlans();
    this.logger.log('Super Admin module initialized');
  }

  private async seedDefaultPlans(): Promise<void> {
    const plans = [
      { code: 'TRIAL', nameFa: 'آزمایشی', nameEn: 'Trial', price: 0, maxCompanies: 10, maxUsers: 50, maxGates: 2, maxDevices: 5, storageGb: 5, apiCallsPerDay: 1000, smsCredits: 100, features: { modules: ['FINANCE', 'LOGISTICS'], anprEnabled: false, iotEnabled: false, b2bEnabled: false, cmmsEnabled: false, hseEnabled: false, hrEnabled: false, biEnabled: false, apiAccess: false, whiteLabel: false, prioritySupport: false }, sortOrder: 0 },
      { code: 'BASIC', nameFa: 'پایه', nameEn: 'Basic', price: 5000000, maxCompanies: 10, maxUsers: 100, maxGates: 3, maxDevices: 10, storageGb: 20, apiCallsPerDay: 5000, smsCredits: 500, features: { modules: ['FINANCE', 'LOGISTICS', 'HR'], anprEnabled: false, iotEnabled: false, b2bEnabled: false, cmmsEnabled: false, hseEnabled: true, hrEnabled: true, biEnabled: false, apiAccess: false, whiteLabel: false, prioritySupport: false }, sortOrder: 1 },
      { code: 'PROFESSIONAL', nameFa: 'حرفه‌ای', nameEn: 'Professional', price: 20000000, maxCompanies: 50, maxUsers: 500, maxGates: 5, maxDevices: 20, storageGb: 50, apiCallsPerDay: 10000, smsCredits: 1000, features: { modules: ['FINANCE', 'LOGISTICS', 'HR', 'HSE', 'CMMS', 'B2B', 'ANPR'], anprEnabled: true, iotEnabled: true, b2bEnabled: true, cmmsEnabled: true, hseEnabled: true, hrEnabled: true, biEnabled: true, apiAccess: true, whiteLabel: false, prioritySupport: false }, sortOrder: 2 },
      { code: 'ENTERPRISE', nameFa: 'سازمانی', nameEn: 'Enterprise', price: 50000000, maxCompanies: 9999, maxUsers: 99999, maxGates: 99, maxDevices: 999, storageGb: 500, apiCallsPerDay: 100000, smsCredits: 10000, features: { modules: ['ALL'], anprEnabled: true, iotEnabled: true, b2bEnabled: true, cmmsEnabled: true, hseEnabled: true, hrEnabled: true, biEnabled: true, apiAccess: true, whiteLabel: true, prioritySupport: true }, sortOrder: 3 },
    ];

    for (const p of plans) {
      try {
        await this.subscriptionService.createPlan(p as any, 'system').catch(() => {});
      } catch { /* plan may already exist */ }
    }
  }
}
