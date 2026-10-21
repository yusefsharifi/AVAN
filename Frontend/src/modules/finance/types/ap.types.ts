export type POStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'fully_received' | 'invoiced' | 'closed' | 'cancelled';
export type VendorInvoiceStatus = 'pending_match' | 'pending_approval' | 'approved' | 'scheduled' | 'paid' | 'disputed';
export type MatchStatus = 'unmatched' | 'partially_matched' | 'matched' | 'discrepancy';

export interface POLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  expectedDate: string;
  receivedQuantity?: number;
  receivedDate?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  companyId: string;
  requisitionId?: string;
  lineItems: POLineItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: POStatus;
  approvalFlow: ApprovalStep[];
  approvedLimit: number;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  grnIds: string[];
  invoiceIds: string[];
  matchStatus: MatchStatus;
  createdBy: string;
  createdAt: string;
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorInvoiceNumber: string;
  vendorId: string;
  vendorName: string;
  poId?: string;
  grnIds: string[];
  poAmount: number;
  grnAmount: number;
  invoiceAmount: number;
  variance: number;
  variancePercent: number;
  matchStatus: MatchStatus;
  discrepancyReason?: string;
  paymentTerms: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'installment';
  earlyPaymentDiscount?: { percent: number; deadline: string };
  status: VendorInvoiceStatus;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  method: 'bank_transfer' | 'check' | 'promissory_note' | 'cash' | 'lc';
  bankAccountId: string;
  checkNumber?: string;
  checkDate?: string;
  bankName?: string;
  referenceNumber: string;
  status: 'draft' | 'approved' | 'processed' | 'completed' | 'cancelled';
  appliedInvoices: string[];
  createdAt: string;
  processedAt?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId: string;
  vendorId: string;
  receivedDate: string;
  receivedBy: string;
  items: { poLineItemId: string; description: string; expectedQty: number; receivedQty: number; condition: 'good' | 'damaged' | 'partial' }[];
  status: 'draft' | 'approved' | 'received';
}

interface ApprovalStep {
  id: string;
  name: string;
  assigneeRole: string;
  assigneeName?: string;
  status: 'pending' | 'active' | 'approved' | 'rejected';
  slaMinutes: number;
  startedAt?: string;
  completedAt?: string;
  comment?: string;
}
