export type ProformaDirection = 'sales' | 'purchase';

export type ProformaStatus =
  | 'draft'
  | 'pending_internal_approval'
  | 'internally_approved'
  | 'sent_to_party'
  | 'party_accepted'
  | 'party_rejected'
  | 'expired'
  | 'converted'
  | 'cancelled';

export interface ProformaVersion {
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  changeNote: string;
  snapshot: Partial<Proforma>;
}

export interface Proforma {
  id: string;
  proformaNumber: string;
  direction: ProformaDirection;
  status: ProformaStatus;
  partyId: string;
  partyName: string;
  partyCode: string;
  contactName?: string;
  contactPhone?: string;
  issueDate: string;
  validUntil: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  paymentTerms: string;
  incoterm?: string;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  lines: DocumentLine[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  grandTotalBaseCurrency: number;
  notes?: string;
  internalNotes?: string;
  attachments: ProformaAttachment[];
  approvalChain: ProformaApprovalStep[];
  currentApproverIndex: number;
  versions: ProformaVersion[];
  currentVersion: number;
  convertedToOrderId?: string;
  convertedToInvoiceId?: string;
  rfqId?: string;
  bidId?: string;
  correspondenceLetterId?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProformaAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProformaApprovalStep {
  id: string;
  order: number;
  roleFa: string;
  assigneeName?: string;
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comment?: string;
  threshold?: number;
}

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'partially_received'
  | 'fully_received'
  | 'invoiced'
  | 'closed'
  | 'cancelled';

export interface CommercialOrder {
  id: string;
  orderNumber: string;
  direction: ProformaDirection;
  proformaId?: string;
  rfqId?: string;
  bidId?: string;
  partyId: string;
  partyName: string;
  status: OrderStatus;
  lines: DocumentLine[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  paymentTerms: string;
  deliveryDate: string;
  deliveryLocation: string;
  milestones: OrderMilestone[];
  shipmentId?: string;
  financeInvoiceId?: string;
  correspondenceLetterId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderMilestone {
  id: string;
  label: string;
  type: 'payment' | 'delivery' | 'inspection' | 'sign_off';
  dueDate: string;
  amount?: number;
  percentOfTotal?: number;
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: string;
  notes?: string;
}

export type ContractStatus =
  | 'draft'
  | 'under_review'
  | 'active'
  | 'suspended'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'renewed';

export interface CommercialContract {
  id: string;
  contractNumber: string;
  title: string;
  direction: ProformaDirection;
  partyId: string;
  partyName: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  value: number;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  paymentSchedule: ContractPaymentSchedule[];
  deliverables: ContractDeliverable[];
  status: ContractStatus;
  signatories: ContractSignatory[];
  addenda: ContractAddendum[];
  linkedOrderIds: string[];
  correspondenceLetterId?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractPaymentSchedule {
  id: string;
  dueDate: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface ContractDeliverable {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
}

export interface ContractSignatory {
  name: string;
  role: string;
  signedAt?: string;
  signatureRef?: string;
}

export interface ContractAddendum {
  id: string;
  number: number;
  title: string;
  effectiveDate: string;
  changes: string;
  signedAt?: string;
}

export type CollectionActionType =
  | 'reminder_call'
  | 'reminder_sms'
  | 'reminder_letter'
  | 'demand_letter'
  | 'installment_agreement'
  | 'legal_notice'
  | 'collection_agency'
  | 'write_off';

export interface CollectionCase {
  id: string;
  invoiceId: string;
  partyId: string;
  partyName: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  daysOverdue: number;
  agingBucket: string;
  collectionStatus: string;
  assignedTo?: string;
  actions: CollectionAction[];
  installmentPlan?: InstallmentPlan;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionAction {
  id: string;
  type: CollectionActionType;
  performedAt: string;
  performedBy: string;
  notes: string;
  outcome: 'no_response' | 'promised_payment' | 'partial_payment' | 'dispute' | 'escalated';
  correspondenceLetterId?: string;
}

export interface InstallmentPlan {
  id: string;
  agreedAt: string;
  installments: {
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue' | 'bounced';
    paidAt?: string;
    checkNumber?: string;
  }[];
  totalAmount: number;
  notes: string;
}

export type { DocumentLine } from '@/modules/finance/types/purchaseSales.types';
export type { BuyerSeller } from '@/modules/finance/types/purchaseSales.types';
export type { BuyerSellerGroup } from '@/modules/finance/types/purchaseSales.types';
export type { Visitor } from '@/modules/finance/types/purchaseSales.types';
export type { DocumentStatus } from '@/modules/finance/types/purchaseSales.types';
export type { InvoiceStatus, AgingBucket, CollectionStatus } from '@/modules/finance/types/ar.types';
export type { AgingReportItem } from '@/modules/finance/types/ar.types';