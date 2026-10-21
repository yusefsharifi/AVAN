import type { PaymentTerms } from './vendor.types';

export type POStatus = 'draft' | 'approved' | 'sent' | 'partially_received' | 'fully_received' | 'invoiced' | 'paid' | 'cancelled';

export interface POLine {
  id: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  uom: string;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  invoicedQuantity: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
  lineTotalWithVat: number;
  prLineId?: string;
  rfqLineId?: string;
  notes: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqId?: string;
  rfqNumber?: string;
  prId: string;
  prNumber: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  status: POStatus;
  orderDate: string;
  requiredDeliveryDate: string;
  actualDeliveryDate?: string;
  deliveryAddress: string;
  paymentTerms: PaymentTerms;
  lines: POLine[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  glJournalVoucherId?: string;
  notes: string;
  attachments: string[];
  createdAt: string;
  createdBy: string;
}

export interface POReceipt {
  id: string;
  poId: string;
  poNumber: string;
  receiptNumber: string;
  vendorId: string;
  vendorName: string;
  receivedAt: string;
  receivedBy: string;
  vehiclePlate: string;
  driverName: string;
  grnId?: string;
  lines: {
    poLineId: string;
    itemId: string;
    itemNameFa: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReason?: string;
    batchNumber?: string;
    expiryDate?: string;
  }[];
  qualityStatus: 'pending' | 'accepted' | 'partially_accepted' | 'rejected';
  notes: string;
  createdAt: string;
}
