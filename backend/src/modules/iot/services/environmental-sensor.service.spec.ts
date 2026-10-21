import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentalSensorService } from './environmental-sensor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';

describe('EnvironmentalSensorService', () => {
  let service: EnvironmentalSensorService;
  let prisma: any;
  let redis: any;
  let gateway: any;

  const mockSensorDevice = {
    id: 'env-1',
    deviceId: 'KVH-ENV-0001',
    zoneId: 'zone-1',
    type: 'ENVIRONMENTAL',
    name: 'Air Quality Sensor',
    config: {},
  };

  const mockReadingDto = {
    deviceId: 'KVH-ENV-0001',
    zoneId: 'zone-1',
    temperature: 32,
    humidity: 55,
    co2: 800,
    co: 5,
    noiseLevel: 70,
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
        findFirst: jest.fn().mockResolvedValue(mockSensorDevice),
        findMany: jest.fn().mockResolvedValue([mockSensorDevice]),
        updateMany: jest.fn(),
      },
      deviceAlert: {
        create: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    gateway = {
      emitEnvironmentalAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentalSensorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<EnvironmentalSensorService>(EnvironmentalSensorService);
  });

  describe('processReading', () => {
    it('should save DeviceReading with ENVIRONMENTAL type', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.deviceReading.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'ENVIRONMENTAL' }),
        }),
      );
    });

    it('should cache current values in Redis with 5min TTL', async () => {
      await service.processReading(mockReadingDto);

      expect(redis.set).toHaveBeenCalledWith(
        'iot:env:KVH-ENV-0001',
        expect.any(String),
        300,
      );
    });

    it('should create WARNING alert when CO2 > 1000 ppm', async () => {
      await service.processReading({ ...mockReadingDto, co2: 1200 });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'TEMPERATURE_HIGH', severity: 'WARNING', message: expect.stringContaining('CO2') }),
        }),
      );
    });

    it('should create CRITICAL alert when CO > 25 ppm', async () => {
      await service.processReading({ ...mockReadingDto, co: 30 });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ severity: 'CRITICAL', message: expect.stringContaining('CO') }),
        }),
      );
    });

    it('should create WARNING when temperature > 45°C', async () => {
      await service.processReading({ ...mockReadingDto, temperature: 50 });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ message: expect.stringContaining('Temperature') }),
        }),
      );
    });

    it('should create WARNING when noise > 85 dB', async () => {
      await service.processReading({ ...mockReadingDto, noiseLevel: 90 });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ message: expect.stringContaining('Noise') }),
        }),
      );
    });

    it('should not create alert for normal readings', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.deviceAlert.create).not.toHaveBeenCalled();
    });

    it('should emit environmental:alert socket when threshold exceeded', async () => {
      await service.processReading({ ...mockReadingDto, co2: 1200 });

      expect(gateway.emitEnvironmentalAlert).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({ parameter: 'CO2', value: 1200, threshold: 1000 }),
      );
    });

    it('should mark reading as processed', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.deviceReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isProcessed: true }),
        }),
      );
    });

    it('should update device lastSeenAt and totalEvents', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.ioTDevice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalEvents: { increment: 1 } }),
        }),
      );
    });
  });

  describe('getCurrentReadings', () => {
    it('should return cached readings for all sensors in zone', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { deviceId: 'KVH-ENV-0001', name: 'Sensor 1', type: 'ENVIRONMENTAL', isActive: true },
        { deviceId: 'KVH-ENV-0002', name: 'Sensor 2', type: 'ENVIRONMENTAL', isActive: true },
      ]);
      redis.get
        .mockResolvedValueOnce(JSON.stringify({ temperature: 32, humidity: 55, co2: 800, co: 5, noiseLevel: 70, recordedAt: new Date().toISOString() }))
        .mockResolvedValueOnce(null);

      const readings = await service.getCurrentReadings('zone-1');

      expect(readings).toHaveLength(2);
      expect(readings[0].temperature).toBe(32);
      expect(readings[1].temperature).toBeNull();
    });
  });

  describe('getReadingHistory', () => {
    it('should return readings in time range ordered by time', async () => {
      prisma.deviceReading.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01T10:00:00'), payload: { temperature: 30, humidity: 50, co2: 700, co: 3 } },
        { createdAt: new Date('2026-01-01T11:00:00'), payload: { temperature: 32, humidity: 55, co2: 800, co: 5 } },
      ]);

      const history = await service.getReadingHistory('KVH-ENV-0001', '2026-01-01', '2026-01-31', 'hour');

      expect(history).toHaveLength(2);
      expect(history[0].temperature).toBe(30);
      expect(history[1].co2).toBe(800);
    });
  });

  describe('getAirQualityIndex', () => {
    it('should compute AQI from current readings', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { deviceId: 'KVH-ENV-0001', name: 'Sensor 1', type: 'ENVIRONMENTAL', isActive: true },
      ]);
      redis.get.mockResolvedValue(JSON.stringify({ co2: 800, pm25: 30, recordedAt: new Date().toISOString() }));

      const aqi = await service.getAirQualityIndex('zone-1');

      expect(aqi.index).toBeGreaterThanOrEqual(0);
      expect(aqi.index).toBeLessThanOrEqual(500);
      expect(aqi.level).toBeDefined();
      expect(['GOOD', 'MODERATE', 'UNHEALTHY', 'HAZARDOUS']).toContain(aqi.level);
    });

    it('should return GOOD level for low AQI', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { deviceId: 'KVH-ENV-0001', name: 'Sensor 1', type: 'ENVIRONMENTAL', isActive: true },
      ]);
      redis.get.mockResolvedValue(JSON.stringify({ co2: 400, pm25: 10, recordedAt: new Date().toISOString() }));

      const aqi = await service.getAirQualityIndex('zone-1');

      expect(aqi.level).toBe('GOOD');
    });

    it('should return empty components when no sensors', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([]);

      const aqi = await service.getAirQualityIndex('zone-1');

      expect(aqi.index).toBe(0);
      expect(aqi.level).toBe('GOOD');
    });
  });
});
