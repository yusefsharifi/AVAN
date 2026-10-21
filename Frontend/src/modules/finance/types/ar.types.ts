export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'written_off' | 'credit_noted';
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export type CollectionStatus = 'normal' | 'reminder_sent' | 'demand_letter' | 'legal' | 'collection_agency';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  amount: number;
  vatRate: number;
  vatAmount: number;
  accountId: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  totalAmountBaseCurrency: number;
  status: InvoiceStatus;
  paidAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  agingBucket: AgingBucket;
  collectionStatus: CollectionStatus;
  lastReminderDate?: string;
  reminderCount: number;
  contractId?: string;
  shipmentIds: string[];
  serviceRequestIds: string[];
  createdBy: string;
  approvedBy?: string;
  postedVoucherId?: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  originalInvoiceId: string;
  companyId: string;
  customerId: string;
  amount: number;
  reason: string;
  status: 'draft' | 'approved' | 'posted';
  createdAt: string;
}

export interface AgingReportItem {
  customerId: string;
  customerName: string;
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
}
