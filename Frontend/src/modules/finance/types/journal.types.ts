export type VoucherType = 'general' | 'opening' | 'adjusting' | 'closing' | 'reversing' | 'recurring' | 'allocation' | 'depreciation' | 'asset_disposal';
export type ReferenceType = 'invoice' | 'payment' | 'shipment' | 'contract' | 'manual' | 'payroll' | 'depreciation' | 'inventory' | 'production' | 'purchase_order';
export type VoucherStatus = 'draft' | 'pending_review' | 'approved' | 'posted' | 'reversed';

export interface JournalEntry {
  id: string;
  voucherId: string;
  accountId: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
  currency: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  debitBaseCurrency: number;
  creditBaseCurrency: number;
  costCenterId?: string;
  projectId?: string;
  departmentId?: string;
  sourceModule: 'ar' | 'ap' | 'inventory' | 'payroll' | 'fixed_asset' | 'manual' | 'production' | 'procurement';
  sourceDocumentId?: string;
}

export interface JournalVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  fiscalYearId: string;
  periodId: string;
  type: VoucherType;
  referenceType: ReferenceType;
  referenceId: string;
  description: string;
  entries: JournalEntry[];
  status: VoucherStatus;
  preparedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  postedAt?: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  attachments: DocumentAttachment[];
  createdAt: string;
  updatedAt: string;
  postedBy: string;
  reversalOf?: string;
  reversalReason?: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RecurringEntryTemplate {
  id: string;
  name: string;
  description: string;
  entries: Omit<JournalEntry, 'id' | 'voucherId'>[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
  requiresApproval: boolean;
}
