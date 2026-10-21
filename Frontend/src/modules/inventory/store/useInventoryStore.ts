import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Warehouse,
  WarehouseZone,
  InventoryItem,
  GoodsReceiptNote,
  MaterialRequisition,
  CycleCountSession,
  DispatchOrder,
  InventoryTransaction,
  InventoryLot,
  ReorderSuggestion,
  WarehouseUtilizationReport,
  StorageLocation,
  InventoryReservation,
} from '../types';
import { generateGRNNumber, generateMRNumber, generateDONumber, generateTXNNumber, allocateFifo, allocateFefo } from '../utils';
import { zustandLocalStorage } from '@/shared/lib/persist';
import { useFinanceStore } from '@/modules/finance/store';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { api } from '@/shared/api/client';
import { seedFromMock, USE_MOCKS } from '@/shared/lib/mockMode';
import { loadCollection, persistMutation, reconcileEntity } from '@/shared/lib/serverSync';
// COMP-004: API integration for real backend data
import { warehouseApi, itemApi, grnApi, requisitionApi, stockApi, countApi } from '../api';

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Backend payload mapping (BUG-PERSIST-001) ───────────────────────────────
// Inventory controllers validate bodies with `whitelist: true`, so payloads
// are narrowed to the exact DTO fields. Missing scope ids / non-UUID mock ids
// fail server validation and surface as a Persian toast — never a fake local
// save. Mock arrays below are only seeded in demo mode (seedFromMock).

const currentScope = () => {
  const user = useAuthStore.getState().user;
  return { zoneId: user?.zoneId, companyId: user?.companyId };
};

/** Forward a value only when it is a real UUID — mock ids would be rejected. */
const asUuid = (value: string | undefined): string | undefined =>
  value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : undefined;

/** Frontend warehouse type values → Prisma WarehouseType. */
const WAREHOUSE_TYPE_DTO: Record<string, string> = {
  raw_material: 'RAW_MATERIAL', finished_goods: 'FINISHED_GOODS', spare_parts: 'SPARE_PARTS',
  hazmat: 'HAZMAT', cold_storage: 'COLD_STORAGE',
};

/** Frontend item type values → Prisma ItemType. */
const ITEM_TYPE_DTO: Record<string, string> = {
  raw_material: 'RAW_MATERIAL', wip: 'SEMI_FINISHED', finished_good: 'FINISHED_GOODS',
  spare_part: 'SPARE_PART', consumable: 'CONSUMABLE', tool_die: 'TOOL', service: 'SERVICE',
};

/** Frontend valuation methods → Prisma ValuationMethod. */
const VALUATION_DTO: Record<string, string> = {
  fifo: 'FIFO', weighted_average: 'WEIGHTED_AVG', standard: 'STANDARD_COST',
};

/** Frontend MR priorities → Prisma RequisitionPriority (no CRITICAL member). */
const PRIORITY_DTO: Record<string, string> = { normal: 'NORMAL', urgent: 'URGENT', critical: 'URGENT' };

const toWarehouseDto = (partial: Partial<Warehouse>): Record<string, unknown> => {
  const scope = currentScope();
  return {
    zoneId: scope.zoneId,
    companyId: asUuid(partial.companyId) ?? scope.companyId,
    code: partial.code,
    nameFa: partial.nameFa || partial.name || 'انبار جدید',
    nameEn: partial.name,
    type: partial.type ? WAREHOUSE_TYPE_DTO[partial.type] : undefined,
    address: partial.address,
  };
};

const toItemDto = (partial: Partial<InventoryItem>): Record<string, unknown> => {
  const scope = currentScope();
  return {
    zoneId: scope.zoneId,
    companyId: asUuid(partial.companyId) ?? scope.companyId,
    nameFa: partial.nameFa,
    nameEn: partial.nameEn,
    categoryId: asUuid(partial.categoryId),
    type: partial.itemType ? ITEM_TYPE_DTO[partial.itemType] : undefined,
    unit: partial.uom,
    barcode: partial.barcode,
    minStock: partial.minStockLevel,
    maxStock: partial.maxStockLevel,
    reorderPoint: partial.reorderPoint,
    reorderQty: partial.reorderQuantity,
    trackByBatch: partial.lotTracking,
    trackBySerial: partial.serialTracking,
    hasExpiry: partial.expiryTracking,
    valuationMethod: partial.valuationMethod ? VALUATION_DTO[partial.valuationMethod] : undefined,
    notes: partial.description,
  };
};

const toGrnDto = (partial: Partial<GoodsReceiptNote>): Record<string, unknown> => {
  const scope = currentScope();
  return {
    zoneId: scope.zoneId,
    companyId: asUuid(partial.companyId) ?? scope.companyId,
    warehouseId: partial.warehouseId,
    vendorId: asUuid(partial.supplierId),
    vendorName: partial.supplierName || '',
    receivedDate: partial.receivedDate || new Date().toISOString().slice(0, 10),
    lines: (partial.lineItems ?? []).map((line) => ({
      itemId: line.itemId,
      receivedQty: line.receivedQuantity,
      unitCost: line.unitCost,
      batchNumber: line.lotNumber,
      expiryDate: line.expiryDate,
    })),
  };
};

const toRequisitionDto = (partial: Partial<MaterialRequisition>): Record<string, unknown> => {
  const scope = currentScope();
  return {
    zoneId: scope.zoneId,
    companyId: asUuid(partial.companyId) ?? scope.companyId,
    departmentId: asUuid(partial.departmentId),
    purpose: partial.purpose,
    requiredDate: partial.requiredDate || new Date().toISOString().slice(0, 10),
    priority: PRIORITY_DTO[partial.priority ?? 'normal'] ?? 'NORMAL',
    lines: (partial.lineItems ?? []).map((line) => ({
      itemId: line.itemId,
      requestedQty: line.requestedQuantity,
    })),
  };
};

const MOCK_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-001', code: 'RM-01', name: 'Raw Material Warehouse', nameFa: 'انبار مواد اولیه',
    type: 'raw_material', status: 'active', address: 'مجتمع صنعتی البرز - سالن ۳',
    companyId: 'co-001',
    capacity: { maxWeight: 500000, maxVolume: 2500, maxPallets: 400 },
    currentUtilization: { weightPercent: 64, volumePercent: 56, palletPercent: 65 },
    zones: [
      { id: 'z-001', warehouseId: 'wh-001', code: 'RM-A', type: 'bulk', temperatureControlled: true, temperatureRange: [15, 25], humidityControlled: false, locationCount: 96 },
      { id: 'z-002', warehouseId: 'wh-001', code: 'RM-B', type: 'bulk', temperatureControlled: false, humidityControlled: false, locationCount: 108 },
      { id: 'z-003', warehouseId: 'wh-001', code: 'RM-R', type: 'receiving', temperatureControlled: false, humidityControlled: false, locationCount: 8 },
    ],
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'wh-002', code: 'FG-01', name: 'Finished Goods Warehouse', nameFa: 'انبار محصولات نهایی',
    type: 'finished_goods', status: 'active', address: 'مجتمع صنعتی البرز - سالن ۷',
    companyId: 'co-001',
    capacity: { maxWeight: 300000, maxVolume: 1800, maxPallets: 300 },
    currentUtilization: { weightPercent: 62, volumePercent: 54, palletPercent: 63 },
    zones: [
      { id: 'z-004', warehouseId: 'wh-002', code: 'FG-A', type: 'picking', temperatureControlled: false, humidityControlled: false, locationCount: 54 },
      { id: 'z-005', warehouseId: 'wh-002', code: 'FG-S', type: 'cross_dock', temperatureControlled: false, humidityControlled: false, locationCount: 6 },
    ],
    createdAt: '2024-02-10T08:00:00Z',
  },
];

// ── Mock Items ──────────────────────────────────────────────────────────────

const MOCK_ITEMS: InventoryItem[] = [
  {
    id: 'item-001', sku: 'RM-PG-001', barcode: 'RM-PG-001-00000001',
    nameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', nameEn: 'HDPE Plastic Granules',
    description: 'گرانول پلی‌اتیلن سنگین برای تزریق و دمش', categoryId: 'cat-01', categoryName: 'مواد شیمیایی',
    uom: 'kg', alternateUoms: [{ uom: 'ton', conversionFactor: 1000, description: 'تن' }],
    dimensions: { length: 1.2, width: 1.0, height: 0.8, weight: 1000 },
    storageRequirements: { hazardous: false }, trackingMethod: 'fifo', lotTracking: true, serialTracking: false, expiryTracking: false,
    reorderPoint: 20000, reorderQuantity: 30000, maxStockLevel: 120000, minStockLevel: 10000, safetyStock: 8000,
    abcClass: 'A', turnoverRatio: 12.5, movingAverageCost: 45000, lastPurchasePrice: 44500,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1101', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 85000, reservedQuantity: 12000, availableQuantity: 73000,
    createdAt: '2024-01-20T08:00:00Z',
  },
  {
    id: 'item-002', sku: 'RM-PG-002', barcode: 'RM-PG-002-00000002',
    nameFa: 'گرانول پلی‌پروپیلن', nameEn: 'PP Plastic Granules',
    description: 'گرانول پلی‌پروپیلن هموپلیمر', categoryId: 'cat-01', categoryName: 'مواد شیمیایی',
    uom: 'kg', alternateUoms: [{ uom: 'ton', conversionFactor: 1000, description: 'تن' }],
    dimensions: { length: 1.1, width: 1.0, height: 0.8, weight: 1000 },
    storageRequirements: { hazardous: false }, trackingMethod: 'fifo', lotTracking: true, serialTracking: false, expiryTracking: false,
    reorderPoint: 15000, reorderQuantity: 25000, maxStockLevel: 80000, minStockLevel: 8000, safetyStock: 5000,
    abcClass: 'A', turnoverRatio: 10.2, movingAverageCost: 52000, lastPurchasePrice: 51800,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1101', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 42000, reservedQuantity: 8000, availableQuantity: 34000,
    createdAt: '2024-01-20T08:00:00Z',
  },
  {
    id: 'item-003', sku: 'RM-SS-001', barcode: 'RM-SS-001-00000003',
    nameFa: 'ورق فولادی سرد نورد', nameEn: 'Cold Rolled Steel Sheet',
    description: 'ورق فولادی ST37 ابعاد ۱۲۵۰×۲۵۰۰', categoryId: 'cat-02', categoryName: 'فلزات',
    uom: 'piece', alternateUoms: [{ uom: 'kg', conversionFactor: 18.5, description: 'هر ورق ۱۸.۵ کیلوگرم' }],
    dimensions: { length: 2.5, width: 1.25, height: 0.002, weight: 18.5 },
    storageRequirements: { hazardous: false }, trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
    reorderPoint: 80, reorderQuantity: 100, maxStockLevel: 300, minStockLevel: 30, safetyStock: 20,
    abcClass: 'A', turnoverRatio: 8.1, movingAverageCost: 1850000, lastPurchasePrice: 1820000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1102', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 125, reservedQuantity: 30, availableQuantity: 95,
    createdAt: '2024-02-01T08:00:00Z',
  },
  {
    id: 'item-004', sku: 'RM-CH-001', barcode: 'RM-CH-001-00000004',
    nameFa: 'رزین اپوکسی صنعتی', nameEn: 'Industrial Epoxy Resin',
    description: 'رزین اپوکسی دو جزئی برای پوشش‌های صنعتی', categoryId: 'cat-01', categoryName: 'مواد شیمیایی',
    uom: 'liter', alternateUoms: [],
    dimensions: { length: 0.3, width: 0.2, height: 0.4, weight: 1.1 },
    storageRequirements: { temperatureRange: [15, 30], hazardous: false }, trackingMethod: 'fifo', lotTracking: true, serialTracking: false, expiryTracking: true, shelfLifeDays: 365,
    reorderPoint: 300, reorderQuantity: 500, maxStockLevel: 1000, minStockLevel: 150, safetyStock: 100,
    abcClass: 'B', turnoverRatio: 6.8, movingAverageCost: 320000, lastPurchasePrice: 315000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1101', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 450, reservedQuantity: 50, availableQuantity: 400,
    createdAt: '2024-03-10T08:00:00Z',
  },
  {
    id: 'item-005', sku: 'RM-CH-002', barcode: 'RM-CH-002-00000005',
    nameFa: 'سخت‌کننده H-37', nameEn: 'Hardener Agent H-37',
    description: 'سخت‌کننده آمینی برای رزین اپوکسی', categoryId: 'cat-01', categoryName: 'مواد شیمیایی',
    uom: 'liter', alternateUoms: [],
    dimensions: { length: 0.25, width: 0.15, height: 0.35, weight: 0.95 },
    storageRequirements: { temperatureRange: [15, 30], hazardous: false }, trackingMethod: 'fifo', lotTracking: true, serialTracking: false, expiryTracking: true, shelfLifeDays: 540,
    reorderPoint: 150, reorderQuantity: 300, maxStockLevel: 500, minStockLevel: 80, safetyStock: 60,
    abcClass: 'C', turnoverRatio: 5.2, movingAverageCost: 180000, lastPurchasePrice: 178000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1101', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 280, reservedQuantity: 0, availableQuantity: 280,
    createdAt: '2024-03-10T08:00:00Z',
  },
  {
    id: 'item-006', sku: 'SP-BRG-001', barcode: 'SP-BRG-001-00000006',
    nameFa: 'بلبرینگ ۶۲۰۵', nameEn: 'Ball Bearing 6205',
    description: 'بلبرینگ ۶۲۰۵ ۲۵×۵۲×۱۵ SKF', categoryId: 'cat-03', categoryName: 'قطعات یدکی',
    uom: 'piece', alternateUoms: [],
    dimensions: { length: 0.052, width: 0.052, height: 0.015, weight: 0.12 },
    storageRequirements: { hazardous: false }, trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
    reorderPoint: 80, reorderQuantity: 200, maxStockLevel: 300, minStockLevel: 40, safetyStock: 30,
    abcClass: 'B', turnoverRatio: 7.4, movingAverageCost: 850000, lastPurchasePrice: 840000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1103', cogsAccountId: 'gl-5102',
    status: 'active', companyId: 'co-001',
    totalQuantity: 150, reservedQuantity: 20, availableQuantity: 130,
    createdAt: '2024-04-01T08:00:00Z',
  },
  {
    id: 'item-007', sku: 'SP-FLT-001', barcode: 'SP-FLT-001-00000007',
    nameFa: 'فیلتر عنصر هیدرولیک', nameEn: 'Hydraulic Filter Element',
    description: 'فیلتر عنصر هیدرولیک ۱۰ میکرون', categoryId: 'cat-03', categoryName: 'قطعات یدکی',
    uom: 'piece', alternateUoms: [],
    dimensions: { length: 0.15, width: 0.08, height: 0.08, weight: 0.35 },
    storageRequirements: { hazardous: false }, trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
    reorderPoint: 40, reorderQuantity: 80, maxStockLevel: 150, minStockLevel: 20, safetyStock: 15,
    abcClass: 'C', turnoverRatio: 4.8, movingAverageCost: 420000, lastPurchasePrice: 415000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1103', cogsAccountId: 'gl-5102',
    status: 'active', companyId: 'co-001',
    totalQuantity: 15, reservedQuantity: 0, availableQuantity: 15,
    createdAt: '2024-04-01T08:00:00Z',
  },
  {
    id: 'item-008', sku: 'PK-CRT-001', barcode: 'PK-CRT-001-00000008',
    nameFa: 'جعبه مقوایی موج‌دار', nameEn: 'Corrugated Carton Box',
    description: 'جعبه مقوایی ۴۰×۳۰×۳۰ سانتی‌متر', categoryId: 'cat-04', categoryName: 'بسته‌بندی',
    uom: 'piece', alternateUoms: [{ uom: 'box', conversionFactor: 1, description: 'جعبه' }],
    dimensions: { length: 0.4, width: 0.3, height: 0.3, weight: 0.8 },
    storageRequirements: { hazardous: false }, trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
    reorderPoint: 800, reorderQuantity: 2000, maxStockLevel: 5000, minStockLevel: 500, safetyStock: 300,
    abcClass: 'C', turnoverRatio: 15.3, movingAverageCost: 45000, lastPurchasePrice: 44000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1104', cogsAccountId: 'gl-5103',
    status: 'active', companyId: 'co-001',
    totalQuantity: 3200, reservedQuantity: 500, availableQuantity: 2700,
    createdAt: '2024-05-15T08:00:00Z',
  },
  {
    id: 'item-009', sku: 'RM-AL-001', barcode: 'RM-AL-001-00000009',
    nameFa: 'پروفیل آلومینیومی ۶۰۶۳', nameEn: 'Aluminum Profile 6063',
    description: 'پروفیل آلومینیومی T5 ابعاد مختلف', categoryId: 'cat-02', categoryName: 'فلزات',
    uom: 'meter', alternateUoms: [{ uom: 'piece', conversionFactor: 6, description: 'هر شاخه ۶ متر' }],
    dimensions: { length: 6.0, width: 0.05, height: 0.05, weight: 2.7 },
    storageRequirements: { hazardous: false }, trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
    reorderPoint: 150, reorderQuantity: 300, maxStockLevel: 600, minStockLevel: 80, safetyStock: 60,
    abcClass: 'B', turnoverRatio: 6.1, movingAverageCost: 290000, lastPurchasePrice: 285000,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1102', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 220, reservedQuantity: 40, availableQuantity: 180,
    createdAt: '2024-06-01T08:00:00Z',
  },
  {
    id: 'item-010', sku: 'RM-CL-001', barcode: 'RM-CL-001-00000010',
    nameFa: 'عایق کابل پی‌وی‌سی', nameEn: 'PVC Cable Insulation',
    description: 'عایق PVC مقاوم در برابر آتش', categoryId: 'cat-01', categoryName: 'مواد شیمیایی',
    uom: 'kg', alternateUoms: [{ uom: 'ton', conversionFactor: 1000, description: 'تن' }],
    dimensions: { length: 1.0, width: 1.0, height: 1.0, weight: 1000 },
    storageRequirements: { hazardous: false }, trackingMethod: 'fifo', lotTracking: true, serialTracking: false, expiryTracking: false,
    reorderPoint: 8000, reorderQuantity: 10000, maxStockLevel: 30000, minStockLevel: 4000, safetyStock: 3000,
    abcClass: 'C', turnoverRatio: 3.8, movingAverageCost: 38000, lastPurchasePrice: 37500,
    valuationMethod: 'weighted_average', glAccountId: 'gl-1101', cogsAccountId: 'gl-5101',
    status: 'active', companyId: 'co-001',
    totalQuantity: 12000, reservedQuantity: 3000, availableQuantity: 9000,
    createdAt: '2024-07-01T08:00:00Z',
  },
];

// ── Mock GRNs ───────────────────────────────────────────────────────────────

const MOCK_GRNS: GoodsReceiptNote[] = [
  {
    id: 'grn-001', grnNumber: 'GRN-1403-00001',
    supplierId: 'sup-001', supplierName: 'پتروشیمی مارون',
    companyId: 'co-001', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    receivedDate: '2025-07-10', receivedBy: 'رضا کریمی',
    status: 'accepted', qcResult: 'pass',
    lineItems: [
      { id: 'grni-001', itemId: 'item-001', itemName: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', orderedQuantity: 25000, receivedQuantity: 25000, acceptedQuantity: 25000, rejectedQuantity: 0, unitOfMeasure: 'kg', unitCost: 44500, totalCost: 1112500000, lotNumber: 'LOT-2025-0710-A', qcStatus: 'pass', qcComments: 'کیفیت مطابق استاندارد' },
    ],
    inventoryValueImpact: 1112500000, postedToGl: true,
    putawayTasks: [],
    createdAt: '2025-07-10T10:00:00Z',
  },
  {
    id: 'grn-002', grnNumber: 'GRN-1403-00002',
    supplierId: 'sup-002', supplierName: 'فولاد مبارکه',
    companyId: 'co-001', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    receivedDate: '2025-07-12', receivedBy: 'رضا کریمی',
    status: 'inspecting', qcResult: 'pass',
    lineItems: [
      { id: 'grni-002', itemId: 'item-003', itemName: 'ورق فولادی سرد نورد', orderedQuantity: 50, receivedQuantity: 50, acceptedQuantity: 0, rejectedQuantity: 0, unitOfMeasure: 'piece', unitCost: 1820000, totalCost: 910000000, qcStatus: 'pending' },
    ],
    inventoryValueImpact: 0, postedToGl: false,
    putawayTasks: [],
    createdAt: '2025-07-12T09:00:00Z',
  },
  {
    id: 'grn-003', grnNumber: 'GRN-1403-00003',
    supplierId: 'sup-003', supplierName: 'شرکت شیمی‌گستران',
    companyId: 'co-001', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    receivedDate: '2025-07-14', receivedBy: 'رضا کریمی',
    status: 'partially_accepted', qcResult: 'conditional',
    rejectionReason: '۱۵ لیتر رزین برگشتی - ویسکوزیته خارج از محدوده',
    lineItems: [
      { id: 'grni-003', itemId: 'item-004', itemName: 'رزین اپوکسی صنعتی', orderedQuantity: 200, receivedQuantity: 200, acceptedQuantity: 185, rejectedQuantity: 15, unitOfMeasure: 'liter', unitCost: 3150000, totalCost: 582750000, lotNumber: 'LOT-2025-0714-A', qcStatus: 'pass' },
      { id: 'grni-004', itemId: 'item-005', itemName: 'سخت‌کننده H-37', orderedQuantity: 100, receivedQuantity: 100, acceptedQuantity: 100, rejectedQuantity: 0, unitOfMeasure: 'liter', unitCost: 1780000, totalCost: 178000000, lotNumber: 'LOT-2025-0714-B', qcStatus: 'pass' },
    ],
    inventoryValueImpact: 760750000, postedToGl: true,
    putawayTasks: [],
    createdAt: '2025-07-14T11:00:00Z',
  },
  {
    id: 'grn-004', grnNumber: 'GRN-1403-00004',
    supplierId: 'sup-005', supplierName: 'مجتمع چاپ و بسته‌بندی البرز',
    companyId: 'co-001', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    receivedDate: '2025-07-15', receivedBy: 'رضا کریمی',
    status: 'pending_inspection', qcResult: 'pass',
    lineItems: [
      { id: 'grni-005', itemId: 'item-008', itemName: 'جعبه مقوایی موج‌دار', orderedQuantity: 2000, receivedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0, unitOfMeasure: 'piece', unitCost: 44000, totalCost: 0, qcStatus: 'pending' },
    ],
    inventoryValueImpact: 0, postedToGl: false,
    putawayTasks: [],
    createdAt: '2025-07-15T08:00:00Z',
  },
  {
    id: 'grn-005', grnNumber: 'GRN-1403-00005',
    supplierId: 'sup-004', supplierName: ' SKF ایران',
    companyId: 'co-001', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    receivedDate: '2025-07-15', receivedBy: 'رضا کریمی',
    status: 'pending_inspection', qcResult: 'pass',
    lineItems: [
      { id: 'grni-006', itemId: 'item-006', itemName: 'بلبرینگ ۶۲۰۵', orderedQuantity: 100, receivedQuantity: 100, acceptedQuantity: 0, rejectedQuantity: 0, unitOfMeasure: 'piece', unitCost: 840000, totalCost: 84000000, qcStatus: 'pending' },
    ],
    inventoryValueImpact: 0, postedToGl: false,
    putawayTasks: [],
    createdAt: '2025-07-15T14:00:00Z',
  },
];

// ── Mock Material Requisitions ──────────────────────────────────────────────

const MOCK_MRS: MaterialRequisition[] = [
  {
    id: 'mr-001', mrNumber: 'MR-1403-00001',
    requesterId: 'u-010', requesterName: 'حسن عباسی',
    departmentId: 'dept-01', costCenterId: 'cc-01', projectId: 'PRJ-2025-018',
    companyId: 'co-001', purpose: 'production', priority: 'urgent',
    status: 'picking', requiredDate: '2025-07-09',
    lineItems: [
      { id: 'mri-001', itemId: 'item-001', itemName: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', requestedQuantity: 15000, issuedQuantity: 0, uom: 'kg', allocatedLotIds: [], pickedLocationIds: [], status: 'pending' },
      { id: 'mri-002', itemId: 'item-004', itemName: 'رزین اپوکسی صنعتی', requestedQuantity: 50, issuedQuantity: 0, uom: 'liter', allocatedLotIds: [], pickedLocationIds: [], status: 'pending' },
    ],
    totalEstimatedCost: 840000000,
    createdAt: '2025-07-08T08:00:00Z',
  },
  {
    id: 'mr-002', mrNumber: 'MR-1403-00002',
    requesterId: 'u-011', requesterName: 'مریم حسینی',
    departmentId: 'dept-02', costCenterId: 'CC-MAINT',
    companyId: 'co-001', purpose: 'maintenance', priority: 'normal',
    status: 'approved', requiredDate: '2025-07-12',
    lineItems: [
      { id: 'mri-003', itemId: 'item-006', itemName: 'بلبرینگ ۶۲۰۵', requestedQuantity: 20, issuedQuantity: 0, uom: 'piece', allocatedLotIds: [], pickedLocationIds: [], status: 'pending' },
      { id: 'mri-004', itemId: 'item-007', itemName: 'فیلتر عنصر هیدرولیک', requestedQuantity: 10, issuedQuantity: 0, uom: 'piece', allocatedLotIds: [], pickedLocationIds: [], status: 'pending' },
    ],
    totalEstimatedCost: 21200000,
    createdAt: '2025-07-10T11:00:00Z',
  },
  {
    id: 'mr-003', mrNumber: 'MR-1403-00003',
    requesterId: 'u-012', requesterName: 'علی نوری',
    departmentId: 'dept-01', costCenterId: 'cc-01', projectId: 'PRJ-2025-022',
    companyId: 'co-001', purpose: 'production', priority: 'critical',
    status: 'pending_approval', requiredDate: '2025-07-15',
    lineItems: [
      { id: 'mri-005', itemId: 'item-003', itemName: 'ورق فولادی سرد نورد', requestedQuantity: 30, issuedQuantity: 0, uom: 'piece', allocatedLotIds: [], pickedLocationIds: [], status: 'pending' },
    ],
    totalEstimatedCost: 555000000,
    createdAt: '2025-07-14T15:00:00Z',
  },
];

// ── Mock Dispatch Orders ────────────────────────────────────────────────────

const MOCK_DOS: DispatchOrder[] = [
  {
    id: 'do-001', doNumber: 'DO-1403-00001',
    customerId: 'cust-010', customerName: 'شرکت صنعت پلاست البرز',
    companyId: 'co-001', warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی',
    status: 'delivered', cogsImpact: 22500000,
    lineItems: [
      { id: 'doi-001', itemId: 'item-008', itemName: 'جعبه مقوایی موج‌دار', orderedQuantity: 500, pickedQuantity: 500, packedQuantity: 500, uom: 'piece' },
    ],
    pickList: [], packages: [],
    vehiclePlate: '۱۲ ب ۳۴۵',
    deliveredAt: '2025-07-11T14:00:00Z',
    createdAt: '2025-07-11T08:00:00Z',
  },
  {
    id: 'do-002', doNumber: 'DO-1403-00002',
    customerId: 'cust-011', customerName: 'کارخانه قطعات خودرو آریا',
    companyId: 'co-001', warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی',
    status: 'shipped', cogsImpact: 55100000,
    lineItems: [
      { id: 'doi-002', itemId: 'item-006', itemName: 'بلبرینگ ۶۲۰۵', orderedQuantity: 50, pickedQuantity: 50, packedQuantity: 50, uom: 'piece' },
      { id: 'doi-003', itemId: 'item-007', itemName: 'فیلتر عنصر هیدرولیک', orderedQuantity: 30, pickedQuantity: 30, packedQuantity: 30, uom: 'piece' },
    ],
    pickList: [], packages: [],
    vehiclePlate: '۶۷ الف ۷۸۹',
    dispatchedAt: '2025-07-14T12:00:00Z',
    createdAt: '2025-07-14T09:00:00Z',
  },
  {
    id: 'do-003', doNumber: 'DO-1403-00003',
    customerId: 'cust-012', customerName: 'پتروشیمی جم',
    companyId: 'co-001', warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی',
    status: 'pending', cogsImpact: 0,
    lineItems: [
      { id: 'doi-004', itemId: 'item-002', itemName: 'گرانول پلی‌پروپیلن', orderedQuantity: 10000, pickedQuantity: 0, packedQuantity: 0, uom: 'kg' },
    ],
    pickList: [], packages: [],
    createdAt: '2025-07-15T10:00:00Z',
  },
];

// ── Mock Cycle Counts ───────────────────────────────────────────────────────

const MOCK_COUNTS: CycleCountSession[] = [
  {
    id: 'cc-001', sessionNumber: 'CC-1403-00001',
    warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه',
    status: 'in_progress', type: 'abc_based',
    scheduledDate: '2025-07-15',
    aItemsCount: 10, bItemsCount: 15, cItemsCount: 15,
    countSheets: [], totalVariance: 3, totalVarianceValue: 85000000,
    createdAt: '2025-07-15T07:00:00Z',
  },
  {
    id: 'cc-002', sessionNumber: 'CC-1403-00002',
    warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی',
    status: 'completed', type: 'zone_based',
    scheduledDate: '2025-07-10', completedDate: '2025-07-10',
    aItemsCount: 5, bItemsCount: 5, cItemsCount: 5,
    countSheets: [], totalVariance: 1, totalVarianceValue: 32000000,
    createdAt: '2025-07-10T07:00:00Z',
  },
];

// ── Mock Lots & Transactions ────────────────────────────────────────────────

const MOCK_LOTS: InventoryLot[] = [
  { id: 'lot-001', itemId: 'item-001', lotNumber: 'LOT-2025-0710-A', initialQuantity: 25000, remainingQuantity: 13000, unitCost: 44500, receivedDate: '2025-07-10', status: 'available', locationId: 'loc-001', locationCode: 'RM-B-R1-B01' },
  { id: 'lot-002', itemId: 'item-001', lotNumber: 'LOT-2025-0628-A', initialQuantity: 60000, remainingQuantity: 60000, unitCost: 45200, receivedDate: '2025-06-28', status: 'available', locationId: 'loc-001', locationCode: 'RM-B-R1-B01' },
  { id: 'lot-003', itemId: 'item-004', lotNumber: 'LOT-2025-0714-A', initialQuantity: 185, remainingQuantity: 185, unitCost: 3150000, receivedDate: '2025-07-14', expiryDate: '2026-07-14', status: 'available', locationId: 'loc-002', locationCode: 'RM-A-R2-B08' },
  { id: 'lot-004', itemId: 'item-004', lotNumber: 'LOT-2025-0615-A', initialQuantity: 265, remainingQuantity: 265, unitCost: 3180000, receivedDate: '2025-06-15', expiryDate: '2026-06-15', status: 'available', locationId: 'loc-002', locationCode: 'RM-A-R2-B08' },
  { id: 'lot-005', itemId: 'item-003', lotNumber: 'LOT-2025-0705-A', initialQuantity: 50, remainingQuantity: 50, unitCost: 1820000, receivedDate: '2025-07-05', status: 'available', locationId: 'loc-003', locationCode: 'RM-B-R3-B05' },
  { id: 'lot-006', itemId: 'item-003', lotNumber: 'LOT-2025-0620-A', initialQuantity: 75, remainingQuantity: 75, unitCost: 1860000, receivedDate: '2025-06-20', status: 'available', locationId: 'loc-003', locationCode: 'RM-B-R3-B05' },
];

const MOCK_TXNS: InventoryTransaction[] = [
  { id: 'txn-001', transactionNumber: 'TXN-1403-000001', type: 'receipt', documentId: 'grn-001', documentType: 'GRN', itemId: 'item-001', itemName: 'گرانول پلاستیکی', lotId: 'lot-001', lotNumber: 'LOT-2025-0710-A', quantity: 25000, uom: 'kg', unitCost: 44500, totalCost: 1112500000, glImpact: { debitAccountId: 'gl-1101', creditAccountId: 'gl-2101', amount: 1112500000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-10T10:00:00Z', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه', referenceNumber: 'GRN-1403-00001' },
  { id: 'txn-002', transactionNumber: 'TXN-1403-000002', type: 'issue', documentId: 'mr-001', documentType: 'MR', itemId: 'item-001', itemName: 'گرانول پلاستیکی', quantity: 12000, uom: 'kg', unitCost: 44500, totalCost: 534000000, glImpact: { debitAccountId: 'gl-5101', creditAccountId: 'gl-1101', amount: 534000000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-12T14:00:00Z', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه', referenceNumber: 'MR-1403-00001' },
  { id: 'txn-003', transactionNumber: 'TXN-1403-000003', type: 'receipt', documentId: 'grn-002', documentType: 'GRN', itemId: 'item-003', itemName: 'ورق فولادی', lotId: 'lot-005', lotNumber: 'LOT-2025-0705-A', quantity: 50, uom: 'piece', unitCost: 1820000, totalCost: 91000000, glImpact: { debitAccountId: 'gl-1102', creditAccountId: 'gl-2101', amount: 91000000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-12T09:30:00Z', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه', referenceNumber: 'GRN-1403-00002' },
  { id: 'txn-004', transactionNumber: 'TXN-1403-000004', type: 'issue', documentId: 'do-002', documentType: 'DO', itemId: 'item-006', itemName: 'بلبرینگ ۶۲۰۵', quantity: 50, uom: 'piece', unitCost: 850000, totalCost: 42500000, glImpact: { debitAccountId: 'gl-5102', creditAccountId: 'gl-1103', amount: 42500000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-14T12:00:00Z', warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی', referenceNumber: 'DO-1403-00002' },
  { id: 'txn-005', transactionNumber: 'TXN-1403-000005', type: 'issue', documentId: 'do-001', documentType: 'DO', itemId: 'item-008', itemName: 'جعبه مقوایی', quantity: 500, uom: 'piece', unitCost: 45000, totalCost: 22500000, glImpact: { debitAccountId: 'gl-5103', creditAccountId: 'gl-1104', amount: 22500000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-11T10:00:00Z', warehouseId: 'wh-002', warehouseName: 'انبار محصولات نهایی', referenceNumber: 'DO-1403-00001' },
  { id: 'txn-006', transactionNumber: 'TXN-1403-000006', type: 'receipt', documentId: 'grn-003', documentType: 'GRN', itemId: 'item-004', itemName: 'رزین اپوکسی', lotId: 'lot-003', lotNumber: 'LOT-2025-0714-A', quantity: 185, uom: 'liter', unitCost: 3150000, totalCost: 582750000, glImpact: { debitAccountId: 'gl-1101', creditAccountId: 'gl-2101', amount: 582750000 }, performedBy: 'رضا کریمی', timestamp: '2025-07-14T14:00:00Z', warehouseId: 'wh-001', warehouseName: 'انبار مواد اولیه', referenceNumber: 'GRN-1403-00003' },
];

// ── Store Interface ─────────────────────────────────────────────────────────

interface InventoryStore {
  warehouses: Warehouse[];
  items: InventoryItem[];
  grns: GoodsReceiptNote[];
  requisitions: MaterialRequisition[];
  dispatchOrders: DispatchOrder[];
  cycleCounts: CycleCountSession[];
  transactions: InventoryTransaction[];
  lots: InventoryLot[];
  locations: StorageLocation[];
  reservations: InventoryReservation[];

  loading: boolean;
  activeTab: string;
  dataLoaded: boolean;

  // Actions
  /** COMP-004: Fetch all inventory data from backend API */
  loadAll: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  createGrn: (grn: Partial<GoodsReceiptNote>) => GoodsReceiptNote;
  acceptGrn: (id: string) => void;
  rejectGrn: (id: string, reason: string) => void;
  createRequisition: (mr: Partial<MaterialRequisition>) => MaterialRequisition;
  approveRequisition: (id: string, approvedBy: string) => void;
  startPicking: (id: string) => void;
  issueRequisition: (id: string) => void;
  addWarehouse: (wh: Partial<Warehouse>) => Warehouse;
  addZone: (warehouseId: string, zone: Partial<Warehouse['zones'][number]>) => void;
  addLocation: (location: Partial<StorageLocation>) => StorageLocation;
  blockLocation: (id: string) => void;
  reserveItem: (params: { requisitionId: string; itemId: string; lotId?: string; locationId?: string; quantity: number; reservedBy: string }) => InventoryReservation;
  releaseReservation: (id: string) => void;
  addItem: (item: Partial<InventoryItem>) => InventoryItem;
  createCountSession: (session: Partial<CycleCountSession> & { itemIds: string[] }) => CycleCountSession;
  recordCount: (sessionId: string, itemId: string, countedQuantity: number) => void;
  completeCountSession: (sessionId: string) => void;

  // Dispatch order fulfillment (pick → pack → ship → deliver)
  pickDispatchOrder: (id: string, pickedBy: string) => void;
  packDispatchOrder: (id: string, packedBy: string) => void;
  shipDispatchOrder: (id: string, carrierName: string, vehiclePlate: string) => void;
  deliverDispatchOrder: (id: string) => void;

  // Inter-warehouse transfer (logged as an audit transaction; see note in UI —
  // items are tracked at company level, not split per warehouse, so this
  // records the movement without changing total on-hand quantity)
  createTransferOrder: (params: { itemId: string; quantity: number; fromWarehouseId: string; toWarehouseId: string; performedBy: string }) => InventoryTransaction;

  // Computed
  getItemById: (id: string) => InventoryItem | undefined;
  getStockSummary: () => { totalItems: number; totalValue: number; lowStockItems: number; expiredLots: number; activeGRNs: number; pendingMRs: number };
  getReorderSuggestions: () => ReorderSuggestion[];
  getWarehouseUtilization: () => WarehouseUtilizationReport[];
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
  warehouses: seedFromMock(MOCK_WAREHOUSES),
  items: seedFromMock(MOCK_ITEMS),
  grns: seedFromMock(MOCK_GRNS),
  requisitions: seedFromMock(MOCK_MRS),
  dispatchOrders: seedFromMock(MOCK_DOS),
  cycleCounts: seedFromMock(MOCK_COUNTS),
  transactions: seedFromMock(MOCK_TXNS),
  lots: seedFromMock(MOCK_LOTS),
  locations: [],
  reservations: [],  loading: false,
  activeTab: 'dashboard',
  dataLoaded: false,


  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * COMP-004: Fetch all inventory data from backend API.
   * BUG-PERSIST-001: the server is the source of truth — each collection load
   * REPLACES the local array (loadCollection) and a failure surfaces a Persian
   * toast instead of silently keeping mock data.
   * NOTE: the old `dataLoaded` early-return is gone — dataLoaded itself is
   * persisted (see partialize), so guarding on it would skip the server load
   * after a reload and leave the collections empty.
   */
  loadAll: async () => {
    // Demo mode runs fully offline on the seedFromMock datasets.
    if (USE_MOCKS) { set({ dataLoaded: true }); return; }
    set({ loading: true });
    await Promise.all([
      loadCollection(() => warehouseApi.list(), (rows) => set({ warehouses: rows }), 'خطا در دریافت انبارها'),
      loadCollection(() => itemApi.list(), (rows) => set({ items: rows }), 'خطا در دریافت کالاها'),
      loadCollection(() => grnApi.list(), (rows) => set({ grns: rows }), 'خطا در دریافت رسیدهای انبار'),
      loadCollection(() => requisitionApi.list(), (rows) => set({ requisitions: rows }), 'خطا در دریافت درخواست‌های مواد'),
      loadCollection(() => stockApi.getTransactions(), (rows) => set({ transactions: rows }), 'خطا در دریافت تراکنش‌های انبار'),
      // TODO(BACKEND): lots & locations have no dedicated list endpoint yet.
    ]);
    set({ dataLoaded: true, loading: false });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  createGrn: (partial) => {
    // Optimistic local entity — replaced by the server row on success; rolled
    // back (with a Persian toast) if the API rejects the payload.
    const localGrn: GoodsReceiptNote = {
      id: genId('grn'),
      grnNumber: generateGRNNumber(),
      supplierId: partial.supplierId || '',
      supplierName: partial.supplierName || '',
      companyId: partial.companyId || '',
      warehouseId: partial.warehouseId || '',
      warehouseName: partial.warehouseName || '',
      receivedDate: partial.receivedDate || new Date().toISOString().slice(0, 10),
      receivedBy: partial.receivedBy || '',
      status: 'pending_inspection',
      qcResult: 'pass',
      lineItems: partial.lineItems || [],
      inventoryValueImpact: partial.inventoryValueImpact || 0,
      postedToGl: false,
      putawayTasks: [],
      createdAt: new Date().toISOString(),
    };
    void persistMutation<GoodsReceiptNote>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ grns: [localGrn, ...s.grns] })),
      // Payload contains backend-only DTO fields (zoneId, vendorName, lines…),
      // so the raw client is used instead of the Partial<Entity> module helper.
      request: () => api.post<GoodsReceiptNote>('/inventory/goods-receipt', toGrnDto(partial)),
      rollback: () => set((s) => ({ grns: s.grns.filter((g) => g.id !== localGrn.id) })),
      reconcile: (server) => set((s) => ({ grns: reconcileEntity(s.grns, localGrn.id, server) })),
      messageFa: 'خطا در ثبت رسید انبار؛ رکورد ذخیره نشد',
    });
    return localGrn;
  },

  acceptGrn: (id) => {
    const grn = get().grns.find((g) => g.id === id);
    if (!grn) return;

    const prev = {
      grns: get().grns, items: get().items, lots: get().lots,
      transactions: get().transactions, locations: get().locations,
    };

    void persistMutation<GoodsReceiptNote>({
      skip: USE_MOCKS,
      optimistic: () => {
        // Real stock movement: increase totalQuantity/availableQuantity for each accepted line item
        set((s) => ({
          items: s.items.map((item) => {
            const line = grn.lineItems.find((li) => li.itemId === item.id);
            if (!line) return item;
            const acceptedQty = line.acceptedQuantity || line.receivedQuantity;
            return {
              ...item,
              totalQuantity: item.totalQuantity + acceptedQty,
              availableQuantity: item.availableQuantity + acceptedQty,
            };
          }),
        }));

        // Cross-module: post a real journal voucher into Finance (Debit Inventory / Credit AP)
        const amount = grn.inventoryValueImpact || grn.lineItems.reduce((s, li) => s + (li.acceptedQuantity || li.receivedQuantity) * li.unitCost, 0);
        const voucher = useFinanceStore.getState().addInventoryReceiptVoucher({ grnId: grn.id, grnNumber: grn.grnNumber, amount });

        set((s) => {
          const receivedAt = new Date().toISOString();
          const newLots: InventoryLot[] = [];
          const newTransactions: InventoryTransaction[] = [];
          const locationUpdates = [...s.locations];
          grn.lineItems.forEach((line, index) => {
            const quantity = line.acceptedQuantity || line.receivedQuantity;
            if (quantity <= 0) return;
            const item = s.items.find(i => i.id === line.itemId);
            const locationId = line.actualLocationId || line.suggestedLocationId || locationUpdates.find(l => l.warehouseId === grn.warehouseId && l.status !== 'blocked')?.id || '';
            const location = locationUpdates.find(l => l.id === locationId);
            const lotId = genId('lot');
            if (item?.lotTracking) newLots.push({ id: lotId, itemId: line.itemId, lotNumber: line.lotNumber || `${grn.grnNumber}-${index + 1}`, manufactureDate: undefined, expiryDate: line.expiryDate, receivedDate: grn.receivedDate, initialQuantity: quantity, remainingQuantity: quantity, unitCost: line.unitCost, status: 'available', locationId, locationCode: location?.code });
            if (location) { const nextQty = location.currentQuantity + quantity; Object.assign(location, { currentItemId: line.itemId, currentLotId: item?.lotTracking ? lotId : undefined, currentQuantity: nextQty, status: 'occupied' as const }); }
            newTransactions.push({ id: genId('txn'), transactionNumber: generateTXNNumber(), type: 'receipt', documentId: grn.id, documentType: 'GRN', itemId: line.itemId, itemName: item?.nameFa, lotId: item?.lotTracking ? lotId : undefined, lotNumber: line.lotNumber, toLocationId: locationId || undefined, toLocationCode: location?.code, quantity, uom: line.unitOfMeasure, unitCost: line.unitCost, totalCost: quantity * line.unitCost, glImpact: { debitAccountId: item?.glAccountId || '', creditAccountId: '', amount: quantity * line.unitCost, journalVoucherId: voucher.id }, performedBy: grn.receivedBy, timestamp: receivedAt, warehouseId: grn.warehouseId, warehouseName: grn.warehouseName, referenceNumber: grn.grnNumber });
          });
          return { grns: s.grns.map(g => g.id === id ? { ...g, status: 'putaway_completed' as const, postedToGl: true, journalVoucherId: voucher.id } : g), lots: [...newLots, ...s.lots], transactions: [...newTransactions, ...s.transactions], locations: locationUpdates };
        });
      },
      request: () => grnApi.confirm(id),
      rollback: () => set(prev),
      reconcile: (server) => set((s) => ({ grns: reconcileEntity(s.grns, id, server) })),
      messageFa: 'خطا در تأیید رسید انبار؛ عملیات انجام نشد',
    });
  },

  rejectGrn: (id, reason) => {
    const prevGrns = get().grns;
    void persistMutation<GoodsReceiptNote>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          grns: s.grns.map((g) =>
            g.id === id ? { ...g, status: 'rejected' as const, rejectionReason: reason } : g
          ),
        })),
      // TODO(BACKEND): the backend has no `POST /inventory/goods-receipt/:id/reject`
      // endpoint yet. The request is still sent so a missing route surfaces as an
      // honest Persian error instead of a fake local success.
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/goods-receipt/${id}/reject`, { reason }); },
      rollback: () => set({ grns: prevGrns }),
      messageFa: 'خطا در رد رسید انبار؛ عملیات انجام نشد',
    });
  },

  createRequisition: (partial) => {
    // Optimistic local entity — replaced by the server row on success; rolled
    // back (with a Persian toast) if the API rejects the payload.
    const localMr: MaterialRequisition = {
      id: genId('mr'),
      mrNumber: generateMRNumber(),
      requesterId: partial.requesterId || '',
      requesterName: partial.requesterName || '',
      departmentId: partial.departmentId || '',
      costCenterId: partial.costCenterId || '',
      companyId: partial.companyId || '',
      purpose: partial.purpose || 'production',
      priority: partial.priority || 'normal',
      status: 'pending_approval',
      requiredDate: partial.requiredDate || new Date().toISOString().slice(0, 10),
      lineItems: partial.lineItems || [],
      totalEstimatedCost: partial.totalEstimatedCost || 0,
      createdAt: new Date().toISOString(),
    };
    void persistMutation<MaterialRequisition>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ requisitions: [localMr, ...s.requisitions] })),
      // Payload contains backend-only DTO fields (zoneId, lines…), so the raw
      // client is used instead of the Partial<Entity> module helper.
      request: () => api.post<MaterialRequisition>('/inventory/requisitions', toRequisitionDto(partial)),
      rollback: () => set((s) => ({ requisitions: s.requisitions.filter((r) => r.id !== localMr.id) })),
      reconcile: (server) => set((s) => ({ requisitions: reconcileEntity(s.requisitions, localMr.id, server) })),
      messageFa: 'خطا در ثبت درخواست مواد؛ رکورد ذخیره نشد',
    });
    return localMr;
  },

  approveRequisition: (id, approvedBy) => {
    const mr = get().requisitions.find(r => r.id === id);
    if (!mr || mr.status !== 'pending_approval') return;
    const prev = {
      requisitions: get().requisitions, reservations: get().reservations,
      items: get().items, lots: get().lots,
    };
    const allocations = mr.lineItems.map(line => {
      const item = get().items.find(i => i.id === line.itemId);
      if (!item || item.availableQuantity < line.requestedQuantity) throw new Error(`کسری موجودی برای ${line.itemName || line.itemId}`);
      const lots = get().lots.filter(l => l.itemId === line.itemId && l.status === 'available' && l.remainingQuantity > 0);
      const allocated = item.trackingMethod === 'fefo' ? allocateFefo(lots, line.requestedQuantity) : allocateFifo(lots, line.requestedQuantity);
      const covered = allocated.reduce((s,a)=>s+a.quantity,0);
      if (item.lotTracking && covered < line.requestedQuantity) throw new Error(`لات قابل تخصیص کافی نیست: ${line.itemName || line.itemId}`);
      return { line, allocated };
    });
    void persistMutation<MaterialRequisition>({
      skip: USE_MOCKS,
      optimistic: () => {
        allocations.forEach(({line, allocated}) => allocated.length ? allocated.forEach(a => get().reserveItem({ requisitionId: id, itemId: line.itemId, lotId: a.lotId, quantity: a.quantity, reservedBy: approvedBy })) : get().reserveItem({ requisitionId: id, itemId: line.itemId, quantity: line.requestedQuantity, reservedBy: approvedBy }));
        set(s => ({ requisitions: s.requisitions.map(r => r.id === id ? { ...r, status: 'approved' as const, lineItems: r.lineItems.map(line => { const a=allocations.find(x=>x.line.id===line.id)?.allocated || []; return { ...line, allocatedLotIds:a.map(x=>x.lotId), status:'allocated' as const }; }) } : r), lots: s.lots.map(lot => { const qty=allocations.flatMap(x=>x.allocated).find(a=>a.lotId===lot.id)?.quantity || 0; return qty ? { ...lot, remainingQuantity: lot.remainingQuantity - qty, status:'reserved' as const } : lot; }) }));
      },
      // ApproveRequisitionDto requires an `approved` boolean, which the module
      // helper's signature cannot carry — hence the raw client call here.
      request: async () => { await api.patch<Record<string, unknown>>(`/inventory/requisitions/${id}/approve`, { approved: true }); },
      rollback: () => set(prev),
      reconcile: (server) => set((s) => ({ requisitions: reconcileEntity(s.requisitions, id, server as Partial<MaterialRequisition>) })),
      messageFa: 'خطا در تأیید درخواست مواد؛ عملیات انجام نشد',
    });
  },

  startPicking: (id) => {
    const prevRequisitions = get().requisitions;
    void persistMutation<MaterialRequisition>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          requisitions: s.requisitions.map((r) =>
            r.id === id ? { ...r, status: 'picking' as const } : r
          ),
        })),
      // TODO(BACKEND): the requisition controller has no start-picking status
      // transition yet (only submit/approve/issue/cancel). The request is still
      // sent so the missing route surfaces as an honest error.
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/requisitions/${id}/start-picking`); },
      rollback: () => set({ requisitions: prevRequisitions }),
      messageFa: 'خطا در شروع پیک‌بندی؛ وضعیت تغییر نکرد',
    });
  },

  issueRequisition: (id) => {
    const now = new Date().toISOString();
    const mr = get().requisitions.find((r) => r.id === id);
    if (!mr || (mr.status !== 'approved' && mr.status !== 'picking')) return;
    const insufficient = mr.lineItems.some(line => { const item=get().items.find(i => i.id === line.itemId); const reserved=get().reservations.filter(r=>r.requisitionId===id && r.itemId===line.itemId && r.status==='active').reduce((s,r)=>s+r.quantity,0); return !item || (item.availableQuantity + reserved) < line.requestedQuantity; });
    if (insufficient) throw new Error('موجودی قابل صدور کافی نیست. صدور با موجودی منفی مجاز نیست.');

    const prev = {
      items: get().items, requisitions: get().requisitions,
      dispatchOrders: get().dispatchOrders, reservations: get().reservations,
    };

    void persistMutation<MaterialRequisition>({
      skip: USE_MOCKS,
      optimistic: () => {
        // Real stock movement: decrease totalQuantity/availableQuantity for each line item
        let totalCost = 0;
        set((s) => ({
          items: s.items.map((item) => {
            const line = mr.lineItems.find((li) => li.itemId === item.id);
            if (!line) return item;
            totalCost += line.requestedQuantity * item.movingAverageCost;
            return {
              ...item,
              totalQuantity: Math.max(0, item.totalQuantity - line.requestedQuantity),
              reservedQuantity: Math.max(0, item.reservedQuantity - line.requestedQuantity),
              availableQuantity: item.availableQuantity,
            };
          }),
        }));

        // Cross-module: post a real journal voucher into Finance (Debit COGS / Credit Inventory)
        const amount = totalCost || mr.totalEstimatedCost;
        useFinanceStore.getState().addInventoryIssueVoucher({ mrId: mr.id, mrNumber: mr.mrNumber, amount });

        const doNumber = generateDONumber();
        const newDo: DispatchOrder = {
          id: genId('do'),
          doNumber,
          customerId: '',
          customerName: '',
          companyId: mr.companyId,
          warehouseId: '',
          warehouseName: '',
          status: 'pending',
          cogsImpact: amount,
          lineItems: mr.lineItems.map((li) => ({
            id: genId('doi'),
            itemId: li.itemId,
            itemName: li.itemName,
            orderedQuantity: li.requestedQuantity,
            pickedQuantity: 0,
            packedQuantity: 0,
            uom: li.uom,
          })),
          pickList: [],
          packages: [],
          createdAt: now,
        };

        set((s) => ({
          requisitions: s.requisitions.map((r) =>
            r.id === id ? { ...r, status: 'issued' as const, issuedDate: now } : r
          ),
          dispatchOrders: [newDo, ...s.dispatchOrders],
          reservations: s.reservations.map(r => r.requisitionId === id && r.status === 'active' ? { ...r, status: 'consumed' as const } : r),
        }));
      },
      request: async () => {
        await api.post<Record<string, unknown>>(`/inventory/requisitions/${id}/issue`, {
          requisitionId: id,
          // TODO(BACKEND): the frontend MR model carries no warehouse context,
          // while IssueItemsDto requires a UUID `warehouseId` per line — the
          // server's validation error is surfaced honestly until the UI
          // captures the warehouse.
          lines: mr.lineItems.map((line) => ({ lineId: line.id, issuedQty: line.requestedQuantity })),
        });
      },
      rollback: () => set(prev),
      reconcile: (server) => set((s) => ({ requisitions: reconcileEntity(s.requisitions, id, server as Partial<MaterialRequisition>) })),
      messageFa: 'خطا در صدور درخواست مواد؛ عملیات انجام نشد',
    });
  },

  addWarehouse: (partial) => {
    // Optimistic local entity — replaced by the server row on success; rolled
    // back (with a Persian toast) if the API rejects the payload.
    const newWh: Warehouse = {
      id: genId('wh'),
      code: partial.code || `WH-${String(get().warehouses.length + 1).padStart(2, '0')}`,
      name: partial.name || '', nameFa: partial.nameFa || partial.name || 'انبار جدید',
      type: partial.type || 'raw_material', status: 'active',
      address: partial.address || '', companyId: 'co-001',
      capacity: partial.capacity || { maxWeight: 100000, maxVolume: 500, maxPallets: 100 },
      currentUtilization: { weightPercent: 0, volumePercent: 0, palletPercent: 0 },
      zones: [], createdAt: new Date().toISOString(),
    };
    void persistMutation<Warehouse>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ warehouses: [...s.warehouses, newWh] })),
      // Payload contains backend-only DTO fields (zoneId…), so the raw client
      // is used instead of the Partial<Entity> module helper.
      request: () => api.post<Warehouse>('/inventory/warehouses', toWarehouseDto(partial)),
      rollback: () => set((s) => ({ warehouses: s.warehouses.filter((w) => w.id !== newWh.id) })),
      reconcile: (server) => set((s) => ({ warehouses: reconcileEntity(s.warehouses, newWh.id, server) })),
      messageFa: 'خطا در ثبت انبار؛ رکورد ذخیره نشد',
    });
    return newWh;
  },

  addZone: (warehouseId, partial) => {
    const zone: WarehouseZone = {
      id: genId('zone'),
      warehouseId,
      code: partial.code || `Z-${Date.now().toString().slice(-4)}`,
      name: partial.name || partial.nameFa || 'زون جدید',
      type: partial.type || 'bulk_storage',
      temperatureControlled: partial.temperatureControlled || false,
      humidityControlled: partial.humidityControlled || false,
      locationCount: 0,
      ...partial,
    };

    const prevWarehouses = get().warehouses;
    void persistMutation<WarehouseZone>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((state) => ({
          warehouses: state.warehouses.map((warehouse) =>
            warehouse.id === warehouseId
              ? { ...warehouse, zones: [...warehouse.zones, zone] }
              : warehouse,
          ),
        })),
      // TODO(BACKEND): the warehouse controller has no zone-creation endpoint
      // (only locations). The request is still sent so the missing route
      // surfaces as an honest error instead of a fake local success.
      request: async () => {
        await api.post<Record<string, unknown>>(`/inventory/warehouses/${warehouseId}/zones`, {
          code: zone.code, name: zone.name, type: zone.type,
        });
      },
      rollback: () => set({ warehouses: prevWarehouses }),
      messageFa: 'خطا در ثبت زون؛ رکورد ذخیره نشد',
    });
  },

  addLocation: (partial) => {
    const location: StorageLocation = { id: genId('loc'), zoneId: partial.zoneId || '', warehouseId: partial.warehouseId || '', code: partial.code || `LOC-${get().locations.length + 1}`, barcode: partial.barcode || `LOC-${Date.now()}`, dimensions: partial.dimensions || { length: 0, width: 0, height: 0 }, maxWeight: partial.maxWeight || 0, locationType: partial.locationType || 'bin', allowedItemCategories: partial.allowedItemCategories || [], status: 'empty', currentQuantity: 0, ...partial };
    const prev = { locations: get().locations, warehouses: get().warehouses };
    void persistMutation<StorageLocation>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((state) => ({
          locations: [...state.locations, location],
          warehouses: state.warehouses.map((warehouse) =>
            warehouse.id === location.warehouseId
              ? {
                  ...warehouse,
                  zones: warehouse.zones.map((zone) =>
                    zone.id === location.zoneId
                      ? { ...zone, locationCount: zone.locationCount + 1 }
                      : zone,
                  ),
                }
              : warehouse,
          ),
        })),
      request: () => {
        // Backend CreateLocationDto differs from the frontend entity — build a
        // whitelist-safe payload (code + aisle/rack/bin/type/capacity only).
        const locationDto: Record<string, unknown> = { code: location.code, type: partial.locationType };
        return warehouseApi.addLocation(location.warehouseId, locationDto as Partial<StorageLocation>);
      },
      rollback: () => set(prev),
      reconcile: (server) => set((s) => ({ locations: reconcileEntity(s.locations, location.id, server) })),
      messageFa: 'خطا در ثبت محل کالا؛ رکورد ذخیره نشد',
    });

    return location;
  },
  blockLocation: (id) => {
    const prevLocations = get().locations;
    void persistMutation<StorageLocation>({
      skip: USE_MOCKS,
      optimistic: () => set(s => ({ locations: s.locations.map(l => l.id === id ? { ...l, status: 'blocked' } : l) })),
      // TODO(BACKEND): no location status endpoint exists yet. The request is
      // still sent so the missing route surfaces as an honest error.
      request: async () => { await api.patch<Record<string, unknown>>(`/inventory/locations/${id}`, { status: 'blocked' }); },
      rollback: () => set({ locations: prevLocations }),
      messageFa: 'خطا در مسدودسازی محل کالا؛ وضعیت تغییر نکرد',
    });
  },
  reserveItem: ({ requisitionId, itemId, lotId, locationId, quantity, reservedBy }) => {
    const item = get().items.find(i => i.id === itemId);
    if (!item || quantity <= 0 || item.availableQuantity < quantity) throw new Error('موجودی قابل تخصیص کافی نیست.');
    if (get().reservations.some(r => r.requisitionId === requisitionId && r.itemId === itemId && r.lotId === lotId && r.status === 'active')) throw new Error('این کالا یا لات قبلاً برای درخواست رزرو شده است.');
    const reservation: InventoryReservation = { id: genId('RSV'), requisitionId, itemId, lotId, locationId, quantity, reservedBy, reservedAt: new Date().toISOString(), status: 'active', lockVersion: 1 };
    void persistMutation<InventoryReservation>({
      skip: USE_MOCKS,
      optimistic: () => set(s => ({ reservations: [...s.reservations, reservation], items: s.items.map(i => i.id === itemId ? { ...i, reservedQuantity: i.reservedQuantity + quantity, availableQuantity: i.availableQuantity - quantity } : i) })),
      // TODO(BACKEND): no stock-reservation endpoint exists in the inventory
      // backend yet. The request is still sent so the missing route surfaces
      // as an honest error instead of a fake local success.
      request: async () => {
        await api.post<Record<string, unknown>>('/inventory/stock/reservations', {
          requisitionId, itemId, lotId, locationId, quantity, reservedBy,
        });
      },
      // Surgical rollback so cascaded reservations (e.g. requisition approval)
      // never clobber each other's state.
      rollback: () =>
        set(s => ({
          reservations: s.reservations.filter(r => r.id !== reservation.id),
          items: s.items.map(i => i.id === itemId
            ? { ...i, reservedQuantity: Math.max(0, i.reservedQuantity - quantity), availableQuantity: i.availableQuantity + quantity }
            : i),
        })),
      messageFa: 'خطا در رزرو موجودی؛ رزرو ثبت نشد',
    });
    return reservation;
  },
  releaseReservation: (id) => {
    const r = get().reservations.find(x => x.id === id); if (!r || r.status !== 'active') return;
    const prev = { reservations: get().reservations, items: get().items, lots: get().lots };
    void persistMutation<InventoryReservation>({
      skip: USE_MOCKS,
      optimistic: () => set(s => ({ reservations: s.reservations.map(x => x.id === id ? { ...x, status: 'released' } : x), items: s.items.map(i => i.id === r.itemId ? { ...i, reservedQuantity: Math.max(0, i.reservedQuantity - r.quantity), availableQuantity: i.availableQuantity + r.quantity } : i), lots: s.lots.map(l => l.id === r.lotId ? { ...l, remainingQuantity: l.remainingQuantity + r.quantity, status: 'available' as const } : l) })),
      // TODO(BACKEND): no reservation-release endpoint exists yet. The request
      // is still sent so the missing route surfaces as an honest error.
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/stock/reservations/${id}/release`); },
      rollback: () => set(prev),
      messageFa: 'خطا در آزادسازی رزرو؛ عملیات انجام نشد',
    });
  },

  addItem: (partial) => {
    // Optimistic local entity — replaced by the server row on success; rolled
    // back (with a Persian toast) if the API rejects the payload.
    const newItem: InventoryItem = {
      sku: partial.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: partial.barcode || '', nameFa: partial.nameFa || '', nameEn: partial.nameEn || '',
      description: partial.description || '', categoryId: partial.categoryId || 'cat-01', categoryName: partial.categoryName || 'عمومی',
      uom: partial.uom || 'piece', alternateUoms: partial.alternateUoms || [],
      dimensions: partial.dimensions || { length: 0, width: 0, height: 0, weight: 0 },
      storageRequirements: partial.storageRequirements || { hazardous: false },
      trackingMethod: 'weighted_average', lotTracking: false, serialTracking: false, expiryTracking: false,
      reorderPoint: partial.reorderPoint ?? 0, reorderQuantity: partial.reorderQuantity ?? 0,
      maxStockLevel: partial.maxStockLevel ?? 0, minStockLevel: partial.minStockLevel ?? 0, safetyStock: partial.safetyStock ?? 0,
      abcClass: partial.abcClass || 'C', turnoverRatio: 0, movingAverageCost: partial.movingAverageCost ?? 0, lastPurchasePrice: partial.movingAverageCost ?? 0,
      valuationMethod: partial.valuationMethod || 'weighted_average', glAccountId: partial.glAccountId || 'gl-1101', cogsAccountId: partial.cogsAccountId || 'gl-5101',
      status: partial.status || 'active', companyId: partial.companyId || 'co-001',
      totalQuantity: partial.totalQuantity ?? 0, reservedQuantity: 0, availableQuantity: partial.totalQuantity ?? 0,
      ...partial,
      id: partial.id || genId('item'),
      createdAt: new Date().toISOString(),
    };
    void persistMutation<InventoryItem>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ items: [newItem, ...s.items] })),
      // Payload contains backend-only DTO fields (zoneId, unit, trackByBatch…),
      // so the raw client is used instead of the Partial<Entity> module helper.
      request: () => api.post<InventoryItem>('/inventory/items', toItemDto(partial)),
      rollback: () => set((s) => ({ items: s.items.filter((i) => i.id !== newItem.id) })),
      reconcile: (server) => set((s) => ({ items: reconcileEntity(s.items, newItem.id, server) })),
      messageFa: 'خطا در ثبت کالا؛ رکورد ذخیره نشد',
    });
    return newItem;
  },

  createCountSession: ({ itemIds, ...partial }) => {
    const items = get().items.filter((i) => itemIds.includes(i.id));
    const session: CycleCountSession = {
      id: genId('cc'),
      sessionNumber: `CC-1403-${String(get().cycleCounts.length + 1).padStart(5, '0')}`,
      warehouseId: partial.warehouseId || '', warehouseName: partial.warehouseName,
      type: partial.type || 'item_based',
      aItemsCount: items.filter((i) => i.abcClass === 'A').length,
      bItemsCount: items.filter((i) => i.abcClass === 'B').length,
      cItemsCount: items.filter((i) => i.abcClass === 'C').length,
      status: 'scheduled',
      scheduledDate: partial.scheduledDate || new Date().toISOString().slice(0, 10),
      countSheets: items.map((item) => ({
        id: genId('cs'), sessionId: '', locationId: 'loc-000', itemId: item.id, itemName: item.nameFa,
        systemQuantity: item.totalQuantity, status: 'pending' as const,
      })),
      totalVariance: 0, totalVarianceValue: 0,
      createdAt: new Date().toISOString(),
    };
    session.countSheets = session.countSheets.map((cs) => ({ ...cs, sessionId: session.id }));
    const scope = currentScope();
    const countPayload: Partial<CycleCountSession> & { companyId?: string; plannedDate?: string; itemIds?: string[] } = {
      zoneId: scope.zoneId,
      companyId: scope.companyId,
      warehouseId: session.warehouseId,
      plannedDate: session.scheduledDate,
      itemIds,
    };
    void persistMutation<CycleCountSession>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ cycleCounts: [session, ...s.cycleCounts] })),
      request: () => countApi.create(countPayload),
      rollback: () => set((s) => ({ cycleCounts: s.cycleCounts.filter((c) => c.id !== session.id) })),
      reconcile: (server) => set((s) => ({ cycleCounts: reconcileEntity(s.cycleCounts, session.id, server) })),
      messageFa: 'خطا در ایجاد جلسه انبارگردانی؛ رکورد ذخیره نشد',
    });
    return session;
  },

  recordCount: (sessionId, itemId, countedQuantity) => {
    const prevCycleCounts = get().cycleCounts;
    const sheetId = prevCycleCounts.find((c) => c.id === sessionId)?.countSheets.find((cs) => cs.itemId === itemId)?.id ?? itemId;
    void persistMutation<CycleCountSession>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          cycleCounts: s.cycleCounts.map((session) => {
            if (session.id !== sessionId) return session;
            const countSheets = session.countSheets.map((cs) =>
              cs.itemId === itemId
                ? { ...cs, countedQuantity, variance: countedQuantity - cs.systemQuantity, status: 'counted' as const, countedAt: new Date().toISOString() }
                : cs
            );
            const allCounted = countSheets.every((cs) => cs.status !== 'pending');
            return {
              ...session,
              countSheets,
              status: allCounted ? session.status : ('in_progress' as const),
            };
          }),
        })),
      request: async () => { await countApi.recordResults(sessionId, { lines: [{ lineId: sheetId, countedQty: countedQuantity }] }); },
      rollback: () => set({ cycleCounts: prevCycleCounts }),
      reconcile: (server) => set((s) => ({ cycleCounts: reconcileEntity(s.cycleCounts, sessionId, server) })),
      messageFa: 'خطا در ثبت نتیجه شمارش؛ تغییرات ذخیره نشد',
    });
  },

  completeCountSession: (sessionId) => {
    const session = get().cycleCounts.find((c) => c.id === sessionId);
    if (!session) return;

    const prev = { cycleCounts: get().cycleCounts, items: get().items };
    void persistMutation<CycleCountSession>({
      skip: USE_MOCKS,
      optimistic: () => {
        // Adjust item stock to counted quantities (real inventory adjustment)
        set((s) => ({
          items: s.items.map((item) => {
            const sheet = session.countSheets.find((cs) => cs.itemId === item.id && cs.countedQuantity != null);
            if (!sheet) return item;
            return { ...item, totalQuantity: sheet.countedQuantity!, availableQuantity: sheet.countedQuantity! - item.reservedQuantity };
          }),
        }));

        const totalVariance = session.countSheets.reduce((s, cs) => s + Math.abs(cs.variance || 0), 0);
        const totalVarianceValue = session.countSheets.reduce((s, cs) => {
          const item = get().items.find((i) => i.id === cs.itemId);
          return s + Math.abs((cs.variance || 0) * (item?.movingAverageCost || 0));
        }, 0);

        set((s) => ({
          cycleCounts: s.cycleCounts.map((c) =>
            c.id === sessionId
              ? { ...c, status: 'completed' as const, completedDate: new Date().toISOString().slice(0, 10), totalVariance, totalVarianceValue }
              : c
          ),
        }));
      },
      // POST /inventory/counts/:id/approve closes the session and posts the
      // adjustments server-side.
      request: () => countApi.approve(sessionId),
      rollback: () => set(prev),
      reconcile: (server) => set((s) => ({ cycleCounts: reconcileEntity(s.cycleCounts, sessionId, server) })),
      messageFa: 'خطا در تکمیل انبارگردانی؛ عملیات انجام نشد',
    });
  },

  // ── Dispatch order fulfillment ────────────────────────────────────────────
  // TODO(BACKEND): the inventory backend has NO dispatch-order endpoints yet.
  // Every step below still sends its request so the missing route surfaces as
  // an honest Persian error + rollback instead of a fake local success.
  pickDispatchOrder: (id, pickedBy) => {
    const prev = get().dispatchOrders;
    void persistMutation<DispatchOrder>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === id
              ? {
                  ...d, status: 'picked' as const, pickedBy, pickedAt: new Date().toISOString(),
                  lineItems: d.lineItems.map((li) => ({ ...li, pickedQuantity: li.orderedQuantity })),
                }
              : d
          ),
        })),
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/dispatch-orders/${id}/pick`, { pickedBy }); },
      rollback: () => set({ dispatchOrders: prev }),
      messageFa: 'خطا در ثبت پیک‌بندی؛ عملیات انجام نشد',
    });
  },
  packDispatchOrder: (id, packedBy) => {
    const prev = get().dispatchOrders;
    void persistMutation<DispatchOrder>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === id
              ? {
                  ...d, status: 'packed' as const, packedBy, packedAt: new Date().toISOString(),
                  lineItems: d.lineItems.map((li) => ({ ...li, packedQuantity: li.pickedQuantity })),
                }
              : d
          ),
        })),
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/dispatch-orders/${id}/pack`, { packedBy }); },
      rollback: () => set({ dispatchOrders: prev }),
      messageFa: 'خطا در ثبت بسته‌بندی؛ عملیات انجام نشد',
    });
  },
  shipDispatchOrder: (id, carrierName, vehiclePlate) => {
    const prev = get().dispatchOrders;
    void persistMutation<DispatchOrder>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === id ? { ...d, status: 'shipped' as const, carrierName, vehiclePlate, dispatchedAt: new Date().toISOString() } : d
          ),
        })),
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/dispatch-orders/${id}/ship`, { carrierName, vehiclePlate }); },
      rollback: () => set({ dispatchOrders: prev }),
      messageFa: 'خطا در ثبت ارسال؛ عملیات انجام نشد',
    });
  },
  deliverDispatchOrder: (id) => {
    const prev = get().dispatchOrders;
    void persistMutation<DispatchOrder>({
      skip: USE_MOCKS,
      optimistic: () =>
        set((s) => ({
          dispatchOrders: s.dispatchOrders.map((d) =>
            d.id === id ? { ...d, status: 'delivered' as const, deliveredAt: new Date().toISOString() } : d
          ),
        })),
      request: async () => { await api.post<Record<string, unknown>>(`/inventory/dispatch-orders/${id}/deliver`); },
      rollback: () => set({ dispatchOrders: prev }),
      messageFa: 'خطا در ثبت تحویل؛ عملیات انجام نشد',
    });
  },

  // ── Inter-warehouse transfer ───────────────────────────────────────────────
  createTransferOrder: ({ itemId, quantity, fromWarehouseId, toWarehouseId, performedBy }) => {
    const item = get().items.find((i) => i.id === itemId);
    const fromWh = get().warehouses.find((w) => w.id === fromWarehouseId);
    const toWh = get().warehouses.find((w) => w.id === toWarehouseId);
    const txn: InventoryTransaction = {
      id: genId('txn'),
      transactionNumber: generateTXNNumber(),
      type: 'transfer',
      documentId: genId('to'),
      documentType: 'transfer_order',
      itemId, itemName: item?.nameFa,
      fromLocationId: fromWarehouseId, fromLocationCode: fromWh?.code,
      toLocationId: toWarehouseId, toLocationCode: toWh?.code,
      quantity, uom: item?.uom ?? 'piece',
      unitCost: item?.movingAverageCost ?? 0,
      totalCost: quantity * (item?.movingAverageCost ?? 0),
      glImpact: { debitAccountId: '1104', creditAccountId: '1104', amount: quantity * (item?.movingAverageCost ?? 0) },
      performedBy,
      timestamp: new Date().toISOString(),
      warehouseId: toWarehouseId, warehouseName: toWh?.nameFa,
      referenceNumber: `${fromWh?.code ?? '?'} → ${toWh?.code ?? '?'}`,
    };
    const prevTransactions = get().transactions;
    void persistMutation<InventoryTransaction, void>({
      skip: USE_MOCKS,
      optimistic: () => set((s) => ({ transactions: [txn, ...s.transactions] })),
      request: async () => { await stockApi.transfer({ itemId, fromWarehouseId, toWarehouseId, quantity }); },
      rollback: () => set({ transactions: prevTransactions }),
      messageFa: 'خطا در ثبت انتقال بین انبارها؛ تراکنش ذخیره نشد',
    });
    return txn;
  },

  // ── Computed ─────────────────────────────────────────────────────────────

  getItemById: (id) => get().items.find((i) => i.id === id),

  getStockSummary: () => {
    const { items, lots, grns, requisitions } = get();
    const totalValue = items.reduce((s, i) => s + i.totalQuantity * i.movingAverageCost, 0);
    const lowStockItems = items.filter((i) => i.totalQuantity <= i.reorderPoint && i.totalQuantity > 0).length;
    const expiredLots = lots.filter((l) => {
      if (!l.expiryDate) return false;
      return new Date(l.expiryDate) < new Date();
    }).length;
    const activeGRNs = grns.filter((g) => g.status === 'pending_inspection' || g.status === 'inspecting' || g.status === 'partially_accepted').length;
    const pendingMRs = requisitions.filter((r) => r.status === 'pending_approval' || r.status === 'approved').length;

    return { totalItems: items.length, totalValue, lowStockItems, expiredLots, activeGRNs, pendingMRs };
  },

  getReorderSuggestions: () => {
    const { items } = get();
    return items
      .filter((i) => i.status === 'active' && i.totalQuantity <= i.reorderPoint)
      .map((item) => ({
        itemId: item.id,
        itemName: item.nameFa,
        currentStock: item.totalQuantity,
        reorderPoint: item.reorderPoint,
        suggestedQuantity: item.reorderQuantity,
        leadTimeDays: 7,
        estimatedCost: item.reorderQuantity * item.movingAverageCost,
        urgency: item.totalQuantity === 0
          ? 'critical' as const
          : item.totalQuantity <= item.safetyStock
            ? 'high' as const
            : 'medium' as const,
      }));
  },

  getWarehouseUtilization: () => {
    return get().warehouses.map((wh) => ({
      warehouseId: wh.id,
      warehouseName: wh.name,
      nameFa: wh.nameFa,
      totalLocations: wh.zones.reduce((s, z) => s + z.locationCount, 0),
      occupiedLocations: 0,
      reservedLocations: 0,
      emptyLocations: wh.zones.reduce((s, z) => s + z.locationCount, 0),
      utilizationPercent: wh.currentUtilization.weightPercent,
      weightUtilization: wh.currentUtilization.weightPercent,
      volumeUtilization: wh.currentUtilization.volumePercent,
    }));
  },
    }),
    {
      name: 'inventory-store',
      storage: createJSONStorage(() => zustandLocalStorage),
      // BUG-PERSIST-001: the server is the source of truth for every entity
      // collection — only UI preferences and the bootstrap flag survive a
      // reload (entities are re-fetched by loadAll on every app start).
      partialize: (s) => ({ activeTab: s.activeTab, dataLoaded: s.dataLoaded }),
    }
  )
);
