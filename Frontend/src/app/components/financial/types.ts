export type DocStatus = "pending" | "paid" | "overdue" | "cancelled" | "partial";
export type DocType = "invoice" | "statement" | "bill" | "receipt" | "credit_note";
export type CurrencyCode = "IRR" | "USD" | "EUR";
export type PaymentMethod = "manual" | "zarinpal" | "mellat" | "saderat" | "tejarat" | "saman" | "pos";
export type AccountNature = "debtor" | "creditor";
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type FinancialPeriodStatus = "open" | "closed" | "locked";

export interface CompanyInfo {
  id: string;
  nameFa: string;
  unit: string;
  regNo: string;
  economicCode: string;
  nationalId: string;
  postalCode: string;
  address: string;
  phone: string;
}

export interface FinancialDocument {
  id: string;
  docType: DocType;
  docNumber: string;
  title: string;
  description: string;
  companyId: string;
  companyName: string;
  amount: number;
  currency: CurrencyCode;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  status: DocStatus;
  category: string;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  isRecurring: boolean;
  recurringPeriod: "monthly" | "quarterly" | "annual" | null;
  attachments: Attachment[];
  lineItems: LineItem[];
  relatedDocId: string | null;
  targetType: "single" | "all";
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  accountCode: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  isReceipt: boolean;
}

export interface Payment {
  id: string;
  documentId: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  referenceNumber: string;
  transactionId: string | null;
  paidAt: string;
  paidBy: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  status: "pending_verification" | "verified" | "rejected";
  receiptUrl: string | null;
  gatewayResponse: string | null;
  notes: string;
}

export interface ChartOfAccount {
  code: string;
  title: string;
  type: AccountType;
  nature: AccountNature;
  level: number;
  parentCode: string | null;
  isActive: boolean;
  balance: number;
  currency: CurrencyCode;
}

export interface GeneralLedgerEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  accountCode: string;
  accountTitle: string;
  debit: number;
  credit: number;
  currency: CurrencyCode;
  documentId: string | null;
  createdBy: string;
  createdAt: string;
  financialPeriodId: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountTitle: string;
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface FinancialPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: FinancialPeriodStatus;
  isCurrent: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  details: string;
  ipAddress: string;
  changes: Record<string, { old: string; new: string }> | null;
}

export interface FinNotification {
  id: string;
  type: "new_document" | "due_reminder" | "overdue" | "payment_confirmed" | "payment_rejected";
  title: string;
  message: string;
  documentId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AgingReportRow {
  companyName: string;
  totalDue: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120plus: number;
}

export interface FinancialSummary {
  period: string;
  income: number;
  expense: number;
  netProfit: number;
  receivables: number;
  payables: number;
}

export interface CashFlowRow {
  category: string;
  items: { description: string; amount: number }[];
  total: number;
}
