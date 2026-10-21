import { Test, TestingModule } from '@nestjs/testing';
import { PlotService } from './plots.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';

describe('PlotService', () => {
  let service: PlotService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      plot: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    redis = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlotService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<PlotService>(PlotService);
  });

  describe('getOccupancyStats', () => {
    it('should compute occupancy rate correctly', async () => {
      prisma.plot.findMany.mockResolvedValue([
        { status: 'AVAILABLE', areaSqM: 100 },
        { status: 'AVAILABLE', areaSqM: 200 },
        { status: 'OCCUPIED', areaSqM: 150 },
        { status: 'RESERVED', areaSqM: 120 },
        { status: 'MAINTENANCE', areaSqM: 80 },
      ]);

      const stats = await service.getOccupancyStats('zone-1');

      expect(stats.total).toBe(5);
      expect(stats.available).toBe(2);
      expect(stats.occupied).toBe(1);
      expect(stats.occupancyRate).toBe(20); // 1/5 = 20%
      expect(stats.totalAreaSqM).toBe(650);
      expect(stats.occupiedAreaSqM).toBe(150);
    });
  });

  describe('delete', () => {
    it('should prevent deletion of occupied plots', async () => {
      prisma.plot.findUnique.mockResolvedValue({
        id: 'plot-1',
        status: 'OCCUPIED',
        zoneId: 'zone-1',
      });

      await expect(service.delete('plot-1')).rejects.toThrow();
    });
  });
});
