import type { UUID, Address, Contact, ZoneDocument, WorkflowStep, FilterState } from './common.types';

export type CompanyType = 'private_joint_stock' | 'limited_liability' | 'cooperative' | 'branch' | 'representative';

export type CompanyLifecycleStatus =
    | 'applicant'
    | 'under_review'
    | 'finance_review'
    | 'hse_review'
    | 'plot_allocation'
    | 'zone_manager_approval'
    | 'active'
    | 'suspended'
    | 'closed';

export interface CompanyOnboardingRecord {
    id: UUID;
    companyName: string;
    companyNameEn?: string;
    brandName?: string;
    companyType: CompanyType;
    registrationNumber: string;
    nationalId: string;
    taxNumber?: string;
    registrationDate?: string;
    industry: string;
    lifecycleStatus: CompanyLifecycleStatus;
    address: Address;
    areaSqM?: number;
    employees: number;
    operatingCapacity?: string;
    productionLines?: number;
    shifts?: number;
    contacts: Contact[];
    legalRepName?: string;
    hseContact?: string;
    financialContact?: string;
    mainProducts?: string[];
    machineCount?: number;
    needsWarehouse: boolean;
    needsHazmatStorage: boolean;
    needsHighVoltage: boolean;
    needsIndustrialGas: boolean;
    needsWastewater: boolean;
    hseManager?: string;
    bankAccount?: string;
    creditLimit?: number;
    utilityTariffGroup?: string;
    requestedServices: string[];
    documents: ZoneDocument[];
    workflowHistory: WorkflowStep[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface CompanyHealthScore {
    companyId: UUID;
    overall: number;
    financial: number;
    hse: number;
    operational: number;
    energy: number;
    engagement: number;
    leaseCompliance: number;
    riskIndicators: string[];
    recommendations: string[];
}

export interface CompanyFilters extends FilterState {
    industry?: string;
    zoneBlock?: string;
    lifecycleStatus?: CompanyLifecycleStatus;
}
