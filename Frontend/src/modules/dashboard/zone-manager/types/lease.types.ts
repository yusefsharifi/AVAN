import type { UUID, ZoneDocument, WorkflowStep } from './common.types';

export type ContractType = 'lease' | 'sublease' | 'service' | 'maintenance';

export type ContractStatus =
    | 'draft'
    | 'pending_finance'
    | 'pending_hse'
    | 'pending_signature'
    | 'active'
    | 'expired'
    | 'terminated'
    | 'suspended';

export type UsageType = 'manufacturing' | 'warehouse' | 'office' | 'laboratory' | 'services' | 'mixed';

export interface LeaseContract {
    id: UUID;
    contractNumber: string;
    companyId: UUID;
    companyName: string;
    contractType: ContractType;
    status: ContractStatus;
    startDate: string;
    endDate: string;
    renewalPeriodMonths?: number;
    block: string;
    unit: string;
    areaSqM: number;
    usageType: UsageType;
    monthlyRent: number;
    serviceCharge: number;
    maintenanceFee: number;
    deposit: number;
    escalationClause?: string;
    taxPercent: number;
    latePaymentPenaltyPercent: number;
    billingCycle: 'monthly' | 'quarterly' | 'annually';
    fireInsuranceExpiry?: string;
    liabilityInsuranceExpiry?: string;
    documents: ZoneDocument[];
    workflowSteps: WorkflowStep[];
    createdAt: string;
    updatedAt: string;
}
