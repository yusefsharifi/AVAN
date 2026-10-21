import { Test, TestingModule } from '@nestjs/testing';
import { ZoneManagementService } from './zone-management.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { SuperAdminGatewayService } from './super-admin-gateway.service';
import { AuditComplianceService } from './audit-compliance.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('ZoneManagementService', () => {
  let service: ZoneManagementService;
  let prisma: any;
  let redis: any;
  let gateway: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      zone: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 'mgr-1', firstName: 'Ali', lastName: 'Rezaei' }),
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
      },
      company: {
        count: jest.fn().mockResolvedValue(10),
      },
      ioTDevice: {
        count: jest.fn().mockResolvedValue(5),
      },
      zoneSubscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
      subscriptionPlan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'plan-1', code: 'BASIC' }),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitHealthUpdate: jest.fn(),
      emitZoneStatusChanged: jest.fn(),
    };

    auditCompliance = {
      logGlobalEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoneManagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: SuperAdminGatewayService, useValue: gateway },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<ZoneManagementService>(ZoneManagementService);
  });

  describe('onboardZone', () => {
    it('should create zone with correct data', async () => {
      prisma.zone.findFirst.mockResolvedValue(null);
      prisma.zone.create.mockResolvedValue({ id: 'zone-1', code: 'TEH-01' });

      const result = await service.onboardZone(
        {
          code: 'TEH-01',
          nameFa: 'شهرک صنعتی تهران',
          province: 'Tehran',
          city: 'Tehran',
          planCode: 'BASIC',
          managerFirstName: 'Ali',
          managerLastName: 'Rezaei',
          managerEmail: 'ali@test.com',
          managerPhone: '09121234567',
        } as any,
        'admin-1',
      );

      expect(prisma.zone.create).toHaveBeenCalled();
      expect(result.zone.code).toBe('TEH-01');
    });

    it('should throw if zone code already exists', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'existing-zone', code: 'TEH-01' });

      await expect(
        service.onboardZone(
          {
            code: 'TEH-01',
            nameFa: 'test',
            province: 'Tehran',
            city: 'Tehran',
            planCode: 'BASIC',
            managerFirstName: 'Ali',
            managerLastName: 'Rezaei',
            managerEmail: 'ali@test.com',
            managerPhone: '09121234567',
          } as any,
          'admin-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should create manager user with temporary password', async () => {
      prisma.zone.findFirst.mockResolvedValue(null);
      prisma.zone.create.mockResolvedValue({ id: 'zone-1', code: 'TEH-01' });

      await service.onboardZone(
        {
          code: 'TEH-01',
          nameFa: 'test',
          province: 'Tehran',
          city: 'Tehran',
          planCode: 'BASIC',
          managerFirstName: 'Ali',
          managerLastName: 'Rezaei',
          managerEmail: 'ali@test.com',
          managerPhone: '09121234567',
        } as any,
        'admin-1',
      );

      expect(prisma.user.create).toHaveBeenCalled();
      const userCall = prisma.user.create.mock.calls[0][0];
      expect(userCall.data.role).toBe('ZONE_MANAGER');
      expect(userCall.data.zoneId).toBe('zone-1');
    });

    it('should write global audit log', async () => {
      prisma.zone.findFirst.mockResolvedValue(null);
      prisma.zone.create.mockResolvedValue({ id: 'zone-1', code: 'TEH-01' });

      await service.onboardZone(
        {
          code: 'TEH-01',
          nameFa: 'test',
          province: 'Tehran',
          city: 'Tehran',
          planCode: 'BASIC',
          managerFirstName: 'Ali',
          managerLastName: 'Rezaei',
          managerEmail: 'ali@test.com',
          managerPhone: '09121234567',
        } as any,
        'admin-1',
      );

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalled();
    });
  });

  describe('suspendZone', () => {
    it('should set zone status to SUSPENDED', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });
      prisma.zone.update.mockResolvedValue({ id: 'zone-1', status: 'SUSPENDED' });

      const result = await service.suspendZone('zone-1', 'violation', 'admin-1');

      expect(prisma.zone.update).toHaveBeenCalledWith({
        where: { id: 'zone-1' },
        data: expect.objectContaining({ status: 'SUSPENDED' }),
      });
      expect(result.status).toBe('SUSPENDED');
    });

    it('should write global audit log for suspension', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });
      prisma.zone.update.mockResolvedValue({ id: 'zone-1', status: 'SUSPENDED' });

      await service.suspendZone('zone-1', 'violation', 'admin-1');

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'ZONE_SUSPENDED',
        'SUPER_ADMIN',
        'admin-1',
        'zone-1',
        'Zone',
        'zone-1',
        expect.objectContaining({ reason: 'violation' }),
      );
    });
  });

  describe('reactivateZone', () => {
    it('should set zone status to ACTIVE', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', status: 'SUSPENDED' });
      prisma.zone.update.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });

      const result = await service.reactivateZone('zone-1', 'admin-1');

      expect(prisma.zone.update).toHaveBeenCalledWith({
        where: { id: 'zone-1' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      });
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getAllZonesOverview', () => {
    it('should return empty array when no zones', async () => {
      prisma.zone.findMany.mockResolvedValue([]);

      const result = await service.getAllZonesOverview();

      expect(result).toEqual([]);
    });

    it('should include subscription and stats for each zone', async () => {
      prisma.zone.findMany.mockResolvedValue([
        { id: 'zone-1', code: 'TEH-01', nameFa: 'تهران', status: 'ACTIVE' },
      ]);
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', code: 'TEH-01', nameFa: 'تهران', status: 'ACTIVE', updatedAt: new Date() });

      const result = await service.getAllZonesOverview();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('zone');
    });
  });

  describe('getZoneOverview', () => {
    it('should throw if zone not found', async () => {
      prisma.zone.findUnique.mockResolvedValue(null);

      await expect(service.getZoneOverview('zone-999')).rejects.toThrow();
    });

    it('should return zone with stats', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', code: 'TEH-01', nameFa: 'تهران', status: 'ACTIVE', settings: {}, updatedAt: new Date() });

      const result = await service.getZoneOverview('zone-1');

      expect(result).toHaveProperty('zone');
      expect(result).toHaveProperty('stats');
    });
  });
});
