// ═══════════════════════════════════════════════════════════════════════════════
// M22: Privacy Rules Engine
// Defines what data is visible per document type in the public verification portal
// ═══════════════════════════════════════════════════════════════════════════════

export interface PrivacyRule {
  allowedFields: string[];
}

// Fields visible for each document type in the public portal
export const PRIVACY_RULES: Record<string, PrivacyRule> = {
  LETTER: {
    allowedFields: [
      'registryNumber', 'subject', 'direction', 'type',
      'senderOrgName', 'status', 'createdAt', 'sentAt',
      'signatory', 'signatoryRole', 'approvalSteps',
    ],
  },
  PERMIT: {
    allowedFields: [
      'permitNumber', 'type', 'typeFa', 'holderName',
      'validFrom', 'validUntil', 'status', 'locationDescription',
      'allowedActivities', 'issuedByOrg', 'issuedAt', 'conditionsSummary',
    ],
  },
  SIGNATURE: {
    allowedFields: [
      'signerName', 'signerOrganization', 'signedAt', 'documentType',
      'documentTitle', 'certificateIssuer', 'signatureValid',
      'certChainValid', 'overallResult', 'timestampValid', 'timestampAt',
    ],
  },
  COMPANY: {
    allowedFields: [
      'nameFa', 'nameEn', 'type', 'industryCategory',
      'zone', 'lifecycleStatus', 'registrationNumber', 'isActive',
    ],
  },
  WAYBILL: {
    allowedFields: [
      'waybillNumber', 'type', 'direction', 'cargoCategory',
      'isHazmat', 'status', 'companyName', 'zoneName',
      'expectedArrival', 'isApproved', 'approvalChain',
    ],
  },
  TRAINING_CERT: {
    allowedFields: [
      'trainingPlanName', 'category', 'employeeNameMasked',
      'companyName', 'zoneName', 'trainingDate', 'passed',
      'expiresAt', 'isExpired', 'conductedBy',
    ],
  },
  WORK_ORDER: {
    allowedFields: [
      'workOrderNumber', 'type', 'assetName', 'assetCategory',
      'priority', 'status', 'zoneName', 'scheduledStart',
      'isCompleted', 'completedAt',
    ],
  },
  PURCHASE_ORDER: {
    allowedFields: [
      'orderNumber', 'status', 'vendorName', 'orderDate',
      'companyName', 'zoneName', 'isApproved', 'lineCount',
    ],
  },
  COMMERCIAL_CONTRACT: {
    allowedFields: [
      'contractNumber', 'title', 'direction', 'partyName',
      'startDate', 'endDate', 'status', 'isActive', 'zoneName',
    ],
  },
  EMPLOYMENT_CERT: {
    allowedFields: [
      'employeeNameMasked', 'positionTitle', 'departmentName',
      'companyName', 'hireDateMasked', 'isCurrentlyEmployed', 'zoneName',
    ],
  },
  PAYSLIP: {
    allowedFields: [
      'employeeNameMasked', 'period', 'companyName',
      'netSalaryMasked', 'isPaid', 'paidDate',
    ],
  },
};

// ─── Masking Utilities ───────────────────────────────────────────────────────

/**
 * Mask a full name: "علی محمدی" → "ع. محمدی", "John Smith" → "J. Smith"
 */
export function maskName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    // Single word: mask all but first char
    return parts[0].charAt(0) + '.' + '*'.repeat(Math.max(0, parts[0].length - 2)) + parts[0].slice(-1);
  }
  // First initial + last name
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1];
  return `${first}. ${last}`;
}

/**
 * Mask a number: "1234567890" → "123****890"
 */
export function maskNumber(value: string): string {
  if (!value || value.length <= 6) return value;
  const first3 = value.slice(0, 3);
  const last3 = value.slice(-3);
  const masked = '*'.repeat(Math.min(4, value.length - 6));
  return first3 + masked + last3;
}

/**
 * Mask a date: "1380-05-15" → "1380-**-**"
 */
export function maskDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    return parts[0] + '-**-**';
  }
  return dateStr;
}

/**
 * Apply privacy rules to raw document data — only return allowed fields
 */
export function applyPrivacyRules(
  rawData: Record<string, unknown>,
  docType: string,
): Record<string, unknown> {
  const rule = PRIVACY_RULES[docType];
  if (!rule) return rawData;

  const result: Record<string, unknown> = {};
  for (const field of rule.allowedFields) {
    if (field in rawData && rawData[field] !== undefined) {
      result[field] = rawData[field];
    }
  }
  return result;
}

// ─── Document Type Persian Labels ────────────────────────────────────────────

export const DOC_TYPE_FA: Record<string, string> = {
  LETTER: 'نامه اداری',
  PERMIT: 'مجوز',
  SIGNATURE: 'امضای دیجیتال',
  COMPANY: 'شرکت',
  WAYBILL: 'بارنامه',
  WORK_ORDER: 'دستور کار',
  TRAINING_CERT: 'گواهینامه آموزشی',
  EMPLOYMENT_CERT: 'گواهینامه اشتغال',
  PURCHASE_ORDER: 'سفارش خرید',
  COMMERCIAL_CONTRACT: 'قرارداد تجاری',
  PAYSLIP: 'فیش حقوقی',
};

export const DOC_TYPE_EN: Record<string, string> = {
  LETTER: 'Letter',
  PERMIT: 'Permit',
  SIGNATURE: 'Digital Signature',
  COMPANY: 'Company',
  WAYBILL: 'Waybill',
  WORK_ORDER: 'Work Order',
  TRAINING_CERT: 'Training Certificate',
  EMPLOYMENT_CERT: 'Employment Certificate',
  PURCHASE_ORDER: 'Purchase Order',
  COMMERCIAL_CONTRACT: 'Commercial Contract',
  PAYSLIP: 'Payslip',
};

/**
 * Detect platform from User-Agent header
 */
export function detectPlatform(userAgent?: string): string {
  if (!userAgent) return 'api';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'web';
}
