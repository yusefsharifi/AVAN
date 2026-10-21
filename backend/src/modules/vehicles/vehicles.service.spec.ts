import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      vehicle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      vehicleAccessPermit: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      trafficLog: {
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
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
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  describe('register', () => {
    it('should create a vehicle successfully', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        id: 'v-1', plate: '12B345', type: 'SEDAN', zoneId: 'zone-1',
      });

      const result = await service.register(
        { zoneId: 'zone-1', plate: '12B345', type: 'SEDAN' as any },
        'user-1',
      );

      expect(result.id).toBe('v-1');
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('should throw PLATE_DUPLICATE if vehicle already exists', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register(
          { zoneId: 'zone-1', plate: '12B345', type: 'SEDAN' as any },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('findAll', () => {
    it('should return filtered vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([{ id: 'v-1', plate: '12B345' }]);

      const result = await service.findAll('zone-1', { plate: '12B' });

      expect(result).toHaveLength(1);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ zoneId: 'zone-1' }),
          take: 50,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return vehicle with permits', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v-1',
        accessPermits: [],
      });

      const result = await service.findById('v-1');
      expect(result.id).toBe('v-1');
    });

    it('should throw if vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('lookupVehicle', () => {
    it('should return cached result if available', async () => {
      const cachedResult = { vehicle: { id: 'v-1' }, currentlyInside: true };
      redis.getJson.mockResolvedValue(cachedResult);

      const result = await service.lookupVehicle('12B345', 'zone-1');
      expect(result).toEqual(cachedResult);
      expect(prisma.vehicle.findFirst).not.toHaveBeenCalled();
    });

    it('should query and cache if not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', plate: '12B345', company: null });
      prisma.vehicleAccessPermit.findFirst.mockResolvedValue(null);
      prisma.trafficLog.findFirst.mockResolvedValue(null);
      prisma.trafficLog.count.mockResolvedValue(0);

      const result: any = await service.lookupVehicle('12B345', 'zone-1');

      expect(result.vehicle).toBeDefined();
      expect(result.currentlyInside).toBe(false);
      expect(result.visitCount30Days).toBe(0);
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update vehicle fields', async () => {
      prisma.vehicle.update.mockResolvedValue({ id: 'v-1', brand: 'Toyota' });

      const result = await service.update('v-1', { brand: 'Toyota' });
      expect(result.brand).toBe('Toyota');
    });
  });

  describe('softDelete', () => {
    it('should soft delete a vehicle', async () => {
      prisma.vehicle.update.mockResolvedValue({});
      await service.softDelete('v-1');
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('issuePermit', () => {
    it('should create an access permit', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v-1',
        zoneId: 'zone-1',
        companyId: null,
        accessPermits: [],
      });
      prisma.vehicleAccessPermit.create.mockResolvedValue({
        id: 'permit-1',
        type: 'DAILY',
      });

      const result = await service.issuePermit(
        'v-1',
        { type: 'DAILY' as any, allowedGates: ['gate-1'] },
        'user-1',
      );

      expect(result.id).toBe('permit-1');
      expect(prisma.vehicleAccessPermit.create).toHaveBeenCalled();
    });
  });

  describe('revokePermit', () => {
    it('should revoke a permit', async () => {
      prisma.vehicleAccessPermit.update.mockResolvedValue({});
      await service.revokePermit('permit-1', 'expired', 'user-1');
      expect(prisma.vehicleAccessPermit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('getTrafficHistory', () => {
    it('should return traffic history for a vehicle', async () => {
      prisma.trafficLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      const result = await service.getTrafficHistory('v-1');
      expect(result).toHaveLength(1);
      expect(prisma.trafficLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
