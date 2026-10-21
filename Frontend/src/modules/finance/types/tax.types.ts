export type TaxReturnType = 'vat_monthly' | 'vat_quarterly' | 'corporate_annual' | 'wh_quarterly';
export type TaxReturnStatus = 'draft' | 'pending_filing' | 'filed' | 'accepted' | 'rejected' | 'amended';

export interface VATReturn {
  id: string;
  periodId: string;
  periodName: string;
  companyId: string;
  totalTaxableSales: number;
  totalTaxablePurchases: number;
  outputVAT: number;
  inputVAT: number;
  netPayable: number;
  status: TaxReturnStatus;
  filedDate?: string;
  acceptanceDate?: string;
  createdAt: string;
}

export interface WithholdingTaxEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceId: string;
  invoiceNumber: string;
  grossAmount: number;
  whtRate: number;
  whtAmount: number;
  netPayment: number;
  periodId: string;
  status: 'pending' | 'deducted' | 'remitted';
  remittanceDate?: string;
  createdAt: string;
}

export interface TaxCalendarEntry {
  id: string;
  taxType: TaxReturnType;
  periodId: string;
  periodName: string;
  dueDate: string;
  status: 'upcoming' | 'due_today' | 'overdue' | 'filed';
  companyId: string;
}
