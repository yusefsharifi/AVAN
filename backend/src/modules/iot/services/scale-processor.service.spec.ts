import { Test, TestingModule } from '@nestjs/testing';
import { ScaleProcessorService } from './scale-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';
import { MqttService } from './mqtt.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('ScaleProcessorService', () => {
  let service: ScaleProcessorService;
  let prisma: any;
  let redis: any;
  let gateway: any;
  let mqtt: any;

  const mockScaleDevice = {
    id: 'scale-1',
    deviceId: 'KVH-WSCA-0001',
    zoneId: 'zone-1',
    type: 'WEIGH_SCALE',
    isOnline: true,
    mqttTopic: 'idop/zone-1/WEIGH_SCALE/KVH-WSCA-0001',
    config: { maxCapacity: 60000, precision: 0.001 },
  };

  const mockReadingDto = {
    deviceId: 'KVH-WSCA-0001',
    zoneId: 'zone-1',
    weight: 25000,
    unit: 'kg',
    isStable: true,
    confidence: 98,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = {
      deviceReading: {
        create: jest.fn().mockResolvedValue({ id: 'reading-1' }),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ioTDevice: {
        findFirst: jest.fn().mockResolvedValue(mockScaleDevice),
        update: jest.fn(),
      },
      deviceAlert: {
        create: jest.fn(),
      },
      deviceCommand: {
        create: jest.fn().mockResolvedValue({ id: 'cmd-1' }),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitScaleReading: jest.fn(),
      emitScaleStable: jest.fn(),
      emitScaleOverload: jest.fn(),
    };

    mqtt = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScaleProcessorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
        { provide: MqttService, useValue: mqtt },
      ],
    }).compile();

    service = module.get<ScaleProcessorService>(ScaleProcessorService);
  });

  describe('processReading', () => {
    it('should convert ton to kg correctly', async () => {
      const result = await service.processReading({ ...mockReadingDto, weight: 25, unit: 'ton' });

      expect(result.weight).toBe(25000);
      expect(result.unit).toBe('kg');
    });

    it('should detect overload condition', async () => {
      const result = await service.processReading({ ...mockReadingDto, weight: 65000 });

      expect(result.isOverload).toBe(true);
      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'OVERLOAD', severity: 'WARNING' }),
        }),
      );
    });

    it('should detect vehicle on scale for weight > 200kg', async () => {
      const result = await service.processReading({ ...mockReadingDto, weight: 25000, isStable: true });

      expect(result.vehicleOnScale).toBe(true);
    });

    it('should not detect vehicle for weight <= 200kg', async () => {
      const result = await service.processReading({ ...mockReadingDto, weight: 50, isStable: true });

      expect(result.vehicleOnScale).toBe(false);
    });

    it('should cache reading in Redis with 30s TTL', async () => {
      await service.processReading(mockReadingDto);

      expect(redis.set).toHaveBeenCalledWith(
        'iot:scale:KVH-WSCA-0001',
        expect.any(String),
        30,
      );
    });

    it('should emit scale:reading socket event', async () => {
      await service.processReading(mockReadingDto);

      expect(gateway.emitScaleReading).toHaveBeenCalledWith(
        'KVH-WSCA-0001',
        expect.objectContaining({ weight: 25000, isStable: true }),
      );
    });

    it('should emit scale:stable when weight > 200kg and stable', async () => {
      await service.processReading({ ...mockReadingDto, weight: 25000, isStable: true });

      expect(gateway.emitScaleStable).toHaveBeenCalled();
    });

    it('should mark reading as processed', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.deviceReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isProcessed: true }),
        }),
      );
    });

    it('should emit overload socket event to zone', async () => {
      await service.processReading({ ...mockReadingDto, weight: 65000 });

      expect(gateway.emitScaleOverload).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({ weight: 65000, maxCapacity: 60000 }),
      );
    });
  });

  describe('getCurrentReading', () => {
    it('should return cached reading', async () => {
      const cachedData = { weight: 25000, unit: 'kg', isStable: true, confidence: 98, lastReadingAt: new Date().toISOString(), isOverload: false, vehicleOnScale: true };
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getCurrentReading('KVH-WSCA-0001');

      expect(result.weight).toBe(25000);
      expect(result.isStable).toBe(true);
    });

    it('should return default when no cache', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getCurrentReading('KVH-WSCA-0001');

      expect(result.weight).toBe(0);
      expect(result.isOnline).toBe(false);
    });
  });

  describe('tare', () => {
    it('should create SCALE_TARE command', async () => {
      await service.tare('KVH-WSCA-0001', 'operator-1');

      expect(prisma.deviceCommand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'SCALE_TARE' }),
        }),
      );
    });

    it('should publish MQTT command', async () => {
      await service.tare('KVH-WSCA-0001', 'operator-1');

      expect(mqtt.publish).toHaveBeenCalledWith(
        'idop/zone-1/WEIGH_SCALE/KVH-WSCA-0001/cmd',
        expect.objectContaining({ type: 'SCALE_TARE' }),
        { qos: 1 },
      );
    });
  });

  describe('detectAxleWeights', () => {
    it('should return axle data from cache', async () => {
      const cachedData = { weight: 25000, axle1: 8000, axle2: 9000, axle3: 8000, isOverload: false };
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.detectAxleWeights('KVH-WSCA-0001');

      expect(result.axle1).toBe(8000);
      expect(result.axle2).toBe(9000);
      expect(result.axle3).toBe(8000);
      expect(result.total).toBe(25000);
    });

    it('should return zeroed data when no cache', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.detectAxleWeights('KVH-WSCA-0001');

      expect(result.axle1).toBeNull();
      expect(result.total).toBe(0);
    });
  });
});
