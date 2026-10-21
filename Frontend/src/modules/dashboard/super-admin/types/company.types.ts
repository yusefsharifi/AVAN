// National Company Types

export type CompanyLifecycle = 'draft' | 'under_review' | 'active' | 'suspended' | 'terminated';
export type CompanySize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
export type IndustryType = 'manufacturing' | 'chemical' | 'food' | 'textile' | 'automotive' | 'electronics' | 'pharmaceutical' | 'metal' | 'plastic' | 'other';

export interface CompanyLease {
  id: string;
  plotNumber: string;
  areaSqM: number;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: 'active' | 'expired' | 'pending_renewal';
  nextRenewalDate?: string;
}

export interface CompanyUtility {
  type: 'electricity' | 'water' | 'gas' | 'wastewater';
  monthlyConsumption: number;
  monthlyBill: number;
  lastPaymentDate?: string;
  outstandingAmount: number;
}

export interface CompanyHSE {
  lastInspectionDate: string;
  inspectionScore: number;
  openIncidents: number;
  workPermitsActive: number;
  certifications: string[];
  complianceStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
}

export interface CompanyFinance {
  totalReceivables: number;
  overdueReceivables: number;
  lastPaymentDate?: string;
  creditLimit: number;
  creditUsed: number;
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CompanyHealthScore {
  overall: number;
  financial: number;
  hse: number;
  operational: number;
  energy: number;
  engagement: number;
  leaseCompliance: number;
  marketplace: number;
}

export interface CompanyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface CompanyDocument {
  id: string;
  type: 'license' | 'certificate' | 'contract' | 'insurance' | 'permit' | 'other';
  name: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
  url: string;
}

export interface NationalCompany {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  parkId: string;
  parkName: string;
  province: string;
  city: string;
  industry: IndustryType;
  size: CompanySize;
  employeeCount: number;
  lifecycleStatus: CompanyLifecycle;
  nationalId: string;
  economicCode: string;
  registrationNumber: string;
  address: string;
  contacts: CompanyContact[];
  lease?: CompanyLease;
  utilities: CompanyUtility[];
  hse: CompanyHSE;
  finance: CompanyFinance;
  healthScore: CompanyHealthScore;
  documents: CompanyDocument[];
  nationalAccountManagerId?: string;
  marketplaceActive: boolean;
  marketplaceTotalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyOnboardingData {
  // Step 1: Basic Info
  code?: string;
  nameFa?: string;
  nameEn?: string;
  parkId?: string;
  industry?: IndustryType;
  size?: CompanySize;
  nationalId?: string;
  economicCode?: string;
  registrationNumber?: string;
  address?: string;
  
  // Step 2: Contacts
  contacts?: CompanyContact[];
  
  // Step 3: Lease Info
  plotNumber?: string;
  leaseAreaSqM?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  monthlyRent?: number;
  
  // Step 4: Utility Setup
  electricityMeterNumber?: string;
  waterMeterNumber?: string;
  gasMeterNumber?: string;
  
  // Step 5: Financial Setup
  creditLimit?: number;
  billingEmail?: string;
  bankAccount?: string;
  
  // Step 6: Documents
  documents?: CompanyDocument[];
}
