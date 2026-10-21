import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService } from './signature.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { SignatureGatewayService } from './signature-gateway.service';

describe('SignatureService', () => {
  let service: SignatureService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      signatureRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      signatureRequestSigner: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      documentSignature: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      digitalCertificate: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incr: jest.fn(),
    };

    gateway = {
      emitSignatureNeeded: jest.fn(),
      emitSigned: jest.fn(),
      emitCompleted: jest.fn(),
      emitDeclined: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: SignatureGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
  });

  describe('requestSignatures', () => {
    it('should create a signature request and notify parallel signers', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Ali', lastName: 'Rezaei' },
      ]);
      prisma.signatureRequest.create.mockResolvedValue({
        id: 'sr-1', signers: [{ signerId: 'user-1' }],
      });

      const result = await service.requestSignatures(
        {
          zoneId: 'z-1',
          documentType: 'INVOICE',
          documentId: 'inv-1',
          documentTitle: 'Invoice #1',
          signingMode: 'PARALLEL',
          signers: [{ signerId: 'user-1', order: 1, isRequired: true, signerRole: 'MANAGER' }],
        } as any,
        'user-2',
      );

      expect(result.id).toBe('sr-1');
      expect(gateway.emitSignatureNeeded).toHaveBeenCalled();
    });

    it('should notify only first signer in sequential mode', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'A', lastName: 'B' },
        { id: 'user-2', firstName: 'C', lastName: 'D' },
      ]);
      prisma.signatureRequest.create.mockResolvedValue({
        id: 'sr-1', signers: [],
      });

      await service.requestSignatures(
        {
          zoneId: 'z-1',
          documentType: 'CONTRACT',
          documentId: 'c-1',
          documentTitle: 'Contract',
          signingMode: 'SEQUENTIAL',
          signers: [
            { signerId: 'user-1', order: 1, isRequired: true, signerRole: 'A' },
            { signerId: 'user-2', order: 2, isRequired: true, signerRole: 'B' },
          ],
        } as any,
        'creator',
      );

      expect(gateway.emitSignatureNeeded).toHaveBeenCalledTimes(1);
      expect(gateway.emitSignatureNeeded).toHaveBeenCalledWith(
        expect.objectContaining({ signerId: 'user-1' }),
      );
    });
  });

  describe('signDocument', () => {
    it('should sign a document successfully', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: 'sr-1', documentType: 'INVOICE', documentId: 'inv-1',
        documentTitle: 'Invoice', documentHash: 'hash123',
        status: 'PENDING', deadline: null, createdBy: 'creator',
        signingMode: 'PARALLEL',
        signers: [{ id: 's-1', signerId: 'user-1', status: 'PENDING', signerOrder: 1, signerName: 'Ali', signerRole: 'MANAGER', isRequired: true }],
      });
      prisma.digitalCertificate.findUnique.mockResolvedValue({
        id: 'cert-1', status: 'ACTIVE', expiresAt: new Date(Date.now() + 365 * 86400000),
      });
      prisma.documentSignature.create.mockResolvedValue({ id: 'ds-1' });
      prisma.signatureRequestSigner.update.mockResolvedValue({});
      prisma.signatureRequestSigner.findMany.mockResolvedValue([
        { id: 's-1', signerId: 'user-1', status: 'SIGNED', signerOrder: 1, isRequired: true },
      ]);
      prisma.signatureRequest.update.mockResolvedValue({});

      const result = await service.signDocument(
        {
          signatureRequestId: 'sr-1',
          certificateId: 'cert-1',
          signatureType: 'OTP_BASED',
        } as any,
        'user-1',
        '127.0.0.1',
        'test-agent',
      );

      expect(result.id).toBe('ds-1');
      expect(gateway.emitSigned).toHaveBeenCalled();
    });

    it('should throw SIG_REQUEST_NOT_FOUND if request not found', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.signDocument({ signatureRequestId: 'nonexistent', certificateId: 'c', signatureType: 'OTP_BASED' } as any, 'user-1', 'ip', 'ua'),
      ).rejects.toThrow(AppException);
    });

    it('should throw SIG_REQUEST_COMPLETED if already completed', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: 'sr-1', status: 'COMPLETED', deadline: null, signers: [],
      });

      await expect(
        service.signDocument({ signatureRequestId: 'sr-1', certificateId: 'c', signatureType: 'OTP_BASED' } as any, 'user-1', 'ip', 'ua'),
      ).rejects.toThrow(AppException);
    });

    it('should throw SIG_REQUEST_EXPIRED if past deadline', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: 'sr-1', status: 'PENDING', deadline: new Date(Date.now() - 1000), signers: [],
      });

      await expect(
        service.signDocument({ signatureRequestId: 'sr-1', certificateId: 'c', signatureType: 'OTP_BASED' } as any, 'user-1', 'ip', 'ua'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('declineSignature', () => {
    it('should decline and cancel request if required signer', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: 'sr-1', status: 'PENDING', documentTitle: 'Test', createdBy: 'creator',
        signers: [{ id: 's-1', signerId: 'user-1', isRequired: true }],
      });
      prisma.signatureRequestSigner.update.mockResolvedValue({});
      prisma.signatureRequest.update.mockResolvedValue({});

      const result = await service.declineSignature(
        { signatureRequestId: 'sr-1', reason: 'Not accurate' } as any,
        'user-1',
      );

      expect(prisma.signatureRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DECLINED' }),
        }),
      );
    });
  });

  describe('cancelRequest', () => {
    it('should cancel a request', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({ id: 'sr-1', status: 'PENDING' });
      prisma.signatureRequest.update.mockResolvedValue({ id: 'sr-1', status: 'CANCELLED' });

      const result = await service.cancelRequest('sr-1', 'No longer needed', 'user-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw if not found', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue(null);
      await expect(service.cancelRequest('x', 'reason', 'user-1')).rejects.toThrow(AppException);
    });
  });

  describe('getRequestStatus', () => {
    it('should return status with completion percent', async () => {
      prisma.signatureRequest.findUnique.mockResolvedValue({
        id: 'sr-1', documentTitle: 'Test', status: 'IN_PROGRESS',
        signers: [
          { signerOrder: 1, signerName: 'Ali', signerRole: 'A', status: 'SIGNED', signedAt: new Date(), signerId: 'u1', isRequired: true },
          { signerOrder: 2, signerName: 'Reza', signerRole: 'B', status: 'PENDING', signedAt: null, signerId: 'u2', isRequired: true },
        ],
      });

      const result = await service.getRequestStatus('sr-1');
      expect(result.completionPercent).toBe(50);
      expect(result.nextExpectedSigner).toBe('u2');
    });
  });

  describe('getSigningStats', () => {
    it('should compute signing statistics', async () => {
      prisma.signatureRequest.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'PENDING' },
        { status: 'DECLINED' },
      ]);

      const stats = await service.getSigningStats('z-1');
      expect(stats.totalRequests).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.declined).toBe(1);
    });
  });
});
