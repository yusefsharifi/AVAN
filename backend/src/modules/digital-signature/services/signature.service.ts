import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { RequestSignatureDto, SignDocumentDto, BulkSignDto, DeclineSignatureDto, DelegateSigningDto, FilterSignatureRequestsDto } from '../dto/create-dtos';
import type { PaginatedResult, SignatureRequestStatusDto, SigningStatsDto } from '../dto/enums';
import { SignatureGatewayService } from './signature-gateway.service';
import { computeDocumentHash, generateVerificationQrHash, createOtpSignature, createHashSignature } from '../utils/signature.utils';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: SignatureGatewayService,
  ) {}

  async requestSignatures(dto: RequestSignatureDto, requestedBy: string): Promise<any> {
    // Compute document hash (would fetch from source module in production)
    const documentHash = computeDocumentHash(`${dto.documentType}:${dto.documentId}:${Date.now()}`);

    // Fetch signer user names
    const signerUserIds = dto.signers.map((s) => s.signerId);
    const signerUsers = await this.prisma.user.findMany({ where: { id: { in: signerUserIds } }, select: { id: true, firstName: true, lastName: true } });
    const signerNameMap = new Map(signerUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    const request = await this.prisma.signatureRequest.create({
      data: {
        zoneId: dto.zoneId,
        documentType: dto.documentType,
        documentId: dto.documentId,
        documentTitle: dto.documentTitle,
        documentHash,
        status: 'PENDING',
        signingMode: dto.signingMode,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        createdBy: requestedBy,
        signers: {
          create: dto.signers.map((s) => ({
            signerOrder: s.order,
            signerId: s.signerId,
            signerName: signerNameMap.get(s.signerId) || s.signerId,
            signerRole: s.signerRole,
            status: 'PENDING',
            isRequired: s.isRequired,
          })),
        },
      },
      include: { signers: true },
    });

    // Notify signers based on mode
    if (dto.signingMode === 'SEQUENTIAL') {
      const firstSigner = [...dto.signers].sort((a, b) => a.order - b.order)[0];
      if (firstSigner) {
        this.gateway.emitSignatureNeeded({
          signerId: firstSigner.signerId, requestId: request.id,
          documentTitle: dto.documentTitle, isRequired: firstSigner.isRequired,
          deadline: dto.deadline, order: firstSigner.order,
        });
      }
    } else {
      // PARALLEL: notify all
      for (const signer of dto.signers) {
        this.gateway.emitSignatureNeeded({
          signerId: signer.signerId, requestId: request.id,
          documentTitle: dto.documentTitle, isRequired: signer.isRequired,
          deadline: dto.deadline, order: signer.order,
        });
      }
    }

    await this.audit.log({ zoneId: dto.zoneId, action: 'SIG_REQUEST_CREATED', targetType: 'SignatureRequest', targetId: request.id, userId: requestedBy, metadata: { documentType: dto.documentType, documentId: dto.documentId, signerCount: dto.signers.length } });
    return request;
  }

  async signDocument(dto: SignDocumentDto, signedBy: string, ipAddress: string, userAgent: string): Promise<any> {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id: dto.signatureRequestId }, include: { signers: true } });
    if (!request) throw new AppException('SIG_REQUEST_NOT_FOUND');
    if (request.status === 'COMPLETED' || request.status === 'DECLINED' || request.status === 'CANCELLED') throw new AppException('SIG_REQUEST_COMPLETED');
    if (request.deadline && request.deadline < new Date()) throw new AppException('SIG_REQUEST_EXPIRED');

    // Verify signer
    const signerRecord = request.signers.find((s) => s.signerId === signedBy && (s.status === 'PENDING' || s.status === 'NOTIFIED'));
    if (!signerRecord) throw new AppException('SIG_WRONG_SIGNER');

    // Validate certificate
    const cert = await this.prisma.digitalCertificate.findUnique({ where: { id: dto.certificateId } });
    if (!cert || cert.status !== 'ACTIVE') throw new AppException('CERT_NOT_FOUND');
    if (cert.expiresAt < new Date()) throw new AppException('CERT_EXPIRED');

    // Create signature based on type
    let signatureValue: string;
    if (dto.signatureType === 'OTP_BASED') {
      signatureValue = createOtpSignature(request.documentHash, signedBy, new Date(), 'system-secret-key');
    } else if (dto.signatureType === 'HASH_BASED') {
      signatureValue = createHashSignature(request.documentHash, signedBy, new Date());
    } else {
      // PKCS7 would use node-forge here
      signatureValue = computeDocumentHash(`${request.documentHash}:${signedBy}:${Date.now()}`);
    }

    const qrHash = generateVerificationQrHash(signatureValue, new Date(), request.documentId);

    const signature = await this.prisma.documentSignature.create({
      data: {
        zoneId: request.zoneId,
        signatureRequestId: request.id,
        documentType: request.documentType,
        documentId: request.documentId,
        documentTitle: request.documentTitle,
        signerId: signedBy,
        signerName: signerRecord.signerName,
        certificateId: dto.certificateId,
        signatureType: dto.signatureType,
        signatureValue,
        documentHash: request.documentHash,
        signedAt: new Date(),
        signedByIp: ipAddress,
        signedByDevice: userAgent,
        verificationQrHash: qrHash,
        signatureOrder: signerRecord.signerOrder,
        signaturePage: dto.signaturePage,
        signatureX: dto.signatureX,
        signatureY: dto.signatureY,
      },
    });

    // Update signer status
    await this.prisma.signatureRequestSigner.update({
      where: { id: signerRecord.id },
      data: { status: 'SIGNED', signedAt: new Date(), certificateId: dto.certificateId },
    });

    // Check if all required signers done
    const allSigners = await this.prisma.signatureRequestSigner.findMany({ where: { signatureRequestId: request.id } });
    const requiredSigners = allSigners.filter((s) => s.isRequired);
    const signedRequired = requiredSigners.filter((s) => s.status === 'SIGNED');
    const isComplete = signedRequired.length === requiredSigners.length;

    if (isComplete) {
      await this.prisma.signatureRequest.update({
        where: { id: request.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      this.gateway.emitCompleted({
        zoneId: request.zoneId, documentOwner: request.createdBy,
        requestId: request.id, documentTitle: request.documentTitle,
        documentType: request.documentType, documentId: request.documentId,
        signedBy: allSigners.filter((s) => s.status === 'SIGNED').map((s) => s.signerId),
      });
    } else {
      await this.prisma.signatureRequest.update({ where: { id: request.id }, data: { status: 'IN_PROGRESS' } });
      // Notify next sequential signer
      if (request.signingMode === 'SEQUENTIAL') {
        const nextSigner = allSigners
          .filter((s) => s.status === 'PENDING' || s.status === 'NOTIFIED')
          .sort((a, b) => a.signerOrder - b.signerOrder)[0];
        if (nextSigner) {
          this.gateway.emitSignatureNeeded({
            signerId: nextSigner.signerId, requestId: request.id,
            documentTitle: request.documentTitle, isRequired: nextSigner.isRequired,
            order: nextSigner.signerOrder,
          });
        }
      }
    }

    this.gateway.emitSigned({
      zoneId: request.zoneId, documentOwner: request.createdBy,
      requestId: request.id, documentTitle: request.documentTitle,
      signerName: signerRecord.signerName, signerRole: signerRecord.signerRole,
      signedAt: new Date(), isComplete,
    });

    await this.audit.log({ zoneId: request.zoneId, action: 'DOCUMENT_SIGNED', targetType: 'DocumentSignature', targetId: signature.id, userId: signedBy, metadata: { requestId: request.id, signatureType: dto.signatureType } });
    return signature;
  }

  async bulkSign(dto: BulkSignDto, signedBy: string, ipAddress: string): Promise<any[]> {
    const results: any[] = [];
    for (const requestId of dto.requestIds) {
      try {
        const result = await this.signDocument({
          signatureRequestId: requestId,
          certificateId: dto.certificateId,
          signatureType: dto.signatureType,
          pfxPassword: dto.pfxPassword,
          otpCode: dto.otpCode,
        }, signedBy, ipAddress, 'bulk-sign');
        results.push(result);
      } catch (err) {
        this.logger.error(`Bulk sign failed for ${requestId}: ${err}`);
      }
    }
    return results;
  }

  async declineSignature(dto: DeclineSignatureDto, declinedBy: string): Promise<any> {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id: dto.signatureRequestId }, include: { signers: true } });
    if (!request) throw new AppException('SIG_REQUEST_NOT_FOUND');

    const signerRecord = request.signers.find((s) => s.signerId === declinedBy);
    if (!signerRecord) throw new AppException('SIG_WRONG_SIGNER');

    await this.prisma.signatureRequestSigner.update({
      where: { id: signerRecord.id },
      data: { status: 'DECLINED', declinedAt: new Date(), declineReason: dto.reason },
    });

    if (signerRecord.isRequired) {
      await this.prisma.signatureRequest.update({
        where: { id: dto.signatureRequestId },
        data: { status: 'DECLINED', cancelReason: `Declined by ${declinedBy}: ${dto.reason}` },
      });
    }

    this.gateway.emitDeclined({
      documentOwner: request.createdBy, requestId: request.id,
      documentTitle: request.documentTitle, signerName: declinedBy, reason: dto.reason,
    });

    await this.audit.log({ zoneId: request.zoneId, action: 'DOCUMENT_SIGN_DECLINED', targetType: 'SignatureRequest', targetId: dto.signatureRequestId, userId: declinedBy, metadata: { reason: dto.reason } });
    return this.prisma.signatureRequest.findUnique({ where: { id: dto.signatureRequestId } });
  }

  async delegateSigning(dto: DelegateSigningDto, delegatedBy: string): Promise<any> {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id: dto.signatureRequestId }, include: { signers: true } });
    if (!request) throw new AppException('SIG_REQUEST_NOT_FOUND');

    const signerRecord = request.signers.find((s) => s.signerId === delegatedBy);
    if (!signerRecord) throw new AppException('SIG_WRONG_SIGNER');

    const updated = await this.prisma.signatureRequestSigner.update({
      where: { id: signerRecord.id },
      data: { signerId: dto.delegateToUserId, status: 'PENDING' },
    });

    this.gateway.emitSignatureNeeded({
      signerId: dto.delegateToUserId, requestId: request.id,
      documentTitle: request.documentTitle, isRequired: signerRecord.isRequired,
      order: signerRecord.signerOrder,
    });

    await this.audit.log({ zoneId: request.zoneId, action: 'DOCUMENT_SIGN_DELEGATED', targetType: 'SignatureRequest', targetId: dto.signatureRequestId, userId: delegatedBy, metadata: { delegateTo: dto.delegateToUserId, reason: dto.reason } });
    return updated;
  }

  async cancelRequest(id: string, reason: string, cancelledBy: string): Promise<any> {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id } });
    if (!request) throw new AppException('SIG_REQUEST_NOT_FOUND');

    return this.prisma.signatureRequest.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }

  async getPendingForSigner(signerId: string, zoneId?: string): Promise<any[]> {
    const where: any = { signerId, status: { in: ['PENDING', 'NOTIFIED'] } };
    return this.prisma.signatureRequestSigner.findMany({ where, include: { request: true } });
  }

  async findRequests(filter: FilterSignatureRequestsDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.documentType) where.documentType = filter.documentType;
    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.signatureRequest.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { signers: true } }),
      this.prisma.signatureRequest.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit } };
  }

  async getRequestStatus(id: string): Promise<SignatureRequestStatusDto> {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id }, include: { signers: true } });
    if (!request) throw new AppException('SIG_REQUEST_NOT_FOUND');

    const signers = request.signers.sort((a, b) => a.signerOrder - b.signerOrder).map((s) => ({
      name: s.signerName, role: s.signerRole, status: s.status, signedAt: s.signedAt || undefined,
    }));

    const required = request.signers.filter((s) => s.isRequired);
    const signedRequired = required.filter((s) => s.status === 'SIGNED');
    const completionPercent = required.length > 0 ? Math.round(signedRequired.length / required.length * 100) : 0;

    const nextSigner = request.signers
      .filter((s) => s.status === 'PENDING' || s.status === 'NOTIFIED')
      .sort((a, b) => a.signerOrder - b.signerOrder)[0];

    return {
      requestId: request.id, documentTitle: request.documentTitle, status: request.status,
      signers, completionPercent, nextExpectedSigner: nextSigner?.signerId,
    };
  }

  async getDocumentSignatures(documentType: string, documentId: string): Promise<any[]> {
    return this.prisma.documentSignature.findMany({
      where: { documentType: documentType as any, documentId },
      orderBy: { signedAt: 'asc' },
    });
  }

  async getSigningStats(zoneId: string, fromDate?: string, toDate?: string): Promise<SigningStatsDto> {
    const where: any = { zoneId };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const requests = await this.prisma.signatureRequest.findMany({ where });
    return {
      totalRequests: requests.length,
      completed: requests.filter((r) => r.status === 'COMPLETED').length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      declined: requests.filter((r) => r.status === 'DECLINED').length,
      expired: requests.filter((r) => r.status === 'EXPIRED').length,
      avgSigningHours: 0,
      byDocumentType: [], byUser: [], bySignatureType: [],
      pendingCount: requests.filter((r) => ['PENDING', 'IN_PROGRESS'].includes(r.status)).length,
    };
  }
}
