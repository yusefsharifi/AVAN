export type DocumentStatus = 'draft' | 'prepared' | 'approved' | 'authorized' | 'posted' | 'cancelled';

export interface DocumentLine {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  warehouseId?: string;
  projectId?: string;
  costCenterId?: string;
  notes: string;
}

export interface PurchaseDocument {
  id: string;
  documentNumber: string;
  date: string;
  notes: string;
  itemNumber: string;
  vendorName: string;
  vendorCode: string;
  lineCount: number;
  preparedBy: string;
  approvedBy: string;
  authorizedBy: string;
  status: DocumentStatus;
  statusChangeDate: string;
  payableAmount: number;
  accountingDocRef?: string;
  escrowRequired: boolean;
  visitorName: string;
  type: 'purchase_invoice' | 'purchase_return' | 'pre_invoice_purchase';
  lines: DocumentLine[];
  projectId?: string;
  costCenterId?: string;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesDocument {
  id: string;
  documentNumber: string;
  date: string;
  notes: string;
  itemNumber: string;
  buyerName: string;
  buyerCode: string;
  lineCount: number;
  preparedBy: string;
  approvedBy: string;
  authorizedBy: string;
  status: DocumentStatus;
  statusChangeDate: string;
  receivableAmount: number;
  accountingDocRef?: string;
  escrowRequired: boolean;
  visitorName: string;
  type: 'sales_invoice' | 'sales_return' | 'pre_invoice_sales';
  lines: DocumentLine[];
  projectId?: string;
  costCenterId?: string;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreInvoice extends PurchaseDocument {
  validUntil: string;
  convertedToInvoiceId?: string;
}

export interface BuyerSeller {
  id: string;
  code: string;
  name: string;
  title: string;
  type: 'buyer' | 'seller' | 'both';
  paymentMethod: 'cash' | 'check' | 'credit' | 'online' | 'lc' | 'bank_transfer';
  groupName: string;
  groupId: string;
  notes: string;
  visitorId?: string;
  subAccountId: string;
  transferredFromAccounting: boolean;
  taxId: string;
  address: string;
  phone: string;
  creditLimit: number;
  currentBalance: number;
  bankAccounts: { bankName: string; accountNumber: string; iban: string }[];
  status: 'active' | 'inactive' | 'blacklisted';
}

export interface BuyerSellerGroup {
  id: string;
  code: string;
  name: string;
  type: 'buyer' | 'seller' | 'both';
  notes: string;
}

export interface Visitor {
  id: string;
  code: string;
  name: string;
  phone: string;
  region: string;
  commissionRate: number;
  status: 'active' | 'inactive';
  notes: string;
}
