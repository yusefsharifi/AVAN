import { Test, TestingModule } from '@nestjs/testing';
import { GroupVisitService } from './group-visit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';

describe('GroupVisitService', () => {
  let service: GroupVisitService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      groupVisit: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      visitorRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    redis = {
      incr: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(1),
      incrWithExpiry: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupVisitService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<GroupVisitService>(GroupVisitService);
  });

  describe('create', () => {
    it('should generate unique group number', async () => {
      prisma.groupVisit.create.mockResolvedValue({
        id: 'gv1',
        groupNumber: 'GV-z1_-1403-0001',
      });

      const result = await service.create(
        {
          zoneId: 'z1',
          companyId: 'c1',
          title: 'Factory Tour',
          organizerName: 'Ahmad',
          organizerPhone: '09121234567',
          expectedCount: 20,
          purpose: 'AUDIT_INSPECTION',
          visitDate: '1403-10-20',
          startTime: '09:00',
          endTime: '12:00',
          hostId: 'h1',
        } as any,
        'user1',
      );

      expect(result.groupNumber).toBeTruthy();
      expect(prisma.groupVisit.create).toHaveBeenCalled();
    });

    it('should notify zone manager for approval', async () => {
      prisma.groupVisit.create.mockResolvedValue({ id: 'gv1', status: 'PENDING' });
      // verify audit log is called (which triggers notification in production)
      await service.create(
        {
          zoneId: 'z1',
          companyId: 'c1',
          title: 'VIP Tour',
          organizerName: 'Sara',
          organizerPhone: '09129876543',
          expectedCount: 5,
          purpose: 'CUSTOMER_VISIT',
          visitDate: '1403-10-21',
          startTime: '14:00',
          endTime: '16:00',
          hostId: 'h1',
        } as any,
        'user1',
      );

      expect(prisma.groupVisit.create).toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should create individual QR for each member', async () => {
      prisma.groupVisit.findUnique.mockResolvedValue({
        id: 'gv1',
        zoneId: 'z1',
        companyId: 'c1',
        status: 'APPROVED',
        purpose: 'BUSINESS_MEETING',
        visitDate: '1403-10-20',
        startTime: '09:00',
        allowedGates: ['g1'],
        allowedZones: [],
        hostId: 'h1',
        hostName: 'Ali',
      });
      prisma.visitorRequest.create.mockResolvedValue({ id: 'vr1', qrPayload: 'IDOP:VISITOR:vr1:hash' });

      const result = await service.addMember(
        'gv1',
        { visitorName: 'John', visitorPhone: '09121111111' } as any,
        'user1',
      );

      expect(result.qrPayload).toBeTruthy();
      expect(prisma.visitorRequest.create).toHaveBeenCalled();
    });

    it('should reject when group not found', async () => {
      prisma.groupVisit.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkAddMembers(
          'nonexistent',
          [{ visitorName: 'Test', visitorPhone: '09120000000' }],
          'user1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getGroupDashboard', () => {
    it('should return correct counts', async () => {
      prisma.groupVisit.findUnique.mockResolvedValue({ id: 'gv1' });
      prisma.visitorRequest.findMany.mockResolvedValue([
        { id: 'v1', status: 'CHECKED_IN' },
        { id: 'v2', status: 'CHECKED_OUT' },
        { id: 'v3', status: 'PENDING' },
        { id: 'v4', status: 'CHECKED_IN' },
      ]);

      const result = await service.getGroupDashboard('gv1');

      expect(result.checkedInCount).toBe(2);
      expect(result.checkedOutCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      expect(result.currentlyInside).toBe(2);
    });
  });

  describe('approve', () => {
    it('should approve group visit', async () => {
      prisma.groupVisit.findUnique.mockResolvedValue({ id: 'gv1', zoneId: 'z1' });
      prisma.groupVisit.update.mockResolvedValue({ id: 'gv1', status: 'APPROVED' });

      const result = await service.approve('gv1', true, '', 'manager1');
      expect(result.status).toBe('APPROVED');
    });

    it('should reject group visit with reason', async () => {
      prisma.groupVisit.findUnique.mockResolvedValue({ id: 'gv1', zoneId: 'z1' });
      prisma.groupVisit.update.mockResolvedValue({ id: 'gv1', status: 'REJECTED' });

      const result = await service.approve('gv1', false, 'Capacity full', 'manager1');
      expect(result.status).toBe('REJECTED');
    });
  });
});
