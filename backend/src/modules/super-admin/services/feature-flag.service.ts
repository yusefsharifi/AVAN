// M21: Super Admin Panel — Feature Flag Service
import { Injectable, Logger, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { SetFeatureFlagDto } from '../dto/create-dtos';
import type { FlagStatusDto } from '../dto/enums';
import { AuditComplianceService } from './audit-compliance.service';

export const RequireFeature = (featureCode: string) => SetMetadata('featureCode', featureCode);

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async setFlag(dto: SetFeatureFlagDto, setBy: string): Promise<any> {
    const flag = await this.prisma.featureFlag.findFirst({ where: { code: dto.flagCode } });
    if (!flag) throw new Error('FLAG_NOT_FOUND');

    const override = await (this.prisma as any).featureFlagOverride.upsert({
      where: { flagId_zoneId_companyId: { flagId: flag.id, zoneId: dto.zoneId ?? undefined, companyId: dto.companyId ?? undefined } },
      create: {
        flagId: flag.id, zoneId: dto.zoneId, companyId: dto.companyId,
        value: dto.value, reason: dto.reason, setBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      update: { value: dto.value, reason: dto.reason, setBy, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null },
    });

    // Clear cache
    const cacheKey = `ff:${dto.flagCode}:${dto.zoneId || 'global'}:${dto.companyId || 'global'}`;
    await this.redis.del(cacheKey);

    await this.auditCompliance.logGlobalEvent('FLAG_SET', 'SUPER_ADMIN', setBy, dto.zoneId, 'FeatureFlag', flag.id, { code: dto.flagCode, value: dto.value });
    return override;
  }

  async getFlag(code: string, zoneId?: string, companyId?: string): Promise<boolean> {
    const cacheKey = `ff:${code}:${zoneId || 'global'}:${companyId || 'global'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached === 'true';

    const flag = await this.prisma.featureFlag.findFirst({ where: { code } });
    if (!flag) return false;

    // Resolution order: company → zone → global → plan → default
    let value = flag.defaultValue;

    // Check company override
    if (companyId) {
      const coOverride = await this.prisma.featureFlagOverride.findFirst({
        where: { flagId: flag.id, companyId, expiresAt: null },
      });
      if (coOverride) value = coOverride.value;
    }

    // Check zone override (higher priority than default, lower than company)
    if (zoneId && !companyId) {
      const zoneOverride = await this.prisma.featureFlagOverride.findFirst({
        where: { flagId: flag.id, zoneId, companyId: null, expiresAt: null },
      });
      if (zoneOverride) value = zoneOverride.value;
    }

    // Check global override
    const globalOverride = await this.prisma.featureFlagOverride.findFirst({
      where: { flagId: flag.id, zoneId: null, companyId: null, expiresAt: null },
    });
    if (globalOverride) value = globalOverride.value;

    await this.redis.set(cacheKey, String(value), 600);
    return value;
  }

  async getAllFlags(zoneId?: string): Promise<FlagStatusDto[]> {
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { code: 'asc' } });
    const results: FlagStatusDto[] = [];

    for (const flag of flags) {
      let value = flag.defaultValue;
      let source = 'default';
      let overridden = false;

      if (zoneId) {
        const zoneOverride = await this.prisma.featureFlagOverride.findFirst({
          where: { flagId: flag.id, zoneId, companyId: null },
        });
        if (zoneOverride) { value = zoneOverride.value; source = 'zone'; overridden = true; }
      }

      const globalOverride = await this.prisma.featureFlagOverride.findFirst({
        where: { flagId: flag.id, zoneId: null, companyId: null },
      });
      if (globalOverride) { value = globalOverride.value; source = 'global'; overridden = true; }

      results.push({ code: flag.code, nameFa: flag.nameFa, value, source, overridden });
    }
    return results;
  }

  async isModuleEnabled(module: string, zoneId: string): Promise<boolean> {
    return this.getFlag(`${module}_MODULE`, zoneId);
  }

  async getEnabledModules(zoneId: string): Promise<string[]> {
    const flags = await this.prisma.featureFlag.findMany({ where: { module: { not: null } } });
    const enabled: string[] = [];
    for (const flag of flags) {
      if (flag.module && await this.getFlag(flag.code, zoneId)) {
        enabled.push(flag.module);
      }
    }
    return enabled;
  }

  async seedDefaultFlags(): Promise<void> {
    const defaultFlags = [
      { code: 'ANPR_MODULE', nameFa: ' دوربین پلاک‌خوان', module: 'ANPR', defaultValue: false },
      { code: 'IOT_MODULE', nameFa: 'ادوات IoT', module: 'IoT', defaultValue: false },
      { code: 'B2B_MODULE', nameFa: 'بازار B2B', module: 'B2B', defaultValue: false },
      { code: 'CMMS_MODULE', nameFa: 'نگهداری و تعمیرات', module: 'CMMS', defaultValue: false },
      { code: 'HSE_MODULE', nameFa: 'ایمنی و بهداشت', module: 'HSE', defaultValue: false },
      { code: 'HR_MODULE', nameFa: 'منابع انسانی', module: 'HR', defaultValue: false },
      { code: 'BI_MODULE', nameFa: 'گزارشات و هوش تجاری', module: 'BI', defaultValue: false },
      { code: 'FINANCE_MODULE', nameFa: 'مالی', module: 'FINANCE', defaultValue: true },
      { code: 'LOGISTICS_MODULE', nameFa: 'لجستیک', module: 'LOGISTICS', defaultValue: true },
      { code: 'API_ACCESS', nameFa: 'دسترسی API', module: null, defaultValue: false },
      { code: 'WHITE_LABEL', nameFa: 'برند اختصاصی', module: null, defaultValue: false },
      { code: 'PRIORITY_SUPPORT', nameFa: 'پشتیبانی اولویت‌دار', module: null, defaultValue: false },
    ];

    for (const f of defaultFlags) {
      await this.prisma.featureFlag.upsert({
        where: { code: f.code },
        create: f,
        update: { nameFa: f.nameFa },
      });
    }
  }
}

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const zoneId = request.user?.zoneId;
    const featureCode = Reflect.getMetadata('featureCode', context.getHandler());
    if (!featureCode) return true;
    return this.featureFlagService.getFlag(featureCode, zoneId);
  }
}
