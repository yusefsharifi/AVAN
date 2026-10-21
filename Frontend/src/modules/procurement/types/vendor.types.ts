export type VendorStatus = 'active' | 'inactive' | 'blacklisted' | 'pending_approval';
export type VendorCategory = 'raw_material' | 'equipment' | 'services' | 'packaging' | 'chemicals' | 'spare_parts' | 'utilities' | 'other';
export type PaymentTerms = 'cod' | 'net15' | 'net30' | 'net45' | 'net60' | 'prepaid' | 'lc';

export interface VendorContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
}

export interface VendorDocument {
  id: string;
  type: 'trade_license' | 'tax_certificate' | 'quality_certificate' | 'iso_certificate' | 'bank_guarantee' | 'other';
  name: string;
  expiryDate?: string;
  isVerified: boolean;
  uploadedAt: string;
}

export interface VendorPerformanceMetric {
  period: string;
  onTimeDeliveryRate: number;
  qualityAcceptanceRate: number;
  priceComplianceRate: number;
  orderCount: number;
  totalPurchaseValue: number;
  averageLeadTimeDays: number;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  nameFa: string;
  nameEn?: string;
  taxId: string;
  category: VendorCategory;
  subCategories: string[];
  status: VendorStatus;
  paymentTerms: PaymentTerms;
  creditLimit: number;
  currentBalance: number;
  address: string;
  city: string;
  province: string;
  phone: string;
  website?: string;
  bankName: string;
  bankAccount: string;
  contacts: VendorContact[];
  documents: VendorDocument[];
  performanceHistory: VendorPerformanceMetric[];
  overallScore: number;
  approvedItemCategories: string[];
  leadTimeDays: number;
  minimumOrderValue: number;
  glAccountId?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  notes: string;
}
