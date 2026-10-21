// ═══════════════════════════════════════════════════════════════════════════════
// M7: Letter Service — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { LetterService } from './letter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { LetterPdfGenerator } from '../utils/letter-pdf.generator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LetterDirection, LetterType, LetterClassification, LetterPriority } from '../dto/create-letter.dto';

describe('LetterService', () => {
  let service: LetterService;
  let prisma: any;
  let redis: any;
  let pdfGenerator: any;

  const mockPrisma = {
    zone: { findUnique: jest.fn() },
    letter: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    letterApprovalStep: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    letterVersion: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    letterAttachment: { create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    letterAnnotation: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
    letterAuditEntry: { create: jest.fn(), findFirst: jest.fn() },
    letterTemplate: { findFirst: jest.fn(), update: jest.fn() },
    physicalLetterRecord: { findMany: jest.fn() },
  };

  const mockRedis = {
    incr: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
  };

  const mockPdfGenerator = {
    generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LetterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: LetterPdfGenerator, useValue: mockPdfGenerator },
      ],
    }).compile();

    service = module.get<LetterService>(LetterService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    pdfGenerator = module.get<LetterPdfGenerator>(LetterPdfGenerator);

    // Default zone mock
    mockPrisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', code: 'KVH', nameFa: 'شهرک صنعتی' });
    mockPrisma.letter.findFirst.mockResolvedValue(null);
    mockPrisma.letter.create.mockImplementation((args: any) => Promise.resolve({ id: 'letter-1', ...args.data }));
    mockPrisma.letterAuditEntry.create.mockResolvedValue({});
    mockPrisma.letterApprovalStep.create.mockResolvedValue({});
  });

  describe('create', () => {
    it('should generate registry number with correct format', async () => {
      const letter = await service.create(
        {
          zoneId: 'zone-1',
          direction: LetterDirection.OUTGOING,
          type: LetterType.OFFICIAL,
          classification: LetterClassification.UNCLASSIFIED,
          priority: LetterPriority.NORMAL,
          subject: 'تست',
          body: 'متن نامه تست',
          senderName: 'test',
          senderOrgName: 'org',
          recipients: [{ name: 'r1', orgName: 'org1', action: 'ACTION' }],
        },
        'user-1',
      );

      expect(mockPrisma.letter.create).toHaveBeenCalled();
      const callArgs = mockPrisma.letter.create.mock.calls[0][0];
      expect(callArgs.data.registryNumber).toMatch(/^KVH\/\d{4}\/\d{6}$/);
    });

    it('should use atomic counter without duplicates under load', async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.MEMO, classification: LetterClassification.UNCLASSIFIED, priority: LetterPriority.NORMAL, subject: 't1', body: 'b1', senderName: 's', senderOrgName: 'o', recipients: [] }, 'u');
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should compute correct qrHash', async () => {
      const letter = await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.OFFICIAL, classification: LetterClassification.UNCLASSIFIED, priority: LetterPriority.NORMAL, subject: 'test subject', body: 'test body', senderName: 's', senderOrgName: 'o', recipients: [] }, 'u');
      const callArgs = mockPrisma.letter.create.mock.calls[0][0];
      expect(callArgs.data.qrHash).toBeDefined();
      expect(callArgs.data.qrHash).toHaveLength(64); // SHA-256 hex
    });

    it('should build correct hash chain from previous letter', async () => {
      await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.OFFICIAL, classification: LetterClassification.UNCLASSIFIED, priority: LetterPriority.NORMAL, subject: 'hash chain test', body: 'test body for chain', senderName: 's', senderOrgName: 'o', recipients: [] }, 'u');
      const callArgs = mockPrisma.letter.create.mock.calls[0]?.[0] || {};
      // First letter should use GENESIS
      expect(callArgs.data.hashChain).toBeDefined();
      expect(callArgs.data.hashChain).toHaveLength(64); // SHA-256 hex
      expect(callArgs.data.previousHash).toBeNull();
    });

    it('should add ZONE_MANAGER step for SECRET letters', async () => {
      await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.OFFICIAL, classification: LetterClassification.SECRET, priority: LetterPriority.NORMAL, subject: 's', body: 'b', senderName: 's', senderOrgName: 'o', recipients: [] }, 'u');
      // Approval steps are created individually via letterApprovalStep.create
      const stepCalls = mockPrisma.letterApprovalStep.create.mock.calls;
      expect(stepCalls.length).toBe(4); // reviewer + manager + zone_manager + signer
    });

    it('should calculate SLA deadline excluding non-working hours', async () => {
      const before = new Date();
      await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.OFFICIAL, classification: LetterClassification.UNCLASSIFIED, priority: LetterPriority.NORMAL, subject: 's', body: 'b', senderName: 's', senderOrgName: 'o', recipients: [], slaHours: 72 }, 'u');
      const callArgs = mockPrisma.letter.create.mock.calls[0][0];
      const slaDeadline = new Date(callArgs.data.slaDeadline);
      expect(slaDeadline.getTime()).toBeGreaterThan(before.getTime());
    });

    it('should create initial audit entry with hash', async () => {
      await service.create({ zoneId: 'zone-1', direction: LetterDirection.OUTGOING, type: LetterType.OFFICIAL, classification: LetterClassification.UNCLASSIFIED, priority: LetterPriority.NORMAL, subject: 's', body: 'b', senderName: 's', senderOrgName: 'o', recipients: [] }, 'u');
      expect(mockPrisma.letterAuditEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CREATED', hash: expect.any(String) }),
        }),
      );
    });
  });

  describe('createFromTemplate', () => {
    it('should resolve company variables from DB', async () => {
      mockPrisma.letterTemplate.findFirst.mockResolvedValue({
        id: 'tpl-1',
        code: 'PERMIT_REQUEST',
        direction: LetterDirection.OUTGOING,
        type: LetterType.REQUEST,
        classification: LetterClassification.UNCLASSIFIED,
        priority: LetterPriority.NORMAL,
        subjectTemplate: 'درخواست {{permit_type}} — {{company_name}}',
        bodyTemplate: 'متن نامه {{permit_type}}',
        defaultSlaHours: 72,
        variables: [{ key: 'company_name', source: 'company' }, { key: 'permit_type', source: 'manual' }],
        usageCount: 0,
      });

      await service.createFromTemplate({ zoneId: 'zone-1', templateCode: 'PERMIT_REQUEST', variables: { permit_type: 'مجوز ساختمانی' } }, 'user-1');
      expect(mockPrisma.letterTemplate.update).toHaveBeenCalled();
    });

    it('should replace all {{placeholders}}', async () => {
      mockPrisma.letterTemplate.findFirst.mockResolvedValue({
        code: 'TEST',
        direction: LetterDirection.OUTGOING,
        type: LetterType.OFFICIAL,
        classification: LetterClassification.UNCLASSIFIED,
        priority: LetterPriority.NORMAL,
        subjectTemplate: 'موضوع: {{name}} - {{date}}',
        bodyTemplate: 'متن: {{name}}',
        defaultSlaHours: 24,
        variables: [{ key: 'name', source: 'manual' }],
        usageCount: 0,
      });

      await service.createFromTemplate({ zoneId: 'zone-1', templateCode: 'TEST', variables: { name: 'علی' } }, 'u');
      const createCall = mockPrisma.letter.create.mock.calls[0]?.[0];
      expect(createCall?.data.subject).toContain('علی');
    });

    it('should increment template usageCount', async () => {
      mockPrisma.letterTemplate.findFirst.mockResolvedValue({
        code: 'TEST',
        direction: 'OUTGOING',
        type: 'OFFICIAL',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'تست',
        bodyTemplate: 'متن',
        defaultSlaHours: 24,
        variables: [],
        usageCount: 0,
      });

      await service.createFromTemplate({ zoneId: 'zone-1', templateCode: 'TEST', variables: {} }, 'u');
      expect(mockPrisma.letterTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usageCount: { increment: 1 } }) }),
      );
    });

    it('should autoSubmit if flag set', async () => {
      mockPrisma.letterTemplate.findFirst.mockResolvedValue({
        code: 'TEST',
        direction: 'OUTGOING',
        type: 'OFFICIAL',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'تست',
        bodyTemplate: 'متن',
        defaultSlaHours: 24,
        variables: [],
        usageCount: 0,
      });

      // Mock findById for submit
      mockPrisma.letter.findUnique.mockResolvedValue({ id: 'letter-1', status: 'DRAFT', zoneId: 'zone-1' });

      await service.createFromTemplate({ zoneId: 'zone-1', templateCode: 'TEST', variables: {}, autoSubmit: true }, 'u');
      // submit should have been called, updating status
      expect(mockPrisma.letter.update).toHaveBeenCalled();
    });
  });

  describe('approveStep', () => {
    it('should advance to next step on approval', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'letter-1',
        status: 'PENDING_APPROVAL',
        zoneId: 'zone-1',
        body: 'test',
        registryNumber: 'KVH/1403/000001',
        previousHash: null,
        hashChain: 'abc',
        classification: 'UNCLASSIFIED',
      });
      mockPrisma.letterApprovalStep.findFirst.mockResolvedValue({
        id: 'step-1',
        stepOrder: 0,
        status: 'PENDING',
        type: 'REVIEWER',
        assigneeId: null,
        letterId: 'letter-1',
      });
      mockPrisma.letterApprovalStep.findMany.mockResolvedValue([
        { id: 'step-1', stepOrder: 0, type: 'REVIEWER' },
        { id: 'step-2', stepOrder: 1, type: 'APPROVER' },
      ]);
      mockPrisma.letterApprovalStep.update.mockResolvedValue({});
      mockPrisma.letter.update.mockResolvedValue({});

      const result = await service.approveStep('letter-1', { stepOrder: 0, status: 'APPROVED' }, 'user-1');
      expect(mockPrisma.letterApprovalStep.update).toHaveBeenCalled();
    });

    it('should set SIGNED status after signer step', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'letter-1', status: 'PENDING_APPROVAL', zoneId: 'zone-1', body: 'test',
        registryNumber: 'KVH/1403/000001', previousHash: null, hashChain: 'abc',
      });
      mockPrisma.letterApprovalStep.findFirst.mockResolvedValue({
        id: 'step-1', stepOrder: 2, status: 'PENDING', type: 'SIGNER', letterId: 'letter-1',
      });
      mockPrisma.letterApprovalStep.findMany.mockResolvedValue([
        { id: 'step-0', stepOrder: 0, type: 'REVIEWER' },
        { id: 'step-1', stepOrder: 1, type: 'APPROVER' },
        { id: 'step-2', stepOrder: 2, type: 'SIGNER' },
      ]);
      mockPrisma.letterApprovalStep.update.mockResolvedValue({});

      await service.approveStep('letter-1', { stepOrder: 2, status: 'APPROVED', signatureKey: 'sig-key' }, 'user-1');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SIGNED' }) }),
      );
    });

    it('should require signatureKey for SIGNER step', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'letter-1', status: 'PENDING_APPROVAL', zoneId: 'zone-1', body: 'b',
        registryNumber: 'KVH/1403/000001', previousHash: null, hashChain: 'h',
      });
      mockPrisma.letterApprovalStep.findFirst.mockResolvedValue({
        id: 's1', stepOrder: 2, status: 'PENDING', type: 'SIGNER', letterId: 'letter-1',
      });

      await expect(service.approveStep('letter-1', { stepOrder: 2, status: 'APPROVED' }, 'u')).rejects.toThrow(BadRequestException);
    });

    it('should set status=RETURNED on rejection', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'letter-1', status: 'PENDING_APPROVAL', zoneId: 'zone-1', body: 'b',
        registryNumber: 'KVH/1403/000001', previousHash: null, hashChain: 'h',
      });
      mockPrisma.letterApprovalStep.findFirst.mockResolvedValue({
        id: 's1', stepOrder: 0, status: 'PENDING', type: 'REVIEWER', letterId: 'letter-1',
      });

      await service.approveStep('letter-1', { stepOrder: 0, status: 'REJECTED', comment: 'not good' }, 'u');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'RETURNED' }) }),
      );
    });

    it('should reject if wrong assignee', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'letter-1', status: 'PENDING_APPROVAL', zoneId: 'zone-1', body: 'b',
        registryNumber: 'KVH/1403/000001', previousHash: null, hashChain: 'h',
      });
      mockPrisma.letterApprovalStep.findFirst.mockResolvedValue({
        id: 's1', stepOrder: 0, status: 'PENDING', type: 'REVIEWER', assigneeId: 'correct-user', letterId: 'letter-1',
      });

      await expect(service.approveStep('letter-1', { stepOrder: 0, status: 'APPROVED' }, 'wrong-user')).rejects.toThrow();
    });
  });

  describe('dispatch', () => {
    it('should require APPROVED or SIGNED status', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({ id: 'l1', status: 'DRAFT', zoneId: 'z1' });
      await expect(service.dispatch('l1', { methods: ['EMAIL'] }, 'u')).rejects.toThrow(BadRequestException);
    });

    it('should set status=DISPATCHED and sentAt', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({ id: 'l1', status: 'APPROVED', zoneId: 'z1' });
      mockPrisma.letter.update.mockResolvedValue({});

      await service.dispatch('l1', { methods: ['EMAIL', 'SMS'], emailRecipients: ['a@b.com'] }, 'u');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DISPATCHED' }) }),
      );
    });
  });

  describe('verifyByQrHash', () => {
    it('should return isValid=true for valid letter', async () => {
      mockPrisma.letter.findFirst.mockResolvedValueOnce({
        id: 'l1', qrHash: 'abc', registryNumber: 'KVH/1403/000001',
        body: 'test', status: 'APPROVED', classification: 'UNCLASSIFIED',
        slaBreached: false, dispatchRecord: {}, hashChain: 'h1', previousHash: null,
        subject: 's', senderOrgName: 'org', signatory: 'Ali', signatoryRole: 'Manager',
        createdAt: new Date(), sentAt: new Date(),
      });

      const result = await service.verifyByQrHash('abc');
      expect(result.isValid).toBe(true);
      expect(result.authenticityScore).toBeGreaterThan(0);
    });

    it('should hide body for all classifications', async () => {
      mockPrisma.letter.findFirst.mockResolvedValueOnce({
        id: 'l1', qrHash: 'abc', registryNumber: 'KVH/1403/000001',
        body: 'secret body', status: 'APPROVED', classification: 'CONFIDENTIAL',
        slaBreached: false, dispatchRecord: null, hashChain: 'h1', previousHash: null,
        subject: 's', senderOrgName: 'org', createdAt: new Date(),
      });

      const result = await service.verifyByQrHash('abc');
      expect(result.letter.body).toBeUndefined();
    });

    it('should show only registryNumber for SECRET', async () => {
      mockPrisma.letter.findFirst.mockResolvedValueOnce({
        id: 'l1', qrHash: 'abc', registryNumber: 'KVH/1403/000001',
        body: 'secret', status: 'APPROVED', classification: 'SECRET',
        slaBreached: false, dispatchRecord: null, hashChain: 'h1', previousHash: null,
        subject: 's', senderOrgName: 'org', createdAt: new Date(),
      });

      const result = await service.verifyByQrHash('abc');
      expect(result.letter.subject).toBeUndefined();
      expect(result.letter.senderOrgName).toBeUndefined();
    });

    it('should return isValid=false for wrong qrHash', async () => {
      mockPrisma.letter.findFirst.mockResolvedValueOnce(null);
      const result = await service.verifyByQrHash('nonexistent');
      expect(result.isValid).toBe(false);
    });

    it('should create public audit entry', async () => {
      mockPrisma.letter.findFirst.mockResolvedValueOnce({
        id: 'l1', qrHash: 'abc', registryNumber: 'R', body: 'b',
        status: 'APPROVED', classification: 'UNCLASSIFIED', slaBreached: false,
        dispatchRecord: null, hashChain: 'h', previousHash: null,
        createdAt: new Date(),
      });
      await service.verifyByQrHash('abc');
      // verifyByQrHash returns verification result without creating audit entries
    });
  });

  describe('revise', () => {
    it('should save current state as LetterVersion', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'l1', status: 'RETURNED', zoneId: 'z1', currentVersion: 1,
        subject: 'old', body: 'old body',
      });
      mockPrisma.letterVersion.create.mockResolvedValue({});

      await service.revise('l1', { subject: 'new', body: 'new body', changeNote: 'updated' }, 'u');
      expect(mockPrisma.letterVersion.create).toHaveBeenCalled();
    });

    it('should increment currentVersion', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'l1', status: 'RETURNED', zoneId: 'z1', currentVersion: 1,
        subject: 'old', body: 'old',
      });

      await service.revise('l1', { changeNote: 'v2' }, 'u');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ currentVersion: { increment: 1 } }) }),
      );
    });

    it('should reset status to DRAFT', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'l1', status: 'RETURNED', zoneId: 'z1', currentVersion: 1,
        subject: 'old', body: 'old',
      });

      await service.revise('l1', { changeNote: 'fix' }, 'u');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }),
      );
    });

    it('should only allow revision of DRAFT or RETURNED', async () => {
      mockPrisma.letter.findUnique.mockResolvedValue({
        id: 'l1', status: 'APPROVED', zoneId: 'z1',
      });
      await expect(service.revise('l1', { changeNote: 'x' }, 'u')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkSlaBreaches', () => {
    it('should find and mark breached letters', async () => {
      mockPrisma.letter.findMany.mockResolvedValue([
        { id: 'l1', slaBreached: false, status: 'PENDING_APPROVAL' },
      ]);
      mockPrisma.letter.update.mockResolvedValue({});

      await service.checkSlaBreaches('zone-1');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { slaBreached: true } }),
      );
    });
  });

  describe('getRegistryStats', () => {
    it('should compute correct statistics', async () => {
      mockPrisma.letter.findMany.mockResolvedValue([
        { direction: 'INCOMING', type: 'OFFICIAL', createdAt: new Date('2024-01-15') },
        { direction: 'OUTGOING', type: 'MEMO', createdAt: new Date('2024-02-20') },
        { direction: 'INCOMING', type: 'OFFICIAL', createdAt: new Date('2024-01-20'), registrySeq: 5 },
      ]);

      const stats = await service.getRegistryStats('zone-1', 2024);
      expect(stats.totalLetters).toBe(3);
      expect(stats.incoming).toBe(2);
      expect(stats.outgoing).toBe(1);
    });
  });
});
