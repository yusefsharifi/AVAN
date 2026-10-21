export type PRStatus = 'draft' | 'pending_approval' | 'approved' | 'rfq_sent' | 'po_created' | 'cancelled';
export type PRSource = 'manual' | 'mrp_auto' | 'reorder_auto' | 'production_auto';

export interface PRLine {
  id: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  uom: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  estimatedUnitPrice: number;
  totalEstimated: number;
  requiredDate: string;
  warehouseId?: string;
  notes: string;
  mrLineRef?: string;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  source: PRSource;
  sourceRef?: string;
  requestedBy: string;
  requestedByDept: string;
  approvedBy?: string;
  approvedAt?: string;
  requiredDate: string;
  status: PRStatus;
  priority: 'normal' | 'urgent' | 'critical';
  lines: PRLine[];
  totalEstimated: number;
  justification: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}
