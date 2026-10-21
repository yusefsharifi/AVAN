export type GRNStatus = 'pending_inspection' | 'inspecting' | 'accepted' | 'partially_accepted' | 'rejected' | 'putaway_completed';
export type QCResult = 'pass' | 'conditional' | 'fail';
export type PutawayStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface GRNLineItem {
  id: string;
  itemId: string;
  itemName?: string;
  lotNumber?: string;
  expiryDate?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitOfMeasure: string;
  unitCost: number;
  totalCost: number;
  qcStatus: 'pending' | 'pass' | 'fail';
  qcComments?: string;
  suggestedLocationId?: string;
  actualLocationId?: string;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poId?: string;
  poNumber?: string;
  shipmentId?: string;
  shipmentNumber?: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  warehouseId: string;
  warehouseName: string;
  receivedDate: string;
  receivedBy: string;
  carrierName?: string;
  vehiclePlate?: string;
  waybillNumber?: string;
  lineItems: GRNLineItem[];
  status: GRNStatus;
  qcInspectionId?: string;
  qcResult: QCResult;
  rejectionReason?: string;
  putawayTasks: PutawayTask[];
  inventoryValueImpact: number;
  postedToGl: boolean;
  journalVoucherId?: string;
  createdAt: string;
}

export interface PutawayTask {
  id: string;
  grnId: string;
  itemId: string;
  lotId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  status: PutawayStatus;
  assignedTo?: string;
  completedAt?: string;
  barcodeScanned: boolean;
}

export interface QCInspection {
  id: string;
  grnId: string;
  inspectorName: string;
  inspectionDate: string;
  result: QCResult;
  items: QCInspectionItem[];
  notes: string;
  photos: string[];
}

export interface QCInspectionItem {
  lineItemId: string;
  itemName: string;
  quantity: number;
  result: 'pass' | 'fail' | 'conditional';
  comments?: string;
}
