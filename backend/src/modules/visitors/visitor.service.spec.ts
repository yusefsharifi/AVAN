import { Test, TestingModule } from '@nestjs/testing';
import { VisitorService } from './visitor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { AppException } from '../../common/exceptions/app.exception';

describe('VisitorService', () => {
  let service: VisitorService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      visitorRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      visitorTracking: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      visitorBlacklist: { findFirst: jest.fn() },
      visitExtension: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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
        VisitorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: BullService, useValue: { add: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToZone: jest.fn(), emitToSuperAdmin: jest.fn() } },
      ],
    }).compile();

    service = module.get<VisitorService>(VisitorService);
  });

  describe('createRequest', () => {
    it('should generate unique request number', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'z1', status: 'ACTIVE', code: 'KVH', settings: {} });
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', companyId: 'c1', firstName: 'Ali', lastName: 'Rezaei', phone: '09121234567' });
      prisma.visitorBlacklist.findFirst.mockResolvedValue(null);
      prisma.visitorRequest.create.mockResolvedValue({
        id: 'vr1',
        requestNumber: 'VR-KVH-1403-000001',
        status: 'PENDING',
      });

      const result = await service.createRequest(
        {
          zoneId: 'z1',
          companyId: 'c1',
          visitorName: 'Reza Mohammadi',
          visitorPhone: '09129876543',
          purpose: 'BUSINESS_MEETING',
          type: 'SINGLE',
          expectedDate: '1403-10-20',
          expectedTime: '10:00',
          hostId: 'h1',
        } as any,
        'creator1',
      );

      expect(result.requestNumber).toBe('VR-KVH-1403-000001');
      expect(prisma.visitorRequest.create).toHaveBeenCalled();
    });

    it('should reject blacklisted visitor by nationalId', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'z1', status: 'ACTIVE', code: 'KVH', settings: {} });
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', companyId: 'c1', firstName: 'Ali', lastName: 'Rezaei', phone: '09121234567' });
      prisma.visitorBlacklist.findFirst.mockResolvedValue({ id: 'bl1', reason: 'criminal' });

      await expect(
        service.createRequest(
          {
            zoneId: 'z1',
            companyId: 'c1',
            visitorName: 'Blocked Person',
            visitorPhone: '09121111111',
            visitorNationalId: '1234567890',
            purpose: 'BUSINESS_MEETING',
            type: 'SINGLE',
            expectedDate: '1403-10-20',
            expectedTime: '10:00',
            hostId: 'h1',
          } as any,
          'creator1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject blacklisted visitor by phone', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'z1', status: 'ACTIVE', code: 'KVH', settings: {} });
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', companyId: 'c1', firstName: 'Ali', lastName: 'Rezaei', phone: '09121234567' });
      prisma.visitorBlacklist.findFirst
        .mockResolvedValue({ id: 'bl2', reason: 'spam' }); // found by phone

      await expect(
        service.createRequest(
          {
            zoneId: 'z1',
            companyId: 'c1',
            visitorName: 'Spammer',
            visitorPhone: '09129999999',
            purpose: 'BUSINESS_MEETING',
            type: 'SINGLE',
            expectedDate: '1403-10-20',
            expectedTime: '10:00',
            hostId: 'h1',
          } as any,
          'creator1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject if host not found', async () => {
      prisma.zone.findUnique.mockResolvedValue({ id: 'z1', status: 'ACTIVE', code: 'KVH', settings: {} });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createRequest(
          {
            zoneId: 'z1',
            companyId: 'c1',
            visitorName: 'Test',
            visitorPhone: '09120000000',
            purpose: 'BUSINESS_MEETING',
            type: 'SINGLE',
            expectedDate: '1403-10-20',
            expectedTime: '10:00',
            hostId: 'nonexistent',
          } as any,
          'creator1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should auto-approve if zone.settings.autoApproveVisitor=true', async () => {
      prisma.zone.findUnique.mockResolvedValue({
        id: 'z1',
        status: 'ACTIVE',
        code: 'KVH',
        settings: { autoApproveVisitor: true },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', companyId: 'c1', firstName: 'Ali', lastName: 'Rezaei', phone: '09121234567' });
      prisma.visitorBlacklist.findFirst.mockResolvedValue(null);
      prisma.visitorRequest.create.mockResolvedValue({
        id: 'vr1',
        requestNumber: 'VR-KVH-1403-000001',
        status: 'APPROVED',
      });
      prisma.visitorRequest.update.mockResolvedValue({ id: 'vr1', qrPayload: 'IDOP:VISITOR:vr1:hash' });

      const result = await service.createRequest(
        {
          zoneId: 'z1',
          companyId: 'c1',
          visitorName: 'Quick Entry',
          visitorPhone: '09120000001',
          purpose: 'DELIVERY_PICKUP',
          type: 'SINGLE',
          expectedDate: '1403-10-20',
          expectedTime: '10:00',
          hostId: 'h1',
        } as any,
        'creator1',
      );

      expect(result.status).toBe('APPROVED');
    });
  });

  describe('checkInVisitor', () => {
    it('should accept valid QR at correct gate', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'APPROVED',
        qrExpiresAt: new Date(Date.now() + 86400000),
        qrUsedAt: null,
        allowedGates: ['g1'],
        allowedZones: ['z1'],
        visitorNationalId: null,
        visitorPhone: '09120000001',
        visitorName: 'Test Visitor',
        requiresEscort: false,
      });
      prisma.visitorBlacklist.findFirst.mockResolvedValue(null);
      prisma.visitorRequest.update.mockResolvedValue({ id: 'vr1', status: 'CHECKED_IN' });

      // NEW-001: parseQrPayload now verifies HMAC, so build a genuine QR payload
      // using the same secret/format as VisitorService (IDOP:VISITOR:{id}:{hmac}).
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', 'idop-zone-secret').update('VISITOR:vr1').digest('base64');

      const result = await service.checkInVisitor(
        { qrPayload: `IDOP:VISITOR:vr1:${hmac}`, gateId: 'g1' },
        'guard1',
        'z1',
      );

      expect(result.visitor.status).toBe('CHECKED_IN');
      expect(prisma.visitorTracking.create).toHaveBeenCalled();
    });

    it('should reject expired QR', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'APPROVED',
        qrExpiresAt: new Date(Date.now() - 1000),
        qrUsedAt: null,
        allowedGates: ['g1'],
        visitorNationalId: null,
        visitorPhone: '09120000001',
      });

      await expect(
        service.checkInVisitor(
          { qrPayload: 'IDOP:VISITOR:vr1:hash', gateId: 'g1' },
          'guard1',
          'z1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject already-used QR', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'APPROVED',
        qrExpiresAt: new Date(Date.now() + 86400000),
        qrUsedAt: new Date(),
        allowedGates: ['g1'],
        visitorNationalId: null,
        visitorPhone: '09120000001',
      });

      await expect(
        service.checkInVisitor(
          { qrPayload: 'IDOP:VISITOR:vr1:hash', gateId: 'g1' },
          'guard1',
          'z1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject wrong gate', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'APPROVED',
        qrExpiresAt: new Date(Date.now() + 86400000),
        qrUsedAt: null,
        allowedGates: ['g1'],
        visitorNationalId: null,
        visitorPhone: '09120000001',
      });

      await expect(
        service.checkInVisitor(
          { qrPayload: 'IDOP:VISITOR:vr1:hash', gateId: 'g2' },
          'guard1',
          'z1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject visitor not in APPROVED status', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'PENDING',
        qrExpiresAt: new Date(Date.now() + 86400000),
        qrUsedAt: null,
        allowedGates: ['g1'],
        visitorNationalId: null,
        visitorPhone: '09120000001',
      });

      await expect(
        service.checkInVisitor(
          { qrPayload: 'IDOP:VISITOR:vr1:hash', gateId: 'g1' },
          'guard1',
          'z1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('approveRequest', () => {
    it('should generate QR payload on approval', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'PENDING',
        zoneId: 'z1',
        hostId: 'h1',
        visitorName: 'Test',
        allowedGates: [],
        allowedZones: [],
        expectedDuration: 120,
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'h1', role: 'COMPANY_MANAGER' });
      prisma.visitorRequest.update.mockResolvedValue({ id: 'vr1', status: 'APPROVED' });

      const result = await service.approveRequest(
        'vr1',
        { approved: true },
        'h1',
      );

      expect(prisma.visitorRequest.update).toHaveBeenCalled();
    });

    it('should reject if approver is not host or manager', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'PENDING',
        hostId: 'h1',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'stranger', role: 'COMPANY_STAFF' });

      await expect(
        service.approveRequest('vr1', { approved: true }, 'stranger'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('checkOutVisitor', () => {
    it('should update status to CHECKED_OUT', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'CHECKED_IN',
        checkedInAt: new Date(Date.now() - 3600000),
      });
      prisma.visitorRequest.update.mockResolvedValue({ id: 'vr1', status: 'CHECKED_OUT', actualDuration: 60 });

      const result = await service.checkOutVisitor(
        { visitorRequestId: 'vr1', gateId: 'g1' },
        'guard1',
        'z1',
      );

      expect(result.status).toBe('CHECKED_OUT');
      expect(prisma.visitorTracking.create).toHaveBeenCalled();
    });

    it('should reject if not CHECKED_IN', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({
        id: 'vr1',
        status: 'APPROVED',
      });

      await expect(
        service.checkOutVisitor(
          { visitorRequestId: 'vr1', gateId: 'g1' },
          'guard1',
          'z1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getOverstayVisitors', () => {
    it('should return visitors who overstayed', async () => {
      const twoHoursAgo = new Date(Date.now() - 7200000);
      prisma.visitorRequest.findMany.mockResolvedValue([
        {
          id: 'vr1',
          status: 'CHECKED_IN',
          checkedInAt: twoHoursAgo,
          expectedDuration: 60, // 1 hour, but been 2 hours
        },
        {
          id: 'vr2',
          status: 'CHECKED_IN',
          checkedInAt: new Date(Date.now() - 1800000),
          expectedDuration: 120, // 2 hours, only 30 min in
        },
      ]);

      const result = await service.getOverstayVisitors('z1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('vr1');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel PENDING request', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({ id: 'vr1', status: 'PENDING' });
      prisma.visitorRequest.update.mockResolvedValue({ id: 'vr1', status: 'CANCELLED' });

      const result = await service.cancelRequest('vr1', 'user1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should reject cancel on CHECKED_IN request', async () => {
      prisma.visitorRequest.findUnique.mockResolvedValue({ id: 'vr1', status: 'CHECKED_IN' });

      await expect(service.cancelRequest('vr1', 'user1')).rejects.toThrow(AppException);
    });
  });
});
