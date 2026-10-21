export type MRStatus = 'draft' | 'pending_approval' | 'approved' | 'picking' | 'picked' | 'issued' | 'partially_issued' | 'rejected';
export type MRPriority = 'normal' | 'urgent' | 'critical';
export type MRPurpose = 'production' | 'maintenance' | 'sales_sample' | 'internal_use' | 'contractor_job';
export type MRItemStatus = 'pending' | 'allocated' | 'picked' | 'issued' | 'short' | 'rejected';

export interface MRLineItem {
  id: string;
  itemId: string;
  itemName?: string;
  requestedQuantity: number;
  issuedQuantity: number;
  uom: string;
  allocatedLotIds: string[];
  pickedLocationIds: string[];
  status: MRItemStatus;
}

export interface MaterialRequisition {
  id: string;
  mrNumber: string;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  costCenterId: string;
  projectId?: string;
  companyId: string;
  purpose: MRPurpose;
  priority: MRPriority;
  lineItems: MRLineItem[];
  status: MRStatus;
  requiredDate: string;
  issuedDate?: string;
  productionOrderId?: string;
  maintenanceTicketId?: string;
  contractorId?: string;
  totalEstimatedCost: number;
  createdAt: string;
}

export type TOStatus = 'draft' | 'pending_approval' | 'approved' | 'picking' | 'in_transit' | 'received' | 'completed';

export interface TOLineItem {
  id: string;
  itemId: string;
  itemName?: string;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  uom: string;
  lotId?: string;
}

export interface TransferOrder {
  id: string;
  toNumber: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  companyId: string;
  lineItems: TOLineItem[];
  status: TOStatus;
  carrierName?: string;
  vehiclePlate?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  inTransitQuantity: number;
  createdAt: string;
}
