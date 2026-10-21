/**
 * Entity: IndustrialZone
 * تایپ‌های پایهٔ شهرک صنعتی با تمامی جزئیات
 */

// ── Enums ───────────────────────────────────────────────────────────────────
export type ZoneOwnershipType = 'governmental' | 'private' | 'public_private' | 'cooperative';
export type ZoneStatus = 'draft' | 'pending_approval' | 'active' | 'suspended' | 'closed';
export type ZoneClass = 'light' | 'heavy' | 'special' | 'mixed';
export type ZoneRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ── Sub-types ─────────────────────────────────────────────────────────────
export interface ZonePlot {
  id: string;
  plotNumber: string;
  areaSqM: number;
  status: 'vacant' | 'reserved' | 'leased' | 'under_construction' | 'occupied';
  assignedCompanyId?: string;
  utilities: {
    electricityMeter?: string;
    waterMeter?: string;
    gasMeter?: string;
  };
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface ZoneInfrastructure {
  totalAreaSqM: number;
  buildableAreaSqM: number;
  totalPlots: number;
  roadAccess: ('asphalt' | 'rail' | 'both')[];
  power: {
    totalCapacityKw: number;
    availableCapacityKw: number;
    substationCount: number;
    voltageLevel: string;
  };
  water: {
    dailyCapacityM3: number;
    source: string;
    treatmentPlant: boolean;
  };
  gas: {
    dailyCapacityNm3: number;
    pressureLevel: string;
  };
  telecom: {
    fiberOptic: boolean;
    maxBandwidthMbps: number;
    ispProviders: string[];
  };
  waste: {
    wastewaterCapacityM3: number;
    hasTreatmentPlant: boolean;
    solidWasteCollection: boolean;
    hazardousWasteDisposal: boolean;
  };
  fireSafety: {
    hasFireStation: boolean;
    fireTrucksCount: number;
    hydrantsCount: number;
    responseTimeMinutes: number;
  };
  medical: {
    hasClinic: boolean;
    ambulanceCount: number;
  };
  security: {
    gateCount: number;
    hasCctv: boolean;
    cameraCount: number;
    guardPosts: number;
  };
}

export interface ZoneHSEProfile {
  environmentalLicenseNumber?: string;
  environmentalLicenseDate?: string;
  environmentalLicenseExpiry?: string;
  inherentRiskScore: number; // 0-100
  riskLevel: ZoneRiskLevel;
  permittedIndustries: string[];
  prohibitedIndustries: string[];
  maxEmissionCo2TonYear?: number;
  noiseLimitDb?: number;
  greenSpacePercent: number;
  hasEiaApproval: boolean;
}

export interface ZoneFinancialProfile {
  landLeaseRatePerSqMYear: number; // ریال
  serviceChargePerSqMYear: number;
  municipalityFeePercent: number;
  vatRegistrationNumber?: string;
  centralBankAccount: string;
  centralShaba: string;
  penaltyRatePercent: number;
  depositAmount: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
}

export interface ZoneDocument {
  id: string;
  type: 'ownership_deed' | 'establishment_permit' | 'environmental_license' | 'fire_safety_certificate' | 'gis_map' | 'master_plan' | 'other';
  name: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy: string;
  expiresAt?: string;
  verified: boolean;
}

export interface ZoneManagerAssignment {
  managerId?: string;
  managerName?: string;
  managerMobile?: string;
  managerEmail?: string;
  assignedAt?: string;
  role: 'zone_manager' | 'finance_manager' | 'hse_manager' | 'security_manager' | 'operations_manager';
}

// ── Main Entity ───────────────────────────────────────────────────────────
export interface IndustrialZone {
  id: string;
  zoneCode: string;          // الگو: ۲ حرف استان + ۳ رقم (مثلاً TEH-001)
  nationalZoneId: string;    // یکتا در سطح ملی
  nameFa: string;
  nameEn?: string;
  
  // Location
  province: string;
  city: string;
  address: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  
  // Classification
  status: ZoneStatus;
  ownershipType: ZoneOwnershipType;
  zoneClass: ZoneClass;
  
  // Area & Capacity
  infrastructure: ZoneInfrastructure;
  plots: ZonePlot[];
  
  // Profiles
  hseProfile: ZoneHSEProfile;
  financialProfile: ZoneFinancialProfile;
  
  // Management
  managementTeam: ZoneManagerAssignment[];
  
  // Documents
  documents: ZoneDocument[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Computed (not stored, derived)
  occupancyPercent?: number;
  availablePlotsCount?: number;
  totalCompaniesCount?: number;
}

// ── Validation ────────────────────────────────────────────────────────────
export const ZONE_CODE_PATTERN = /^[A-Z]{2,3}-\d{3,4}$/;
export const NATIONAL_ZONE_ID_PATTERN = /^NZ-\d{6}$/;

export function validateZoneCode(code: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'کد شهرک الزامی است' };
  if (!ZONE_CODE_PATTERN.test(code)) {
    return { valid: false, error: 'الگوی کد: ۲-۳ حرف انگلیسی + خط تیره + ۳-۴ رقم (مثلاً TEH-001)' };
  }
  return { valid: true };
}

export function validateNationalZoneId(id: string): { valid: boolean; error?: string } {
  if (!id) return { valid: false, error: 'شناسه ملی شهرک الزامی است' };
  if (!NATIONAL_ZONE_ID_PATTERN.test(id)) {
    return { valid: false, error: 'الگوی شناسه: NZ- + ۶ رقم (مثلاً NZ-000001)' };
  }
  return { valid: true };
}

export function validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
  if (lat < 25 || lat > 40) return { valid: false, error: 'عرض جغرافیایی باید بین ۲۵ تا ۴۰ باشد (محدوده ایران)' };
  if (lng < 44 || lng > 63) return { valid: false, error: 'طول جغرافیایی باید بین ۴۴ تا ۶۳ باشد (محدوده ایران)' };
  return { valid: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function calculateZoneOccupancy(plots: ZonePlot[]): number {
  if (plots.length === 0) return 0;
  const occupied = plots.filter(p => p.status === 'occupied' || p.status === 'under_construction').length;
  return Math.round((occupied / plots.length) * 100);
}

export function getAvailablePlots(plots: ZonePlot[]): ZonePlot[] {
  return plots.filter(p => p.status === 'vacant');
}

export function getZoneStatusLabel(status: ZoneStatus): string {
  const labels: Record<ZoneStatus, string> = {
    draft: 'پیش‌نویس',
    pending_approval: 'در انتظار تأیید',
    active: 'فعال',
    suspended: 'تعلیق‌شده',
    closed: 'تعطیل',
  };
  return labels[status];
}

export interface ZoneStatusColor {
  bg: string;
  text: string;
  border: string;
}

export function getZoneStatusColor(status: ZoneStatus): ZoneStatusColor {
  const colors: Record<ZoneStatus, ZoneStatusColor> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    pending_approval: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    suspended: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    closed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  };
  return colors[status] || colors.draft;
}

export function getZoneClassLabel(zoneClass: ZoneClass): string {
  const labels: Record<ZoneClass, string> = {
    light: 'سبک',
    heavy: 'سنگین',
    special: 'ویژه',
    mixed: 'ترکیبی',
  };
  return labels[zoneClass];
}

export function getOwnershipTypeLabel(type: ZoneOwnershipType): string {
  const labels: Record<ZoneOwnershipType, string> = {
    governmental: 'دولتی',
    private: 'خصوصی',
    public_private: 'عمومی-خصوصی',
    cooperative: 'تعاونی',
  };
  return labels[type];
}

export const zoneStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  active: 'فعال',
  suspended: 'تعلیق‌شده',
  closed: 'تعطیل',
};

export const zoneStatusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-blue-50 text-blue-700',
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-amber-50 text-amber-700',
  closed: 'bg-red-50 text-red-700',
};
