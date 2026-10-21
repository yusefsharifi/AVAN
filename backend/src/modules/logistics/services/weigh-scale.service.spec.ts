import { Test, TestingModule } from '@nestjs/testing';
import { WeighScaleService } from './weigh-scale.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('WeighScaleService', () => {
  let service: WeighScaleService;
  let prisma: any;
  let redis: any;
  let audit: any;

  const mockZone = {
    id: 'zone-1',
    settings: { weightDiscrepancyThreshold: 5, weighingFeePerTon: 50000 },
  };

  const mockScale = {
    id: 'scale-1',
    zoneId: 'zone-1',
    code: 'SCALE-01',
    nameFa: 'باسکول اصلی',
    capacity: 60,
    precision: 0.001,
    status: 'ACTIVE',
    isAutoCapture: false,
  };

  beforeEach(async () => {
    prisma = {
      weighScale: {
        findUnique: jest.fn().mockResolvedValue(mockScale),
        findFirst: jest.fn().mockResolvedValue(mockScale),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      weighRecord: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
      },
      waybill: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      shipmentTracking: { create: jest.fn() },
      zone: { findUnique: jest.fn().mockResolvedValue(mockZone) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'op-1', firstName: 'علی', lastName: 'رضایی' }) },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      incrWithExpiry: jest.fn().mockResolvedValue(1),
    };

    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeighScaleService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<WeighScaleService>(WeighScaleService);
  });

  describe('recordWeight', () => {
    it('should compute netWeight = grossWeight - tareWeight', async () => {
      prisma.weighRecord.create.mockResolvedValue({
        id: 'wr-1',
        netWeight: 8.5,
        grossWeight: 12,
        tareWeight: 3.5,
      });
      prisma.weighRecord.findMany.mockResolvedValue([]);
      prisma.waybill.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'علی', lastName: 'رضایی' });

      const result = await service.recordWeight(
        {
          scaleId: 'scale-1',
          vehiclePlate: '44L123',
          vehicleType: 'TRUCK',
          weighType: 'GROSS',
          grossWeight: 12,
          tareWeight: 3.5,
        },
        'op-1',
        'zone-1',
      );

      expect(prisma.weighRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grossWeight: 12,
            tareWeight: 3.5,
            netWeight: 8.5,
          }),
        }),
      );
    });

    it('should flag tamper if discrepancy > 5%', async () => {
      prisma.waybill.findUnique.mockResolvedValue({
        id: 'wb-1',
        quantity: 10, // declared 10 ton
      });
      prisma.weighRecord.findMany.mockResolvedValue([]);
      prisma.weighRecord.create.mockResolvedValue({
        id: 'wr-1',
        isTamperFlag: true,
        tamperReason: 'وزن با بارنامه مغایرت دارد',
      });
      prisma.user.findUnique.mockResolvedValue({ firstName: 'علی', lastName: 'رضایی' });

      const result = await service.recordWeight(
        {
          scaleId: 'scale-1',
          waybillId: 'wb-1',
          vehiclePlate: '44L123',
          vehicleType: 'TRUCK',
          weighType: 'SINGLE',
          grossWeight: 12, // 12 vs declared 10 = 20% discrepancy
        },
        'op-1',
        'zone-1',
      );

      expect(prisma.weighRecord.create).toHaveBeenCalled();
      const createCall = prisma.weighRecord.create.mock.calls[0][0];
      expect(createCall.data.isTamperFlag).toBe(true);
      expect(createCall.data.tamperReason).toContain('مغایرت');
    });

    it('should reject stable=false from sensor reading', async () => {
      prisma.weighScale.findUnique.mockResolvedValue({
        ...mockScale,
        isAutoCapture: true,
      });
      redis.get.mockResolvedValue(JSON.stringify({
        weight: 10,
        isStable: false,
        confidence: 95,
      }));

      await expect(
        service.recordWeight(
          {
            scaleId: 'scale-1',
            vehiclePlate: '44L123',
            vehicleType: 'TRUCK',
            weighType: 'GROSS',
            grossWeight: 10,
          },
          'op-1',
          'zone-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should calculate weighing fee correctly', async () => {
      prisma.weighRecord.create.mockResolvedValue({ id: 'wr-1', chargeAmount: BigInt(425000) });
      prisma.weighRecord.findMany.mockResolvedValue([]);
      prisma.waybill.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'علی', lastName: 'رضایی' });

      await service.recordWeight(
        {
          scaleId: 'scale-1',
          vehiclePlate: '44L123',
          vehicleType: 'TRUCK',
          weighType: 'SINGLE',
          grossWeight: 8.5, // 8.5 * 50000 = 425000 IRR
        },
        'op-1',
        'zone-1',
      );

      const createCall = prisma.weighRecord.create.mock.calls[0][0];
      expect(createCall.data.chargeAmount).toBe(BigInt(425000));
    });

    it('should update linked waybill weight fields', async () => {
      prisma.waybill.findUnique.mockResolvedValue({
        id: 'wb-1',
        quantity: 10,
        zoneId: 'zone-1',
      });
      prisma.weighRecord.create.mockResolvedValue({ id: 'wr-1', netWeight: 10.2 });
      prisma.weighRecord.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'علی', lastName: 'رضایی' });

      await service.recordWeight(
        {
          scaleId: 'scale-1',
          waybillId: 'wb-1',
          vehiclePlate: '44L123',
          vehicleType: 'TRUCK',
          weighType: 'SINGLE',
          grossWeight: 10.2,
        },
        'op-1',
        'zone-1',
      );

      expect(prisma.waybill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wb-1' },
          data: expect.objectContaining({
            grossWeight: 10.2,
            netWeight: 10.2,
            status: 'WEIGHED',
          }),
        }),
      );
    });
  });

  describe('receiveSensorReading', () => {
    it('should cache reading in Redis with 30s TTL', async () => {
      await service.receiveSensorReading({
        deviceId: 'device-1',
        scaleId: 'scale-1',
        weight: 10000, // 10,000 kg = 10 ton
        isStable: true,
        confidence: 95,
        timestamp: new Date().toISOString(),
      });

      expect(redis.set).toHaveBeenCalledWith(
        'scale:reading:scale-1',
        expect.any(String),
        30,
      );
    });

    it('should emit overload alert when over capacity', async () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      await service.receiveSensorReading({
        deviceId: 'device-1',
        scaleId: 'scale-1',
        weight: 65000, // 65,000 kg = 65 ton > 60 ton capacity
        isStable: true,
        confidence: 95,
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OVERLOAD'),
      );
    });
  });

  describe('voidWeighRecord', () => {
    it('should void a record', async () => {
      prisma.weighRecord.findUnique.mockResolvedValue({
        id: 'wr-1',
        zoneId: 'zone-1',
        isVoided: false,
        waybillId: null,
      });
      prisma.weighRecord.update.mockResolvedValue({});

      const result = await service.voidWeighRecord('wr-1', 'اشتباه در وزن‌کشی', 'mgr-1');

      expect(prisma.weighRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isVoided: true }),
        }),
      );
    });

    it('should reject voiding already voided record', async () => {
      prisma.weighRecord.findUnique.mockResolvedValue({
        id: 'wr-1',
        isVoided: true,
      });

      await expect(
        service.voidWeighRecord('wr-1', 'reason', 'mgr-1'),
      ).rejects.toThrow(AppException);
    });

    it('should recompute waybill after void', async () => {
      prisma.weighRecord.findUnique.mockResolvedValue({
        id: 'wr-1',
        zoneId: 'zone-1',
        isVoided: false,
        waybillId: 'wb-1',
      });
      prisma.weighRecord.update.mockResolvedValue({});
      prisma.weighRecord.findFirst.mockResolvedValue(null); // No other valid weighing
      prisma.waybill.update.mockResolvedValue({});

      await service.voidWeighRecord('wr-1', 'reason', 'mgr-1');

      expect(prisma.waybill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wb-1' },
          data: expect.objectContaining({ status: 'AT_SCALE' }),
        }),
      );
    });
  });

  describe('getOperatorDashboard', () => {
    it('should return scale info, pending waybills, and today stats', async () => {
      prisma.weighScale.findUnique.mockResolvedValue(mockScale);
      redis.get.mockResolvedValue(JSON.stringify({ weight: 10, isStable: true, isOnline: true }));
      prisma.waybill.findMany.mockResolvedValue([{ id: 'wb-1', status: 'AT_SCALE' }]);
      prisma.weighRecord.aggregate.mockResolvedValue({
        _count: 5,
        _sum: { netWeight: 50, chargeAmount: BigInt(2500000) },
      });
      prisma.weighRecord.count.mockResolvedValue(1);
      prisma.weighRecord.findMany.mockResolvedValue([]);

      const result = await service.getOperatorDashboard('op-1', 'scale-1');

      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('currentReading');
      expect(result).toHaveProperty('pendingWaybills');
      expect(result).toHaveProperty('todayStats');
      expect(result.todayStats.totalWeighings).toBe(5);
    });
  });
});
