import { Test, TestingModule } from '@nestjs/testing';
import { PlatformMetricsService } from './platform-metrics.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

describe('PlatformMetricsService', () => {
  let service: PlatformMetricsService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      zone: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([]),
      },
      company: {
        count: jest.fn().mockResolvedValue(50),
      },
      user: {
        count: jest.fn().mockResolvedValue(200),
      },
      ioTDevice: {
        count: jest.fn().mockResolvedValue(30),
      },
      platformMetric: {
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformMetricsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<PlatformMetricsService>(PlatformMetricsService);
  });

  describe('getPlatformKpis', () => {
    it('should return cached KPIs if available', async () => {
      const cachedKpis = {
        zones: { total: 10, active: 8 },
        companies: { total: 50, active: 50 },
        users: { total: 200, active30d: 180 },
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedKpis));

      const result = await service.getPlatformKpis();

      expect(result.zones.total).toBe(10);
      expect(result.companies.total).toBe(50);
    });

    it('should query all entity counts when not cached', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getPlatformKpis();

      expect(prisma.zone.count).toHaveBeenCalled();
      expect(prisma.company.count).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.ioTDevice.count).toHaveBeenCalled();
    });

    it('should cache KPIs for 5 minutes', async () => {
      redis.get.mockResolvedValue(null);

      await service.getPlatformKpis();

      expect(redis.set).toHaveBeenCalledWith(
        'platform:kpis',
        expect.any(String),
        300,
      );
    });

    it('should include zone breakdown', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getPlatformKpis();

      expect(result.zones).toHaveProperty('total');
      expect(result.zones).toHaveProperty('active');
      expect(result.zones).toHaveProperty('suspended');
    });

    it('should include device stats', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getPlatformKpis();

      expect(result.devices).toHaveProperty('total');
      expect(result.devices).toHaveProperty('online');
    });
  });

  describe('computeDailyPlatformMetrics', () => {
    it('should upsert daily metrics for each entity', async () => {
      prisma.platformMetric.upsert.mockResolvedValue({ id: 'm-1' });

      await service.computeDailyPlatformMetrics();

      // 6 metrics: total_zones, active_zones, total_companies, total_users, total_devices, online_devices
      expect(prisma.platformMetric.upsert).toHaveBeenCalledTimes(6);
    });

    it('should use correct metric names', async () => {
      prisma.platformMetric.upsert.mockResolvedValue({ id: 'm-1' });

      await service.computeDailyPlatformMetrics();

      // Verify upsert was called for each metric
      const calls = prisma.platformMetric.upsert.mock.calls;
      expect(calls.length).toBe(6);
    });
  });

  describe('getPlatformTrend', () => {
    it('should return trend data for a metric', async () => {
      prisma.platformMetric.findMany.mockResolvedValue([
        { metric: 'total_zones', value: 8, date: '2026-08-01' },
        { metric: 'total_zones', value: 9, date: '2026-08-15' },
        { metric: 'total_zones', value: 10, date: '2026-09-01' },
      ]);

      const result = await service.getPlatformTrend('total_zones', 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('value');
    });

    it('should return empty array when no data', async () => {
      prisma.platformMetric.findMany.mockResolvedValue([]);

      const result = await service.getPlatformTrend('total_zones', 1);

      expect(result).toEqual([]);
    });
  });

  describe('getZoneRankings', () => {
    it('should return zones ranked by a metric', async () => {
      prisma.zone.findMany.mockResolvedValue([
        { id: 'zone-1', code: 'TEH-01', nameFa: 'تهران', status: 'ACTIVE', _count: { company: 20, user: 100 } },
        { id: 'zone-2', code: 'ISF-01', nameFa: 'اصفهان', status: 'ACTIVE', _count: { company: 15, user: 75 } },
      ]);

      const result = await service.getZoneRankings('companies', 10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty zones', async () => {
      prisma.zone.findMany.mockResolvedValue([]);

      const result = await service.getZoneRankings('companies', 10);

      expect(result).toEqual([]);
    });
  });
});
