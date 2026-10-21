export type ContractStatus = 'draft' | 'active' | 'expiring_soon' | 'expired' | 'terminated';
export type ContractType = 'supply' | 'service' | 'framework' | 'blanket_order';

export interface ContractMilestone {
  id: string;
  title: string;
  dueDate: string;
  completedDate?: string;
  value: number;
  status: 'pending' | 'completed' | 'overdue';
}

export interface VendorContract {
  id: string;
  contractNumber: string;
  vendorId: string;
  vendorName: string;
  type: ContractType;
  title: string;
  description: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  totalValue: number;
  consumedValue: number;
  remainingValue: number;
  currency: 'IRR' | 'USD' | 'EUR';
  paymentSchedule: string;
  milestones: ContractMilestone[];
  linkedPOIds: string[];
  autoRenew: boolean;
  renewalNoticeDays: number;
  signatoryCompany: string;
  signatoryVendor: string;
  attachments: string[];
  approvedBy?: string;
  approvedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  notes: string;
  createdAt: string;
}
