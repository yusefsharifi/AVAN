// src/modules/dashboard/super-admin/types/nationalCompany.types.ts

export type CompanyLifecycle = 'active' | 'suspended' | 'pending' | 'terminated' | 'under_review';
export type LeaseStatus = 'active' | 'expired' | 'pending_renewal' | 'terminated';

export interface NationalCompany {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  nationalId: string;
  registrationNumber: string;
  industry: string;
  subIndustry?: string;
  parkId: string;
  parkName: string;
  province: string;
  lifecycleStatus: CompanyLifecycle;
  leaseStatus: LeaseStatus;
  employeeCount: number;
  plotArea: number;
  healthScore: number;
  financialScore: number;
  hseScore: number;
  operationalScore: number;
  energyScore: number;
  engagementScore: number;
  leaseComplianceScore: number;
  marketplaceScore: number;
  utilityDebt: number;
  overdueReceivables: number;
  marketplaceParticipation: boolean;
  nationalAccountManagerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyOnboardingForm {
  nameFa: string;
  nameEn: string;
  nationalId: string;
  registrationNumber: string;
  industry: string;
  subIndustry: string;
  parkId: string;
  ceoName: string;
  ceoNationalId: string;
  ceoPhone: string;
  ceoEmail: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  employeeCount: string;
  plotArea: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: string;
  securityDeposit: string;
  activityDescription: string;
  products: string;
  annualRevenue: string;
  bankAccount: string;
  documents: File[];
}