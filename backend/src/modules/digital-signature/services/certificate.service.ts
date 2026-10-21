import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { RegisterCertificateDto, UploadSoftwareCertDto } from '../dto/create-dtos';
import type { ParsedCertificateDto, CertificateValidityDto } from '../dto/enums';
import { computeSha256Fingerprint, computeSha1Fingerprint, computeSha256Hash } from '../utils/signature.utils';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterCertificateDto, registeredBy: string): Promise<any> {
    // Generate serial number if not provided
    const serialNumber = dto.certificatePem
      ? computeSha256Hash(dto.certificatePem).substring(0, 32)
      : `CERT-${Date.now().toString(36).toUpperCase()}`;

    // Check serial uniqueness
    const existing = await this.prisma.digitalCertificate.findFirst({ where: { serialNumber } });
    if (existing) throw new AppException('CERT_SERIAL_DUPLICATE');

    // Compute fingerprints
    const certData = dto.certificatePem || dto.commonName;
    const sha256Fingerprint = computeSha256Fingerprint(Buffer.from(certData));
    const sha1Fingerprint = computeSha1Fingerprint(Buffer.from(certData));

    const certificate = await this.prisma.digitalCertificate.create({
      data: {
        zoneId: dto.zoneId,
        userId: dto.userId,
        type: dto.type,
        storageType: dto.storageType,
        status: 'PENDING_VERIFICATION',
        commonName: dto.commonName,
        organizationName: dto.organizationName,
        countryCode: 'IR',
        serialNumber,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        issuerName: dto.organizationName || 'Unknown CA',
        issuerDN: `CN=${dto.organizationName || 'Unknown CA'}, C=IR`,
        publicKeyPem: dto.certificatePem || '',
        subjectDN: `CN=${dto.commonName}, O=${dto.organizationName || ''}, C=IR`,
        sha1Fingerprint,
        sha256Fingerprint,
        certFileKey: dto.certFileKey,
        tokenSerial: dto.tokenSerial,
        notes: dto.notes,
      },
    });

    if (dto.zoneId) {
      await this.audit.log({ zoneId: dto.zoneId, action: 'CERT_REGISTERED', targetType: 'DigitalCertificate', targetId: certificate.id, userId: registeredBy, metadata: { commonName: dto.commonName, type: dto.type } });
    }

    return certificate;
  }

  async uploadSoftwareCert(userId: string, _file: Express.Multer.File, dto: UploadSoftwareCertDto): Promise<any> {
    // Parse PFX would happen here with node-forge
    // For now, create certificate record
    const serialNumber = `SW-${Date.now().toString(36).toUpperCase()}`;
    const passwordHash = computeSha256Hash(dto.password);

    const certificate = await this.prisma.digitalCertificate.create({
      data: {
        userId,
        type: 'SOFTWARE_CERT',
        storageType: 'SOFTWARE',
        status: 'PENDING_VERIFICATION',
        commonName: `Software Cert - ${userId}`,
        serialNumber,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        issuerName: 'Software Certificate',
        issuerDN: 'CN=Software Cert',
        publicKeyPem: '',
        subjectDN: `CN=Software Cert, userId=${userId}`,
        pfxPasswordHash: passwordHash,
      },
    });

    return certificate;
  }

  async verify(id: string, verifiedBy: string): Promise<any> {
    const cert = await this.prisma.digitalCertificate.findUnique({ where: { id } });
    if (!cert) throw new AppException('CERT_NOT_FOUND');

    return this.prisma.digitalCertificate.update({
      where: { id },
      data: { status: 'ACTIVE', isVerified: true, verifiedAt: new Date(), verifiedBy, verificationMethod: 'ADMIN_VERIFIED' },
    });
  }

  async revoke(id: string, reason: string, revokedBy: string): Promise<any> {
    const cert = await this.prisma.digitalCertificate.findUnique({ where: { id } });
    if (!cert) throw new AppException('CERT_NOT_FOUND');

    const updated = await this.prisma.digitalCertificate.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedBy, revocationReason: reason },
    });

    // Invalidate pending signature requests using this cert
    await this.prisma.signatureRequestSigner.updateMany({
      where: { certificateId: id, status: 'PENDING' },
      data: { status: 'SKIPPED' },
    });

    return updated;
  }

  async findByUser(userId: string): Promise<any[]> {
    return this.prisma.digitalCertificate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const cert = await this.prisma.digitalCertificate.findUnique({ where: { id } });
    if (!cert) throw new AppException('CERT_NOT_FOUND');
    return cert;
  }

  async checkValidity(id: string): Promise<CertificateValidityDto> {
    const cert = await this.prisma.digitalCertificate.findUnique({ where: { id } });
    if (!cert) throw new AppException('CERT_NOT_FOUND');

    const now = new Date();
    const isExpired = cert.expiresAt < now;
    const isRevoked = cert.status === 'REVOKED';
    const daysUntilExpiry = Math.ceil((cert.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let revocationStatus: 'GOOD' | 'REVOKED' | 'UNKNOWN' = 'UNKNOWN';
    if (isRevoked) revocationStatus = 'REVOKED';
    else if (cert.ocspUrl) revocationStatus = await this.checkRevocation(cert) as any;

    return {
      isValid: !isExpired && !isRevoked && cert.status === 'ACTIVE',
      isExpired,
      isRevoked,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      chainValid: cert.isVerified,
      revocationStatus,
    };
  }

  async checkRevocation(cert: any): Promise<string> {
    const cacheKey = `sig:ocsp:${cert.serialNumber}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // OCSP check would happen here
    const status = cert.status === 'REVOKED' ? 'REVOKED' : 'GOOD';
    await this.redis.set(cacheKey, status, 3600);
    return status;
  }

  async getExpiringCertificates(withinDays: number, userId?: string): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const where: any = {
      status: 'ACTIVE',
      expiresAt: { lte: futureDate, gte: new Date() },
    };
    if (userId) where.userId = userId;

    return this.prisma.digitalCertificate.findMany({ where, orderBy: { expiresAt: 'asc' } });
  }

  async generateSystemCertificate(zoneId: string, commonName: string): Promise<any> {
    const serialNumber = `SYS-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.digitalCertificate.create({
      data: {
        zoneId,
        userId: 'SYSTEM',
        type: 'SYSTEM_CERT',
        storageType: 'SYSTEM',
        status: 'ACTIVE',
        commonName,
        serialNumber,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        issuerName: 'IDOP System CA',
        issuerDN: 'CN=IDOP System CA, O=IDOP, C=IR',
        publicKeyPem: 'SYSTEM_GENERATED',
        subjectDN: `CN=${commonName}, O=IDOP Zone ${zoneId}, C=IR`,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: 'SYSTEM',
        verificationMethod: 'SYSTEM_GENERATED',
      },
    });
  }
}
