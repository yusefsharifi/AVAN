import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditComplianceService } from './audit-compliance.service';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let prisma: any;
  let redis: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      systemAnnouncement: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      maintenanceWindow: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        count: jest.fn().mockResolvedValue(100),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    auditCompliance = {
      logGlobalEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
  });

  describe('create', () => {
    it('should create announcement', async () => {
      prisma.systemAnnouncement.create.mockResolvedValue({
        id: 'ann-1',
        title: 'System Update',
        body: 'Platform will be updated tonight',
        type: 'INFO',
        channels: ['IN_APP'],
      });
      prisma.user.count.mockResolvedValue(100);

      const result = await service.create(
        {
          title: 'System Update',
          body: 'Platform will be updated tonight',
          type: 'INFO',
          severity: 'INFO',
          channels: ['IN_APP'],
        } as any,
        'admin-1',
      );

      expect(prisma.systemAnnouncement.create).toHaveBeenCalled();
      expect(result.title).toBe('System Update');
    });

    it('should deliver immediately if publishAt is now', async () => {
      prisma.systemAnnouncement.create.mockResolvedValue({
        id: 'ann-1',
        channels: ['IN_APP'],
        targetZoneIds: [],
        targetRoles: [],
      });
      prisma.systemAnnouncement.findUnique.mockResolvedValue({
        id: 'ann-1',
        channels: ['IN_APP'],
        targetZoneIds: [],
        targetRoles: [],
      });
      prisma.user.count.mockResolvedValue(50);

      await service.create(
        {
          title: 'Urgent Notice',
          body: 'Immediate delivery',
          type: 'WARNING',
          severity: 'WARNING',
          channels: ['IN_APP'],
        } as any,
        'admin-1',
      );

      expect(prisma.systemAnnouncement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ann-1' },
          data: expect.objectContaining({ isDelivered: true }),
        }),
      );
    });

    it('should not deliver if publishAt is in the future', async () => {
      prisma.systemAnnouncement.create.mockResolvedValue({
        id: 'ann-1',
        channels: ['IN_APP'],
      });

      await service.create(
        {
          title: 'Scheduled Notice',
          body: 'Will be delivered later',
          type: 'INFO',
          severity: 'INFO',
          channels: ['IN_APP'],
          publishAt: '2027-01-01T00:00:00Z',
        } as any,
        'admin-1',
      );

      expect(prisma.systemAnnouncement.update).not.toHaveBeenCalled();
    });

    it('should count recipients on delivery', async () => {
      prisma.systemAnnouncement.create.mockResolvedValue({ id: 'ann-1', channels: ['IN_APP'] });
      prisma.systemAnnouncement.findUnique.mockResolvedValue({
        id: 'ann-1',
        channels: ['IN_APP'],
        targetZoneIds: [],
        targetRoles: [],
      });
      prisma.user.count.mockResolvedValue(200);

      await service.create(
        {
          title: 'Notice',
          body: 'Body text here',
          type: 'INFO',
          severity: 'INFO',
          channels: ['IN_APP'],
        } as any,
        'admin-1',
      );

      expect(prisma.systemAnnouncement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recipientCount: 200 }),
        }),
      );
    });
  });

  describe('getActiveAnnouncements', () => {
    it('should return active announcements', async () => {
      prisma.systemAnnouncement.findMany.mockResolvedValue([
        { id: 'ann-1', title: 'Active Notice', isActive: true, expiresAt: null },
      ]);

      const result = await service.getActiveAnnouncements('zone-1', 'ZONE_MANAGER');

      expect(result).toHaveLength(1);
    });

    it('should filter by zone', async () => {
      prisma.systemAnnouncement.findMany.mockResolvedValue([]);

      await service.getActiveAnnouncements('zone-1', 'ZONE_MANAGER');

      expect(prisma.systemAnnouncement.findMany).toHaveBeenCalled();
    });
  });

  describe('createMaintenanceWindow', () => {
    it('should create maintenance window', async () => {
      prisma.maintenanceWindow.create.mockResolvedValue({
        id: 'mw-1',
        title: 'Database Upgrade',
        startAt: new Date('2026-09-15T02:00:00Z'),
        endAt: new Date('2026-09-15T06:00:00Z'),
        isActive: true,
      });

      const result = await service.createMaintenanceWindow(
        {
          title: 'Database Upgrade',
          description: 'PostgreSQL upgrade to v16',
          startAt: '2026-09-15T02:00:00Z',
          endAt: '2026-09-15T06:00:00Z',
        } as any,
        'admin-1',
      );

      expect(prisma.maintenanceWindow.create).toHaveBeenCalled();
      expect(result.title).toBe('Database Upgrade');
    });

    it('should return created window', async () => {
      prisma.maintenanceWindow.create.mockResolvedValue({ id: 'mw-1', title: 'Upgrade' });

      const result = await service.createMaintenanceWindow(
        {
          title: 'Upgrade',
          startAt: '2026-09-15T02:00:00Z',
          endAt: '2026-09-15T06:00:00Z',
        } as any,
        'admin-1',
      );

      expect(result.id).toBe('mw-1');
      expect(result.title).toBe('Upgrade');
    });
  });

  describe('getMaintenanceWindows', () => {
    it('should return maintenance windows', async () => {
      prisma.maintenanceWindow.findMany.mockResolvedValue([
        { id: 'mw-1', title: 'Upgrade', startAt: new Date(), endAt: new Date(), isActive: true },
      ]);

      const result = await service.getMaintenanceWindows();

      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all announcements', async () => {
      prisma.systemAnnouncement.findMany.mockResolvedValue([
        { id: 'ann-1', title: 'Notice 1' },
        { id: 'ann-2', title: 'Notice 2' },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });
});
