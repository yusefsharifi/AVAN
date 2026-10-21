import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService, FeatureFlagGuard } from './feature-flag.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditComplianceService } from './audit-compliance.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let prisma: any;
  let redis: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      featureFlag: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      featureFlagOverride: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      subscriptionPlan: {
        findFirst: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    auditCompliance = {
      logGlobalEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
  });

  describe('setFlag', () => {
    it('should upsert a feature flag override', async () => {
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE', defaultValue: false });
      prisma.featureFlagOverride.upsert.mockResolvedValue({ id: 'override-1', value: true });

      const result = await service.setFlag(
        { flagCode: 'HSE_MODULE', value: true, zoneId: 'zone-1', reason: 'Enable for testing' } as any,
        'admin-1',
      );

      expect(prisma.featureFlagOverride.upsert).toHaveBeenCalled();
      expect(result.value).toBe(true);
    });

    it('should clear Redis cache after setting flag', async () => {
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE' });
      prisma.featureFlagOverride.upsert.mockResolvedValue({ id: 'override-1' });

      await service.setFlag(
        { flagCode: 'HSE_MODULE', value: true, zoneId: 'zone-1' } as any,
        'admin-1',
      );

      expect(redis.del).toHaveBeenCalledWith('ff:HSE_MODULE:zone-1:global');
    });

    it('should throw if flag code not found', async () => {
      prisma.featureFlag.findFirst.mockResolvedValue(null);

      await expect(
        service.setFlag({ flagCode: 'NONEXISTENT', value: true } as any, 'admin-1'),
      ).rejects.toThrow('FLAG_NOT_FOUND');
    });

    it('should write global audit log', async () => {
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE' });
      prisma.featureFlagOverride.upsert.mockResolvedValue({ id: 'override-1' });

      await service.setFlag(
        { flagCode: 'HSE_MODULE', value: false, zoneId: 'zone-1', reason: 'Disabled for maintenance' } as any,
        'admin-1',
      );

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'FLAG_SET',
        'SUPER_ADMIN',
        'admin-1',
        'zone-1',
        'FeatureFlag',
        'flag-1',
        expect.objectContaining({ value: false }),
      );
    });
  });

  describe('getFlag', () => {
    it('should return cached value if available', async () => {
      redis.get.mockResolvedValue('true');

      const result = await service.getFlag('HSE_MODULE', 'zone-1');

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalled();
    });

    it('should check zone-specific override first', async () => {
      redis.get.mockResolvedValue(null);
      prisma.featureFlagOverride.findFirst.mockResolvedValueOnce({ value: true }); // zone override
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE' });

      const result = await service.getFlag('HSE_MODULE', 'zone-1');

      expect(result).toBe(true);
    });

    it('should fall back to default value', async () => {
      redis.get.mockResolvedValue(null);
      prisma.featureFlagOverride.findFirst.mockResolvedValue(null);
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE', defaultValue: true });

      const result = await service.getFlag('HSE_MODULE', 'zone-999');

      expect(result).toBe(true);
    });

    it('should cache result for 10 minutes', async () => {
      redis.get.mockResolvedValue(null);
      prisma.featureFlagOverride.findFirst.mockResolvedValue(null);
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'flag-1', code: 'HSE_MODULE', defaultValue: false });

      await service.getFlag('HSE_MODULE', 'zone-1');

      expect(redis.set).toHaveBeenCalledWith(
        'ff:HSE_MODULE:zone-1:global',
        expect.any(String),
        600,
      );
    });
  });

  describe('isModuleEnabled', () => {
    it('should return true if module flag is enabled', async () => {
      redis.get.mockResolvedValue('true');

      const result = await service.isModuleEnabled('HSE', 'zone-1');

      expect(result).toBe(true);
    });

    it('should return false if module flag is disabled', async () => {
      redis.get.mockResolvedValue('false');

      const result = await service.isModuleEnabled('HSE', 'zone-1');

      expect(result).toBe(false);
    });
  });

  describe('getEnabledModules', () => {
    it('should return list of enabled modules', async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        { code: 'HSE_MODULE', defaultValue: true, overrides: [{ value: true }] },
        { code: 'B2B_MODULE', defaultValue: false, overrides: [] },
        { code: 'IOT_MODULE', defaultValue: true, overrides: [{ value: false }] },
      ]);

      const result = await service.getEnabledModules('zone-1');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('seedDefaultFlags', () => {
    it('should upsert all default flags', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({ id: 'flag-new' });

      await service.seedDefaultFlags();

      // 12 default flags defined in seedDefaultFlags
      expect(prisma.featureFlag.upsert).toHaveBeenCalledTimes(12);
    });

    it('should use correct code for each flag', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({ id: 'flag-new' });

      await service.seedDefaultFlags();

      const firstCall = prisma.featureFlag.upsert.mock.calls[0][0];
      expect(firstCall.where.code).toBe('ANPR_MODULE');
    });
  });
});

describe('FeatureFlagGuard', () => {
  let guard: FeatureFlagGuard;
  let featureFlagService: any;

  beforeEach(() => {
    featureFlagService = {
      getFlag: jest.fn(),
    };
    guard = new FeatureFlagGuard(featureFlagService);
  });

  it('should return true if feature code metadata is not set', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { zoneId: 'zone-1' } }),
      }),
      getHandler: () => ({}),
    } as any;

    // Reflect.getMetadata returns undefined (no feature code)
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should check feature flag when code is set', async () => {
    featureFlagService.getFlag.mockResolvedValue(true);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { zoneId: 'zone-1' } }),
      }),
      getHandler: () => ({}),
    } as any;

    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('HSE_MODULE');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(featureFlagService.getFlag).toHaveBeenCalledWith('HSE_MODULE', 'zone-1');
  });

  it('should deny access when flag is disabled', async () => {
    featureFlagService.getFlag.mockResolvedValue(false);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { zoneId: 'zone-1' } }),
      }),
      getHandler: () => ({}),
    } as any;

    jest.spyOn(Reflect, 'getMetadata').mockReturnValue('HSE_MODULE');

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });
});
