import { Test, TestingModule } from '@nestjs/testing';
import { ZoneService } from './zones.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { AppException } from '../../common/exceptions/app.exception';
import { ZoneStatus } from '@prisma/client';

describe('ZoneService', () => {
  let service: ZoneService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      zone: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      zoneHoliday: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      gate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      company: { count: jest.fn() },
      plot: { count: jest.fn() },
      trafficLog: { count: jest.fn() },
      issuedPermit: { count: jest.fn() },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZoneService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToSuperAdmin: jest.fn() } },
      ],
    }).compile();

    service = module.get<ZoneService>(ZoneService);
  });

  describe('create', () => {
    it('should create a zone with default settings', async () => {
      prisma.zone.findUnique.mockResolvedValue(null);
      prisma.zone.create.mockResolvedValue({
        id: 'z-1', code: 'TEH-01', nameFa: 'تهران', settings: {},
      });

      const result = await service.create(
        { code: 'TEH-01', nameFa: 'تهران', province: 'تهران', city: 'تهران' },
        'user-1',
      );

      expect(result.id).toBe('z-1');
      expect(prisma.zone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'TEH-01',
            settings: expect.objectContaining({
              workingHours: { start: '07:00', end: '18:00' },
              weekends: [5, 6],
            }),
          }),
        }),
      );
    });

    it('should throw ZONE_CODE_TAKEN if code already exists', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(
          { code: 'TEH-01', nameFa: 'تهران', province: 'تهران', city: 'تهران' },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should throw on invalid lat range', async () => {
      prisma.zone.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { code: 'TEH-01', nameFa: 'تهران', province: 'تهران', city: 'تهران', mapCenterLat: 95 },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('findAll', () => {
    it('should return zones filtered by status', async () => {
      prisma.zone.findMany.mockResolvedValue([{ id: 'z-1', status: 'ACTIVE' }]);

      const result = await service.findAll({ status: ZoneStatus.ACTIVE });
      expect(result).toHaveLength(1);
      expect(prisma.zone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ZoneStatus.ACTIVE }),
        }),
      );
    });

    it('should search by name/code/city', async () => {
      prisma.zone.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'تهران' });

      expect(prisma.zone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ nameFa: expect.objectContaining({ contains: 'تهران' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return zone', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'z-1', nameFa: 'تهران' });
      const result = await service.findById('z-1');
      expect(result.id).toBe('z-1');
    });

    it('should throw if not found', async () => {
      prisma.zone.findFirst.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('update', () => {
    it('should update and clear cache', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'z-1' });
      prisma.zone.update.mockResolvedValue({ id: 'z-1', nameFa: 'Updated' });

      const result = await service.update('z-1', { nameFa: 'Updated' }, 'user-1');
      expect(result.nameFa).toBe('Updated');
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should soft delete and set status to CLOSED', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'z-1' });
      prisma.zone.update.mockResolvedValue({});

      await service.softDelete('z-1', 'user-1');

      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ZoneStatus.CLOSED }),
        }),
      );
    });
  });

  describe('settings', () => {
    it('should return cached settings', async () => {
      const settings = { workingHours: { start: '08:00', end: '17:00' } };
      redis.getJson.mockResolvedValue(settings);

      const result = await service.getSettings('z-1');
      expect(result).toEqual(settings);
    });

    it('should merge and update settings', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'z-1', settings: {} });
      redis.getJson.mockResolvedValue({ workingHours: { start: '07:00', end: '18:00' } });
      prisma.zone.update.mockResolvedValue({});

      await service.updateSettings('z-1', { maxDwellMinutes: 120 }, 'user-1');

      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({ maxDwellMinutes: 120 }),
          }),
        }),
      );
    });
  });

  describe('holidays', () => {
    it('should add a holiday', async () => {
      prisma.zoneHoliday.create.mockResolvedValue({ id: 'h-1', date: '1403-01-01', nameFa: 'نوروز' });

      const result = await service.addHoliday('z-1', { date: '1403-01-01', nameFa: 'نوروز', type: 'NATIONAL' }, 'user-1');
      expect(result.id).toBe('h-1');
    });

    it('should remove a holiday', async () => {
      prisma.zoneHoliday.delete.mockResolvedValue({});
      await service.removeHoliday('z-1', 'h-1');
      expect(prisma.zoneHoliday.delete).toHaveBeenCalledWith({ where: { id: 'h-1' } });
    });

    it('should filter holidays by year', async () => {
      prisma.zoneHoliday.findMany.mockResolvedValue([
        { id: 'h-1', date: '1403-01-01', nameFa: 'نوروز' },
        { id: 'h-2', date: '1402-12-29', nameFa: '-test' },
      ]);

      const result = await service.getHolidays('z-1', 1403);
      expect(result).toHaveLength(1);
    });
  });

  describe('gates', () => {
    it('should create a gate', async () => {
      prisma.gate.findFirst.mockResolvedValue(null);
      prisma.gate.create.mockResolvedValue({ id: 'g-1', code: 'G1' });

      const result = await service.createGate(
        'z-1',
        { code: 'G1', nameFa: 'دروازه ۱', type: 'ENTRY' as any },
        'user-1',
      );
      expect(result.id).toBe('g-1');
    });

    it('should throw if gate code is taken', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createGate('z-1', { code: 'G1', nameFa: 'test', type: 'ENTRY' as any }, 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should delete a gate', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'g-1' });
      prisma.gate.delete.mockResolvedValue({});

      await service.deleteGate('z-1', 'g-1');
      expect(prisma.gate.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
    });

    it('should throw GATE_NOT_FOUND when deleting non-existent gate', async () => {
      prisma.gate.findFirst.mockResolvedValue(null);

      await expect(service.deleteGate('z-1', 'nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('getZoneStatistics', () => {
    it('should return cached stats if available', async () => {
      const stats = { totalCompanies: 5, occupancyRate: 75 };
      redis.getJson.mockResolvedValue(stats);

      const result = await service.getZoneStatistics('z-1');
      expect(result).toEqual(stats);
    });

    it('should compute stats from DB if not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      prisma.company.count.mockResolvedValue(10);
      prisma.plot.count.mockResolvedValue(20);
      prisma.trafficLog.count.mockResolvedValue(5);
      prisma.issuedPermit.count.mockResolvedValue(3);

      const result: any = await service.getZoneStatistics('z-1');

      expect(result.totalCompanies).toBe(10);
      expect(result.totalPlots).toBe(20);
      expect(redis.setJson).toHaveBeenCalled();
    });
  });
});
