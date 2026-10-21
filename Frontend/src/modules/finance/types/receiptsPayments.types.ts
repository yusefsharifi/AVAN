export type ReceiptPaymentType = 'receipt' | 'payment' | 'internal_transfer';
export type ReceiptPaymentStatus = 'draft' | 'prepared' | 'approved' | 'posted' | 'bounced' | 'cancelled';
export type InstrumentType = 'cash' | 'check' | 'promissory_note' | 'bank_transfer' | 'online' | 'lc';
export type RPDocType = 'cash_receipt' | 'check_receipt' | 'transfer_receipt' | 'cash_payment' | 'check_payment' | 'transfer_payment';

export interface ReceiptPaymentLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  description: string;
  projectId?: string;
  costCenterId?: string;
}

export interface ReceiptPaymentDoc {
  id: string;
  documentNumber: string;
  docType: RPDocType;
  date: string;
  type: ReceiptPaymentType;
  status: ReceiptPaymentStatus;
  statusChangeDate: string;
  entityId: string;
  entityName: string;
  entityType: 'buyer' | 'seller' | 'employee' | 'other';
  instrumentType: InstrumentType;
  checkId?: string;
  checkNumber?: string;
  checkDate?: string;      // سررسید
  bankName?: string;
  bankBranch?: string;
  bankAccountId?: string;
  transactionRef?: string;
  totalAmount: number;
  currency: 'IRR' | 'USD';
  exchangeRate: number;
  lines: ReceiptPaymentLine[];
  parentDocumentId?: string;
  parentDocNumber?: string;
  isPartial: boolean;
  remainingAmount?: number;
  preparedBy: string;
  approvedBy?: string;
  postedBy?: string;
  notes: string;
  description: string;
  glVoucherId?: string;
  cancelReason?: string;
  bounceReason?: string;
  createdAt: string;
}

export interface ParentDocument {
  id: string;
  documentNumber: string;
  date: string;
  description: string;
  entityName: string;
  totalAmount: number;
  settledAmount: number;
  remainingAmount: number;
  childDocumentIds: string[];
  status: 'open' | 'partially_applied' | 'fully_applied' | 'cancelled';
  notes: string;
}

export type CheckStatus = 'issued' | 'pending_clearance' | 'cleared' | 'bounced' | 'cancelled' | 'returned';

export interface Check {
  id: string;
  checkNumber: string;
  checkbookId: string;
  bankAccountId: string;
  bankName: string;
  direction: 'incoming' | 'outgoing'; // incoming = دریافتی, outgoing = پرداختی
  payeeName?: string;
  payerName?: string;
  amount: number;
  currency: 'IRR' | 'USD';
  issueDate: string;
  dueDate: string;
  clearanceDate?: string;
  status: CheckStatus;
  rpDocumentId?: string;
  glVoucherId?: string;
  bounceReason?: string;
  bounceDate?: string;
  bouncePenaltyAmount?: number;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface Checkbook {
  id: string;
  bookNumber: string;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  series: string;
  startNumber: string;
  endNumber: string;
  currentNumber: string;
  totalLeaves: number;
  usedLeaves: number;
  remainingLeaves: number;
  status: 'active' | 'exhausted' | 'cancelled';
  issuedDate: string;
}

export interface BankAccountRecord {
  id: string;
  code: string;
  name: string;
  notes: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  iban: string;
  glAccountId: string;
  currentBalance: number;
  status: 'active' | 'inactive';
}

export interface FinancialSource {
  id: string;
  code: string;
  name: string;
  type: 'bank_loan' | 'equity' | 'credit_line' | 'bond' | 'other';
  amount: number;
  usedAmount: number;
  availableAmount: number;
  interestRate: number;
  maturityDate?: string;
  status: 'active' | 'exhausted' | 'closed';
  notes: string;
}
