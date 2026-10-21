import type { UUID, Address } from './common.types';

export type UtilityType = 'electricity' | 'water' | 'gas' | 'wastewater' | 'internet' | 'steam' | 'compressed_air';

export type MeterStatus = 'active' | 'inactive' | 'maintenance' | 'faulty' | 'decommissioned';

export type ReadingSource = 'manual' | 'iot' | 'import';

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface UtilityGLMapping {
  electricityRevenueAccountId: string;
  waterRevenueAccountId: string;
  gasRevenueAccountId: string;
  receivableAccountId: string;
  taxAccountId: string;
  penaltyAccountId: string;
  collectionBankAccountId: string;
}

export interface UtilityMeter {
    id: UUID;
    meterCode: string;
    utilityType: UtilityType;
    serialNumber: string;
    manufacturer?: string;
    companyId: UUID;
    companyName: string;
    address: Address;
    unit: string;
    installationDate: string;
    lastServiceDate?: string;
    tariffGroup: string;
    anomalyThreshold: number;
    lastReading: number;
    lastReadingDate: string;
    status: MeterStatus;
    createdAt: string;
}

export interface MeterReading {
    id: UUID;
    meterId: UUID;
    readingDate: string;
    currentValue: number;
    previousValue: number;
    consumption: number;
    peakConsumption?: number;
    offPeakConsumption?: number;
    source: ReadingSource;
    recordedBy: string;
    notes?: string;
    meterImageName?: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface UtilityTariff {
    id: UUID;
    utilityType: UtilityType;
    tariffGroup: string;
    tariffName: string;
    baseRate: number;
    peakRate?: number;
    offPeakRate?: number;
    taxPercent: number;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
}

export interface UtilityInvoice {
    id: UUID;
    invoiceNumber: string;
    companyId: UUID;
    companyName: string;
    meterId: UUID;
    utilityType: UtilityType;
    billingPeriodFrom: string;
    billingPeriodTo: string;
    consumption: number;
    unit: string;
    baseAmount: number;
    taxAmount: number;
    penaltyAmount: number;
    discountAmount: number;
    totalAmount: number;
    dueDate: string;
    paymentStatus: InvoiceStatus;
    issuedAt: string;
    issuedBy: string;
    paidAt?: string;
    journalVoucherId?: string;
    notes?: string;
}
