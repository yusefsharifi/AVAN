// National Finance Types

export type InvoiceStatus = 'draft' | 'issued' | 'due' | 'overdue' | 'reminder_sent' | 'collection_task' | 'paid' | 'settled' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'pos' | 'online';
export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  parkId: string;
  parkName: string;
  companyId: string;
  companyName: string;
  type: 'utility' | 'lease' | 'service' | 'penalty' | 'other';
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
  status: InvoiceStatus;
  remindersSent: number;
  lastReminderAt?: string;
  paidAmount: number;
  paidAt?: string;
  receiptVoucherId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  parkId: string;
  companyId: string;
  companyName: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  receivedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
}

export interface ReceiptVoucher {
  id: string;
  voucherNumber: string;
  invoiceIds: string[];
  paymentIds: string[];
  parkId: string;
  companyId: string;
  companyName: string;
  totalAmount: number;
  issuedAt: string;
  issuedBy: string;
  status: 'draft' | 'posted';
}

export interface CollectionTask {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  parkId: string;
  companyId: string;
  companyName: string;
  amount: number;
  daysOverdue: number;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'escalated' | 'resolved';
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ParkFinanceSummary {
  parkId: string;
  parkName: string;
  province: string;
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  utilityRevenue: number;
  leaseRevenue: number;
  serviceRevenue: number;
  totalReceivables: number;
  overdueReceivables: number;
  collectionRate: number;
  budgetUtilization: number;
}

export interface NationalFinanceKPI {
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  totalReceivables: number;
  overdueReceivables: number;
  collectionRate: number;
  averageCollectionDays: number;
  utilityRevenueTotal: number;
  leaseRevenueTotal: number;
  serviceRevenueTotal: number;
  budgetTotal: number;
  budgetUtilized: number;
  cashFlowPositive: boolean;
  taxPayable: number;
}

export interface BudgetLine {
  id: string;
  parkId: string;
  category: string;
  subcategory?: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  period: string;
}

export interface CashFlowItem {
  id: string;
  parkId?: string;
  type: 'inflow' | 'outflow';
  category: string;
  amount: number;
  date: string;
  description: string;
}
