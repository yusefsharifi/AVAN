export type BankAccountType = 'checking' | 'savings' | 'deposit' | 'lc' | 'guarantee';
export type ReconciliationStatus = 'reconciled' | 'unreconciled' | 'discrepancy';
export type BankMatchStatus = 'unmatched' | 'auto_matched' | 'manual_matched' | 'matched_with_variance';

export interface BankAccount {
  id: string;
  accountNumber: string;
  iban: string;
  bankName: string;
  branchName: string;
  branchCode: string;
  accountType: BankAccountType;
  currency: 'IRR' | 'USD' | 'EUR';
  glAccountId: string;
  currentBalance: number;
  availableBalance: number;
  blockedAmount: number;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  reconciliationStatus: ReconciliationStatus;
  status: 'active' | 'inactive' | 'closed';
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  description: string;
  referenceNumber: string;
  debit: number;
  credit: number;
  balance: number;
  matchedInvoiceId?: string;
  matchedVoucherId?: string;
  matchStatus: BankMatchStatus;
  source: 'bank_api' | 'manual_entry' | 'import';
  importBatchId?: string;
  isReconciled: boolean;
}

export interface CashFlowForecast {
  date: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  cumulativeBalance: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface BankReconciliationItem {
  id: string;
  type: 'bank_statement' | 'book_record';
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
  matched: boolean;
  matchedWithId?: string;
}
