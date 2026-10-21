import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditComplianceService } from './audit-compliance.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: any;
  let redis: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      subscriptionPlan: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      zoneSubscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      zoneInvoice: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      zone: {
        count: jest.fn().mockResolvedValue(5),
      },
      company: {
        count: jest.fn().mockResolvedValue(10),
      },
      user: {
        count: jest.fn().mockResolvedValue(50),
      },
      ioTDevice: {
        count: jest.fn().mockResolvedValue(8),
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
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(null);
      prisma.subscriptionPlan.create.mockResolvedValue({
        id: 'plan-1',
        code: 'PRO',
        nameFa: 'حرفه‌ای',
        price: BigInt(20000000),
      });

      const result = await service.createPlan(
        {
          code: 'PRO',
          nameFa: 'حرفه‌ای',
          nameEn: 'Professional',
          price: BigInt(20000000),
          billingCycle: 'MONTHLY',
          maxCompanies: 50,
          maxUsers: 500,
          maxGates: 10,
          maxDevices: 20,
          storageGb: 100,
          apiCallsPerDay: 50000,
          smsCredits: 5000,
          features: { modules: ['GATE', 'LOGISTICS'] },
        } as any,
        'admin-1',
      );

      expect(prisma.subscriptionPlan.create).toHaveBeenCalled();
      expect(result.code).toBe('PRO');
    });

    it('should throw if plan code already exists', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'existing', code: 'PRO' });

      await expect(
        service.createPlan({ code: 'PRO', nameFa: 'test', nameEn: 'test', price: BigInt(1000), billingCycle: 'MONTHLY', maxCompanies: 10, maxUsers: 100, maxGates: 5, maxDevices: 10, storageGb: 10, apiCallsPerDay: 1000, smsCredits: 100, features: {} } as any, 'admin-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updatePlan', () => {
    it('should update existing plan', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'plan-1', code: 'PRO' });
      prisma.subscriptionPlan.update.mockResolvedValue({ id: 'plan-1', nameFa: 'جدید' });

      const result = await service.updatePlan('plan-1', { nameFa: 'جدید' });

      expect(prisma.subscriptionPlan.update).toHaveBeenCalled();
      expect(result.nameFa).toBe('جدید');
    });

    it('should throw if plan not found', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.updatePlan('plan-999', { nameFa: 'test' })).rejects.toThrow(AppException);
    });
  });

  describe('assignPlan', () => {
    it('should assign plan to zone', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'plan-1', code: 'BASIC', features: {} });
      prisma.zoneSubscription.findUnique.mockResolvedValue(null);
      prisma.zoneSubscription.upsert.mockResolvedValue({ id: 'sub-1', zoneId: 'zone-1', planId: 'plan-1' });

      const result = await service.assignPlan(
        { zoneId: 'zone-1', planCode: 'BASIC', startDate: '2026-01-01' } as any,
        'admin-1',
      );

      expect(prisma.zoneSubscription.upsert).toHaveBeenCalled();
      expect(result.zoneId).toBe('zone-1');
    });

    it('should throw if zone already has active subscription', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'plan-1', code: 'BASIC', features: {} });
      prisma.zoneSubscription.findUnique.mockResolvedValue({ id: 'existing-sub', status: 'ACTIVE' });

      await expect(
        service.assignPlan({ zoneId: 'zone-1', planCode: 'BASIC', startDate: '2026-01-01' } as any, 'admin-1'),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all plans', async () => {
      prisma.subscriptionPlan.findMany.mockResolvedValue([
        { id: 'plan-1', code: 'BASIC', price: BigInt(5000000) },
        { id: 'plan-2', code: 'PRO', price: BigInt(20000000) },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('getZoneSubscription', () => {
    it('should return zone subscription', async () => {
      prisma.zoneSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        zoneId: 'zone-1',
        status: 'ACTIVE',
        planId: 'plan-1',
      });

      const result = await service.getZoneSubscription('zone-1');

      expect(result.zoneId).toBe('zone-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should return null if no subscription found', async () => {
      prisma.zoneSubscription.findUnique.mockResolvedValue(null);

      const result = await service.getZoneSubscription('zone-999');

      expect(result).toBeNull();
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for zone', async () => {
      prisma.zoneSubscription.findUnique.mockResolvedValue({ id: 'sub-1', zoneId: 'zone-1' });
      prisma.zoneInvoice.findMany.mockResolvedValue([
        { id: 'inv-1', zoneId: 'zone-1', amount: BigInt(5000000), status: 'PAID' },
      ]);

      const result = await service.getInvoices('zone-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PAID');
    });
  });

  describe('checkUsageLimits', () => {
    it('should return under-limit status', async () => {
      prisma.zoneSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        zoneId: 'zone-1',
        planId: 'plan-1',
        usageCompanies: 5,
        usageUsers: 50,
        plan: {
          id: 'plan-1',
          maxCompanies: 50,
          maxUsers: 500,
          maxGates: 10,
          maxDevices: 20,
          storageGb: 100,
          apiCallsPerDay: 10000,
          smsCredits: 1000,
        },
      });

      const result = await service.checkUsageLimits('zone-1');

      expect(result.isOverLimit).toBe(false);
    });

    it('should detect over-limit usage', async () => {
      prisma.zoneSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        zoneId: 'zone-1',
        planId: 'plan-1',
        usageCompanies: 55,
        usageUsers: 600,
        plan: {
          id: 'plan-1',
          maxCompanies: 50,
          maxUsers: 500,
          maxGates: 10,
          maxDevices: 20,
          storageGb: 100,
          apiCallsPerDay: 10000,
          smsCredits: 1000,
        },
      });

      const result = await service.checkUsageLimits('zone-1');

      expect(result.isOverLimit).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
});
