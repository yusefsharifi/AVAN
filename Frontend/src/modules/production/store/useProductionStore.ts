import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { zustandLocalStorage } from '@/shared/lib/persist';
import { useInventoryStore } from '@/modules/inventory';
import { api } from '@/shared/api/client';
import { useFinanceStore } from '@/modules/finance';
import { persistMutation, reconcileEntity, loadCollection } from '@/shared/lib/serverSync';
import { seedFromMock, USE_MOCKS, PERSISTENCE_MESSAGES } from '@/shared/lib/mockMode';
import type {
  SalesOrder, WorkOrder, WorkOrderStatus, ProductionLine, LineStatus, ProductionPlan,
  Machine, MaintenanceRecord, DowntimeLog, QualityCheck, NCR, ScrapRecord, BillOfMaterials,
} from '../types';
import {
  generateSalesOrderNumber, generateWorkOrderNumber, generateQCNumber, generateNCRNumber, generateBOMNumber,
} from '../utils';
export const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Mock data (شرکت پلاستیک ایران) ──────────────────────────────────────────

const MOCK_LINES: ProductionLine[] = [
  { id: 'line-a', code: 'LINE-A', nameFa: 'خط تزریق A', capacity: 240, currentStatus: 'running', currentWorkOrderId: undefined, shift: 'morning', oee: 72, lastMaintenanceDate: '۱۴۰۳/۰۳/۱۰', nextMaintenanceDate: '۱۴۰۳/۰۵/۱۰', supervisorName: 'رضا کریمی' },
  { id: 'line-b', code: 'LINE-B', nameFa: 'خط تزریق B', capacity: 200, currentStatus: 'running', currentWorkOrderId: undefined, shift: 'morning', oee: 68, lastMaintenanceDate: '۱۴۰۳/۰۲/۲۰', nextMaintenanceDate: '۱۴۰۳/۰۴/۲۰', supervisorName: 'سعید نوری' },
  { id: 'line-c', code: 'LINE-C', nameFa: 'خط دمش', capacity: 150, currentStatus: 'idle', currentWorkOrderId: undefined, shift: 'afternoon', oee: 81, lastMaintenanceDate: '۱۴۰۳/۰۴/۰۱', nextMaintenanceDate: '۱۴۰۳/۰۶/۰۱', supervisorName: 'مریم احمدی' },
];

const MOCK_MACHINES: Machine[] = [
  { id: 'mch-001', code: 'MCH-001', nameFa: 'دستگاه تزریق شماره ۱', nameEn: 'Injection Molder 1', lineId: 'line-a', category: 'injection_molding', brand: 'Haitian', model: 'MA1200', serialNumber: 'HT-2021-0451', installDate: '۱۳۹۹/۰۲/۱۰', status: 'running', operatingHoursTotal: 6200, operatingHoursSinceLastPM: 320, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۵/۰۵', currentOperatorId: 'EMP-001', currentOperatorName: 'محمد رضایی', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 88, oeePerformance: 84, oeeQuality: 96, assetId: 'FA-IT-LAPTOP-014', glAccountCode: '1501' },
  { id: 'mch-002', code: 'MCH-002', nameFa: 'دستگاه تزریق شماره ۲', nameEn: 'Injection Molder 2', lineId: 'line-a', category: 'injection_molding', brand: 'Haitian', model: 'MA900', serialNumber: 'HT-2020-0332', installDate: '۱۳۹۸/۰۶/۱۵', status: 'running', operatingHoursTotal: 7800, operatingHoursSinceLastPM: 410, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۴/۲۸', currentOperatorId: 'EMP-002', currentOperatorName: 'علی حسینی', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 82, oeePerformance: 78, oeeQuality: 94, glAccountCode: '1501' },
  { id: 'mch-003', code: 'MCH-003', nameFa: 'دستگاه تزریق شماره ۳', nameEn: 'Injection Molder 3', lineId: 'line-b', category: 'injection_molding', brand: 'Engel', model: 'E-Motion 740', serialNumber: 'EN-2019-1187', installDate: '۱۳۹۷/۱۱/۰۱', status: 'idle', operatingHoursTotal: 8500, operatingHoursSinceLastPM: 90, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۶/۱۵', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 75, oeePerformance: 80, oeeQuality: 92, glAccountCode: '1501' },
  { id: 'mch-004', code: 'MCH-004', nameFa: 'دستگاه تزریق شماره ۴', nameEn: 'Injection Molder 4', lineId: 'line-b', category: 'injection_molding', brand: 'Engel', model: 'E-Motion 610', serialNumber: 'EN-2019-1188', installDate: '۱۳۹۷/۱۱/۰۱', status: 'maintenance', operatingHoursTotal: 8100, operatingHoursSinceLastPM: 495, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۴/۲۹', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 70, oeePerformance: 75, oeeQuality: 90, glAccountCode: '1501' },
  { id: 'mch-005', code: 'MCH-005', nameFa: 'دستگاه دمش شماره ۱', nameEn: 'Blow Molder 1', lineId: 'line-c', category: 'blow_molding', brand: 'Kautex', model: 'KEB5', serialNumber: 'KX-2022-0091', installDate: '۱۴۰۰/۰۱/۲۰', status: 'idle', operatingHoursTotal: 2600, operatingHoursSinceLastPM: 150, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۷/۰۱', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 90, oeePerformance: 88, oeeQuality: 97, glAccountCode: '1501' },
  { id: 'mch-006', code: 'MCH-006', nameFa: 'دستگاه بسته‌بندی', nameEn: 'Packaging Machine 1', lineId: 'line-c', category: 'packaging', brand: 'Multivac', model: 'R145', serialNumber: 'MV-2021-0733', installDate: '۱۴۰۰/۰۸/۱۲', status: 'running', operatingHoursTotal: 3900, operatingHoursSinceLastPM: 210, pmIntervalHours: 500, nextPMDue: '۱۴۰۳/۰۶/۲۰', maintenanceRecords: [], downtimeLogs: [], oeeAvailability: 92, oeePerformance: 90, oeeQuality: 98, glAccountCode: '1501' },
];

// Raw materials referenced: item-001 (HDPE granules), item-002 (PP granules), item-003..005
const MOCK_BOMS: BillOfMaterials[] = [
  {
    id: 'bom-001', bomNumber: 'BOM-00018', finishedItemId: 'fg-hdpe-fitting', finishedItemNameFa: 'اتصالات لوله HDPE', finishedItemSku: 'FG-HDPE-001',
    version: 'v1.2', status: 'active', outputQuantity: 1, outputUom: 'piece',
    lines: [
      { id: genId('boml'), itemId: 'item-001', itemNameFa: 'گرانول پلی‌اتیلن HDPE', itemSku: 'RM-PG-001', quantity: 0.45, uom: 'kg', scrapFactor: 0.03, effectiveQuantity: 0.4635, isOptional: false, notes: '' },
      { id: genId('boml'), itemId: 'item-003', itemNameFa: 'ورق فولاد ضدزنگ', itemSku: 'RM-SS-001', quantity: 0.02, uom: 'kg', scrapFactor: 0.01, effectiveQuantity: 0.0202, isOptional: true, notes: 'برای تقویت اتصال' },
    ],
    totalMaterialCost: 0, processingCost: 45000, totalCost: 0, effectiveFrom: '۱۴۰۳/۰۱/۰۱', createdAt: '۱۴۰۳/۰۱/۰۱',
  },
  {
    id: 'bom-002', bomNumber: 'BOM-00019', finishedItemId: 'fg-pp-container', finishedItemNameFa: 'ظرف پلی‌پروپیلن', finishedItemSku: 'FG-PP-001',
    version: 'v1.0', status: 'active', outputQuantity: 1, outputUom: 'piece',
    lines: [
      { id: genId('boml'), itemId: 'item-002', itemNameFa: 'گرانول پلی‌پروپیلن PP', itemSku: 'RM-PG-002', quantity: 0.12, uom: 'kg', scrapFactor: 0.02, effectiveQuantity: 0.1224, isOptional: false, notes: '' },
      { id: genId('boml'), itemId: 'item-004', itemNameFa: 'مواد شیمیایی افزودنی نوع ۱', itemSku: 'RM-CH-001', quantity: 0.005, uom: 'kg', scrapFactor: 0, effectiveQuantity: 0.005, isOptional: false, notes: 'رنگ‌دهنده' },
    ],
    totalMaterialCost: 0, processingCost: 12000, totalCost: 0, effectiveFrom: '۱۴۰۳/۰۱/۱۵', createdAt: '۱۴۰۳/۰۱/۱۵',
  },
  {
    id: 'bom-003', bomNumber: 'BOM-00020', finishedItemId: 'fg-hdpe-bottle', finishedItemNameFa: 'بطری دمشی HDPE', finishedItemSku: 'FG-HDPE-002',
    version: 'v1.0', status: 'draft', outputQuantity: 1, outputUom: 'piece',
    lines: [
      { id: genId('boml'), itemId: 'item-001', itemNameFa: 'گرانول پلی‌اتیلن HDPE', itemSku: 'RM-PG-001', quantity: 0.08, uom: 'kg', scrapFactor: 0.05, effectiveQuantity: 0.084, isOptional: false, notes: '' },
      { id: genId('boml'), itemId: 'item-005', itemNameFa: 'مواد شیمیایی افزودنی نوع ۲', itemSku: 'RM-CH-002', quantity: 0.003, uom: 'kg', scrapFactor: 0, effectiveQuantity: 0.003, isOptional: true, notes: '' },
    ],
    totalMaterialCost: 0, processingCost: 8000, totalCost: 0, effectiveFrom: '۱۴۰۳/۰۴/۰۱', createdAt: '۱۴۰۳/۰۴/۰۱',
  },
];

const MOCK_ORDERS: SalesOrder[] = [
  { id: 'so-001', orderNumber: 'SO-1403-00038', customerId: 'C-101', customerName: 'شرکت لوله‌سازی البرز', orderDate: '۱۴۰۳/۰۳/۱۰', requiredDate: '۱۴۰۳/۰۴/۲۰', status: 'in_production', priority: 'urgent',
    lines: [{ id: genId('ol'), itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', itemSku: 'FG-HDPE-001', quantity: 5000, uom: 'piece', unitPrice: 185000, totalPrice: 925000000, deliveredQuantity: 0, status: 'in_production' }],
    totalValue: 925000000, notes: '', createdAt: '۱۴۰۳/۰۳/۱۰', confirmedAt: '۱۴۰۳/۰۳/۱۱' },
  { id: 'so-002', orderNumber: 'SO-1403-00039', customerId: 'C-102', customerName: 'بازرگانی سبز پلیمر', orderDate: '۱۴۰۳/۰۳/۱۵', requiredDate: '۱۴۰۳/۰۴/۱۰', status: 'completed', priority: 'normal',
    lines: [{ id: genId('ol'), itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', itemSku: 'FG-PP-001', quantity: 12000, uom: 'piece', unitPrice: 42000, totalPrice: 504000000, deliveredQuantity: 12000, status: 'completed' }],
    totalValue: 504000000, notes: '', createdAt: '۱۴۰۳/۰۳/۱۵', confirmedAt: '۱۴۰۳/۰۳/۱۶', completedAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'so-003', orderNumber: 'SO-1403-00040', customerId: 'C-103', customerName: 'صنایع بسته‌بندی پارس', orderDate: '۱۴۰۳/۰۴/۰۱', requiredDate: '۱۴۰۳/۰۵/۰۱', status: 'confirmed', priority: 'normal',
    lines: [{ id: genId('ol'), itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', itemSku: 'FG-PP-001', quantity: 8000, uom: 'piece', unitPrice: 42000, totalPrice: 336000000, deliveredQuantity: 0, status: 'pending' }],
    totalValue: 336000000, notes: '', createdAt: '۱۴۰۳/۰۴/۰۱', confirmedAt: '۱۴۰۳/۰۴/۰۲' },
  { id: 'so-004', orderNumber: 'SO-1403-00041', customerId: 'C-104', customerName: 'گروه صنعتی زاگرس', orderDate: '۱۴۰۳/۰۴/۱۰', requiredDate: '۱۴۰۳/۰۵/۲۰', status: 'in_production', priority: 'critical',
    lines: [{ id: genId('ol'), itemId: 'fg-hdpe-bottle', itemNameFa: 'بطری دمشی HDPE', itemSku: 'FG-HDPE-002', quantity: 20000, uom: 'piece', unitPrice: 15000, totalPrice: 300000000, deliveredQuantity: 0, status: 'in_production' }],
    totalValue: 300000000, notes: 'سفارش فوری - اولویت با خط دمش', createdAt: '۱۴۰۳/۰۴/۱۰', confirmedAt: '۱۴۰۳/۰۴/۱۱' },
  { id: 'so-005', orderNumber: 'SO-1403-00042', customerId: 'C-101', customerName: 'شرکت لوله‌سازی البرز', orderDate: '۱۴۰۳/۰۴/۱۵', requiredDate: '۱۴۰۳/۰۵/۳۰', status: 'draft', priority: 'normal',
    lines: [{ id: genId('ol'), itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', itemSku: 'FG-HDPE-001', quantity: 3000, uom: 'piece', unitPrice: 185000, totalPrice: 555000000, deliveredQuantity: 0, status: 'pending' }],
    totalValue: 555000000, notes: '', createdAt: '۱۴۰۳/۰۴/۱۵' },
];

const MOCK_WORK_ORDERS: WorkOrder[] = [
  { id: 'wo-001', workOrderNumber: 'WO-1403-00012', salesOrderId: 'so-001', salesOrderNumber: 'SO-1403-00038', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', itemSku: 'FG-HDPE-001', plannedQuantity: 5000, actualQuantity: 3200, scrapQuantity: 85, uom: 'piece', lineId: 'line-a', lineName: 'خط تزریق A', scheduledStart: '۱۴۰۳/۰۴/۱۲', scheduledEnd: '۱۴۰۳/۰۴/۱۸', actualStart: '۱۴۰۳/۰۴/۱۲', status: 'in_progress', priority: 'urgent', assignedShift: 'morning', supervisorId: 'EMP-001', supervisorName: 'رضا کریمی', bomId: 'bom-001', estimatedDurationHours: 120, createdAt: '۱۴۰۳/۰۴/۱۱' },
  { id: 'wo-002', workOrderNumber: 'WO-1403-00013', salesOrderId: 'so-002', salesOrderNumber: 'SO-1403-00039', itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', itemSku: 'FG-PP-001', plannedQuantity: 12000, actualQuantity: 12040, scrapQuantity: 120, uom: 'piece', lineId: 'line-b', lineName: 'خط تزریق B', scheduledStart: '۱۴۰۳/۰۳/۲۰', scheduledEnd: '۱۴۰۳/۰۴/۰۵', actualStart: '۱۴۰۳/۰۳/۲۰', actualEnd: '۱۴۰۳/۰۴/۰۵', status: 'completed', priority: 'normal', assignedShift: 'afternoon', supervisorId: 'EMP-002', supervisorName: 'سعید نوری', bomId: 'bom-002', estimatedDurationHours: 200, actualDurationHours: 210, createdAt: '۱۴۰۳/۰۳/۱۹' },
  { id: 'wo-003', workOrderNumber: 'WO-1403-00014', salesOrderId: 'so-004', salesOrderNumber: 'SO-1403-00041', itemId: 'fg-hdpe-bottle', itemNameFa: 'بطری دمشی HDPE', itemSku: 'FG-HDPE-002', plannedQuantity: 20000, actualQuantity: 6500, scrapQuantity: 210, uom: 'piece', lineId: 'line-c', lineName: 'خط دمش', scheduledStart: '۱۴۰۳/۰۴/۱۴', scheduledEnd: '۱۴۰۳/۰۵/۰۵', actualStart: '۱۴۰۳/۰۴/۱۴', status: 'in_progress', priority: 'critical', assignedShift: 'afternoon', supervisorId: 'EMP-003', supervisorName: 'مریم احمدی', bomId: 'bom-003', estimatedDurationHours: 300, createdAt: '۱۴۰۳/۰۴/۱۳' },
  { id: 'wo-004', workOrderNumber: 'WO-1403-00015', salesOrderId: 'so-003', salesOrderNumber: 'SO-1403-00040', itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', itemSku: 'FG-PP-001', plannedQuantity: 8000, actualQuantity: 0, scrapQuantity: 0, uom: 'piece', lineId: 'line-b', lineName: 'خط تزریق B', scheduledStart: '۱۴۰۳/۰۵/۰۱', scheduledEnd: '۱۴۰۳/۰۵/۱۰', status: 'planned', priority: 'normal', assignedShift: 'morning', bomId: 'bom-002', estimatedDurationHours: 140, createdAt: '۱۴۰۳/۰۴/۲۰' },
  { id: 'wo-005', workOrderNumber: 'WO-1403-00016', salesOrderId: 'so-001', salesOrderNumber: 'SO-1403-00038', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', itemSku: 'FG-HDPE-001', plannedQuantity: 2000, actualQuantity: 0, scrapQuantity: 0, uom: 'piece', lineId: 'line-a', lineName: 'خط تزریق A', scheduledStart: '۱۴۰۳/۰۴/۱۹', scheduledEnd: '۱۴۰۳/۰۴/۲۳', status: 'released', priority: 'urgent', assignedShift: 'morning', supervisorId: 'EMP-001', supervisorName: 'رضا کریمی', bomId: 'bom-001', estimatedDurationHours: 48, createdAt: '۱۴۰۳/۰۴/۱۸' },
  { id: 'wo-006', workOrderNumber: 'WO-1403-00017', salesOrderId: 'so-005', salesOrderNumber: 'SO-1403-00042', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', itemSku: 'FG-HDPE-001', plannedQuantity: 3000, actualQuantity: 0, scrapQuantity: 0, uom: 'piece', lineId: 'line-a', lineName: 'خط تزریق A', scheduledStart: '۱۴۰۳/۰۵/۱۵', scheduledEnd: '۱۴۰۳/۰۵/۲۲', status: 'planned', priority: 'normal', assignedShift: 'night', bomId: 'bom-001', estimatedDurationHours: 96, createdAt: '۱۴۰۳/۰۴/۲۲' },
  { id: 'wo-007', workOrderNumber: 'WO-1403-00011', salesOrderId: 'so-002', salesOrderNumber: 'SO-1403-00039', itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', itemSku: 'FG-PP-001', plannedQuantity: 4000, actualQuantity: 3980, scrapQuantity: 40, uom: 'piece', lineId: 'line-c', lineName: 'خط دمش', scheduledStart: '۱۴۰۳/۰۳/۰۱', scheduledEnd: '۱۴۰۳/۰۳/۱۰', actualStart: '۱۴۰۳/۰۳/۰۱', actualEnd: '۱۴۰۳/۰۳/۱۰', status: 'completed', priority: 'normal', assignedShift: 'morning', supervisorId: 'EMP-002', supervisorName: 'مریم احمدی', bomId: 'bom-002', estimatedDurationHours: 80, actualDurationHours: 78, createdAt: '۱۴۰۳/۰۲/۲۸' },
];

const MOCK_QC: QualityCheck[] = [
  { id: 'qc-001', checkNumber: 'QC-1403-00082', workOrderId: 'wo-001', workOrderNumber: 'WO-1403-00012', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', checkType: 'in_process', sampleSize: 50, defectCount: 2, defectRate: 4, result: 'pass', checkedBy: 'زهرا محمدی', checkedAt: '۱۴۰۳/۰۴/۱۴',
    parameters: [{ name: 'ضخامت دیواره', unit: 'mm', target: 3.2, actual: 3.15, tolerance: 0.2, pass: true }, { name: 'وزن قطعه', unit: 'g', target: 145, actual: 143, tolerance: 5, pass: true }], notes: '', attachments: [] },
  { id: 'qc-002', checkNumber: 'QC-1403-00083', workOrderId: 'wo-002', workOrderNumber: 'WO-1403-00013', itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', checkType: 'final', sampleSize: 100, defectCount: 8, defectRate: 8, result: 'fail', checkedBy: 'حسین رضایی', checkedAt: '۱۴۰۳/۰۴/۰۴',
    parameters: [{ name: 'استحکام کششی', unit: 'MPa', target: 28, actual: 22, tolerance: 2, pass: false }, { name: 'وزن ظرف', unit: 'g', target: 38, actual: 37.5, tolerance: 1, pass: true }], notes: 'استحکام کششی پایین‌تر از حد مجاز', attachments: [] },
  { id: 'qc-003', checkNumber: 'QC-1403-00084', workOrderId: 'wo-003', workOrderNumber: 'WO-1403-00014', itemId: 'fg-hdpe-bottle', itemNameFa: 'بطری دمشی HDPE', checkType: 'in_process', sampleSize: 40, defectCount: 1, defectRate: 2.5, result: 'pass', checkedBy: 'زهرا محمدی', checkedAt: '۱۴۰۳/۰۴/۱۶',
    parameters: [{ name: 'ضخامت دیواره', unit: 'mm', target: 1.5, actual: 1.48, tolerance: 0.1, pass: true }], notes: '', attachments: [] },
  { id: 'qc-004', checkNumber: 'QC-1403-00085', workOrderId: 'wo-001', workOrderNumber: 'WO-1403-00012', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', checkType: 'final', sampleSize: 60, defectCount: 0, defectRate: 0, result: 'pending', checkedBy: 'حسین رضایی', checkedAt: '۱۴۰۳/۰۴/۱۷',
    parameters: [{ name: 'ضخامت دیواره', unit: 'mm', target: 3.2, actual: 3.2, tolerance: 0.2, pass: true }], notes: 'در انتظار نتیجه آزمایشگاه', attachments: [] },
];

const MOCK_NCRS: NCR[] = [
  { id: 'ncr-001', ncrNumber: 'NCR-1403-00012', workOrderId: 'wo-002', title: 'استحکام کششی پایین ظرف PP', description: 'در بازرسی نهایی، استحکام کششی ۸٪ از نمونه‌ها زیر حد مجاز بود.', severity: 'major', status: 'open', raisedBy: 'حسین رضایی', raisedAt: '۱۴۰۳/۰۴/۰۴', assignedTo: 'سعید نوری' },
  { id: 'ncr-002', ncrNumber: 'NCR-1403-00011', title: 'انحراف رنگ در محموله قبلی', description: 'رنگ محصول در یک پارت تولیدی با نمونه استاندارد مطابقت نداشت.', severity: 'minor', status: 'closed', raisedBy: 'زهرا محمدی', raisedAt: '۱۴۰۳/۰۳/۱۵', assignedTo: 'رضا کریمی', rootCause: 'دوز نادرست مستربچ رنگ', correctiveAction: 'اصلاح دستورالعمل دوزینگ و آموزش اپراتور', closedAt: '۱۴۰۳/۰۳/۲۲', closedBy: 'رضا کریمی' },
];

const MOCK_SCRAP: ScrapRecord[] = [
  { id: 'scrap-001', workOrderId: 'wo-001', itemId: 'fg-hdpe-fitting', itemNameFa: 'اتصالات لوله HDPE', quantity: 85, uom: 'piece', reason: 'setup_waste', cost: 6800000, recordedBy: 'رضا کریمی', recordedAt: '۱۴۰۳/۰۴/۱۴', disposalMethod: 'recycled' },
  { id: 'scrap-002', workOrderId: 'wo-002', itemId: 'fg-pp-container', itemNameFa: 'ظرف پلی‌پروپیلن', quantity: 120, uom: 'piece', reason: 'defect', cost: 2400000, recordedBy: 'سعید نوری', recordedAt: '۱۴۰۳/۰۴/۰۳', disposalMethod: 'disposal' },
  { id: 'scrap-003', workOrderId: 'wo-003', itemId: 'fg-hdpe-bottle', itemNameFa: 'بطری دمشی HDPE', quantity: 210, uom: 'piece', reason: 'machine_issue', cost: 3150000, recordedBy: 'مریم احمدی', recordedAt: '۱۴۰۳/۰۴/۱۶', disposalMethod: 'rework' },
];

const MOCK_PLANS: ProductionPlan[] = [
  { id: 'plan-001', planNumber: 'PP-1403-04', month: '۱۴۰۳/۰۴', status: 'in_progress', workOrders: ['wo-001', 'wo-003', 'wo-005'], totalPlannedUnits: 10000, totalActualUnits: 9700, createdAt: '۱۴۰۳/۰۳/۲۵' },
];

// ── Store ────────────────────────────────────────────────────────────────────

interface ProductionStore {
  salesOrders: SalesOrder[];
  workOrders: WorkOrder[];
  productionLines: ProductionLine[];
  machines: Machine[];
  qualityChecks: QualityCheck[];
  ncrs: NCR[];
  scrapRecords: ScrapRecord[];
  boms: BillOfMaterials[];
  plans: ProductionPlan[];
  activeTab: string;

  setActiveTab: (tab: string) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API

  createSalesOrder: (partial: Partial<SalesOrder>) => SalesOrder;
  confirmSalesOrder: (id: string) => void;

  createWorkOrder: (partial: Partial<WorkOrder>) => WorkOrder;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus, extra?: { actualQuantity?: number; scrapQuantity?: number }) => void;
  releaseWorkOrder: (id: string) => void;

  createQualityCheck: (partial: Partial<QualityCheck>) => QualityCheck;
  raiseNCR: (partial: Partial<NCR>) => NCR;
  closeNCR: (id: string, closedBy: string) => void;
  assignNCR: (id: string, assignedTo: string) => void;
  recordScrap: (partial: Partial<ScrapRecord>) => ScrapRecord;

  createBOM: (partial: Partial<BillOfMaterials>) => BillOfMaterials;
  approveBOM: (id: string, approverName: string) => void;

  updateLineStatus: (lineId: string, status: LineStatus) => void;
  logDowntime: (machineId: string, log: Partial<DowntimeLog>) => void;
  scheduleMaintenanceRecord: (machineId: string, record: Partial<MaintenanceRecord>) => void;

  // Cross-module
  triggerMaterialRequisition: (workOrderId: string) => void;
  postProductionVoucher: (workOrderId: string) => void;

  // Computed
  getProductionStats: () => {
    totalSalesOrders: number; pendingOrders: number; activeWorkOrders: number; completedThisMonth: number;
    totalPlannedUnits: number; totalActualUnits: number; overallOEE: number;
    linesRunning: number; linesIdle: number; linesMaintenance: number;
    openNCRs: number; totalScrapCost: number; pendingQualityChecks: number;
  };
  getMRPRequirements: (workOrderIds: string[]) => {
    itemId: string; itemNameFa: string; itemSku: string; uom: string;
    required: number; available: number; shortage: number; estimatedCost: number; suggestPR: boolean;
  }[];
  getWorkOrdersByLine: (lineId: string) => WorkOrder[];
  getScheduleForWeek: (weekStartDate: string) => { day: string; workOrders: WorkOrder[] }[];
}

export const useProductionStore = create<ProductionStore>()(
  persist(
    (set, get) => ({
      // داده‌های نمونه فقط در حالت دمو (VITE_USE_MOCKS=true) seed می‌شوند — BUG-PERSIST-001
      salesOrders: seedFromMock(MOCK_ORDERS),
      workOrders: seedFromMock(MOCK_WORK_ORDERS),
      productionLines: seedFromMock(MOCK_LINES),
      machines: seedFromMock(MOCK_MACHINES),
      qualityChecks: seedFromMock(MOCK_QC),
      ncrs: seedFromMock(MOCK_NCRS),
      scrapRecords: seedFromMock(MOCK_SCRAP),
      boms: seedFromMock(MOCK_BOMS),
      plans: seedFromMock(MOCK_PLANS),
      activeTab: 'dashboard',

      // ── API Integration (COMP-004 / BUG-PERSIST-001): خواندن از بک‌اند ──
      loadFromApi: async () => {
        // هر مجموعه جداگانه واکشی می‌شود: در موفقیت collection REPLACE می‌شود
        // (لیست خالی سرور ⇒ فروشگاه خالی، هرگز داده seed) و در شکست با toast
        // فارسی گزارش می‌شود و دست‌نخورده می‌ماند.
        await Promise.all([
          loadCollection<ProductionLine>(
            () => api.get<ProductionLine[]>('/production/lines'),
            (rows) => set({ productionLines: rows }),
          ),
          loadCollection<SalesOrder>(
            () => api.get<SalesOrder[]>('/production/sales-orders'),
            (rows) => set({ salesOrders: rows }),
          ),
          loadCollection<WorkOrder>(
            () => api.get<WorkOrder[]>('/production/work-orders'),
            (rows) => set({ workOrders: rows }),
          ),
          loadCollection<BillOfMaterials>(
            () => api.get<BillOfMaterials[]>('/production/boms'),
            (rows) => set({ boms: rows }),
          ),
          loadCollection<QualityCheck>(
            () => api.get<QualityCheck[]>('/production/quality-checks'),
            (rows) => set({ qualityChecks: rows }),
          ),
          loadCollection<NCR>(
            () => api.get<NCR[]>('/production/ncrs'),
            (rows) => set({ ncrs: rows }),
          ),
          loadCollection<ScrapRecord>(
            () => api.get<ScrapRecord[]>('/production/scrap'),
            (rows) => set({ scrapRecords: rows }),
          ),
        ]);
        // TODO(BACKEND): ماشین‌آلات (machines) و برنامه‌های تولید (plans) هنوز
        // endpoint خواندنی ندارند؛ تا پیاده‌سازی سرویس فقط از داده‌های محلی
        // (یا seed حالت دمو) استفاده می‌شود.
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      createSalesOrder: (partial) => {
        const lines = (partial.lines || []).map((l) => ({ ...l, totalPrice: l.quantity * l.unitPrice, deliveredQuantity: 0, status: 'pending' as const }));
        const order: SalesOrder = {
          id: genId('so'), orderNumber: generateSalesOrderNumber(),
          customerId: partial.customerId || genId('cust'), customerName: partial.customerName || '—',
          orderDate: partial.orderDate || 'امروز', requiredDate: partial.requiredDate || '—',
          status: 'draft', priority: partial.priority || 'normal', lines,
          totalValue: lines.reduce((s, l) => s + l.totalPrice, 0),
          notes: partial.notes || '', createdAt: new Date().toISOString(),
        };
        // فاز ۱ (خوش‌بینانه) بالا اعمال شد تا امضای همزمان action حفظ شود؛
        // سپس persistMutation درخواست سرور را اجرا و در شکست rollback + toast می‌کند.
        set((s) => ({ salesOrders: [order, ...s.salesOrders] }));
        void persistMutation<SalesOrder>({
          optimistic: () => undefined,
          request: () =>
            api.post<SalesOrder>('/production/sales-orders', {
              orderNumber: order.orderNumber,
              customerId: order.customerId,
              customerName: order.customerName,
              orderDate: order.orderDate,
              requiredDate: order.requiredDate,
              status: order.status,
              priority: order.priority,
              lines: order.lines.map((l) => ({
                id: l.id, itemId: l.itemId, itemNameFa: l.itemNameFa, itemSku: l.itemSku,
                quantity: l.quantity, uom: l.uom, unitPrice: l.unitPrice, totalPrice: l.totalPrice,
                deliveredQuantity: l.deliveredQuantity, status: l.status,
              })),
              totalValue: order.totalValue,
              notes: order.notes,
            }),
          rollback: () => set((s) => ({ salesOrders: s.salesOrders.filter((o) => o.id !== order.id) })),
          reconcile: (server) => set((s) => ({ salesOrders: reconcileEntity(s.salesOrders, order.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        });
        return order;
      },
      confirmSalesOrder: (id) => {
        const prev = get().salesOrders;
        const confirmedAt = new Date().toISOString();
        set((s) => ({
          salesOrders: s.salesOrders.map((o) => (o.id === id ? { ...o, status: 'confirmed' as const, confirmedAt } : o)),
        }));
        void persistMutation<SalesOrder>({
          optimistic: () => undefined,
          request: () => api.patch<SalesOrder>(`/production/sales-orders/${id}`, { status: 'confirmed', confirmedAt }),
          rollback: () => set({ salesOrders: prev }),
          reconcile: (server) => set((s) => ({ salesOrders: reconcileEntity(s.salesOrders, id, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        });
      },

      createWorkOrder: (partial) => {
        const order = get().salesOrders.find((o) => o.id === partial.salesOrderId);
        const line = get().productionLines.find((l) => l.id === partial.lineId);
        const wo: WorkOrder = {
          id: genId('wo'), workOrderNumber: generateWorkOrderNumber(),
          salesOrderId: partial.salesOrderId || '', salesOrderNumber: order?.orderNumber || '',
          itemId: partial.itemId || order?.lines[0]?.itemId || '', itemNameFa: partial.itemNameFa || order?.lines[0]?.itemNameFa || '',
          itemSku: partial.itemSku || order?.lines[0]?.itemSku || '',
          plannedQuantity: partial.plannedQuantity || order?.lines[0]?.quantity || 0,
          actualQuantity: 0, scrapQuantity: 0, uom: partial.uom || order?.lines[0]?.uom || 'piece',
          lineId: partial.lineId || '', lineName: line?.nameFa || '',
          scheduledStart: partial.scheduledStart || '—', scheduledEnd: partial.scheduledEnd || '—',
          status: 'planned', priority: partial.priority || order?.priority || 'normal',
          assignedShift: partial.assignedShift || 'morning',
          supervisorId: partial.supervisorId, supervisorName: partial.supervisorName,
          bomId: partial.bomId || get().boms.find((b) => b.finishedItemId === (partial.itemId || order?.lines[0]?.itemId))?.id || '',
          estimatedDurationHours: partial.estimatedDurationHours || 40, createdAt: new Date().toISOString(),
        };
        // وضعیت قبلی سفارش فروش برای rollback احتمالی نگه داشته می‌شود
        const prevSoStatus = get().salesOrders.find((o) => o.id === wo.salesOrderId)?.status;
        set((s) => ({
          workOrders: [wo, ...s.workOrders],
          salesOrders: s.salesOrders.map((o) => (o.id === wo.salesOrderId ? { ...o, status: 'in_production' as const } : o)),
        }));
        void persistMutation<WorkOrder>({
          optimistic: () => undefined,
          request: () =>
            api.post<WorkOrder>('/production/work-orders', {
              workOrderNumber: wo.workOrderNumber,
              salesOrderId: wo.salesOrderId, salesOrderNumber: wo.salesOrderNumber,
              itemId: wo.itemId, itemNameFa: wo.itemNameFa, itemSku: wo.itemSku,
              plannedQuantity: wo.plannedQuantity, uom: wo.uom,
              lineId: wo.lineId, lineName: wo.lineName,
              scheduledStart: wo.scheduledStart, scheduledEnd: wo.scheduledEnd,
              status: wo.status, priority: wo.priority, assignedShift: wo.assignedShift,
              supervisorId: wo.supervisorId, supervisorName: wo.supervisorName,
              bomId: wo.bomId, estimatedDurationHours: wo.estimatedDurationHours,
            }),
          rollback: () =>
            set((s) => ({
              workOrders: s.workOrders.filter((w) => w.id !== wo.id),
              salesOrders: s.salesOrders.map((o) =>
                o.id === wo.salesOrderId && prevSoStatus ? { ...o, status: prevSoStatus } : o
              ),
            })),
          reconcile: (server) => set((s) => ({ workOrders: reconcileEntity(s.workOrders, wo.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        }).then((server) => {
          // بررسی موجودی مواد با شناسه نهایی (شناسه سرور پس از reconcile، یا شناسه
          // محلی در حالت دمو). در حالت شکست، rollback دستور کار را حذف کرده و
          // triggerMaterialRequisition با پیدا نکردن دستور کار بدون‌کار می‌ماند.
          get().triggerMaterialRequisition(server?.id ?? wo.id);
        });
        return wo;
      },

      updateWorkOrderStatus: (id, status, extra) => {
        const prev = get().workOrders;
        const now = new Date().toISOString();
        set((s) => ({
          workOrders: s.workOrders.map((w) =>
            w.id === id
              ? {
                  ...w, status,
                  actualQuantity: extra?.actualQuantity ?? w.actualQuantity,
                  scrapQuantity: extra?.scrapQuantity ?? w.scrapQuantity,
                  actualStart: status === 'in_progress' && !w.actualStart ? now : w.actualStart,
                  actualEnd: status === 'completed' ? now : w.actualEnd,
                }
              : w
          ),
        }));
        void persistMutation<WorkOrder>({
          optimistic: () => undefined,
          request: () =>
            api.patch<WorkOrder>(`/production/work-orders/${id}/status`, {
              status,
              actualQuantity: extra?.actualQuantity,
              scrapQuantity: extra?.scrapQuantity,
            }),
          rollback: () => set({ workOrders: prev }),
          reconcile: (server) => set((s) => ({ workOrders: reconcileEntity(s.workOrders, id, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        }).then((server) => {
          if (status !== 'completed') return;
          // سند هزینه تولید فقط پس از موفقیت ذخیره سروری (یا در حالت دمو) ثبت می‌شود
          if (server || USE_MOCKS) get().postProductionVoucher(server?.id ?? id);
        });
      },

      releaseWorkOrder: (id) => {
        const prev = get().workOrders;
        set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, status: 'released' as const } : w)) }));
        const afterRelease = (resolvedId: string) => {
          get().triggerMaterialRequisition(resolvedId);
          const wo = get().workOrders.find((w) => w.id === resolvedId);
          toast.success(`دستور کار ${wo?.workOrderNumber} آزاد شد و درخواست مواد اولیه به انبار ارسال شد`);
        };
        if (USE_MOCKS) {
          afterRelease(id);
          return;
        }
        void persistMutation<WorkOrder>({
          optimistic: () => undefined,
          request: () => api.patch<WorkOrder>(`/production/work-orders/${id}`, { status: 'released' }),
          rollback: () => set({ workOrders: prev }),
          reconcile: (server) => {
            set((s) => ({ workOrders: reconcileEntity(s.workOrders, id, server) }));
            afterRelease(server.id || id);
          },
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
        });
      },

      createQualityCheck: (partial) => {
        const defectRate = partial.sampleSize ? ((partial.defectCount || 0) / partial.sampleSize) * 100 : 0;
        const qc: QualityCheck = {
          id: genId('qc'), checkNumber: generateQCNumber(),
          workOrderId: partial.workOrderId || '', workOrderNumber: partial.workOrderNumber || '',
          itemId: partial.itemId || '', itemNameFa: partial.itemNameFa || '',
          checkType: partial.checkType || 'in_process', sampleSize: partial.sampleSize || 0,
          defectCount: partial.defectCount || 0, defectRate: Math.round(defectRate * 100) / 100,
          result: partial.result || (defectRate > 5 ? 'fail' : 'pass'),
          checkedBy: partial.checkedBy || '—', checkedAt: new Date().toISOString().slice(0, 10),
          parameters: partial.parameters || [], notes: partial.notes || '', attachments: [],
        };
        set((s) => ({ qualityChecks: [qc, ...s.qualityChecks] }));
        void persistMutation<QualityCheck>({
          optimistic: () => undefined,
          request: () =>
            api.post<QualityCheck>('/production/quality-checks', {
              checkNumber: qc.checkNumber,
              workOrderId: qc.workOrderId, workOrderNumber: qc.workOrderNumber,
              itemId: qc.itemId, itemNameFa: qc.itemNameFa,
              checkType: qc.checkType, sampleSize: qc.sampleSize,
              defectCount: qc.defectCount, defectRate: qc.defectRate,
              result: qc.result, checkedBy: qc.checkedBy, checkedAt: qc.checkedAt,
              parameters: qc.parameters, notes: qc.notes, attachments: qc.attachments,
            }),
          rollback: () => set((s) => ({ qualityChecks: s.qualityChecks.filter((q) => q.id !== qc.id) })),
          reconcile: (server) => set((s) => ({ qualityChecks: reconcileEntity(s.qualityChecks, qc.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        });
        return qc;
      },

      raiseNCR: (partial) => {
        const ncr: NCR = {
          id: genId('ncr'), ncrNumber: generateNCRNumber(),
          workOrderId: partial.workOrderId, grnId: partial.grnId,
          title: partial.title || '—', description: partial.description || '',
          severity: partial.severity || 'minor', status: 'open',
          raisedBy: partial.raisedBy || '—', raisedAt: new Date().toISOString().slice(0, 10),
          assignedTo: partial.assignedTo,
        };
        set((s) => ({ ncrs: [ncr, ...s.ncrs] }));
        void persistMutation<NCR>({
          optimistic: () => undefined,
          request: () =>
            api.post<NCR>('/production/ncrs', {
              ncrNumber: ncr.ncrNumber,
              workOrderId: ncr.workOrderId, grnId: ncr.grnId,
              title: ncr.title, description: ncr.description,
              severity: ncr.severity, status: ncr.status,
              raisedBy: ncr.raisedBy, raisedAt: ncr.raisedAt, assignedTo: ncr.assignedTo,
            }),
          rollback: () => set((s) => ({ ncrs: s.ncrs.filter((n) => n.id !== ncr.id) })),
          reconcile: (server) => set((s) => ({ ncrs: reconcileEntity(s.ncrs, ncr.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        });
        return ncr;
      },
      closeNCR: (id, closedBy) => {
        const prev = get().ncrs;
        const closedAt = new Date().toISOString().slice(0, 10);
        set((s) => ({ ncrs: s.ncrs.map((n) => (n.id === id ? { ...n, status: 'closed' as const, closedAt, closedBy } : n)) }));
        void persistMutation<NCR>({
          optimistic: () => undefined,
          request: () => api.patch<NCR>(`/production/ncrs/${id}`, { status: 'closed', closedAt, closedBy }),
          rollback: () => set({ ncrs: prev }),
          reconcile: (server) => set((s) => ({ ncrs: reconcileEntity(s.ncrs, id, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        });
      },
      assignNCR: (id, assignedTo) => {
        const prev = get().ncrs;
        set((s) => ({ ncrs: s.ncrs.map((n) => (n.id === id ? { ...n, assignedTo, status: n.status === 'open' ? 'under_review' as const : n.status } : n)) }));
        const current = get().ncrs.find((n) => n.id === id);
        void persistMutation<NCR>({
          optimistic: () => undefined,
          request: () => api.patch<NCR>(`/production/ncrs/${id}`, { assignedTo, status: current?.status }),
          rollback: () => set({ ncrs: prev }),
          reconcile: (server) => set((s) => ({ ncrs: reconcileEntity(s.ncrs, id, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        });
      },

      recordScrap: (partial) => {
        const item = useInventoryStore.getState().getItemById(partial.itemId || '');
        const cost = (partial.quantity || 0) * (item?.movingAverageCost ?? 0);
        const scrap: ScrapRecord = {
          id: genId('scrap'), workOrderId: partial.workOrderId || '', itemId: partial.itemId || '',
          itemNameFa: partial.itemNameFa || item?.nameFa || '—', quantity: partial.quantity || 0,
          uom: partial.uom || item?.uom || 'piece', reason: partial.reason || 'other', cost,
          recordedBy: partial.recordedBy || '—', recordedAt: new Date().toISOString().slice(0, 10),
          disposalMethod: partial.disposalMethod || 'disposal',
        };
        set((s) => ({ scrapRecords: [scrap, ...s.scrapRecords] }));
        void persistMutation<ScrapRecord>({
          optimistic: () => undefined,
          request: () =>
            api.post<ScrapRecord>('/production/scrap', {
              workOrderId: scrap.workOrderId, itemId: scrap.itemId, itemNameFa: scrap.itemNameFa,
              quantity: scrap.quantity, uom: scrap.uom, reason: scrap.reason, cost: scrap.cost,
              recordedBy: scrap.recordedBy, recordedAt: scrap.recordedAt, disposalMethod: scrap.disposalMethod,
            }),
          rollback: () => set((s) => ({ scrapRecords: s.scrapRecords.filter((r) => r.id !== scrap.id) })),
          reconcile: (server) => set((s) => ({ scrapRecords: reconcileEntity(s.scrapRecords, scrap.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        });
        return scrap;
      },

      createBOM: (partial) => {
        const lines = (partial.lines || []).map((l) => ({ ...l, effectiveQuantity: l.quantity * (1 + (l.scrapFactor || 0)) }));
        const bom: BillOfMaterials = {
          id: genId('bom'), bomNumber: generateBOMNumber(),
          finishedItemId: partial.finishedItemId || '', finishedItemNameFa: partial.finishedItemNameFa || '',
          finishedItemSku: partial.finishedItemSku || '', version: partial.version || 'v1.0', status: 'draft',
          outputQuantity: partial.outputQuantity || 1, outputUom: partial.outputUom || 'piece', lines,
          totalMaterialCost: 0, processingCost: partial.processingCost || 0, totalCost: 0,
          effectiveFrom: partial.effectiveFrom || new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString(),
        };
        set((s) => ({ boms: [bom, ...s.boms] }));
        void persistMutation<BillOfMaterials>({
          optimistic: () => undefined,
          request: () =>
            api.post<BillOfMaterials>('/production/boms', {
              bomNumber: bom.bomNumber,
              finishedItemId: bom.finishedItemId, finishedItemNameFa: bom.finishedItemNameFa,
              finishedItemSku: bom.finishedItemSku, version: bom.version, status: bom.status,
              outputQuantity: bom.outputQuantity, outputUom: bom.outputUom,
              lines: bom.lines.map((l) => ({
                id: l.id, itemId: l.itemId, itemNameFa: l.itemNameFa, itemSku: l.itemSku,
                quantity: l.quantity, uom: l.uom, scrapFactor: l.scrapFactor,
                effectiveQuantity: l.effectiveQuantity, isOptional: l.isOptional, notes: l.notes,
              })),
              totalMaterialCost: bom.totalMaterialCost, processingCost: bom.processingCost, totalCost: bom.totalCost,
              effectiveFrom: bom.effectiveFrom,
            }),
          rollback: () => set((s) => ({ boms: s.boms.filter((b) => b.id !== bom.id) })),
          reconcile: (server) => set((s) => ({ boms: reconcileEntity(s.boms, bom.id, server) })),
          messageFa: PERSISTENCE_MESSAGES.createFailed,
          skip: USE_MOCKS,
        });
        return bom;
      },
      approveBOM: (id, approverName) => {
        const prev = get().boms;
        const approvedAt = new Date().toISOString().slice(0, 10);
        set((s) => ({ boms: s.boms.map((b) => (b.id === id ? { ...b, status: 'active' as const, approvedBy: approverName, approvedAt } : b)) }));
        void persistMutation<BillOfMaterials>({
          optimistic: () => undefined,
          request: () => api.patch<BillOfMaterials>(`/production/boms/${id}`, { status: 'active', approvedBy: approverName, approvedAt }),
          rollback: () => set({ boms: prev }),
          reconcile: (server) => set((s) => ({ boms: reconcileEntity(s.boms, id, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        });
      },

      updateLineStatus: (lineId, status) => {
        const prev = get().productionLines;
        set((s) => ({ productionLines: s.productionLines.map((l) => (l.id === lineId ? { ...l, currentStatus: status } : l)) }));
        // TODO(BACKEND): PATCH /production/lines/:id هنوز پیاده‌سازی نشده است
        // (کنترلر فعلی فقط GET و POST دارد). تا افزودن endpoint، درخواست ارسال
        // می‌شود و خطای 404 با rollback و toast فارسی به کاربر گزارش می‌گردد.
        void persistMutation<ProductionLine>({
          optimistic: () => undefined,
          request: () => api.patch<ProductionLine>(`/production/lines/${lineId}`, { currentStatus: status }),
          rollback: () => set({ productionLines: prev }),
          reconcile: (server) => set((s) => ({ productionLines: reconcileEntity(s.productionLines, lineId, server) })),
          messageFa: PERSISTENCE_MESSAGES.updateFailed,
          skip: USE_MOCKS,
        });
      },
      // TODO(BACKEND): endpoint ثبت خرابی ماشین (downtime) وجود ندارد؛ فعلاً فقط
      // به‌صورت محلی اعمال می‌شود و با رفرش صفحه از بین می‌رود.
      logDowntime: (machineId, log) => {
        const entry: DowntimeLog = {
          id: genId('dt'), machineId, startTime: log.startTime || new Date().toISOString(),
          endTime: log.endTime, reason: log.reason || 'other', description: log.description || '',
          impact: log.impact || 'minor', reportedBy: log.reportedBy || '—', resolvedBy: log.resolvedBy,
          durationMinutes: log.durationMinutes,
        };
        set((s) => ({
          machines: s.machines.map((m) => (m.id === machineId ? { ...m, downtimeLogs: [entry, ...m.downtimeLogs], status: entry.impact === 'critical' ? 'breakdown' as const : m.status } : m)),
        }));
      },
      // TODO(BACKEND): endpoint برنامه‌ریزی تعمیرات نگهداری وجود ندارد؛ فعلاً فقط
      // به‌صورت محلی اعمال می‌شود و با رفرش صفحه از بین می‌رود.
      scheduleMaintenanceRecord: (machineId, record) => {
        const entry: MaintenanceRecord = {
          id: genId('pm'), machineId, type: record.type || 'preventive', description: record.description || '',
          performedBy: record.performedBy || '—', performedAt: record.performedAt || new Date().toISOString().slice(0, 10),
          durationHours: record.durationHours || 0, cost: record.cost || 0, nextScheduledDate: record.nextScheduledDate,
          partReplaced: record.partReplaced, workOrderRef: record.workOrderRef,
        };
        set((s) => ({
          machines: s.machines.map((m) => (m.id === machineId ? { ...m, maintenanceRecords: [entry, ...m.maintenanceRecords], operatingHoursSinceLastPM: 0 } : m)),
        }));
      },

      // ── Cross-module: Production → Inventory (MRP) ──────────────────────
      triggerMaterialRequisition: (workOrderId) => {
        const wo = get().workOrders.find((w) => w.id === workOrderId);
        const bom = get().boms.find((b) => b.id === wo?.bomId);
        if (!wo || !bom) return;

        const inventory = useInventoryStore.getState();
        const shortageLines = bom.lines
          .map((line) => {
            const required = line.effectiveQuantity * wo.plannedQuantity;
            const item = inventory.items.find((i) => i.id === line.itemId);
            const available = item?.availableQuantity ?? 0;
            return { line, item, required, available, shortage: Math.max(0, required - available) };
          })
          .filter((x) => x.shortage > 0 && x.item);

        if (shortageLines.length === 0) return;

        inventory.createRequisition({
          requesterName: wo.supervisorName || 'واحد تولید',
          departmentId: wo.lineName,
          purpose: 'production',
          priority: wo.priority,
          productionOrderId: wo.id,
          lineItems: shortageLines.map((s) => ({
            id: genId('mli'), itemId: s.item!.id, itemName: s.item!.nameFa,
            requestedQuantity: Math.ceil(s.shortage), issuedQuantity: 0, uom: s.item!.uom,
            allocatedLotIds: [], pickedLocationIds: [], status: 'pending',
          })),
          totalEstimatedCost: shortageLines.reduce((sum, s) => sum + s.shortage * (s.item?.movingAverageCost ?? 0), 0),
        });
        toast.success('درخواست مواد خودکار ایجاد شد — در ماژول انبار قابل پیگیری است');
      },

      // ── Cross-module: Production → Finance (production cost voucher) ────
      postProductionVoucher: (workOrderId) => {
        const wo = get().workOrders.find((w) => w.id === workOrderId);
        const bom = get().boms.find((b) => b.id === wo?.bomId);
        if (!wo) return;

        const inventory = useInventoryStore.getState();
        const qty = wo.actualQuantity || wo.plannedQuantity;
        const amount = bom
          ? bom.lines.reduce((sum, line) => {
              const item = inventory.items.find((i) => i.id === line.itemId);
              return sum + line.effectiveQuantity * qty * (item?.movingAverageCost ?? 0);
            }, 0)
          : 0;
        if (amount <= 0) return;

        const finance = useFinanceStore.getState();
        const cogsAccount = finance.accounts.find((a) => a.code === '5101');
        const inventoryAccount = finance.accounts.find((a) => a.code === '1104');

        const voucher = finance.createVoucher({
          type: 'general', referenceType: 'production', referenceId: workOrderId,
          description: `هزینه تولید سفارش ${wo.workOrderNumber}`,
          entries: [
            {
              id: genId('je'), voucherId: '', accountId: cogsAccount?.id ?? '', accountCode: cogsAccount?.code ?? '5101',
              description: `بهای مواد مصرفی - ${wo.workOrderNumber}`, debit: amount, credit: 0,
              currency: 'IRR', exchangeRate: 1, debitBaseCurrency: amount, creditBaseCurrency: 0, sourceModule: 'production',
            },
            {
              id: genId('je'), voucherId: '', accountId: inventoryAccount?.id ?? '', accountCode: inventoryAccount?.code ?? '1104',
              description: `کاهش موجودی مواد اولیه - ${wo.workOrderNumber}`, debit: 0, credit: amount,
              currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: amount, sourceModule: 'production',
            },
          ],
          status: 'draft',
        });
        finance.postVoucher(voucher.id);
        toast.success('سند حسابداری تولید ثبت شد');
      },

      // ── Computed ──────────────────────────────────────────────────────────
      getProductionStats: () => {
        const s = get();
        const linesRunning = s.productionLines.filter((l) => l.currentStatus === 'running').length;
        const linesIdle = s.productionLines.filter((l) => l.currentStatus === 'idle').length;
        const linesMaintenance = s.productionLines.filter((l) => l.currentStatus === 'maintenance').length;
        const overallOEE = s.productionLines.length
          ? Math.round((s.productionLines.reduce((sum, l) => sum + l.oee, 0) / s.productionLines.length) * 10) / 10
          : 0;
        return {
          totalSalesOrders: s.salesOrders.length,
          pendingOrders: s.salesOrders.filter((o) => o.status === 'confirmed').length,
          activeWorkOrders: s.workOrders.filter((w) => w.status === 'in_progress').length,
          completedThisMonth: s.workOrders.filter((w) => w.status === 'completed').length,
          totalPlannedUnits: s.workOrders.reduce((sum, w) => sum + w.plannedQuantity, 0),
          totalActualUnits: s.workOrders.reduce((sum, w) => sum + w.actualQuantity, 0),
          overallOEE, linesRunning, linesIdle, linesMaintenance,
          openNCRs: s.ncrs.filter((n) => n.status === 'open' || n.status === 'under_review').length,
          totalScrapCost: s.scrapRecords.reduce((sum, r) => sum + r.cost, 0),
          pendingQualityChecks: s.qualityChecks.filter((q) => q.result === 'pending').length,
        };
      },

      getMRPRequirements: (workOrderIds) => {
        const s = get();
        const inventory = useInventoryStore.getState();
        const aggregated = new Map<string, { itemNameFa: string; itemSku: string; uom: string; required: number }>();

        workOrderIds.forEach((woId) => {
          const wo = s.workOrders.find((w) => w.id === woId);
          const bom = s.boms.find((b) => b.id === wo?.bomId);
          if (!wo || !bom) return;
          bom.lines.forEach((line) => {
            const required = line.effectiveQuantity * wo.plannedQuantity;
            const existing = aggregated.get(line.itemId);
            aggregated.set(line.itemId, {
              itemNameFa: line.itemNameFa, itemSku: line.itemSku, uom: line.uom,
              required: (existing?.required ?? 0) + required,
            });
          });
        });

        return Array.from(aggregated.entries()).map(([itemId, agg]) => {
          const item = inventory.items.find((i) => i.id === itemId);
          const available = item?.availableQuantity ?? 0;
          const shortage = Math.max(0, agg.required - available);
          return {
            itemId, itemNameFa: agg.itemNameFa, itemSku: agg.itemSku, uom: agg.uom,
            required: Math.round(agg.required * 1000) / 1000, available,
            shortage: Math.round(shortage * 1000) / 1000,
            estimatedCost: Math.round(shortage * (item?.movingAverageCost ?? 0)),
            suggestPR: shortage > 0,
          };
        });
      },

      getWorkOrdersByLine: (lineId) => get().workOrders.filter((w) => w.lineId === lineId),

      // _weekStartDate عمداً استفاده نمی‌شود (امضای عمومی action باید حفظ شود)
      getScheduleForWeek: (_weekStartDate) => {
        const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
        const workOrders = get().workOrders;
        return dayNames.map((day) => ({ day, workOrders }));
      },
    }),
    {
      name: 'production-store',
      storage: createJSONStorage(() => zustandLocalStorage),
    }
  )
);
