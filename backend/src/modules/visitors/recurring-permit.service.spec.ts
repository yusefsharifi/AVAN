import { Test, TestingModule } from '@nestjs/testing';
import { RecurringPermitService } from './recurring-permit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';

describe('RecurringPermitService', () => {
  let service: RecurringPermitService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      recurringVisitorPermit: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      visitorBlacklist: { findFirst: jest.fn() },
      visitorTracking: { count: jest.fn() },
    };
    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringPermitService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<RecurringPermitService>(RecurringPermitService);
  });

  describe('validate', () => {
    it('should allow on valid permit within date/time/window', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.recurringVisitorPermit.findFirst.mockResolvedValue({
        id: 'rp1',
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: futureDate,
        allowedGates: ['g1'],
        allowedDays: [new Date().getDay()],
        allowedTimeStart: '00:00',
        allowedTimeEnd: '23:59',
        maxVisitsPerDay: 5,
        visitorNationalId: '1234567890',
      });
      prisma.visitorTracking.count.mockResolvedValue(2);

      const result = await service.validate(
        'IDOP:RECURRING:rp1:hash',
        'g1',
        'z1',
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject expired permit', async () => {
      prisma.recurringVisitorPermit.findFirst.mockResolvedValue({
        id: 'rp1',
        isActive: true,
        validFrom: new Date(Date.now() - 86400000 * 30),
        validUntil: new Date(Date.now() - 86400000),
        allowedGates: ['g1'],
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeStart: '00:00',
        allowedTimeEnd: '23:59',
        maxVisitsPerDay: 5,
        visitorNationalId: '1234567890',
      });

      const result = await service.validate(
        'IDOP:RECURRING:rp1:hash',
        'g1',
        'z1',
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('منقضی');
    });

    it('should reject at wrong gate', async () => {
      prisma.recurringVisitorPermit.findFirst.mockResolvedValue({
        id: 'rp1',
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        allowedGates: ['g1'],
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeStart: '00:00',
        allowedTimeEnd: '23:59',
        maxVisitsPerDay: 5,
        visitorNationalId: '1234567890',
      });

      const result = await service.validate(
        'IDOP:RECURRING:rp1:hash',
        'g2',
        'z1',
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('ورودی');
    });

    it('should reject if max visits per day exceeded', async () => {
      prisma.recurringVisitorPermit.findFirst.mockResolvedValue({
        id: 'rp1',
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        allowedGates: ['g1'],
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        allowedTimeStart: '00:00',
        allowedTimeEnd: '23:59',
        maxVisitsPerDay: 2,
        visitorNationalId: '1234567890',
      });
      prisma.visitorTracking.count.mockResolvedValue(2);

      const result = await service.validate(
        'IDOP:RECURRING:rp1:hash',
        'g1',
        'z1',
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('حداکثر');
    });

    it('should reject inactive permit', async () => {
      prisma.recurringVisitorPermit.findFirst.mockResolvedValue({
        id: 'rp1',
        isActive: false,
      });

      const result = await service.validate(
        'IDOP:RECURRING:rp1:hash',
        'g1',
        'z1',
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('create', () => {
    it('should require nationalId for recurring permits', async () => {
      await expect(
        service.create(
          {
            zoneId: 'z1',
            companyId: 'c1',
            visitorName: 'Test',
            visitorPhone: '09120000000',
            permitType: 'DAILY',
            allowedDays: [0, 1, 2, 3, 4],
            allowedTimeStart: '08:00',
            allowedTimeEnd: '17:00',
            validFrom: '2024-01-01',
            validUntil: '2024-12-31',
          } as any,
          'manager1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('revoke', () => {
    it('should revoke permit and set isActive=false', async () => {
      prisma.recurringVisitorPermit.findUnique.mockResolvedValue({ id: 'rp1', zoneId: 'z1' });
      prisma.recurringVisitorPermit.update.mockResolvedValue({ id: 'rp1', isActive: false });

      const result = await service.revoke('rp1', 'violated rules', 'manager1');
      expect(result.isActive).toBe(false);
    });
  });
});
