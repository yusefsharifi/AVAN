// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Service — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */

import { VerificationService } from './verification.service';
import { VerificationRateLimiter } from './verification-rate-limiter.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;
  let rateLimiter: VerificationRateLimiter;
  let redis: any;

  beforeEach(() => {
    prisma = {
      letter: { findUnique: jest.fn() },
      issuedPermit: { findUnique: jest.fn(), findFirst: jest.fn() },
      documentSignature: { findUnique: jest.fn() },
      company: { findFirst: jest.fn() },
      waybill: { findFirst: jest.fn() },
      waybillApproval: { findMany: jest.fn() },
      workOrder: { findFirst: jest.fn() },
      hseTrainingPlan: { findFirst: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      commercialContract: { findFirst: jest.fn() },
      verificationBadge: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      verificationRecord: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };

    rateLimiter = {
      isIpBlocked: jest.fn().mockResolvedValue(false),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 29, resetAt: new Date(), limitType: 'session' }),
      checkManualLookupLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: new Date(), limitType: 'ip' }),
      incrementCounters: jest.fn().mockResolvedValue(undefined),
      getSessionId: jest.fn().mockReturnValue('test-session'),
    } as unknown as VerificationRateLimiter;

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
    };

    service = new VerificationService(prisma, rateLimiter, redis);
  });

  describe('verifyByQr', () => {
    it('should return VALID for active permit QR', async () => {
      prisma.issuedPermit.findUnique.mockResolvedValue({
        id: 'permit-1', permitNumber: 'PRM-001', type: 'ACTIVITY_LICENSE',
        holderName: 'Test Co', validFrom: new Date('2024-01-01'),
        validUntil: new Date('2099-12-31'), status: 'ACTIVE',
        locationDescription: 'Building A', allowedActivities: ['Manufacturing'],
        issuedByName: 'Zone Admin', issuedAt: new Date(),
        qrHash: 'test-qr-hash-12345', zoneId: 'zone-1',
        zone: { nameFa: 'شهرک تست', nameEn: 'Test Zone', city: 'Tehran', phone: '021', email: 'a@b.com' },
      });

      const result = await service.verifyByQr('test-qr-hash-12345', 'fa', '1.2.3.4', 'Mozilla/5.0', 'sess-1');
      expect(result.isValid).toBe(true);
      expect(result.result).toBe('VALID');
      expect(result.documentType).toBe('PERMIT');
      expect(result.data).toHaveProperty('permitNumber', 'PRM-001');
    });

    it('should return EXPIRED for expired permit', async () => {
      prisma.issuedPermit.findUnique.mockResolvedValue({
        id: 'permit-2', permitNumber: 'PRM-002', type: 'ACTIVITY_LICENSE',
        holderName: 'Test Co', validFrom: new Date('2020-01-01'),
        validUntil: new Date('2023-12-31'), status: 'ACTIVE',
        locationDescription: 'Building B', allowedActivities: [],
        issuedByName: 'Zone Admin', issuedAt: new Date(),
        qrHash: 'expired-qr', zoneId: 'zone-1',
        zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran', phone: null, email: null },
      });

      const result = await service.verifyByQr('expired-qr', 'en', '1.2.3.4', 'UA', 's1');
      expect(result.isValid).toBe(false);
      expect(result.result).toBe('EXPIRED');
    });

    it('should return REVOKED for revoked permit', async () => {
      prisma.issuedPermit.findUnique.mockResolvedValue({
        id: 'p3', permitNumber: 'PRM-003', type: 'ACTIVITY_LICENSE',
        holderName: 'Test Co', validFrom: new Date('2024-01-01'),
        validUntil: new Date('2099-12-31'), status: 'REVOKED',
        locationDescription: null, allowedActivities: [],
        issuedByName: 'Admin', issuedAt: new Date(),
        qrHash: 'revoked-qr', zoneId: 'z1',
        zone: { nameFa: 'z', nameEn: 'z', city: 'c' },
      });

      const result = await service.verifyByQr('revoked-qr', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('REVOKED');
    });

    it('should return NOT_FOUND for unknown QR hash', async () => {
      prisma.issuedPermit.findUnique.mockResolvedValue(null);
      prisma.letter.findUnique.mockResolvedValue(null);
      prisma.documentSignature.findUnique.mockResolvedValue(null);
      prisma.verificationBadge.findUnique.mockResolvedValue(null);

      const result = await service.verifyByQr('unknown-hash-12345678', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('NOT_FOUND');
    });

    it('should return RATE_LIMITED when session limit exceeded', async () => {
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false, remaining: 0, resetAt: new Date(), limitType: 'session',
      });

      const result = await service.verifyByQr('some-hash-12345678', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('RATE_LIMITED');
    });

    it('should cache result in Redis for 5 minutes', async () => {
      prisma.letter.findUnique.mockResolvedValue(null);
      prisma.issuedPermit.findUnique.mockResolvedValue(null);
      prisma.documentSignature.findUnique.mockResolvedValue(null);
      prisma.verificationBadge.findUnique.mockResolvedValue(null);

      await service.verifyByQr('cache-test-hash-12345', 'fa', '1.2.3.4', 'UA', 's1');
      expect(redis.set).toHaveBeenCalledWith(
        'verify:result:cache-test-hash-12345', expect.any(String), 'EX', 300,
      );
    });

    it('should return cached result if available', async () => {
      const cached = { isValid: true, result: 'VALID', resultCode: 'VALID', documentType: 'PERMIT', data: {} };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.verifyByQr('cached-hash', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result).toEqual(cached);
      expect(prisma.letter.findUnique).not.toHaveBeenCalled();
    });

    it('should update badge viewCount', async () => {
      prisma.verificationBadge.findUnique.mockResolvedValue({
        id: 'b1', documentType: 'PERMIT', documentId: 'p1', qrHash: 'badge-hash', viewCount: 5,
      });
      prisma.verificationBadge.update.mockResolvedValue({ id: 'b1' });
      prisma.issuedPermit.findFirst.mockResolvedValue(null);

      await service.verifyByQr('badge-hash', 'fa', '1.2.3.4', 'UA', 's1');
      expect(prisma.verificationBadge.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { viewCount: { increment: 1 }, lastViewedAt: expect.any(Date) },
      });
    });

    it('should apply classification rules for SECRET letters', async () => {
      prisma.letter.findUnique.mockResolvedValue({
        id: 'l1', registryNumber: 'LTR-001', classification: 'SECRET',
        zoneId: 'z1', zone: { nameFa: 'z', nameEn: 'z', city: 'c' },
      });

      const result = await service.verifyByQr('secret-letter-qr', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('CLASSIFIED');
      expect(result.data).toHaveProperty('registryNumber', 'LTR-001');
      expect(result.data).not.toHaveProperty('subject');
    });

    it('should return IP blocked as RATE_LIMITED', async () => {
      (rateLimiter.isIpBlocked as jest.Mock).mockResolvedValue(true);
      const result = await service.verifyByQr('any-hash-12345678', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('RATE_LIMITED');
    });
  });

  describe('verifyByNumber', () => {
    it('should find letter by registryNumber', async () => {
      prisma.letter.findUnique.mockResolvedValue({
        id: 'l1', registryNumber: 'LTR-1403-001', direction: 'OUTGOING', type: 'OFFICIAL',
        subject: 'Test', status: 'SENT', classification: 'UNCLASSIFIED',
        senderOrgName: 'HR Dept', signatory: 'Manager', signatoryRole: 'Director',
        createdAt: new Date(), sentAt: new Date(),
        zoneId: 'z1', zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran', phone: null, email: null },
      });

      const result = await service.verifyByNumber('LETTER', 'LTR-1403-001', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.isValid).toBe(true);
      expect(result.documentType).toBe('LETTER');
      expect(result.data).toHaveProperty('registryNumber', 'LTR-1403-001');
    });

    it('should find company by registrationNumber', async () => {
      prisma.company.findFirst.mockResolvedValue({
        id: 'c1', registrationNumber: '12345678', nameFa: 'شرکت تست', nameEn: 'Test Co',
        type: 'MANUFACTURING', industryCategory: 'Steel',
        lifecycleStatus: 'ACTIVE', isActive: true,
        zoneId: 'z1', zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran', phone: null, email: null },
      });

      const result = await service.verifyByNumber('COMPANY', '12345678', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.isValid).toBe(true);
      expect(result.data).not.toHaveProperty('ceoNationalId');
    });

    it('should apply stricter rate limit for manual lookup', async () => {
      (rateLimiter.checkManualLookupLimit as jest.Mock).mockResolvedValue({
        allowed: false, remaining: 0, resetAt: new Date(), limitType: 'ip',
      });

      const result = await service.verifyByNumber('LETTER', 'LTR-001', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('RATE_LIMITED');
    });

    it('should return NOT_FOUND for non-existent number', async () => {
      prisma.letter.findUnique.mockResolvedValue(null);
      prisma.issuedPermit.findFirst.mockResolvedValue(null);
      prisma.company.findFirst.mockResolvedValue(null);
      prisma.waybill.findFirst.mockResolvedValue(null);
      prisma.workOrder.findFirst.mockResolvedValue(null);
      prisma.hseTrainingPlan.findFirst.mockResolvedValue(null);
      prisma.purchaseOrder.findFirst.mockResolvedValue(null);
      prisma.commercialContract.findFirst.mockResolvedValue(null);

      const result = await service.verifyByNumber('LETTER', 'NONEXISTENT', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.result).toBe('NOT_FOUND');
    });
  });

  describe('verifyCompany', () => {
    it('should return VALID for ACTIVE company', async () => {
      prisma.company.findFirst.mockResolvedValue({
        id: 'c1', registrationNumber: '12345', nameFa: 'تست', nameEn: 'Test',
        type: 'MANUFACTURING', industryCategory: 'Steel', lifecycleStatus: 'ACTIVE', isActive: true,
        zoneId: 'z1', zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran', phone: null, email: null },
      });

      const result = await service.verifyByNumber('COMPANY', '12345', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.isValid).toBe(true);
      expect(result.data).not.toHaveProperty('ceoNationalId');
      expect(result.data).not.toHaveProperty('creditLimit');
    });
  });

  describe('verifyWaybill', () => {
    it('should return VALID for active waybill', async () => {
      prisma.waybill.findFirst.mockResolvedValue({
        id: 'wb1', waybillNumber: 'WB-001', type: 'STANDARD', direction: 'INBOUND',
        cargoCategory: 'RAW_MATERIAL', isHazmat: false, status: 'APPROVED',
        carrierName: 'Carrier Co', expectedArrival: new Date(),
        zoneId: 'z1', zone: { nameFa: 'Z' },
      });
      prisma.waybillApproval.findMany.mockResolvedValue([]);

      const result = await service.verifyByNumber('WAYBILL', 'WB-001', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.isValid).toBe(true);
      expect(result.data).not.toHaveProperty('driverName');
    });
  });

  describe('getVerificationStats', () => {
    it('should return correct statistics', async () => {
      prisma.verificationRecord.findMany.mockResolvedValue([
        { documentType: 'PERMIT', resultCode: 'VALID', sessionId: 's1', documentId: 'd1', responseMs: 100, createdAt: new Date('2024-01-01T10:00:00') },
        { documentType: 'LETTER', resultCode: 'NOT_FOUND', sessionId: 's2', documentId: null, responseMs: 200, createdAt: new Date('2024-01-01T14:00:00') },
      ]);

      const stats = await service.getVerificationStats();
      expect(stats.totalVerifications).toBe(2);
      expect(stats.uniqueSessions).toBe(2);
      expect(stats.byType).toEqual({ PERMIT: 1, LETTER: 1 });
      expect(stats.avgResponseMs).toBe(150);
    });
  });

  describe('getPortalInfo', () => {
    it('should return portal info with all doc types', async () => {
      prisma.verificationRecord.count.mockResolvedValue(150);
      prisma.verificationRecord.findMany.mockResolvedValue([]);

      const info = await service.getPortalInfo();
      expect(info).toHaveProperty('nameFa');
      expect(info).toHaveProperty('supportedDocTypes');
      expect(info).toHaveProperty('totalVerifications', 150);
      expect((info.supportedDocTypes as unknown[])).toHaveLength(11);
    });
  });

  describe('badge management', () => {
    it('should create badge if not exists', async () => {
      prisma.verificationBadge.findFirst.mockResolvedValue(null);
      prisma.verificationBadge.create.mockResolvedValue({
        id: 'b1', badgeCode: 'VRF-1234-5678', qrHash: 'hash123',
      });

      const result = await service.createOrGetBadge('LETTER', 'doc1', 'hash123');
      expect(result.badgeCode).toBe('VRF-1234-5678');
      expect(prisma.verificationBadge.create).toHaveBeenCalled();
    });

    it('should return existing badge', async () => {
      prisma.verificationBadge.findFirst.mockResolvedValue({
        id: 'b1', badgeCode: 'VRF-EXISTING', qrHash: 'existing-hash',
      });

      const result = await service.createOrGetBadge('LETTER', 'doc1', 'hash');
      expect(result.badgeCode).toBe('VRF-EXISTING');
      expect(prisma.verificationBadge.create).not.toHaveBeenCalled();
    });

    it('should return null for unknown badge code', async () => {
      prisma.verificationBadge.findUnique.mockResolvedValue(null);
      const result = await service.getBadgeInfo('VRF-NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('verifyLetter classification', () => {
    it('should return full data for UNCLASSIFIED', async () => {
      prisma.letter.findUnique.mockResolvedValue({
        id: 'l1', registryNumber: 'LTR-001', subject: 'Meeting', direction: 'OUTGOING',
        type: 'OFFICIAL', senderOrgName: 'HR', status: 'SENT', classification: 'UNCLASSIFIED',
        signatory: 'Manager', signatoryRole: 'Director', createdAt: new Date(), sentAt: new Date(),
        zoneId: 'z1', zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran' },
      });

      const result = await service.verifyByQr('ltr-qr', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.data).toHaveProperty('subject', 'Meeting');
      expect(result.data).toHaveProperty('senderOrgName', 'HR');
    });

    it('should hide subject for CONFIDENTIAL', async () => {
      prisma.letter.findUnique.mockResolvedValue({
        id: 'l1', registryNumber: 'LTR-002', classification: 'CONFIDENTIAL',
        direction: 'OUTGOING', type: 'OFFICIAL', status: 'SENT',
        signatory: 'Manager', createdAt: new Date(),
        zoneId: 'z1', zone: { nameFa: 'Z', nameEn: 'Z', city: 'Tehran' },
      });

      const result = await service.verifyByQr('conf-qr', 'fa', '1.2.3.4', 'UA', 's1');
      expect(result.data).toHaveProperty('note');
      expect(result.data).not.toHaveProperty('subject');
    });
  });

  describe('purgeCache', () => {
    it('should delete all cached verification results', async () => {
      redis.keys.mockResolvedValue(['verify:result:key1', 'verify:result:key2']);
      await service.purgeCache('LETTER', 'doc1');
      expect(redis.del).toHaveBeenCalledWith('verify:result:key1', 'verify:result:key2');
    });

    it('should handle null Redis gracefully', async () => {
      const noRedisService = new VerificationService(prisma, rateLimiter, null);
      await expect(noRedisService.purgeCache('LETTER', 'doc1')).resolves.toBeUndefined();
    });
  });
});
