export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  overStockCount: number;
  pendingGRN: number;
  acceptedTodayGRN: number;
  valueReceivedToday: number;
  pendingApprovalMR: number;
  inPickingMR: number;
  issuedTodayMR: number;
  countScheduled: number;
  countInProgress: number;
  countCompleted: number;
  varianceAlerts: number;
}

export interface StockStatusItem {
  itemId: string;
  sku: string;
  itemName: string;
  categoryName: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  uom: string;
  unitCost: number;
  totalValue: number;
  locations: { locationCode: string; quantity: number; lotNumber?: string }[];
}

export interface InventoryMovementReport {
  transactionId: string;
  transactionNumber: string;
  type: string;
  itemName: string;
  quantity: number;
  uom: string;
  fromLocation?: string;
  toLocation?: string;
  performedBy: string;
  timestamp: string;
  referenceNumber?: string;
}

export interface StockAgingItem {
  itemId: string;
  itemName: string;
  lotNumber: string;
  receivedDate: string;
  ageDays: number;
  quantity: number;
  value: number;
  locationCode: string;
  status: string;
}

export interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  preferredVendor?: string;
  leadTimeDays: number;
  estimatedCost: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface InventoryValuationItem {
  itemId: string;
  sku: string;
  itemName: string;
  categoryName: string;
  quantity: number;
  uom: string;
  unitCost: number;
  totalValue: number;
  valuationMethod: string;
  lastMovementDate: string;
}

export interface WarehouseUtilizationReport {
  warehouseId: string;
  warehouseName: string;
  totalLocations: number;
  occupiedLocations: number;
  reservedLocations: number;
  emptyLocations: number;
  utilizationPercent: number;
  weightUtilization: number;
  volumeUtilization: number;
}
