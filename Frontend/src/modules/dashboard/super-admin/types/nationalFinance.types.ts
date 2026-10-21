
// src/modules/dashboard/super-admin/types/nationalFinance.types.ts

export type InvoiceStatus = 'draft' | 'issued' | 'due' | 'overdue' | 'paid' | 'cancelled';
export type CollectionStatus = 'pending' | 'in_progress' | 'collected' | 'written_off';

export interface NationalFinanceSummary {
  id: string;
  parkId: string;
  parkName: string;
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  utilityInvoiced: number;
  utilityCollected: number;
  overdueReceivables: number;
  collectionRate: number;
  cashFlow: number;
  budgetVariance: number;
}

export interface NationalInvoice {
  id: string;
  invoiceNumber: string;
  parkId: string;
  parkName: string;
  companyId: string;
  companyName: string;
  type: 'utility' | 'lease' | 'service' | 'penalty';
  amount: number;
  tax: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  overduedays?: number;
}

export interface CollectionTask {
  id: string;
  invoiceId: string;
  companyId: string;
  companyName: string;
  parkId: string;
  amount: number;
  status: CollectionStatus;
  assignedTo: string;
  dueDate: string;
  notes: string;
  createdAt: string;
}