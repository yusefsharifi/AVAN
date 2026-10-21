// ═══════════════════════════════════════════════════════════════════════════════
// M17: Inventory & Warehouse — Enums & TypeScript Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export {
  WarehouseType,
  ItemType,
  ValuationMethod,
  StockTransactionType,
  TransactionStatus,
  RequisitionStatus,
  RequisitionPriority,
  GRNStatus,
  PRStatus,
  POStatus,
  CountStatus,
} from '@prisma/client';

// ─── DTO Response Interfaces ──────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    cursor?: string;
    hasMore: boolean;
  };
}

export interface WarehouseCapacityDto {
  warehouseId: string;
  warehouseName: string;
  totalLocations: number;
  occupiedLocations: number;
  availableLocations: number;
  occupancyRate: number;
  totalItems: number;
  totalValue: bigint;
}

export interface LowStockDto {
  itemId: string;
  itemCode: string;
  itemNameFa: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  leadTimeDays: number;
  lastVendorName?: string;
}

export interface ExpiringItemDto {
  itemId: string;
  itemCode: string;
  itemNameFa: string;
  batchNumber?: string | null;
  expiryDate: Date;
  quantity: number;
  warehouseId: string;
  warehouseName: string;
  daysUntilExpiry: number;
}

export interface StockLevelDto {
  itemId: string;
  itemCode: string;
  itemNameFa: string;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  byWarehouse: { warehouseId: string; warehouseName: string; qty: number; value: bigint }[];
  avgCost: bigint;
  totalValue: bigint;
  lastMovement?: Date;
}

export interface StockAvailabilityDto {
  available: boolean;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  deficit: number;
}

export interface InventoryValuationDto {
  totalItems: number;
  totalValue: bigint;
  byCategory: { categoryId: string; categoryName: string; count: number; value: bigint }[];
  byWarehouse: { warehouseId: string; warehouseName: string; count: number; value: bigint }[];
  lowStockCount: number;
  expiringSoonCount: number;
}

export interface RequisitionStatsDto {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  partiallyIssued: number;
  fullyIssued: number;
  cancelled: number;
  avgFulfillmentHours: number;
  byPriority: { priority: string; count: number }[];
}

export interface POStatsDto {
  total: number;
  draft: number;
  approved: number;
  sentToVendor: number;
  partiallyReceived: number;
  fullyReceived: number;
  totalPOValue: bigint;
  pendingDelivery: number;
}

export interface PhysicalCountVarianceDto {
  countId: string;
  lines: {
    itemId: string;
    itemName: string;
    itemCode: string;
    systemQty: number;
    countedQty: number;
    variance: number;
    varianceValue: bigint;
    variancePct: number;
  }[];
  totalVarianceValue: bigint;
  positiveVariance: bigint;
  negativeVariance: bigint;
}
