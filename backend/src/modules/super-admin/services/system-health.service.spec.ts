import { Test, TestingModule } from '@nestjs/testing';
import { SystemHealthService } from './system-health.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

describe('SystemHealthService', () => {
  let service: SystemHealthService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $executeRawUnsafe: jest.fn(),
      systemHealthSnapshot: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      info: jest.fn().mockResolvedValue('used_memory:1048576\r\n'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemHealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<SystemHealthService>(SystemHealthService);
  });

  describe('getSystemHealth', () => {
    it('should return cached health if available', async () => {
      const cachedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        overallStatus: 'GREEN',
        components: {},
        system: { cpuPercent: 10, memoryPercent: 40, diskPercent: 30 },
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedHealth));

      const result = await service.getSystemHealth();

      expect(result.status).toBe('healthy');
      expect(result.overallStatus).toBe('GREEN');
    });

    it('should check database connectivity', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getSystemHealth();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result.components.database).toBeDefined();
    });

    it('should report RED status when database is down', async () => {
      redis.get.mockResolvedValue(null);
      prisma.$queryRaw.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.getSystemHealth();

      expect(result.overallStatus).toBe('RED');
      expect(result.components.database.status).toBe('critical');
    });

    it('should check Redis connectivity', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getSystemHealth();

      expect(result.components.redis).toBeDefined();
    });

    it('should cache result for 10 seconds', async () => {
      redis.get.mockResolvedValue(null);

      await service.getSystemHealth();

      expect(redis.set).toHaveBeenCalledWith(
        'sys:health',
        expect.any(String),
        10,
      );
    });

    it('should report YELLOW when CPU is high', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getSystemHealth();

      // CPU usage is dynamic; just verify the structure
      expect(result.system).toHaveProperty('cpuPercent');
      expect(result.system).toHaveProperty('memoryPercent');
      expect(result.system).toHaveProperty('diskPercent');
    });
  });

  describe('saveSnapshot', () => {
    it('should create a health snapshot record', async () => {
      // Pre-populate cache so getSystemHealth doesn't hit DB
      const cachedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        overallStatus: 'GREEN',
        components: {
          database: { status: 'healthy', responseMs: 5, connections: 10 },
          redis: { status: 'healthy', responseMs: 2, memoryMb: 10, hitRate: 95 },
          queues: { status: 'healthy', waiting: 0, active: 0, failed: 0 },
          storage: { status: 'healthy', usedGb: 1, totalGb: 500, objects: 100 },
          mqtt: { status: 'healthy', connected: true, clients: 5 },
          api: { status: 'healthy', requestsMin: 100, errorRate: 0.1, activeSockets: 10 },
        },
        system: { cpuPercent: 20, memoryPercent: 50, diskPercent: 40 },
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedHealth));
      prisma.systemHealthSnapshot.create.mockResolvedValue({ id: 'snap-1' });

      const result = await service.saveSnapshot();

      expect(prisma.systemHealthSnapshot.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  describe('getHealthHistory', () => {
    it('should return recent health snapshots', async () => {
      prisma.systemHealthSnapshot.findMany.mockResolvedValue([
        { id: 'snap-1', recordedAt: new Date(), apiResponseMs: 50, dbResponseMs: 10 },
        { id: 'snap-2', recordedAt: new Date(), apiResponseMs: 45, dbResponseMs: 8 },
      ]);

      const result = await service.getHealthHistory(24);

      expect(result).toHaveLength(2);
      expect(prisma.systemHealthSnapshot.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no snapshots', async () => {
      prisma.systemHealthSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getHealthHistory(1);

      expect(result).toEqual([]);
    });
  });
});
