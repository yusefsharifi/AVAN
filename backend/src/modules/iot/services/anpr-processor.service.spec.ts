import { Test, TestingModule } from '@nestjs/testing';
import { AnprProcessorService } from './anpr-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';

describe('AnprProcessorService', () => {
  let service: AnprProcessorService;
  let prisma: any;
  let redis: any;
  let gateway: any;

  const mockReadingDto = {
    deviceId: 'KVH-ANPR-0001',
    zoneId: 'zone-1',
    plate: '۱۲ع345',
    confidence: 0.95,
    direction: 'ENTRY',
    imageKey: '/images/anpr/test.jpg',
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = {
      deviceReading: {
        create: jest.fn().mockResolvedValue({ id: 'reading-1', payload: {} }),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ioTDevice: {
        updateMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'dev-1', deviceId: 'KVH-ANPR-0001', zoneId: 'zone-1', gateId: 'gate-1', config: {} }),
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      deviceAlert: {
        create: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitAnprPlateDetected: jest.fn(),
      emitAnprNeedsReview: jest.fn(),
      emitAnprLowConfidence: jest.fn(),
      emitDeviceAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnprProcessorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<AnprProcessorService>(AnprProcessorService);
  });

  describe('processReading', () => {
    it('should auto-process for confidence >= 0.90', async () => {
      const result = await service.processReading({ ...mockReadingDto, confidence: 0.95 });

      expect(result.action).toBe('AUTO_PROCESSED');
      expect(result.confidence).toBe(0.95);
      expect(gateway.emitAnprPlateDetected).toHaveBeenCalled();
      expect(prisma.deviceReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isProcessed: true }),
        }),
      );
    });

    it('should send for guard review for confidence 0.75-0.89', async () => {
      const result = await service.processReading({ ...mockReadingDto, confidence: 0.82 });

      expect(result.action).toBe('SENT_FOR_REVIEW');
      expect(gateway.emitAnprNeedsReview).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('iot:anpr:pending:'),
        expect.any(String),
        60,
      );
    });

    it('should flag as low-confidence for < 0.75', async () => {
      const result = await service.processReading({ ...mockReadingDto, confidence: 0.60 });

      expect(result.action).toBe('LOW_CONFIDENCE');
      expect(gateway.emitAnprLowConfidence).toHaveBeenCalled();
    });

    it('should normalize Persian plate digits', async () => {
      const result = await service.processReading({ ...mockReadingDto, plate: '۱۲ع۳۴۵' });

      expect(result.plate).toBe('12ع345');
    });

    it('should mark reading as processed', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.deviceReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reading-1' },
          data: expect.objectContaining({ isProcessed: true }),
        }),
      );
    });

    it('should update device totalEvents count', async () => {
      await service.processReading(mockReadingDto);

      expect(prisma.ioTDevice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalEvents: { increment: 1 } }),
        }),
      );
    });

    it('should emit plate-detected with vehicle info when vehicle found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', plate: '12ع345', companyId: 'comp-1' });

      const result = await service.processReading({ ...mockReadingDto, confidence: 0.95 });

      expect(result.vehicleInfo).toEqual({ id: 'v-1', plate: '12ع345', companyId: 'comp-1' });
    });

    it('should detect blacklisted plate and emit alert', async () => {
      redis.get.mockResolvedValue('true');

      await service.processReading({ ...mockReadingDto, confidence: 0.95 });

      expect(gateway.emitDeviceAlert).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({ alertType: 'UNAUTHORIZED_ACCESS', severity: 'CRITICAL' }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should compute total readings, auto-processed, and avg confidence', async () => {
      prisma.deviceReading.findMany.mockResolvedValue([
        { processingResult: { action: 'AUTO_PROCESSED' }, payload: { plate: 'A', confidence: 0.95 }, createdAt: new Date('2026-01-01T10:00:00') },
        { processingResult: { action: 'SENT_FOR_REVIEW' }, payload: { plate: 'B', confidence: 0.82 }, createdAt: new Date('2026-01-01T11:00:00') },
        { processingResult: { action: 'LOW_CONFIDENCE' }, payload: { plate: 'A', confidence: 0.60 }, createdAt: new Date('2026-01-01T12:00:00') },
      ]);

      const stats = await service.getStatistics('dev-1', '2026-01-01', '2026-01-31');

      expect(stats.totalReadings).toBe(3);
      expect(stats.autoProcessed).toBe(1);
      expect(stats.sentForReview).toBe(1);
      expect(stats.lowConfidence).toBe(1);
      expect(stats.avgConfidence).toBeCloseTo(0.79, 1);
    });

    it('should return top plates by frequency', async () => {
      prisma.deviceReading.findMany.mockResolvedValue([
        { processingResult: {}, payload: { plate: 'ABC', confidence: 0.9 }, createdAt: new Date() },
        { processingResult: {}, payload: { plate: 'ABC', confidence: 0.9 }, createdAt: new Date() },
        { processingResult: {}, payload: { plate: 'XYZ', confidence: 0.9 }, createdAt: new Date() },
      ]);

      const stats = await service.getStatistics('dev-1', '2026-01-01', '2026-01-31');

      expect(stats.topPlates[0]).toEqual({ plate: 'ABC', count: 2 });
    });

    it('should return empty stats when no readings', async () => {
      prisma.deviceReading.findMany.mockResolvedValue([]);

      const stats = await service.getStatistics('dev-1', '2026-01-01', '2026-01-31');

      expect(stats.totalReadings).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.readingsByHour).toHaveLength(24);
    });
  });
});
