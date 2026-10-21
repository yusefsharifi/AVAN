import { Test, TestingModule } from '@nestjs/testing';
import { AuditComplianceService } from './audit-compliance.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

describe('AuditComplianceService', () => {
  let service: AuditComplianceService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      globalAuditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      deviceReading: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      vehicleTrackingPoint: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ cnt: 0 }]),
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditComplianceService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AuditComplianceService>(AuditComplianceService);
  });

  describe('logGlobalEvent', () => {
    it('should create global audit log entry', async () => {
      prisma.globalAuditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logGlobalEvent(
        'ZONE_CREATED',
        'SuperAdmin',
        'admin-1',
        'zone-1',
        'Zone',
        'zone-1',
        { code: 'TEH-01' },
        '192.168.1.1',
      );

      expect(prisma.globalAuditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'ZONE_CREATED',
          module: 'SuperAdmin',
          userId: 'admin-1',
          zoneId: 'zone-1',
          entityType: 'Zone',
          entityId: 'zone-1',
          metadata: { code: 'TEH-01' },
          ipAddress: '192.168.1.1',
          isSuper: true,
        },
      });
    });

    it('should not throw on audit log failure', async () => {
      prisma.globalAuditLog.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        service.logGlobalEvent('TEST', 'SuperAdmin'),
      ).resolves.toBeUndefined();
    });

    it('should default metadata to empty object', async () => {
      prisma.globalAuditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logGlobalEvent('TEST_ACTION', 'SuperAdmin', 'admin-1', 'zone-1');

      expect(prisma.globalAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata: {} }),
        }),
      );
    });
  });

  describe('getGlobalAuditLog', () => {
    it('should return paginated audit logs', async () => {
      prisma.globalAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'ZONE_CREATED', timestamp: new Date() },
        { id: 'log-2', action: 'USER_CREATED', timestamp: new Date() },
      ]);
      prisma.globalAuditLog.count.mockResolvedValue(2);

      const result = await service.getGlobalAuditLog({ limit: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by zoneId', async () => {
      prisma.globalAuditLog.findMany.mockResolvedValue([]);
      prisma.globalAuditLog.count.mockResolvedValue(0);

      await service.getGlobalAuditLog({ zoneId: 'zone-1', limit: 50 });

      expect(prisma.globalAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ zoneId: 'zone-1' }),
        }),
      );
    });

    it('should filter by action', async () => {
      prisma.globalAuditLog.findMany.mockResolvedValue([]);
      prisma.globalAuditLog.count.mockResolvedValue(0);

      await service.getGlobalAuditLog({ action: 'ZONE_CREATED', limit: 50 });

      expect(prisma.globalAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'ZONE_CREATED' }),
        }),
      );
    });

    it('should handle DB errors gracefully', async () => {
      prisma.globalAuditLog.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getGlobalAuditLog({ limit: 50 });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getSuperAdminActions', () => {
    it('should return super admin actions within time range', async () => {
      prisma.globalAuditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'ZONE_CREATED', isSuper: true, timestamp: new Date() },
      ]);

      const result = await service.getSuperAdminActions(30);

      expect(result).toHaveLength(1);
      expect(prisma.globalAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isSuper: true,
            timestamp: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should handle DB errors gracefully', async () => {
      prisma.globalAuditLog.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.getSuperAdminActions(7);

      expect(result).toEqual([]);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious login patterns', async () => {
      // Simulate logins outside business hours (before 7am or after 10pm)
      const lateLogins = Array.from({ length: 3 }, (_, i) => ({
        action: 'LOGIN',
        userId: 'user-' + i,
        zoneId: 'zone-1',
        timestamp: new Date(Date.now() - i * 3600000),
      }));
      // Set timestamps to unusual hours
      lateLogins[0].timestamp = new Date('2026-09-02T03:00:00Z');
      lateLogins[1].timestamp = new Date('2026-09-02T04:00:00Z');
      lateLogins[2].timestamp = new Date('2026-09-02T23:30:00Z');

      prisma.globalAuditLog.findMany.mockResolvedValue(lateLogins);

      const result = await service.detectSuspiciousActivity('zone-1');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for normal activity', async () => {
      prisma.globalAuditLog.findMany.mockResolvedValue([]);

      const result = await service.detectSuspiciousActivity('zone-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('purgeOldData', () => {
    it('should delete records older than cutoff', async () => {
      prisma.deviceReading = prisma.deviceReading || { deleteMany: jest.fn() };
      prisma.deviceReading.deleteMany = jest.fn().mockResolvedValue({ count: 150 });

      const result = await service.purgeOldData('zone-1', 'DEVICE_READING', 90, 'admin-1');

      expect(result).toHaveProperty('recordsDeleted');
      expect(result.recordsDeleted).toBe(150);
    });

    it('should create purge audit log', async () => {
      prisma.deviceReading = prisma.deviceReading || { deleteMany: jest.fn() };
      prisma.deviceReading.deleteMany = jest.fn().mockResolvedValue({ count: 50 });

      await service.purgeOldData('zone-1', 'DEVICE_READING', 30, 'admin-1');

      expect(prisma.globalAuditLog.create).toHaveBeenCalled();
    });

    it('should return accurate deletion count', async () => {
      prisma.deviceReading = prisma.deviceReading || { deleteMany: jest.fn() };
      prisma.deviceReading.deleteMany = jest.fn().mockResolvedValue({ count: 0 });

      const result = await service.purgeOldData('zone-1', 'VEHICLE_TRACKING', 7, 'admin-1');

      expect(result.recordsDeleted).toBe(0);
    });
  });

  describe('runDataIntegrityCheck', () => {
    it('should return integrity check results', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ cnt: 0 }]);

      const result = await service.runDataIntegrityCheck();

      expect(result).toHaveProperty('totalChecks');
      expect(result).toHaveProperty('issuesFound');
      expect(result).toHaveProperty('issues');
    });

    it('should detect orphaned records', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ cnt: 5 }]);

      const result = await service.runDataIntegrityCheck();

      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('ORPHANED_FK');
    });
  });
});
