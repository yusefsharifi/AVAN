// ═══════════════════════════════════════════════════════════════════════════════
// Finance API — COMP-004: Typed API for finance backend endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '@/shared/api/client';
import type {
  Account,
  JournalVoucher,
  SalesInvoice,
  VendorInvoice,
  BankAccount,
  FixedAsset,
  VATReturn,
  PurchaseDocument,
  SalesDocument,
  BuyerSeller,
  Visitor,
  ReceiptPaymentDoc,
  Check,
  Checkbook,
  FiscalYear,
} from '../types';

// ── Accounts (Chart of Accounts) ─────────────────────────────────────────────

export const accountApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Account[]>('/finance/accounts', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<Account>(`/finance/accounts/${id}`),
  create: (data: Partial<Account>) => api.post<Account>('/finance/accounts', data),
  getTree: () => api.get<Account[]>('/finance/accounts/tree'),
  seed: () => api.post<void>('/finance/accounts/seed'),
};

// ── Journal Vouchers ─────────────────────────────────────────────────────────

export const voucherApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<JournalVoucher[]>('/finance/vouchers', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<JournalVoucher>(`/finance/vouchers/${id}`),
  create: (data: Partial<JournalVoucher>) => api.post<JournalVoucher>('/finance/vouchers', data),
  post: (id: string) => api.post<JournalVoucher>(`/finance/vouchers/${id}/post`),
  void: (id: string) => api.post<void>(`/finance/vouchers/${id}/void`),
  reverse: (id: string, reason: string) => api.post<JournalVoucher>(`/finance/vouchers/${id}/reverse`, { reason }),
  getTrialBalance: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/vouchers/trial-balance', { params: params as Record<string, string | number | boolean | undefined> }),
  getLedger: (accountId: string, params?: Record<string, unknown>) =>
    api.get<any[]>(`/finance/vouchers/ledger/${accountId}`, { params: params as Record<string, string | number | boolean | undefined> }),
};

// ── Bank Accounts ────────────────────────────────────────────────────────────

export const bankAccountApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<BankAccount[]>('/finance/bank-accounts', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<BankAccount>(`/finance/bank-accounts/${id}`),
  create: (data: Partial<BankAccount>) => api.post<BankAccount>('/finance/bank-accounts', data),
  getTreasuryDashboard: () => api.get<any>('/finance/bank-accounts/treasury-dashboard'),
  getTransactions: (id: string, params?: Record<string, unknown>) =>
    api.get<any[]>(`/finance/bank-accounts/${id}/transactions`, { params: params as Record<string, string | number | boolean | undefined> }),
  reconcile: (id: string, data: any) => api.post<any>(`/finance/bank-accounts/${id}/reconcile`, data),
};

// ── Invoices ─────────────────────────────────────────────────────────────────

export const invoiceApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/invoices', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/finance/invoices/${id}`),
  create: (data: any) => api.post<any>('/finance/invoices', data),
  issue: (id: string) => api.post<any>(`/finance/invoices/${id}/issue`),
  recordPayment: (id: string, data: any) => api.post<any>(`/finance/invoices/${id}/payment`, data),
  cancel: (id: string) => api.post<void>(`/finance/invoices/${id}/cancel`),
  dispute: (id: string, reason: string) => api.post<any>(`/finance/invoices/${id}/dispute`, { reason }),
  getOverdue: () => api.get<any[]>('/finance/invoices/overdue'),
  getAgingReport: () => api.get<any[]>('/finance/invoices/aging-report'),
  getPdf: (id: string) => api.get<any>(`/finance/invoices/${id}/pdf`),
};

// ── Leases ───────────────────────────────────────────────────────────────────

export const leaseApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/leases', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/finance/leases/${id}`),
  create: (data: any) => api.post<any>('/finance/leases', data),
  suspend: (id: string) => api.post<any>(`/finance/leases/${id}/suspend`),
  terminate: (id: string) => api.post<any>(`/finance/leases/${id}/terminate`),
  renew: (id: string, data: any) => api.post<any>(`/finance/leases/${id}/renew`, data),
  getExpiring: () => api.get<any[]>('/finance/leases/expiring'),
  getStats: () => api.get<any>('/finance/leases/stats'),
  getPayments: (id: string) => api.get<any[]>(`/finance/leases/${id}/payments`),
  recordPayment: (id: string, pid: string, data: any) =>
    api.post<any>(`/finance/leases/${id}/payments/${pid}/record`, data),
};

// ── Periods ──────────────────────────────────────────────────────────────────

export const periodApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/periods', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/finance/periods', data),
  getCurrent: () => api.get<any>('/finance/periods/current'),
  close: (id: string) => api.post<void>(`/finance/periods/${id}/close`),
  lock: (id: string) => api.post<void>(`/finance/periods/${id}/lock`),
};

// ── Reports ──────────────────────────────────────────────────────────────────

export const reportApi = {
  getKpi: () => api.get<any>('/finance/reports/kpi'),
  getIncomeStatement: (params?: Record<string, unknown>) =>
    api.get<any>('/finance/reports/income-statement', { params: params as Record<string, string | number | boolean | undefined> }),
  getBalanceSheet: (params?: Record<string, unknown>) =>
    api.get<any>('/finance/reports/balance-sheet', { params: params as Record<string, string | number | boolean | undefined> }),
  getCashFlow: (params?: Record<string, unknown>) =>
    api.get<any>('/finance/reports/cash-flow', { params: params as Record<string, string | number | boolean | undefined> }),
  getAging: () => api.get<any>('/finance/reports/aging'),
  getRevenueBreakdown: () => api.get<any>('/finance/reports/revenue-breakdown'),
  getBudgetVariance: () => api.get<any>('/finance/reports/budget-variance'),
};

// ── Budgets ──────────────────────────────────────────────────────────────────

export const budgetApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/budgets', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/finance/budgets/${id}`),
  create: (data: any) => api.post<any>('/finance/budgets', data),
  approve: (id: string) => api.post<any>(`/finance/budgets/${id}/approve`),
  getVariance: (id: string) => api.get<any>(`/finance/budgets/${id}/variance`),
};

// ── Fixed Assets ─────────────────────────────────────────────────────────────
export const fixedAssetApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<FixedAsset[]>('/finance/fixed-assets', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<FixedAsset>(`/finance/fixed-assets/${id}`),
  create: (data: Partial<FixedAsset>) => api.post<FixedAsset>('/finance/fixed-assets', data),
  update: (id: string, data: Partial<FixedAsset>) => api.patch<FixedAsset>(`/finance/fixed-assets/${id}`, data),
};

// ── Purchase / Sales documents ───────────────────────────────────────────────
export const documentApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Array<PurchaseDocument | SalesDocument>>('/finance/documents', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<PurchaseDocument | SalesDocument>(`/finance/documents/${id}`),
  createPurchase: (data: Partial<PurchaseDocument>) => api.post<PurchaseDocument>('/finance/documents', data),
  createSales: (data: Partial<SalesDocument>) => api.post<SalesDocument>('/finance/documents', data),
};

// ── Buyers / Sellers ─────────────────────────────────────────────────────────
export const buyerSellerApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<BuyerSeller[]>('/finance/buyer-sellers', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<BuyerSeller>(`/finance/buyer-sellers/${id}`),
  create: (data: Partial<BuyerSeller>) => api.post<BuyerSeller>('/finance/buyer-sellers', data),
  update: (id: string, data: Partial<BuyerSeller>) => api.patch<BuyerSeller>(`/finance/buyer-sellers/${id}`, data),
};

// ── Visitors ─────────────────────────────────────────────────────────────────
export const visitorApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Visitor[]>('/finance/visitors', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<Visitor>(`/finance/visitors/${id}`),
  create: (data: Partial<Visitor>) => api.post<Visitor>('/finance/visitors', data),
};

// ── Checkbooks ───────────────────────────────────────────────────────────────
export const checkbookApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Checkbook[]>('/finance/checkbooks', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<Checkbook>(`/finance/checkbooks/${id}`),
  create: (data: Partial<Checkbook>) => api.post<Checkbook>('/finance/checkbooks', data),
};

// ── Checks ───────────────────────────────────────────────────────────────────
export const checkApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Check[]>('/finance/checks', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<Check>(`/finance/checks/${id}`),
  create: (data: Partial<Check>) => api.post<Check>('/finance/checks', data),
};

// ── Receipt / payment documents ──────────────────────────────────────────────
export const receiptPaymentDocApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ReceiptPaymentDoc[]>('/finance/receipt-payment-docs', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<ReceiptPaymentDoc>(`/finance/receipt-payment-docs/${id}`),
  create: (data: Partial<ReceiptPaymentDoc>) => api.post<ReceiptPaymentDoc>('/finance/receipt-payment-docs', data),
};
