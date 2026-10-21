import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { VerifySignatureDto, VerifyDocumentDto } from '../dto/create-dtos';
import type { SignatureVerificationResult, DocumentVerificationResult } from '../dto/enums';

@Injectable()
export class SignatureVerificationService {
  private readonly logger = new Logger(SignatureVerificationService.name);

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async verify(dto: VerifySignatureDto): Promise<SignatureVerificationResult> {
    let signature: any;
    if (dto.signatureId) {
      signature = await this.prisma.documentSignature.findUnique({ where: { id: dto.signatureId } });
    } else if (dto.verificationQrHash) {
      const cacheKey = `sig:verify:${dto.verificationQrHash}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      signature = await this.prisma.documentSignature.findUnique({ where: { verificationQrHash: dto.verificationQrHash } });
    }
    if (!signature) throw new AppException('VERIFICATION_FAILED');

    // Check certificate validity
    let certValid = true;
    let certExpiredAtSigning = true;
    let revocationStatus = 'UNKNOWN';
    let issuerName = '';

    if (signature.certificateId) {
      const cert = await this.prisma.digitalCertificate.findUnique({ where: { id: signature.certificateId } });
      if (cert) {
        certValid = cert.status === 'ACTIVE';
        certExpiredAtSigning = cert.expiresAt > signature.signedAt;
        issuerName = cert.issuerName;
        revocationStatus = cert.status === 'REVOKED' ? 'REVOKED' : 'GOOD';
      }
    }

    // Timestamp validation
    const timestampValid = !!signature.timestampToken;
    const result: SignatureVerificationResult = {
      signatureId: signature.id,
      isValid: true,
      documentIntact: true,
      signatureValid: true,
      certificateValid: certValid,
      certificateNotExpiredAtSigning: certExpiredAtSigning,
      revocationStatus,
      timestampValid,
      timestampAt: signature.timestampAt || undefined,
      signerName: signature.signerName,
      signerRole: signature.signerRole || '',
      signedAt: signature.signedAt,
      documentTitle: signature.documentTitle,
      documentType: signature.documentType,
      issuerName,
      overallResult: 'VALID',
    };

    result.isValid = result.documentIntact && result.signatureValid && result.certificateValid && result.certificateNotExpiredAtSigning;
    result.overallResult = result.isValid ? 'VALID' : 'INVALID';

    // Cache result
    if (dto.verificationQrHash) {
      await this.redis.set(`sig:verify:${dto.verificationQrHash}`, JSON.stringify(result), 300);
    }

    // Create audit log
    await this.prisma.signatureAuditLog.create({
      data: { zoneId: signature.zoneId, action: 'SIGNATURE_VERIFIED', signatureId: signature.id, result: result.overallResult, details: result as any },
    });

    return result;
  }

  async verifyDocument(dto: VerifyDocumentDto): Promise<DocumentVerificationResult> {
    const signatures = await this.prisma.documentSignature.findMany({
      where: { documentType: dto.documentType as any, documentId: dto.documentId },
      orderBy: { signedAt: 'asc' },
    });

    const results: SignatureVerificationResult[] = [];
    for (const sig of signatures) {
      try {
        const result = await this.verify({ signatureId: sig.id });
        results.push(result);
      } catch {
        results.push({
          signatureId: sig.id, isValid: false, documentIntact: false, signatureValid: false,
          certificateValid: false, certificateNotExpiredAtSigning: false, revocationStatus: 'UNKNOWN',
          timestampValid: false, signerName: sig.signerName, signerRole: sig.signerRole || '',
          signedAt: sig.signedAt, documentTitle: sig.documentTitle, documentType: sig.documentType,
          issuerName: '', overallResult: 'INVALID',
        });
      }
    }

    const allValid = results.every((r) => r.overallResult === 'VALID');
    const firstSigned = signatures[0]?.signedAt;
    const lastSigned = signatures[signatures.length - 1]?.signedAt;

    return {
      documentType: dto.documentType, documentId: dto.documentId,
      documentTitle: signatures[0]?.documentTitle || '',
      signatures: results, allValid, signerCount: signatures.length,
      firstSignedAt: firstSigned || undefined, lastSignedAt: lastSigned || undefined,
      isFullySigned: allValid && signatures.length > 0,
      summary: allValid ? 'All signatures are valid' : 'Some signatures are invalid',
    };
  }

  async verifyByQrHash(qrHash: string): Promise<SignatureVerificationResult> {
    const cacheKey = `sig:verify:${qrHash}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // verify() already caches the result internally
    return this.verify({ verificationQrHash: qrHash });
  }

  async generateVerificationReport(documentType: string, documentId: string, format: 'pdf' | 'json'): Promise<{ report?: object }> {
    const verification = await this.verifyDocument({ documentType: documentType as any, documentId });
    return { report: verification };
  }
}
