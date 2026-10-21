import { Test, TestingModule } from '@nestjs/testing';
import { IssuedPermitService } from './issued-permit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('IssuedPermitService', () => {
  let service: IssuedPermitService;

  const mockPrisma = {
    issuedPermit: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    permitRequest: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    permitCondition: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedis = {
    incr: jest.fn().mockResolvedValue(1),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuedPermitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<IssuedPermitService>(IssuedPermitService);
    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('should generate correct permit number format', async () => {
      mockPrisma.permitRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        type: 'CONSTRUCTION',
        zoneId: 'zone-1',
        companyId: 'comp-1',
        title: 'Construction Permit',
        company: { nameFa: 'Test Company', nationalId: '12345678901', phone: '02112345678' },
        zone: { code: 'KVH' },
        locationDescription: 'Block B',
        locationBlock: 'B',
        locationUnit: '3',
        affectedArea: 'Unit 3-7',
        responsibleName: 'John',
        responsiblePhone: '09121234567',
        applicantName: 'Test User',
        applicantPhone: '09121234567',
      });
      mockPrisma.issuedPermit.create.mockResolvedValue({ id: 'permit-1', permitNumber: 'PRM-CON-2026-00001' });

      const result = await service.issue(
        { requestId: 'req-1', validFrom: '2026-09-01', validUntil: '2026-12-01' },
        'manager-1',
        'zone-1',
      );

      expect(result.permitNumber).toMatch(/^PRM-CON-\d{4}-\d{5}$/);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should reject if request not APPROVED', async () => {
      mockPrisma.permitRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'SUBMITTED',
        type: 'CONSTRUCTION',
        company: { nameFa: 'Test' },
        zone: { code: 'KVH' },
      });

      await expect(
        service.issue(
          { requestId: 'req-1', validFrom: '2026-09-01', validUntil: '2026-12-01' },
          'manager-1',
          'zone-1',
        ),
      ).rejects.toThrow();
    });

    it('should send SMS to applicant + responsible person', async () => {
      mockPrisma.permitRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        type: 'CONSTRUCTION',
        zoneId: 'zone-1',
        companyId: 'comp-1',
        title: 'Test',
        company: { nameFa: 'Test Co', nationalId: '123', phone: '02112345678' },
        zone: { code: 'KVH' },
        responsibleName: 'John',
        responsiblePhone: '09121234567',
        applicantName: 'Test',
        applicantPhone: '09121234567',
      });
      mockPrisma.issuedPermit.create.mockResolvedValue({ id: 'permit-1' });

      // Issue should create audit log which captures the notification metadata
      await service.issue(
        { requestId: 'req-1', validFrom: '2026-09-01', validUntil: '2026-12-01' },
        'manager-1',
        'zone-1',
      );

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PERMIT_ISSUED',
        }),
      );
    });
  });

  describe('verifyByQrHash', () => {
    it('should return isValid=true for active permit', async () => {
      mockRedis.get.mockResolvedValue(null); // no cache
      mockPrisma.issuedPermit.findFirst.mockResolvedValue({
        qrHash: 'abc123',
        status: 'ACTIVE',
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2026-12-31'),
        conditions: [],
        company: { nameFa: 'Test Co' },
        permitNumber: 'PRM-CON-2026-00001',
        type: 'CONSTRUCTION',
        holderName: 'Test Holder',
        issuedByName: 'Manager',
        title: 'Construction Permit',
      });

      const result = await service.verifyByQrHash('abc123');

      expect(result.isValid).toBe(true);
      expect(result.permit).toBeDefined();
    });

    it('should return isValid=false for expired permit', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.issuedPermit.findFirst.mockResolvedValue({
        qrHash: 'abc123',
        status: 'ACTIVE',
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'),
        conditions: [],
        company: { nameFa: 'Test Co' },
        permitNumber: 'PRM-CON-2020-00001',
        type: 'CONSTRUCTION',
        holderName: 'Test',
        issuedByName: 'Manager',
        title: 'Test',
      });

      const result = await service.verifyByQrHash('abc123');

      expect(result.isValid).toBe(false);
    });

    it('should return isValid=false for suspended permit', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.issuedPermit.findFirst.mockResolvedValue({
        qrHash: 'abc123',
        status: 'SUSPENDED',
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2026-12-31'),
        conditions: [],
        company: { nameFa: 'Test Co' },
        permitNumber: 'PRM-CON-2026-00001',
        type: 'CONSTRUCTION',
        holderName: 'Test',
        issuedByName: 'Manager',
        title: 'Test',
      });

      const result = await service.verifyByQrHash('abc123');

      expect(result.isValid).toBe(false);
    });

    it('should return isValid=false for wrong qrHash', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.issuedPermit.findFirst.mockResolvedValue(null);

      const result = await service.verifyByQrHash('wrong-hash');

      expect(result.isValid).toBe(false);
    });

    it('should cache result in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.issuedPermit.findFirst.mockResolvedValue(null);

      await service.verifyByQrHash('abc123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('permit:verify:'),
        expect.any(String),
        300,
      );
    });
  });

  describe('suspend', () => {
    it('should set status to SUSPENDED', async () => {
      mockPrisma.issuedPermit.findFirst.mockResolvedValue({
        id: 'permit-1',
        status: 'ACTIVE',
        zoneId: 'zone-1',
        permitNumber: 'PRM-CON-2026-00001',
      });
      mockPrisma.issuedPermit.update.mockResolvedValue({ id: 'permit-1', status: 'SUSPENDED' });

      const result = await service.suspend(
        'permit-1',
        { reason: 'Safety violation detected during inspection' },
        'manager-1',
      );

      expect(mockPrisma.issuedPermit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUSPENDED' }),
        }),
      );
    });

    it('should reject if permit not ACTIVE', async () => {
      mockPrisma.issuedPermit.findFirst.mockResolvedValue({
        id: 'permit-1',
        status: 'REVOKED',
        zoneId: 'zone-1',
        permitNumber: 'PRM-CON-2026-00001',
      });

      await expect(
        service.suspend('permit-1', { reason: 'Safety issue' }, 'manager-1'),
      ).rejects.toThrow();
    });
  });

  describe('fulfillCondition', () => {
    it('should update condition to FULFILLED', async () => {
      mockPrisma.permitCondition.findUnique.mockResolvedValue({
        id: 'cond-1',
        status: 'PENDING',
        issuedPermitId: 'permit-1',
        issuedPermit: { requestId: 'req-1' },
        description: 'Safety signage installed',
      });
      mockPrisma.permitCondition.update.mockResolvedValue({ id: 'cond-1', status: 'FULFILLED' });
      mockPrisma.permitCondition.findMany.mockResolvedValue([]); // all conditions fulfilled

      const result = await service.fulfillCondition(
        { conditionId: 'cond-1', notes: 'Signage installed at main entrance' },
        'user-1',
      );

      expect(result.status).toBe('FULFILLED');
    });

    it('should reject if condition already fulfilled', async () => {
      mockPrisma.permitCondition.findUnique.mockResolvedValue({
        id: 'cond-1',
        status: 'FULFILLED',
      });

      await expect(
        service.fulfillCondition({ conditionId: 'cond-1', notes: 'Already done' }, 'user-1'),
      ).rejects.toThrow();
    });
  });
});
