import type { PaymentTerms } from './vendor.types';

export type RFQStatus = 'draft' | 'sent' | 'responses_received' | 'evaluated' | 'awarded' | 'cancelled';
export type QuotationStatus = 'pending' | 'received' | 'rejected' | 'awarded';

export interface QuotationLine {
  prLineId: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  requestedQuantity: number;
  offeredQuantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  notes: string;
}

export interface VendorQuotation {
  id: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  quotationNumber: string;
  receivedAt?: string;
  validUntil: string;
  paymentTerms: PaymentTerms;
  deliveryTerms: string;
  lines: QuotationLine[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  vatAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  evaluationScore?: number;
  notes: string;
  attachments: string[];
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  prId: string;
  prNumber: string;
  title: string;
  description: string;
  status: RFQStatus;
  sentToVendors: string[];
  responseDeadline: string;
  quotations: VendorQuotation[];
  evaluationCriteria: {
    priceWeight: number;
    deliveryWeight: number;
    vendorScoreWeight: number;
  };
  awardedVendorId?: string;
  awardedQuotationId?: string;
  awardedAt?: string;
  awardedBy?: string;
  cancelReason?: string;
  createdAt: string;
  createdBy: string;
}
