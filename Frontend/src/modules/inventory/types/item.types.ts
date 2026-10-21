export type UnitOfMeasure = 'kg' | 'ton' | 'meter' | 'piece' | 'liter' | 'box' | 'pallet' | 'roll' | 'drum';
export type TrackingMethod = 'fifo' | 'fefo' | 'lifo' | 'weighted_average' | 'specific_identification';
export type ValuationMethod = 'fifo' | 'fefo' | 'lifo' | 'weighted_average' | 'standard';
export type ItemType = 'raw_material' | 'spare_part' | 'wip' | 'finished_good' | 'consumable' | 'tool_die' | 'fixed_asset' | 'service';
export type ABCClass = 'A' | 'B' | 'C';
export type ItemStatus = 'active' | 'pending' | 'inactive' | 'blocked' | 'obsolete' | 'quarantine';
export type LotStatus = 'available' | 'reserved' | 'quarantine' | 'expired' | 'consumed';

export interface AlternateUom {
  uom: UnitOfMeasure;
  conversionFactor: number;
  description: string;
}

export interface StorageRequirements {
  temperatureRange?: [number, number];
  humidityMax?: number;
  hazardous: boolean;
  hazardousClass?: string;
  msdsDocumentId?: string;
  segregationGroup?: string;
}

export interface BOMComponent {
  id: string;
  componentItemId: string;
  quantity: number;
  uom: UnitOfMeasure;
  scrapFactor: number;
  operationSequence: number;
  isCritical: boolean;
}

export interface RoutingStep {
  id: string;
  sequence: number;
  operationName: string;
  workCenterId?: string;
  standardTimeMin: number;
  setupTimeMin?: number;
}

export interface ItemVendor {
  vendorId: string;
  isPrimary: boolean;
  vendorPartNumber?: string;
  minOrderQty: number;
  contractPrice?: number;
  contractExpiryDate?: string;
  paymentTerms?: string;
  contractCurrency?: 'IRR' | 'USD' | 'EUR';
  qualityRating?: 'A' | 'B' | 'C' | 'F';
}

export interface ItemDocument {
  id: string;
  documentType: 'image' | 'catalog' | 'msds' | 'certificate' | 'engineering' | 'maintenance_manual' | 'video' | 'contract' | 'sample_invoice';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  rfidTag?: string;
  gtin?: string;
  hsCode?: string;
  nationalStandardCode?: string;
  brandName?: string;
  vendorPartNumber?: string;
  customerPartNumber?: string;
  aliasNames?: string[];
  itemType?: ItemType;
  subCategoryId?: string;
  glGroupId?: string;
  taxGroupId?: string;
  insuranceGroupId?: string;
  nameFa: string;
  nameEn: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  uom: UnitOfMeasure;
  alternateUoms: AlternateUom[];
  dimensions: { length: number; width: number; height: number; weight: number };
  grossWeightKg?: number;
  netWeightKg?: number;
  geometryType?: 'cubic' | 'cylindrical' | 'sheet' | 'powder' | 'liquid' | 'gas';
  color?: string;
  material?: string;
  technicalStandard?: string;
  stackable?: boolean;
  maxStackHeight?: number;
  hazardous?: boolean;
  hazmatCompatibility?: string;
  storageRequirements: StorageRequirements;
  trackingMethod: TrackingMethod;
  lotTracking: boolean;
  serialTracking: boolean;
  expiryTracking: boolean;
  shelfLifeDays?: number;
  reorderPoint: number;
  reorderQuantity: number;
  maxStockLevel: number;
  minStockLevel: number;
  safetyStock: number;
  abcClass: ABCClass;
  turnoverRatio: number;
  standardCost?: number;
  movingAverageCost: number;
  lastPurchasePrice: number;
  suggestedSalePrice?: number;
  minimumSalePrice?: number;
  targetMarginPercent?: number;
  defaultCurrency?: 'IRR' | 'USD' | 'EUR';
  vatRate?: number;
  valuationMethod: ValuationMethod;
  glAccountId: string;
  cogsAccountId: string;
  revenueAccountId?: string;
  priceVarianceAccountId?: string;
  bom?: BOMComponent[];
  routing?: RoutingStep[];
  makeOrBuy?: 'make' | 'buy' | 'both';
  leadTimeDays?: number;
  defaultVendorId?: string;
  defaultWarehouseId?: string;
  defaultZoneId?: string;
  defaultLocationId?: string;
  sellable?: boolean;
  purchasable?: boolean;
  manufacturable?: boolean;
  inventoryControl?: 'strict' | 'soft';
  vendors?: ItemVendor[];
  documents?: ItemDocument[];
  depreciable?: boolean;
  depreciationMethod?: 'straight_line' | 'declining_balance';
  usefulLifeYears?: number;
  salvageValue?: number;
  depreciationExpenseAccountId?: string;
  accumulatedDepreciationAccountId?: string;
  status: ItemStatus;
  companyId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string;
}

export interface InventoryLot {
  id: string;
  itemId: string;
  lotNumber: string;
  supplierId?: string;
  supplierName?: string;
  manufactureDate?: string;
  expiryDate?: string;
  receivedDate: string;
  initialQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  status: LotStatus;
  locationId: string;
  locationCode?: string;
  serialNumbers?: string[];
}

export interface ItemCategory {
  id: string;
  parentId: string | null;
  name: string;
  nameFa: string;
  code: string;
  level: number;
  children?: ItemCategory[];
}
