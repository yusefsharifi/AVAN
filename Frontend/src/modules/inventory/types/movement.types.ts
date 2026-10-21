export type MovementType = 'receipt' | 'issue' | 'transfer' | 'return_vendor' | 'return_customer' | 'adjustment' | 'scrap' | 'cycle_count' | 'production_consumption' | 'production_output';

export interface GLImpact {
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  journalVoucherId?: string;
}

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  type: MovementType;
  documentId: string;
  documentType: string;
  itemId: string;
  itemName?: string;
  lotId?: string;
  lotNumber?: string;
  serialNumber?: string;
  fromLocationId?: string;
  fromLocationCode?: string;
  toLocationId?: string;
  toLocationCode?: string;
  quantity: number;
  uom: string;
  unitCost: number;
  totalCost: number;
  glImpact: GLImpact;
  performedBy: string;
  approvedBy?: string;
  timestamp: string;
  warehouseId?: string;
  warehouseName?: string;
  referenceNumber?: string;
}
