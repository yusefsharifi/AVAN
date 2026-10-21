// ═══════════════════════════════════════════════════════════════════════════════
// M22: Document Verification Portal — Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export { VerifiableDocType, VerificationResult } from '@prisma/client';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class VerifyByQrDto {
  qrHash!: string;
  language?: string;
}

export class VerifyByNumberDto {
  documentType!: string;
  documentNumber!: string;
  language?: string;
}

export class VerifyCompoundDto {
  documentType!: string;
  documentNumber?: string;
  registrationNumber?: string;
  nationalId?: string;
  language?: string;
}

export class VerifyStatsQueryDto {
  zoneId?: string;
  fromDate?: string;
  toDate?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface VerificationResponse {
  isValid: boolean;
  result: string;
  resultCode: string;
  resultMessageFa: string;
  resultMessageEn: string;
  documentType: string;
  documentTypeFa: string;
  documentTypeEn: string;
  verifiedAt: string;
  data: Record<string, unknown>;
  zone?: ZonePublicInfo;
  badge?: BadgeInfo;
  previousVerifications?: number;
}

export interface ZonePublicInfo {
  nameFa: string;
  nameEn: string;
  city: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export interface BadgeInfo {
  badgeCode: string;
  qrImageUrl: string;
  embedCode: string;
}

export interface PortalInfoDto {
  nameFa: string;
  nameEn: string;
  version: string;
  supportedDocTypes: SupportedDocType[];
  instructions: { fa: string; en: string };
  totalVerifications: number;
  totalDocuments: number;
}

export interface SupportedDocType {
  type: string;
  nameFa: string;
  nameEn: string;
  icon: string;
  exampleNumber: string;
}

export interface VerificationStatsDto {
  totalVerifications: number;
  uniqueSessions: number;
  uniqueDocuments: number;
  byType: Record<string, number>;
  byResult: Record<string, number>;
  avgResponseMs: number;
  topVerifiedDocs: { docType: string; docId: string; count: number }[];
  byHour: number[];
  byDay: { date: string; count: number }[];
}

export interface MostVerifiedDto {
  documentType: string;
  documentId: string;
  count: number;
  lastVerifiedAt: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limitType: 'session' | 'ip' | 'global';
}

export interface PrivacyRule {
  allowedFields: string[];
}

// ─── Document Type Labels ────────────────────────────────────────────────────

export const DOC_TYPE_LABELS: Record<string, { fa: string; en: string; icon: string; example: string }> = {
  LETTER:             { fa: 'نامه اداری',         en: 'Letter',             icon: '📝', example: 'LTR-1403-000001' },
  PERMIT:             { fa: 'مجوز',               en: 'Permit',             icon: '📋', example: 'PRM-1403-000001' },
  SIGNATURE:          { fa: 'امضای دیجیتال',     en: 'Digital Signature',  icon: '🔏', example: 'SIG-1403-000001' },
  COMPANY:            { fa: 'شرکت',               en: 'Company',            icon: '🏢', example: '12345678901' },
  WAYBILL:            { fa: 'بارنامه',            en: 'Waybill',            icon: '🚛', example: 'WB-1403-000001' },
  WORK_ORDER:         { fa: 'دستور کار',          en: 'Work Order',         icon: '🔧', example: 'WO-1403-000001' },
  TRAINING_CERT:      { fa: 'گواهینامه آموزشی',  en: 'Training Certificate', icon: '🎓', example: 'TRC-1403-000001' },
  EMPLOYMENT_CERT:    { fa: 'گواهینامه اشتغال',   en: 'Employment Cert',    icon: '👤', example: 'EMP-1403-000001' },
  PURCHASE_ORDER:     { fa: 'سفارش خرید',         en: 'Purchase Order',     icon: '🛒', example: 'PO-1403-000001' },
  COMMERCIAL_CONTRACT:{ fa: 'قرارداد تجاری',     en: 'Commercial Contract',icon: '📄', example: 'CTR-1403-000001' },
  PAYSLIP:            { fa: 'فیش حقوقی',          en: 'Payslip',            icon: '💰', example: 'PAY-1403-06-000001' },
};

export const RESULT_MESSAGES: Record<string, { fa: string; en: string }> = {
  VALID:       { fa: '✓ این سند معتبر است و توسط سامانه آوان تأیید می‌شود', en: '✓ This document is valid and verified by AVAN' },
  INVALID:     { fa: '✗ این سند معتبر نیست یا اطلاعات آن تغییر کرده است', en: '✗ This document is not valid or has been tampered' },
  EXPIRED:     { fa: '⚠ این سند منقضی شده است', en: '⚠ This document has expired' },
  REVOKED:     { fa: '⛔ این سند باطل شده است', en: '⛔ This document has been revoked' },
  SUSPENDED:   { fa: '⚠ این سند معلق شده است', en: '⚠ This document has been suspended' },
  NOT_FOUND:   { fa: 'این سند در سیستم یافت نشد', en: 'Document not found in the system' },
  CLASSIFIED:  { fa: 'این سند طبقه‌بندی شده است. اطلاعات محدود نمایش داده می‌شود', en: 'This document is classified. Limited information is shown' },
  RATE_LIMITED:{ fa: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید', en: 'Rate limit exceeded. Please try again later' },
};
