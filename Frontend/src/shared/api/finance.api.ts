import { api } from './client';

export interface InvoiceDto {
  id: string;
  zoneId?: string;
  companyId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  items?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceKpiDto {
  totalRevenue?: number;
  totalReceivables?: number;
  monthlyCollection?: number;
  overdueAmount?: number;
  collectionRate?: number;
  monthlyTrend?: Array<{ month: string; revenue: number; collected: number }>;
}

export const financeApiTyped = {
  listInvoices: async (params?: Record<string, unknown>): Promise<InvoiceDto[]> => {
    const data = await api.get<unknown>('/finance/invoices', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as InvoiceDto[] : [];
  },

  getInvoice: async (id: string): Promise<InvoiceDto> => {
    return api.get<InvoiceDto>(`/finance/invoices/${id}`);
  },

  createInvoice: async (data: Partial<InvoiceDto>): Promise<InvoiceDto> => {
    return api.post<InvoiceDto>('/finance/invoices', data);
  },

  recordPayment: async (id: string, payment: { amount: number; method?: string; reference?: string }): Promise<InvoiceDto> => {
    return api.post<InvoiceDto>(`/finance/invoices/${id}/payment`, payment);
  },

  cancelInvoice: async (id: string): Promise<InvoiceDto> => {
    return api.post<InvoiceDto>(`/finance/invoices/${id}/cancel`, {});
  },

  issueInvoice: async (id: string): Promise<InvoiceDto> => {
    return api.post<InvoiceDto>(`/finance/invoices/${id}/issue`, {});
  },

  getOverdueInvoices: async (): Promise<InvoiceDto[]> => {
    const data = await api.get<unknown>('/finance/invoices/overdue');
    return Array.isArray(data) ? data as InvoiceDto[] : [];
  },

  getAgingReport: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/invoices/aging-report');
  },

  getKpi: async (): Promise<FinanceKpiDto> => {
    return api.get<FinanceKpiDto>('/finance/reports/kpi');
  },

  getIncomeStatement: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/reports/income-statement');
  },

  getBalanceSheet: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/reports/balance-sheet');
  },

  getRevenueBreakdown: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/reports/revenue-breakdown');
  },

  listLeases: async (params?: Record<string, unknown>): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/leases', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data : [];
  },

  createLease: async (data: Record<string, unknown>): Promise<any> => {
    return api.post<any>('/finance/leases', data);
  },

  leaseStats: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/leases/stats');
  },

  suspendLease: async (id: string): Promise<any> => {
    return api.post<any>(`/finance/leases/${id}/suspend`, {});
  },

  terminateLease: async (id: string): Promise<any> => {
    return api.post<any>(`/finance/leases/${id}/terminate`, {});
  },

  renewLease: async (id: string): Promise<any> => {
    return api.post<any>(`/finance/leases/${id}/renew`, {});
  },

  listVouchers: async (params?: Record<string, unknown>): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/vouchers', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data : [];
  },

  getTrialBalance: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/finance/vouchers/trial-balance');
  },

  listAccounts: async (): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/accounts');
    return Array.isArray(data) ? data : [];
  },

  listBankAccounts: async (): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/bank-accounts');
    return Array.isArray(data) ? data : [];
  },

  listBudgets: async (): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/budgets');
    return Array.isArray(data) ? data : [];
  },

  listPeriods: async (): Promise<any[]> => {
    const data = await api.get<unknown>('/finance/periods');
    return Array.isArray(data) ? data : [];
  },
};
