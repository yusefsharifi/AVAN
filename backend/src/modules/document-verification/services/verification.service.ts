// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Service — Core verification logic
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { VerificationRateLimiter } from './verification-rate-limiter.service';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import {
  VerificationResponse,
  ZonePublicInfo,
  VerificationStatsDto,
  MostVerifiedDto,
  DOC_TYPE_LABELS,
} from '../dto/enums';
import {
  DOC_TYPE_FA,
  DOC_TYPE_EN,
  detectPlatform,
} from '../utils/privacy-rules';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: VerificationRateLimiter,
    private readonly redis: Redis | null,
  ) {}

  // ─── QR Verification ──────────────────────────────────────────────────────

  async verifyByQr(
    qrHash: string,
    language: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
  ): Promise<VerificationResponse> {
    if (await this.rateLimiter.isIpBlocked(ipAddress)) {
      return this.buildResponse('RATE_LIMITED', 'LETTER', {}, null, qrHash, language);
    }

    const rl = await this.rateLimiter.checkRateLimit(sessionId, ipAddress);
    if (!rl.allowed) {
      return this.buildResponse('RATE_LIMITED', 'LETTER', {}, null, qrHash, language);
    }

    const cached = await this.getCachedResult(qrHash);
    if (cached) return cached;

    // Try each document type in order
    const verifiers: Array<() => Promise<VerificationResponse | null>> = [
      () => this.verifyLetterByQr(qrHash, language),
      () => this.verifyPermitByQr(qrHash, language),
      () => this.verifySignatureByQr(qrHash, language),
      () => this.verifyWaybillByQr(qrHash, language),
      () => this.verifyTrainingCertByQr(qrHash, language),
    ];

    let result: VerificationResponse = this.buildResponse('NOT_FOUND', 'LETTER', {}, null, qrHash, language);

    for (const fn of verifiers) {
      try {
        const r = await fn();
        if (r && r.result !== 'NOT_FOUND') {
          result = r;
          break;
        }
      } catch { /* continue */ }
    }

    // Also check VerificationBadge
    if (result.result === 'NOT_FOUND') {
      const badgeResult = await this.verifyByBadgeHash(qrHash, language);
      if (badgeResult && badgeResult.result !== 'NOT_FOUND') {
        result = badgeResult;
      }
    }

    await this.cacheResult(qrHash, result);
    this.recordVerificationAsync({
      sessionId, ipAddress, userAgent,
      documentType: result.documentType,
      qrHash, documentNumber: null,
      result: result.resultCode, responseData: result.data,
      responseMs: 0, language, platform: detectPlatform(userAgent),
    }).catch(() => {});
    await this.rateLimiter.incrementCounters(sessionId, ipAddress);
    return result;
  }

  // ─── Number Verification ──────────────────────────────────────────────────

  async verifyByNumber(
    documentType: string,
    documentNumber: string,
    language: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
  ): Promise<VerificationResponse> {
    if (await this.rateLimiter.isIpBlocked(ipAddress)) {
      return this.buildResponse('RATE_LIMITED', documentType, {}, null, null, language);
    }

    const rl = await this.rateLimiter.checkManualLookupLimit(ipAddress);
    if (!rl.allowed) {
      return this.buildResponse('RATE_LIMITED', documentType, {}, null, null, language);
    }

    const sessionRl = await this.rateLimiter.checkRateLimit(sessionId, ipAddress);
    if (!sessionRl.allowed) {
      return this.buildResponse('RATE_LIMITED', documentType, {}, null, null, language);
    }

    const cacheKey = `number:${documentType}:${documentNumber}`;
    const cached = await this.getCachedResult(cacheKey);
    if (cached) return cached;

    let result: VerificationResponse;
    try {
      result = await this.verifyByDocumentNumber(documentType, documentNumber, language);
    } catch {
      result = this.buildResponse('NOT_FOUND', documentType, {}, null, null, language);
    }

    await this.cacheResult(cacheKey, result);
    await this.recordVerificationAsync({
      sessionId, ipAddress, userAgent,
      documentType, qrHash: null, documentNumber,
      result: result.resultCode, responseData: result.data,
      responseMs: 0, language, platform: detectPlatform(userAgent),
    }).catch(() => {});
    await this.rateLimiter.incrementCounters(sessionId, ipAddress);
    return result;
  }

  // ─── Compound Verification ────────────────────────────────────────────────

  async verifyCompound(
    documentType: string,
    documentNumber: string | undefined,
    registrationNumber: string | undefined,
    nationalId: string | undefined,
    language: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
  ): Promise<VerificationResponse> {
    const identifier = documentNumber || registrationNumber || nationalId || '';
    return this.verifyByNumber(documentType, identifier, language, ipAddress, userAgent, sessionId);
  }

  // ─── Per-Type QR Verifiers ────────────────────────────────────────────────

  private async verifyLetterByQr(qrHash: string, language: string): Promise<VerificationResponse> {
    const letter = await this.prisma.letter.findUnique({
      where: { qrHash },
      include: { zone: { select: { nameFa: true, nameEn: true, city: true, phone: true, email: true } } },
    });
    if (!letter) return this.buildResponse('NOT_FOUND', 'LETTER', {}, null, qrHash, language);
    return this.buildLetterResponse(letter, qrHash, language);
  }

  private async verifyPermitByQr(qrHash: string, language: string): Promise<VerificationResponse> {
    const permit = await this.prisma.issuedPermit.findUnique({
      where: { qrHash },
      include: { zone: { select: { nameFa: true, nameEn: true, city: true, phone: true, email: true } } },
    });
    if (!permit) return this.buildResponse('NOT_FOUND', 'PERMIT', {}, null, qrHash, language);
    return this.buildPermitResponse(permit, qrHash, language);
  }

  private async verifySignatureByQr(qrHash: string, language: string): Promise<VerificationResponse> {
    const sig = await this.prisma.documentSignature.findUnique({
      where: { verificationQrHash: qrHash },
      include: { zone: { select: { nameFa: true, nameEn: true, city: true } } },
    });
    if (!sig) return this.buildResponse('NOT_FOUND', 'SIGNATURE', {}, null, qrHash, language);
    return this.buildSignatureResponse(sig, qrHash, language);
  }

  private async verifyWaybillByQr(qrHash: string, language: string): Promise<VerificationResponse> {
    // Waybills don't have a QR hash field, so this returns NOT_FOUND
    return this.buildResponse('NOT_FOUND', 'WAYBILL', {}, null, qrHash, language);
  }

  private async verifyTrainingCertByQr(qrHash: string, language: string): Promise<VerificationResponse> {
    // Training certs don't have a QR hash, return NOT_FOUND
    return this.buildResponse('NOT_FOUND', 'TRAINING_CERT', {}, null, qrHash, language);
  }

  // ─── Per-Type Number Verifiers ────────────────────────────────────────────

  private async verifyByDocumentNumber(docType: string, docNumber: string, language: string): Promise<VerificationResponse> {
    switch (docType) {
      case 'LETTER': {
        const letter = await this.prisma.letter.findUnique({
          where: { registryNumber: docNumber },
          include: { zone: { select: { nameFa: true, nameEn: true, city: true, phone: true, email: true } } },
        });
        if (!letter) return this.buildResponse('NOT_FOUND', 'LETTER', {}, null, null, language);
        return this.buildLetterResponse(letter, docNumber, language);
      }
      case 'PERMIT': {
        const permit = await this.prisma.issuedPermit.findUnique({
          where: { permitNumber: docNumber },
          include: { zone: { select: { nameFa: true, nameEn: true, city: true, phone: true, email: true } } },
        });
        if (!permit) return this.buildResponse('NOT_FOUND', 'PERMIT', {}, null, null, language);
        return this.buildPermitResponse(permit, docNumber, language);
      }
      case 'COMPANY': {
        const company = await this.prisma.company.findFirst({
          where: { registrationNumber: docNumber },
          include: { zone: { select: { nameFa: true, nameEn: true, city: true, phone: true, email: true } } },
        });
        if (!company) return this.buildResponse('NOT_FOUND', 'COMPANY', {}, null, null, language);
        const data: Record<string, unknown> = {
          nameFa: company.nameFa,
          nameEn: company.nameEn,
          type: company.type,
          industryCategory: company.industryCategory,
          zone: { nameFa: company.zone.nameFa, city: company.zone.city },
          lifecycleStatus: company.lifecycleStatus,
          registrationNumber: company.registrationNumber,
          isActive: company.isActive,
        };
        return this.buildResponse(company.isActive ? 'VALID' : 'INVALID', 'COMPANY', data, company.zoneId, null, language);
      }
      case 'WAYBILL': {
        const wb = await this.prisma.waybill.findFirst({
          where: { waybillNumber: docNumber },
          include: { zone: { select: { nameFa: true } } },
        });
        if (!wb) return this.buildResponse('NOT_FOUND', 'WAYBILL', {}, null, null, language);
        const approvals = await this.prisma.waybillApproval.findMany({
          where: { waybillId: wb.id },
          orderBy: { stepOrder: 'asc' },
          select: { stepOrder: true, roleFa: true, status: true },
        });
        const data: Record<string, unknown> = {
          waybillNumber: wb.waybillNumber,
          type: wb.type,
          direction: wb.direction,
          cargoCategory: wb.cargoCategory,
          isHazmat: wb.isHazmat,
          status: wb.status,
          companyName: wb.carrierName,
          zoneName: wb.zone.nameFa,
          expectedArrival: wb.expectedArrival,
          isApproved: wb.status === 'APPROVED' || wb.status === 'COMPLETED',
          approvalChain: approvals.map(a => ({ step: a.stepOrder, status: a.status, role: a.roleFa })),
        };
        const result = wb.status !== 'CANCELLED' && wb.status !== 'REJECTED' ? 'VALID' : 'INVALID';
        return this.buildResponse(result, 'WAYBILL', data, wb.zoneId, null, language);
      }
      case 'WORK_ORDER': {
        const wo = await this.prisma.workOrder.findFirst({
          where: { workOrderNumber: docNumber },
          include: { zone: { select: { nameFa: true } } },
        });
        if (!wo) return this.buildResponse('NOT_FOUND', 'WORK_ORDER', {}, null, null, language);
        const data: Record<string, unknown> = {
          workOrderNumber: wo.workOrderNumber,
          type: wo.type,
          priority: wo.priority,
          status: wo.status,
          zoneName: wo.zone.nameFa,
          scheduledStart: wo.scheduledStart,
          scheduledEnd: wo.scheduledEnd,
          isCompleted: wo.status === 'COMPLETED',
          completedAt: wo.actualEnd,
        };
        return this.buildResponse('VALID', 'WORK_ORDER', data, wo.zoneId, null, language);
      }
      case 'TRAINING_CERT': {
        const training = await this.prisma.hseTrainingPlan.findFirst({
          where: { code: docNumber },
          include: { zone: { select: { nameFa: true } } },
        });
        if (!training) return this.buildResponse('NOT_FOUND', 'TRAINING_CERT', {}, null, null, language);
        const data: Record<string, unknown> = {
          trainingPlanName: training.nameFa,
          category: training.category,
          zoneName: training.zone.nameFa,
          conductedBy: training.instructor,
        };
        return this.buildResponse('VALID', 'TRAINING_CERT', data, training.zoneId, null, language);
      }
      case 'PURCHASE_ORDER': {
        const po = await this.prisma.purchaseOrder.findFirst({
          where: { orderNumber: docNumber },
          include: { zone: { select: { nameFa: true } } },
        });
        if (!po) return this.buildResponse('NOT_FOUND', 'PURCHASE_ORDER', {}, null, null, language);
        const data: Record<string, unknown> = {
          orderNumber: po.orderNumber,
          status: po.status,
          vendorName: po.vendorName,
          orderDate: po.orderDate,
          zoneName: po.zone.nameFa,
          isApproved: po.status !== 'DRAFT',
        };
        return this.buildResponse('VALID', 'PURCHASE_ORDER', data, po.zoneId, null, language);
      }
      case 'COMMERCIAL_CONTRACT': {
        const contract = await this.prisma.commercialContract.findFirst({
          where: { contractNumber: docNumber },
          include: { zone: { select: { nameFa: true } } },
        });
        if (!contract) return this.buildResponse('NOT_FOUND', 'COMMERCIAL_CONTRACT', {}, null, null, language);
        const data: Record<string, unknown> = {
          contractNumber: contract.contractNumber,
          title: contract.title,
          direction: contract.direction,
          partyName: contract.partyName,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
          isActive: contract.status === 'ACTIVE',
          zoneName: contract.zone.nameFa,
        };
        return this.buildResponse('VALID', 'COMMERCIAL_CONTRACT', data, contract.zoneId, null, language);
      }
      default:
        return this.buildResponse('NOT_FOUND', docType, {}, null, null, language);
    }
  }

  // ─── Response Builders ────────────────────────────────────────────────────

  private buildLetterResponse(letter: Record<string, unknown>, identifier: string, language: string): VerificationResponse {
    const zoneId = letter.zoneId as string;
    const zone = letter.zone as Record<string, unknown> | undefined;
    const classification = (letter.classification as string) || 'UNCLASSIFIED';

    let data: Record<string, unknown> = {};
    switch (classification) {
      case 'UNCLASSIFIED':
        data = {
          registryNumber: letter.registryNumber,
          subject: letter.subject,
          direction: letter.direction,
          type: letter.type,
          senderOrgName: letter.senderOrgName,
          status: letter.status,
          createdAt: letter.createdAt,
          sentAt: letter.sentAt,
          signatory: letter.signatory,
          signatoryRole: letter.signatoryRole,
        };
        break;
      case 'CONFIDENTIAL':
        data = {
          registryNumber: letter.registryNumber,
          direction: letter.direction,
          type: letter.type,
          status: letter.status,
          signatory: letter.signatory,
          createdAt: letter.createdAt,
          note: language === 'fa' ? 'محرمانه — اطلاعات محدود نمایش داده می‌شود' : 'Confidential — limited information shown',
        };
        break;
      case 'RESTRICTED':
      case 'SECRET':
        data = {
          registryNumber: letter.registryNumber,
          note: language === 'fa' ? 'سری — نمایش اطلاعات مجاز نیست' : 'Restricted — information display not allowed',
        };
        break;
    }

    const result = (classification === 'RESTRICTED' || classification === 'SECRET') ? 'CLASSIFIED' : 'VALID';
    return this.buildResponse(result, 'LETTER', data, zoneId, identifier, language);
  }

  private buildPermitResponse(permit: Record<string, unknown>, identifier: string, language: string): VerificationResponse {
    const now = new Date();
    const validUntil = permit.validUntil as Date;
    const isExpired = validUntil && validUntil < now;
    const status = permit.status as string;

    let result = 'VALID';
    if (isExpired) result = 'EXPIRED';
    else if (status === 'REVOKED') result = 'REVOKED';
    else if (status === 'SUSPENDED') result = 'SUSPENDED';
    else if (status !== 'ACTIVE') result = 'INVALID';

    const data: Record<string, unknown> = {
      permitNumber: permit.permitNumber,
      type: permit.type,
      holderName: permit.holderName,
      validFrom: permit.validFrom,
      validUntil: permit.validUntil,
      status: permit.status,
      locationDescription: permit.locationDescription,
      allowedActivities: permit.allowedActivities,
      issuedByOrg: permit.issuedByName,
      issuedAt: permit.issuedAt,
    };

    return this.buildResponse(result, 'PERMIT', data, permit.zoneId as string, identifier, language);
  }

  private buildSignatureResponse(sig: Record<string, unknown>, identifier: string, language: string): VerificationResponse {
    const isVerified = sig.isVerified as boolean;
    const hasTimestamp = !!sig.timestampAt;

    const data: Record<string, unknown> = {
      signatureType: sig.signatureType,
      documentType: sig.documentType,
      documentTitle: sig.documentTitle,
      signerName: sig.signerName,
      signedAt: sig.signedAt,
      tsaName: sig.tsaName,
      signatureValid: isVerified,
      timestampValid: hasTimestamp,
      timestampAt: sig.timestampAt,
      overallResult: isVerified ? 'VALID' : 'INVALID',
    };

    const result = isVerified ? 'VALID' : 'INVALID';
    return this.buildResponse(result, 'SIGNATURE', data, sig.zoneId as string, identifier, language);
  }

  // ─── Badge Lookup ─────────────────────────────────────────────────────────

  private async verifyByBadgeHash(qrHash: string, language: string): Promise<VerificationResponse | null> {
    const badge = await this.prisma.verificationBadge.findUnique({ where: { qrHash } });
    if (!badge) return null;

    await this.prisma.verificationBadge.update({
      where: { id: badge.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    }).catch(() => {});

    return this.verifyByDocumentNumber(badge.documentType, badge.documentId, language);
  }

  // ─── Badge Management ─────────────────────────────────────────────────────

  async createOrGetBadge(
    documentType: string,
    documentId: string,
    qrHash: string,
  ): Promise<{ badgeCode: string; qrHash: string }> {
    const existing = await this.prisma.verificationBadge.findFirst({
      where: { documentType: documentType as never, documentId },
    });
    if (existing) return { badgeCode: existing.badgeCode, qrHash: existing.qrHash };

    const badgeCode = `VRF-${String(Math.floor(1000 + Math.random() * 9000))}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const hash = qrHash || crypto.randomUUID().replace(/-/g, '');

    const badge = await this.prisma.verificationBadge.create({
      data: { documentType: documentType as never, documentId, badgeCode, qrHash: hash },
    });
    return { badgeCode: badge.badgeCode, qrHash: badge.qrHash };
  }

  async getBadgeInfo(badgeCode: string): Promise<Record<string, unknown> | null> {
    const badge = await this.prisma.verificationBadge.findUnique({ where: { badgeCode } });
    if (!badge) return null;
    return {
      badgeCode: badge.badgeCode,
      documentType: badge.documentType,
      isActive: badge.isActive,
      viewCount: badge.viewCount,
      createdAt: badge.createdAt,
      expiresAt: badge.expiresAt,
      qrHash: badge.qrHash,
    };
  }

  async getBadgeEmbedCode(badgeCode: string): Promise<string> {
    const badge = await this.prisma.verificationBadge.findUnique({ where: { badgeCode } });
    if (!badge) return '';
    return `<div class="idop-badge" data-badge="${badge.badgeCode}" style="display:inline-block;font-family:Arial,sans-serif;">
  <a href="/verify/qr/${badge.qrHash}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:#333;">
    <img src="/verify/badge/${badge.badgeCode}/qr.png" alt="تأیید شده توسط آوان" width="60" height="60" style="border-radius:4px;" />
    <div>
      <div style="font-size:14px;font-weight:bold;">✅ تأیید شده توسط آوان</div>
      <div style="font-size:11px;color:#666;">${badge.badgeCode}</div>
    </div>
  </a>
</div>`;
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  async getVerificationStats(zoneId?: string, fromDate?: string, toDate?: string): Promise<VerificationStatsDto> {
    const where: Record<string, unknown> = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.createdAt as Record<string, Date>).lte = new Date(toDate);
    }

    const records = await this.prisma.verificationRecord.findMany({ where });

    const byType: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const sessions = new Set<string>();
    const docs = new Set<string>();
    let totalResponseMs = 0;
    const byHour = new Array(24).fill(0) as number[];
    const dayMap = new Map<string, number>();

    for (const r of records) {
      byType[r.documentType] = (byType[r.documentType] || 0) + 1;
      byResult[r.resultCode] = (byResult[r.resultCode] || 0) + 1;
      sessions.add(r.sessionId);
      if (r.documentId) docs.add(r.documentId);
      totalResponseMs += r.responseMs;
      byHour[r.createdAt.getHours()]++;
      const day = r.createdAt.toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }

    return {
      totalVerifications: records.length,
      uniqueSessions: sessions.size,
      uniqueDocuments: docs.size,
      byType,
      byResult,
      avgResponseMs: records.length > 0 ? Math.round(totalResponseMs / records.length) : 0,
      topVerifiedDocs: [],
      byHour,
      byDay: Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  async getMostVerifiedDocuments(zoneId?: string, limit = 20): Promise<MostVerifiedDto[]> {
    const where: Record<string, unknown> = {};
    const records = await this.prisma.verificationRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 1000 });

    const docCounts = new Map<string, { count: number; lastAt: Date }>();
    for (const r of records) {
      const key = `${r.documentType}:${r.documentId}`;
      const existing = docCounts.get(key);
      if (existing) existing.count++;
      else docCounts.set(key, { count: 1, lastAt: r.createdAt });
    }

    return Array.from(docCounts.entries())
      .map(([key, val]) => {
        const [docType, docId] = key.split(':');
        return { documentType: docType, documentId: docId, count: val.count, lastVerifiedAt: val.lastAt.toISOString() };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getPortalInfo(): Promise<Record<string, unknown>> {
    const totalVerifications = await this.prisma.verificationRecord.count();
    const uniqueDocs = await this.prisma.verificationRecord.findMany({ select: { documentId: true }, distinct: ['documentId'] });

    return {
      nameFa: 'پورتال تأیید اسناد آوان',
      nameEn: 'AVAN Document Verification Portal',
      version: '1.0.0',
      supportedDocTypes: Object.entries(DOC_TYPE_LABELS).map(([type, labels]) => ({
        type, nameFa: labels.fa, nameEn: labels.en, icon: labels.icon, exampleNumber: labels.example,
      })),
      instructions: {
        fa: 'برای تأیید سند، کد QR را اسکن کنید یا شماره سند را وارد کنید',
        en: 'To verify a document, scan the QR code or enter the document number',
      },
      totalVerifications,
      totalDocuments: uniqueDocs.length,
    };
  }

  async purgeCache(_documentType: string, _documentId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys('verify:result:*');
      if (keys.length > 0) await this.redis.del(...keys);
    } catch { /* ignore */ }
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async getCachedResult(key: string): Promise<VerificationResponse | null> {
    if (!this.redis) return null;
    try {
      const cached = await this.redis.get(`verify:result:${key}`);
      if (cached) return JSON.parse(cached) as VerificationResponse;
    } catch { /* ignore */ }
    return null;
  }

  private async cacheResult(key: string, result: VerificationResponse): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(`verify:result:${key}`, JSON.stringify(result), 'EX', 300);
    } catch { /* ignore */ }
  }

  private async recordVerificationAsync(data: {
    sessionId: string; ipAddress: string; userAgent: string;
    documentType: string; qrHash: string | null; documentNumber: string | null;
    result: string; responseData: unknown; responseMs: number;
    language: string; platform: string;
  }): Promise<void> {
    try {
      await this.prisma.verificationRecord.create({
        data: {
          sessionId: data.sessionId,
          documentType: data.documentType as never,
          qrHash: data.qrHash,
          documentNumber: data.documentNumber,
          result: data.result as never,
          resultCode: data.result,
          responseData: data.responseData as never,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          language: data.language,
          platform: data.platform,
          responseMs: data.responseMs,
        },
      });
    } catch { /* silent */ }
  }

  private buildResponse(
    result: string,
    documentType: string,
    data: Record<string, unknown>,
    zoneId: string | null | undefined,
    identifier: string | null,
    language: string,
  ): VerificationResponse {
    const isValid = result === 'VALID';
    const messages: Record<string, { fa: string; en: string }> = {
      VALID:        { fa: '✓ این سند معتبر است و توسط سامانه آوان تأیید می‌شود', en: '✓ This document is valid and verified by AVAN' },
      INVALID:      { fa: '✗ این سند معتبر نیست یا اطلاعات آن تغییر کرده است', en: '✗ This document is not valid or has been tampered' },
      EXPIRED:      { fa: '⚠ این سند منقضی شده است', en: '⚠ This document has expired' },
      REVOKED:      { fa: '⛔ این سند باطل شده است', en: '⛔ This document has been revoked' },
      SUSPENDED:    { fa: '⚠ این سند معلق شده است', en: '⚠ This document has been suspended' },
      NOT_FOUND:    { fa: 'این سند در سیستم یافت نشد', en: 'Document not found in the system' },
      CLASSIFIED:   { fa: 'این سند طبقه‌بندی شده است', en: 'This document is classified' },
      RATE_LIMITED: { fa: 'تعداد درخواست‌های شما بیش از حد مجاز است', en: 'Rate limit exceeded' },
    };
    const msg = messages[result] || messages.NOT_FOUND;

    return {
      isValid,
      result,
      resultCode: result,
      resultMessageFa: msg.fa,
      resultMessageEn: msg.en,
      documentType,
      documentTypeFa: DOC_TYPE_FA[documentType] || documentType,
      documentTypeEn: DOC_TYPE_EN[documentType] || documentType,
      verifiedAt: new Date().toISOString(),
      data,
    };
  }
}
