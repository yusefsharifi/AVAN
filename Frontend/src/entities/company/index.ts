/**
 * Entity: NationalCompany
 * تایپ‌های پایهٔ شرکت با الزام اتصال به یک شهرک منحصر به فرد
 */

// ── Enums ─────────────────────────────────────────────────────────────────
export type CompanyLegalType = 'private_joint_stock' | 'public_joint_stock' | 'limited_liability' | 'cooperative' | 'sole_proprietorship';
export type CompanyType = 'manufacturing' | 'service' | 'trading' | 'contracting' | 'r_and_d' | 'logistics';
export type CompanyStatus = 'draft' | 'pending_zone_approval' | 'pending_national_approval' | 'active' | 'suspended' | 'terminated';
export type CompanySize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';

// ── Sub-types ─────────────────────────────────────────────────────────────
export interface CompanyContact {
  id: string;
  fullName: string;
  role: 'ceo' | 'factory_manager' | 'hse_manager' | 'accountant' | 'legal_representative' | 'other';
  mobile: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

export interface CompanyProduct {
  id: string;
  name: string;
  hsCode?: string; // Harmonized System code
  description?: string;
  isMainProduct: boolean;
  monthlyCapacity?: number;
  // Flat onboarding fields (see the note on NationalCompany): the wizard's
  // product editor writes an ISIC per product line and an ANNUAL capacity.
  isicCode?: string;
  annualCapacity?: number; // tonnes/year
  unit?: string;
}

export interface CompanyRawMaterial {
  id: string;
  name: string;
  hsCode?: string;
  isHazardous: boolean;
  monthlyConsumption?: number;
  // Annual figure in tonnes — the wizard's raw-material editor writes this
  // instead of the monthly one (flat onboarding vocabulary, see NationalCompany).
  annualConsumption?: number;
  unit?: string;
  supplierName?: string;
}

export interface CompanyWaste {
  type: 'industrial' | 'hazardous' | 'municipal' | 'recyclable';
  monthlyVolumeKg: number;
  disposalMethod: string;
  licensedDisposer?: string;
}

export interface CompanyDocument {
  id: string;
  type: 'articles_of_association' | 'official_gazette' | 'financial_statements' | 'operating_license' | 'construction_permit' | 'hse_certificate' | 'lease_contract' | 'insurance' | 'tax_certificate' | 'other';
  name: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy: string;
  expiresAt?: string;
  verified: boolean;
  status: 'valid' | 'expiring_soon' | 'expired';
  // Flat onboarding fields (see the note on NationalCompany): the wizard's
  // document editor writes a title, a document number and its own issue/expiry
  // dates alongside `name` and `expiresAt`.
  title?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface CompanyFinancials {
  registeredCapital: number; // ریال
  fiscalYearEndMonth: number; // 1-12
  shaba: string; // ۲۴ رقم
  taxCode: string;
  insuranceNumber?: string;
  creditLimit: number;
  creditUsed: number;
  totalReceivables: number;
  overdueReceivables: number;
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  lastPaymentDate?: string;
}

export interface CompanyHSE {
  hasOperatingLicense: boolean;
  operatingLicenseNumber?: string;
  operatingLicenseExpiry?: string;
  lastInspectionDate?: string;
  inspectionScore?: number;
  openIncidents: number;
  workPermitsActive: number;
  certifications: string[];
  complianceStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
  hasHazardousMaterials: boolean;
  hazmatTypes: string[];
  wastes: CompanyWaste[];
  // Read directly (not through `as any`) by the wizard's HSE step; optional so
  // existing rows without it still type-check.
  hazardLevel?: 'low' | 'medium' | 'high';
}

export interface CompanyPlotAssignment {
  plotId: string;
  plotNumber: string;
  areaSqM: number;
  landStatus: 'owned' | 'leased' | 'mortgaged';
  leaseStartDate?: string;
  leaseEndDate?: string;
  monthlyRent?: number;
}

// ── Main Entity ───────────────────────────────────────────────────────────
export interface NationalCompany {
  id: string;
  
  // ── Zone Binding (الزامی و منحصر به فرد) ─────────────────────────────
  zoneId: string;              // شناسهٔ شهرک والد — الزامی
  zoneName?: string;          // denormalized for display
  
  // ── Identification ───────────────────────────────────────────────────
  nationalId: string;         // ۱۱ رقم
  registrationNumber: string;
  nameFa: string;
  nameEn?: string;
  tradeName?: string;
  
  // ── Classification ───────────────────────────────────────────────────
  legalType: CompanyLegalType;
  companyType: CompanyType;
  industryCode: string;       // ISIC 4-digit
  size: CompanySize;
  
  // ── Location within Zone ─────────────────────────────────────────────
  plotAssignment: CompanyPlotAssignment;
  factoryAddress?: string;
  officeAddress?: string;
  
  // ── Contacts ─────────────────────────────────────────────────────────
  contacts: CompanyContact[];
  employeeCount: number;
  
  // ── Products & Materials ───────────────────────────────────────────
  products: CompanyProduct[];
  rawMaterials: CompanyRawMaterial[];
  
  // ── Financial ──────────────────────────────────────────────────────
  financials: CompanyFinancials;
  
  // ── HSE ─────────────────────────────────────────────────────────────
  hse: CompanyHSE;
  
  // ── Documents ──────────────────────────────────────────────────────
  documents: CompanyDocument[];
  
  // ── Workflow ───────────────────────────────────────────────────────
  status: CompanyStatus;
  workflowState: {
    currentStep: string;
    assignedReviewerId?: string;
    reviewNotes?: string[];
    approvedBy?: string[];
    rejectedBy?: string[];
    submittedAt?: string;
    approvedAt?: string;
  };
  
  // ── Metadata ───────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // ── Marketplace & Analytics (optional) ─────────────────────────────
  marketplaceActive: boolean;
  healthScore?: number;

  // ── Flat onboarding vocabulary (optional) ──────────────────────────────
  // The super-admin CompanyOnboardingWizard collects a FLAT set of fields and
  // persists them through the localStorage-backed company store; nothing here
  // is posted to a backend (companiesApi exposes only GET list/get).
  //
  // These deliberately sit ALONGSIDE the structured fields above rather than
  // replacing them: `name` complements `nameFa`, `isicCode` complements
  // `industryCode`, and `phone`/`email`/`address` complement `contacts[]`.
  // Renaming the wizard onto the structured vocabulary is a design decision
  // (it would touch every screen that reads `form.name`), recorded as such in
  // docs/STEP7-REPORT.md rather than done silently.
  //
  // All optional: adding them only narrows the error count and cannot break an
  // existing consumer.
  name?: string;
  brand?: string;
  description?: string;
  isicCode?: string;
  industry?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  province?: string;
  city?: string;
  ceoName?: string;
  ceoNationalId?: string;
  establishmentYear?: number;

  // Company-level rollup the localStorage store derives on every write.
  documentStatus?: 'valid' | 'expiring_soon' | 'expired';
  transferHistory?: {
    fromZoneId: string;
    toZoneId: string;
    reason?: string;
    transferredAt: string;
    transferredBy: string;
  }[];
}

// ── Validation ────────────────────────────────────────────────────────────
export const NATIONAL_ID_PATTERN = /^\d{11}$/;
export const REGISTRATION_NUMBER_PATTERN = /^\d{6,10}$/;
export const SHABA_PATTERN = /^IR\d{24}$/;
export const ISIC_CODE_PATTERN = /^\d{4}$/;

export function validateNationalId(nationalId: string): { valid: boolean; error?: string } {
  if (!nationalId) return { valid: false, error: 'شناسه ملی شرکت الزامی است' };
  if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    return { valid: false, error: 'شناسه ملی باید ۱۱ رقم باشد' };
  }
  // Iranian national ID checksum validation
  const digits = nationalId.split('').map(Number);
  const check = digits[10];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (10 - i);
  }
  const remainder = sum % 11;
  const expectedCheck = remainder < 2 ? remainder : 11 - remainder;
  if (check !== expectedCheck) {
    return { valid: false, error: 'شناسه ملی نامعتبر است (خطای کنترلی)' };
  }
  return { valid: true };
}

export function validateShaba(shaba: string): { valid: boolean; error?: string } {
  if (!shaba) return { valid: false, error: 'شماره شبا الزامی است' };
  const normalized = shaba.toUpperCase().replace(/\s/g, '');
  if (!SHABA_PATTERN.test(normalized)) {
    return { valid: false, error: 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد' };
  }
  return { valid: true };
}

export function validateIsicCode(code: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'کد ISIC الزامی است' };
  if (!ISIC_CODE_PATTERN.test(code)) {
    return { valid: false, error: 'کد ISIC باید ۴ رقم باشد' };
  }
  return { valid: true };
}

export function getCompanyStatusLabel(status: CompanyStatus): string {
  const labels: Record<CompanyStatus, string> = {
    draft: 'پیش‌نویس',
    pending_zone_approval: 'در انتظار تأیید شهرک',
    pending_national_approval: 'در انتظار تأیید ملی',
    active: 'فعال',
    suspended: 'تعلیق',
    terminated: 'خاتمه یافته',
  };
  return labels[status];
}

export function getCompanyStatusColor(status: CompanyStatus): { bg: string; text: string } {
  const colors: Record<CompanyStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700' },
    pending_zone_approval: { bg: 'bg-blue-50', text: 'text-blue-700' },
    pending_national_approval: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    suspended: { bg: 'bg-amber-50', text: 'text-amber-700' },
    terminated: { bg: 'bg-red-50', text: 'text-red-700' },
  };
  return colors[status];
}

export function getLegalTypeLabel(type: CompanyLegalType): string {
  const labels: Record<CompanyLegalType, string> = {
    private_joint_stock: 'سهامی خاص',
    public_joint_stock: 'سهامی عام',
    limited_liability: 'مسئولیت محدود',
    cooperative: 'تعاونی',
    sole_proprietorship: 'تنها',
  };
  return labels[type];
}

export function getCompanyTypeLabel(type: CompanyType): string {
  const labels: Record<CompanyType, string> = {
    manufacturing: 'تولیدی',
    service: 'خدماتی',
    trading: 'بازرگانی',
    contracting: 'پیمانکاری',
    r_and_d: 'تحقیق و توسعه',
    logistics: 'لجستیک',
  };
  return labels[type];
}

export function getCompanySizeLabel(size: CompanySize): string {
  const labels: Record<CompanySize, string> = {
    micro: 'خرد',
    small: 'کوچک',
    medium: 'متوسط',
    large: 'بزرگ',
    enterprise: 'بزرگ‌مقیاس',
  };
  return labels[size];
}

// ── Document Status Helper ────────────────────────────────────────────────
function statusFromExpiry(expiresAt?: string): 'valid' | 'expiring_soon' | 'expired' {
  if (!expiresAt) return 'valid';
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return 'valid';
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
}

/**
 * Document status, in the two shapes callers actually use:
 *
 *   - a single ISO date  -> the status OF THAT document;
 *   - a document list    -> the worst status ACROSS them (company rollup).
 *
 * Every one of the five call sites passes a `CompanyDocument[]`. The parameter
 * used to be typed `string`, so `new Date(documents)` ran there: an Invalid
 * Date, `NaN` days, and neither `NaN < 0` nor `NaN <= 30` being true, so every
 * company reported `valid` no matter how many documents had expired. This is a
 * runtime defect, not a typing convenience — the reason fix7.md B1 allows the
 * TS2345 it produced.
 */
export function computeDocumentStatus(
  input?: string | CompanyDocument[],
): 'valid' | 'expiring_soon' | 'expired' {
  if (input === undefined || typeof input === 'string') return statusFromExpiry(input);
  if (input.length === 0) return 'valid';

  const rank: Record<'valid' | 'expiring_soon' | 'expired', number> = {
    valid: 0,
    expiring_soon: 1,
    expired: 2,
  };
  let worst: 'valid' | 'expiring_soon' | 'expired' = 'valid';
  for (const doc of input) {
    // Prefer each document's own expiry: the wizard's rows carry `expiryDate`
    // while seeded rows carry `expiresAt`.
    const status = statusFromExpiry(doc.expiryDate ?? doc.expiresAt);
    if (rank[status] > rank[worst]) worst = status;
  }
  return worst;
}

// ── Health Score Calculation ─────────────────────────────────────────────
export interface HealthScoreWeights {
  financial: number;
  hse: number;
  operational: number;
  compliance: number;
}

export function calculateHealthScore(
  company: Pick<NationalCompany, 'financials' | 'hse' | 'status' | 'documents'>,
  weights: HealthScoreWeights = { financial: 0.3, hse: 0.3, operational: 0.2, compliance: 0.2 }
): number {
  // Financial score (0-100)
  let financialScore = 100;
  if (company.financials.overdueReceivables > 0) {
    const overdueRatio = company.financials.overdueReceivables / Math.max(company.financials.totalReceivables, 1);
    financialScore -= Math.min(overdueRatio * 50, 50);
  }
  if (company.financials.paymentHistory === 'poor') financialScore -= 30;
  else if (company.financials.paymentHistory === 'fair') financialScore -= 15;
  
  // HSE score (0-100)
  let hseScore = company.hse.inspectionScore ?? 50;
  if (company.hse.complianceStatus === 'non_compliant') hseScore = Math.min(hseScore, 30);
  else if (company.hse.complianceStatus === 'major_issues') hseScore = Math.min(hseScore, 50);
  else if (company.hse.complianceStatus === 'minor_issues') hseScore = Math.min(hseScore, 70);
  
  // Operational score (0-100)
  let operationalScore = 80;
  if (company.status === 'active') operationalScore = 100;
  else if (company.status === 'suspended') operationalScore = 40;
  else if (company.status === 'terminated') operationalScore = 0;
  
  // Compliance score (0-100)
  let complianceScore = 100;
  const expiredDocs = company.documents.filter(d => d.status === 'expired').length;
  const expiringDocs = company.documents.filter(d => d.status === 'expiring_soon').length;
  complianceScore -= expiredDocs * 15;
  complianceScore -= expiringDocs * 5;
  if (complianceScore < 0) complianceScore = 0;
  
  const overall = Math.round(
    financialScore * weights.financial +
    hseScore * weights.hse +
    operationalScore * weights.operational +
    complianceScore * weights.compliance
  );
  
  return Math.max(0, Math.min(100, overall));
}

export function isValidNationalId(id: string): boolean {
  if (!id || !/^\d{11}$/.test(id)) return false;
  const digits = id.split('').map(Number);
  const check = digits[10];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (10 - i);
  const r = sum % 11;
  return r < 2 ? check === r : check === 11 - r;
}

export function isValidShaba(shaba: string): boolean {
  return /^IR\d{24}$/.test((shaba || '').toUpperCase().replace(/\s/g, ''));
}

export function isValidIsic(code: string): boolean {
  return /^\d{4}$/.test(code || '');
}
