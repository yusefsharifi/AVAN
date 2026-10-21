import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { zustandLocalStorage } from '@/shared/lib/persist';
import { useInventoryStore } from '@/modules/inventory';
import { vendorApi, purchaseRequestApi, purchaseOrderApi, rfqApi, vendorContractApi } from '../api';
import { USE_MOCKS, seedFromMock, reportMutationError } from '@/shared/lib/mockMode';
import { persistMutation, reconcileEntity, loadCollection } from '@/shared/lib/serverSync';
import { useTenantStore } from '@/core/stores/useTenantStore';
import { useFinanceStore } from '@/modules/finance';
import type {
  Vendor, VendorPerformanceMetric, PurchaseRequest, PRLine, RFQ, VendorQuotation,
  PurchaseOrder, POLine, POReceipt, VendorContract,
} from '../types';
import {
  generatePRNumber, generateRFQNumber, generatePONumber, generateVCNumber, generatePORNumber,
  computeVendorScore, computeQuotationScore, computePOTotals, getDaysUntilExpiry, groupLinesByVendor,
} from '../utils';

export const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Mock data ────────────────────────────────────────────────────────────────

const perf3 = (a1: number, q1: number, p1: number, a2: number, q2: number, p2: number, a3: number, q3: number, p3: number): VendorPerformanceMetric[] => [
  { period: '۱۴۰۳/۰۲', onTimeDeliveryRate: a1, qualityAcceptanceRate: q1, priceComplianceRate: p1, orderCount: 6, totalPurchaseValue: 1200000000, averageLeadTimeDays: 7 },
  { period: '۱۴۰۳/۰۳', onTimeDeliveryRate: a2, qualityAcceptanceRate: q2, priceComplianceRate: p2, orderCount: 8, totalPurchaseValue: 1650000000, averageLeadTimeDays: 6 },
  { period: '۱۴۰۳/۰۴', onTimeDeliveryRate: a3, qualityAcceptanceRate: q3, priceComplianceRate: p3, orderCount: 7, totalPurchaseValue: 1400000000, averageLeadTimeDays: 6 },
];

const MOCK_VENDORS: Vendor[] = [
  {
    id: 'vnd-001', vendorCode: 'VND-001', nameFa: 'پتروپلیمر خاورمیانه', nameEn: 'MidEast PetroPolymer', taxId: '14005678901',
    category: 'raw_material', subCategories: ['پلی‌اتیلن', 'پلی‌پروپیلن', 'گرانول'], status: 'active', paymentTerms: 'net30',
    creditLimit: 5000000000, currentBalance: 850000000, address: 'شهرک صنعتی، بلوار پتروشیمی، پلاک ۱۲', city: 'ماهشهر', province: 'خوزستان',
    phone: '۰۶۱۵۲۲۳۳۴۴', website: 'petropolymer.ir', bankName: 'بانک ملت', bankAccount: '۰۱۰۲۰۳۰۴۰۵۰۶',
    contacts: [
      { id: genId('vc'), name: 'رضا کاظمی', title: 'مدیر فروش', phone: '۰۶۱۵۲۲۳۳۴۴', mobile: '۰۹۱۶۱۱۱۲۲۳۳', email: 'kazemi@petropolymer.ir', isPrimary: true },
      { id: genId('vc'), name: 'سارا مرادی', title: 'کارشناس بازرگانی', phone: '۰۶۱۵۲۲۳۳۴۵', mobile: '۰۹۱۶۲۲۲۳۳۴۴', email: 'moradi@petropolymer.ir', isPrimary: false },
    ],
    documents: [
      { id: genId('vd'), type: 'trade_license', name: 'جواز کسب', expiryDate: '۱۴۰۴/۰۶/۰۱', isVerified: true, uploadedAt: '۱۴۰۲/۰۱/۱۰' },
      { id: genId('vd'), type: 'iso_certificate', name: 'گواهی ISO 9001', expiryDate: '۱۴۰۴/۰۹/۱۵', isVerified: true, uploadedAt: '۱۴۰۲/۰۳/۰۱' },
    ],
    performanceHistory: perf3(90, 95, 92, 88, 94, 90, 89, 96, 93), overallScore: 87,
    approvedItemCategories: ['مواد شیمیایی'], leadTimeDays: 6, minimumOrderValue: 100000000, glAccountId: 'ACC-006',
    createdAt: '۱۴۰۱/۰۵/۰۱', approvedAt: '۱۴۰۱/۰۵/۱۰', approvedBy: 'مدیر خرید', notes: '',
  },
  {
    id: 'vnd-002', vendorCode: 'VND-002', nameFa: 'تجهیزات صنعتی آریا', nameEn: 'Arya Industrial Equipment', taxId: '14009988776',
    category: 'equipment', subCategories: ['قطعات دستگاه تزریق', 'یاتاقان', 'موتور'], status: 'active', paymentTerms: 'net45',
    creditLimit: 2000000000, currentBalance: 320000000, address: 'تهران، جاده مخصوص کرج، کیلومتر ۱۵', city: 'تهران', province: 'تهران',
    phone: '۰۲۱۴۴۵۵۶۶۷۷', bankName: 'بانک صادرات', bankAccount: '۰۲۰۳۰۴۰۵۰۶۰۷',
    contacts: [{ id: genId('vc'), name: 'حمید یوسفی', title: 'مدیر فنی', phone: '۰۲۱۴۴۵۵۶۶۷۷', mobile: '۰۹۱۲۳۳۳۴۴۵۵', email: 'yousefi@arya-ind.ir', isPrimary: true }],
    documents: [{ id: genId('vd'), type: 'trade_license', name: 'جواز کسب', expiryDate: '۱۴۰۳/۱۰/۰۱', isVerified: true, uploadedAt: '۱۴۰۱/۰۲/۰۱' }],
    performanceHistory: perf3(75, 82, 80, 78, 79, 76, 72, 80, 74), overallScore: 74,
    approvedItemCategories: ['قطعات یدکی'], leadTimeDays: 10, minimumOrderValue: 20000000, glAccountId: 'ACC-006',
    createdAt: '۱۴۰۱/۰۸/۱۵', approvedAt: '۱۴۰۱/۰۸/۲۰', approvedBy: 'مدیر خرید', notes: '',
  },
  {
    id: 'vnd-003', vendorCode: 'VND-003', nameFa: 'بسته‌بندی نوین ایران', nameEn: 'Novin Packaging Iran', taxId: '14001122334',
    category: 'packaging', subCategories: ['کارتن', 'استرچ فیلم', 'پالت'], status: 'active', paymentTerms: 'net15',
    creditLimit: 1500000000, currentBalance: 150000000, address: 'اصفهان، شهرک صنعتی محمودآباد', city: 'اصفهان', province: 'اصفهان',
    phone: '۰۳۱۳۳۲۲۱۱۰۰', bankName: 'بانک تجارت', bankAccount: '۰۳۰۴۰۵۰۶۰۷۰۸',
    contacts: [{ id: genId('vc'), name: 'فاطمه رستمی', title: 'مدیر فروش', phone: '۰۳۱۳۳۲۲۱۱۰۰', mobile: '۰۹۱۳۴۴۴۵۵۶۶', email: 'rostami@novinpack.ir', isPrimary: true }],
    documents: [{ id: genId('vd'), type: 'quality_certificate', name: 'گواهی کیفیت', expiryDate: '۱۴۰۴/۰۲/۰۱', isVerified: true, uploadedAt: '۱۴۰۲/۰۲/۰۱' }],
    performanceHistory: perf3(93, 96, 95, 92, 97, 93, 94, 98, 94), overallScore: 91,
    approvedItemCategories: ['بسته‌بندی'], leadTimeDays: 4, minimumOrderValue: 15000000, glAccountId: 'ACC-006',
    createdAt: '۱۴۰۱/۰۳/۰۱', approvedAt: '۱۴۰۱/۰۳/۰۵', approvedBy: 'مدیر خرید', notes: '',
  },
  {
    id: 'vnd-004', vendorCode: 'VND-004', nameFa: 'مواد شیمیایی الوند', nameEn: 'Alvand Chemicals', taxId: '14007766554',
    category: 'chemicals', subCategories: ['مستربچ', 'افزودنی', 'رنگ'], status: 'active', paymentTerms: 'net30',
    creditLimit: 1000000000, currentBalance: 410000000, address: 'کرج، شهرک صنعتی اشتهارد', city: 'کرج', province: 'البرز',
    phone: '۰۲۶۳۶۷۷۸۸۹۹', bankName: 'بانک ملی', bankAccount: '۰۴۰۵۰۶۰۷۰۸۰۹',
    contacts: [{ id: genId('vc'), name: 'محسن قاسمی', title: 'کارشناس فروش', phone: '۰۲۶۳۶۷۷۸۸۹۹', mobile: '۰۹۱۴۵۵۵۶۶۷۷', email: 'ghasemi@alvandchem.ir', isPrimary: true }],
    documents: [{ id: genId('vd'), type: 'tax_certificate', name: 'گواهی مالیاتی', expiryDate: '۱۴۰۳/۰۸/۱۵', isVerified: false, uploadedAt: '۱۴۰۲/۰۴/۰۱' }],
    performanceHistory: perf3(65, 70, 68, 60, 65, 62, 58, 62, 60), overallScore: 62,
    approvedItemCategories: ['مواد شیمیایی'], leadTimeDays: 12, minimumOrderValue: 30000000, glAccountId: 'ACC-006',
    createdAt: '۱۴۰۱/۰۹/۱۰', approvedAt: '۱۴۰۱/۰۹/۱۵', approvedBy: 'مدیر خرید', notes: 'کیفیت تحویل نیاز به پیگیری دارد',
  },
  {
    id: 'vnd-005', vendorCode: 'VND-005', nameFa: 'خدمات فنی کاسپین', nameEn: 'Caspian Technical Services', taxId: '14003344556',
    category: 'services', subCategories: ['تعمیرات', 'کالیبراسیون'], status: 'pending_approval', paymentTerms: 'net30',
    creditLimit: 500000000, currentBalance: 0, address: 'رشت، جاده تهران، کیلومتر ۵', city: 'رشت', province: 'گیلان',
    phone: '۰۱۳۳۳۴۴۵۵۶', bankName: 'بانک پارسیان', bankAccount: '۰۵۰۶۰۷۰۸۰۹۱۰',
    contacts: [{ id: genId('vc'), name: 'آرش نجفی', title: 'مدیرعامل', phone: '۰۱۳۳۳۴۴۵۵۶', mobile: '۰۹۱۱۶۶۶۷۷۸۸', email: 'najafi@caspiants.ir', isPrimary: true }],
    documents: [{ id: genId('vd'), type: 'trade_license', name: 'جواز کسب', expiryDate: '۱۴۰۳/۰۵/۲۰', isVerified: false, uploadedAt: '۱۴۰۳/۰۴/۰۱' }],
    performanceHistory: perf3(50, 58, 55, 52, 56, 58, 55, 60, 58), overallScore: 55,
    approvedItemCategories: ['خدمات عمومی'], leadTimeDays: 3, minimumOrderValue: 5000000,
    createdAt: '۱۴۰۳/۰۴/۰۱', notes: 'در انتظار بررسی مدارک',
  },
];

const MOCK_PRS: PurchaseRequest[] = [
  {
    id: 'pr-001', prNumber: 'PR-1403-00018', source: 'reorder_auto', sourceRef: 'RM-PG-001', requestedBy: 'سیستم MRP', requestedByDept: 'انبار',
    requiredDate: '۱۴۰۳/۰۵/۰۵', status: 'po_created', priority: 'urgent',
    lines: [{ id: genId('prl'), itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', itemSku: 'RM-PG-001', uom: 'kg', requestedQuantity: 30000, approvedQuantity: 30000, estimatedUnitPrice: 44500, totalEstimated: 1335000000, requiredDate: '۱۴۰۳/۰۵/۰۵', notes: '' }],
    totalEstimated: 1335000000, justification: 'موجودی این کالا به زیر نقطه سفارش مجدد رسیده است.', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۰', updatedAt: '۱۴۰۳/۰۴/۱۲',
  },
  {
    id: 'pr-002', prNumber: 'PR-1403-00019', source: 'manual', requestedBy: 'رضا کریمی', requestedByDept: 'خط تزریق A',
    requiredDate: '۱۴۰۳/۰۵/۱۰', status: 'approved', priority: 'normal',
    lines: [{ id: genId('prl'), itemId: 'item-002', itemNameFa: 'گرانول پلی‌پروپیلن', itemSku: 'RM-PG-002', uom: 'kg', requestedQuantity: 20000, approvedQuantity: 20000, estimatedUnitPrice: 39000, totalEstimated: 780000000, requiredDate: '۱۴۰۳/۰۵/۱۰', notes: '' }],
    totalEstimated: 780000000, justification: 'نیاز تولید برای سفارش SO-1403-00040', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۵', updatedAt: '۱۴۰۳/۰۴/۱۶', approvedBy: 'مدیر خرید', approvedAt: '۱۴۰۳/۰۴/۱۶',
  },
  {
    id: 'pr-003', prNumber: 'PR-1403-00020', source: 'manual', requestedBy: 'سعید نوری', requestedByDept: 'خط تزریق B',
    requiredDate: '۱۴۰۳/۰۵/۲۰', status: 'pending_approval', priority: 'normal',
    lines: [{ id: genId('prl'), itemId: 'item-004', itemNameFa: 'مواد شیمیایی افزودنی نوع ۱', itemSku: 'RM-CH-001', uom: 'kg', requestedQuantity: 500, estimatedUnitPrice: 1200000, totalEstimated: 600000000, requiredDate: '۱۴۰۳/۰۵/۲۰', notes: '' }],
    totalEstimated: 600000000, justification: 'کمبود مستربچ رنگ', attachments: [], createdAt: '۱۴۰۳/۰۴/۲۰', updatedAt: '۱۴۰۳/۰۴/۲۰',
  },
  {
    id: 'pr-004', prNumber: 'PR-1403-00021', source: 'mrp_auto', sourceRef: 'WO-1403-00014', requestedBy: 'سیستم MRP تولید', requestedByDept: 'خط دمش',
    requiredDate: '۱۴۰۳/۰۵/۰۱', status: 'rfq_sent', priority: 'critical',
    lines: [{ id: genId('prl'), itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', itemSku: 'RM-PG-001', uom: 'kg', requestedQuantity: 12000, approvedQuantity: 12000, estimatedUnitPrice: 45000, totalEstimated: 540000000, requiredDate: '۱۴۰۳/۰۵/۰۱', notes: '' }],
    totalEstimated: 540000000, justification: 'کمبود مواد اولیه برای دستور کار WO-1403-00014', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۳', updatedAt: '۱۴۰۳/۰۴/۱۴', approvedBy: 'مدیر خرید', approvedAt: '۱۴۰۳/۰۴/۱۴',
  },
];

const criteria = { priceWeight: 50, deliveryWeight: 30, vendorScoreWeight: 20 };

const MOCK_RFQS: RFQ[] = [
  {
    id: 'rfq-001', rfqNumber: 'RFQ-1403-00013', prId: 'pr-003', prNumber: 'PR-1403-00020', title: 'استعلام خرید افزودنی شیمیایی',
    description: 'خرید ۵۰۰ کیلوگرم افزودنی شیمیایی نوع ۱', status: 'sent', sentToVendors: ['vnd-004'], responseDeadline: '۱۴۰۳/۰۴/۲۸',
    quotations: [{ id: genId('vq'), rfqId: 'rfq-001', vendorId: 'vnd-004', vendorName: 'مواد شیمیایی الوند', quotationNumber: '', validUntil: '', paymentTerms: 'net30', deliveryTerms: '', lines: [], totalAmount: 0, discount: 0, finalAmount: 0, vatAmount: 0, grandTotal: 0, status: 'pending', notes: '', attachments: [] }],
    evaluationCriteria: criteria, createdAt: '۱۴۰۳/۰۴/۲۰', createdBy: 'مدیر خرید',
  },
  {
    id: 'rfq-002', rfqNumber: 'RFQ-1403-00014', prId: 'pr-004', prNumber: 'PR-1403-00021', title: 'استعلام فوری گرانول HDPE',
    description: 'خرید فوری ۱۲,۰۰۰ کیلوگرم گرانول HDPE', status: 'responses_received', sentToVendors: ['vnd-001', 'vnd-004'], responseDeadline: '۱۴۰۳/۰۴/۱۸',
    quotations: [
      { id: 'vq-201', rfqId: 'rfq-002', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', quotationNumber: 'QT-8834', receivedAt: '۱۴۰۳/۰۴/۱۶', validUntil: '۱۴۰۳/۰۵/۱۶', paymentTerms: 'net30', deliveryTerms: 'DAP انبار مشتری',
        lines: [{ prLineId: 'prl-1', itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', itemSku: 'RM-PG-001', requestedQuantity: 12000, offeredQuantity: 12000, unitPrice: 45200, totalPrice: 542400000, deliveryDays: 5, notes: '' }],
        totalAmount: 542400000, discount: 1, finalAmount: 537000000, vatAmount: 53700000, grandTotal: 590700000, status: 'received', evaluationScore: 91.2, notes: '', attachments: [] },
      { id: 'vq-202', rfqId: 'rfq-002', vendorId: 'vnd-004', vendorName: 'مواد شیمیایی الوند', quotationNumber: 'AL-2291', receivedAt: '۱۴۰۳/۰۴/۱۷', validUntil: '۱۴۰۳/۰۵/۱۰', paymentTerms: 'net15', deliveryTerms: 'تحویل درب کارخانه',
        lines: [{ prLineId: 'prl-1', itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', itemSku: 'RM-PG-001', requestedQuantity: 12000, offeredQuantity: 12000, unitPrice: 43800, totalPrice: 525600000, deliveryDays: 11, notes: '' }],
        totalAmount: 525600000, discount: 0, finalAmount: 525600000, vatAmount: 52560000, grandTotal: 578160000, status: 'received', evaluationScore: 78.4, notes: '', attachments: [] },
    ],
    evaluationCriteria: criteria, createdAt: '۱۴۰۳/۰۴/۱۳', createdBy: 'مدیر خرید',
  },
  {
    id: 'rfq-003', rfqNumber: 'RFQ-1403-00012', prId: 'pr-001', prNumber: 'PR-1403-00018', title: 'استعلام گرانول HDPE (سفارش خودکار)',
    description: 'خرید ۳۰,۰۰۰ کیلوگرم گرانول HDPE', status: 'awarded', sentToVendors: ['vnd-001'], responseDeadline: '۱۴۰۳/۰۴/۱۵',
    quotations: [{ id: 'vq-101', rfqId: 'rfq-003', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', quotationNumber: 'QT-8811', receivedAt: '۱۴۰۳/۰۴/۱۲', validUntil: '۱۴۰۳/۰۵/۱۲', paymentTerms: 'net30', deliveryTerms: 'DAP انبار مشتری',
      lines: [{ prLineId: 'prl-2', itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', itemSku: 'RM-PG-001', requestedQuantity: 30000, offeredQuantity: 30000, unitPrice: 44500, totalPrice: 1335000000, deliveryDays: 6, notes: '' }],
      totalAmount: 1335000000, discount: 0, finalAmount: 1335000000, vatAmount: 133500000, grandTotal: 1468500000, status: 'awarded', evaluationScore: 95, notes: '', attachments: [] }],
    evaluationCriteria: criteria, awardedVendorId: 'vnd-001', awardedQuotationId: 'vq-101', awardedAt: '۱۴۰۳/۰۴/۱۳', awardedBy: 'مدیر خرید',
    createdAt: '۱۴۰۳/۰۴/۱۰', createdBy: 'مدیر خرید',
  },
];

function buildPOLine(itemId: string, itemNameFa: string, itemSku: string, uom: string, ordered: number, received: number, unitPrice: number): POLine {
  const lineTotal = ordered * unitPrice;
  const vatAmount = Math.round(lineTotal * 0.1);
  return { id: genId('pol'), itemId, itemNameFa, itemSku, uom, orderedQuantity: ordered, receivedQuantity: received, pendingQuantity: ordered - received, invoicedQuantity: 0, unitPrice, lineTotal, vatRate: 10, vatAmount, lineTotalWithVat: lineTotal + vatAmount, notes: '' };
}

const MOCK_POS: PurchaseOrder[] = [
  (() => {
    const lines = [buildPOLine('item-004', 'مواد شیمیایی افزودنی نوع ۱', 'RM-CH-001', 'kg', 500, 0, 1250000)];
    const totals = computePOTotals(lines);
    return { id: 'po-001', poNumber: 'PO-1403-00035', prId: 'pr-003', prNumber: 'PR-1403-00020', vendorId: 'vnd-004', vendorName: 'مواد شیمیایی الوند', vendorCode: 'VND-004',
      status: 'draft' as const, orderDate: '۱۴۰۳/۰۴/۲۲', requiredDeliveryDate: '۱۴۰۳/۰۵/۰۵', deliveryAddress: 'انبار مرکزی کارخانه', paymentTerms: 'net30' as const,
      lines, ...totals, paidAmount: 0, balanceDue: totals.grandTotal, notes: '', attachments: [], createdAt: '۱۴۰۳/۰۴/۲۲', createdBy: 'مدیر خرید' };
  })(),
  (() => {
    const lines = [buildPOLine('item-001', 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', 'RM-PG-001', 'kg', 12000, 0, 45200)];
    const totals = computePOTotals(lines);
    return { id: 'po-002', poNumber: 'PO-1403-00036', rfqId: 'rfq-002', rfqNumber: 'RFQ-1403-00014', prId: 'pr-004', prNumber: 'PR-1403-00021', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', vendorCode: 'VND-001',
      status: 'sent' as const, orderDate: '۱۴۰۳/۰۴/۱۸', requiredDeliveryDate: '۱۴۰۳/۰۴/۲۳', deliveryAddress: 'انبار مرکزی کارخانه', paymentTerms: 'net30' as const,
      lines, ...totals, paidAmount: 0, balanceDue: totals.grandTotal, sentAt: '۱۴۰۳/۰۴/۱۸', notes: '', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۸', createdBy: 'مدیر خرید' };
  })(),
  (() => {
    const lines = [buildPOLine('item-002', 'گرانول پلی‌پروپیلن', 'RM-PG-002', 'kg', 20000, 12000, 39000)];
    const totals = computePOTotals(lines);
    return { id: 'po-003', poNumber: 'PO-1403-00033', prId: 'pr-002', prNumber: 'PR-1403-00019', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', vendorCode: 'VND-001',
      status: 'partially_received' as const, orderDate: '۱۴۰۳/۰۴/۱۶', requiredDeliveryDate: '۱۴۰۳/۰۴/۲۲', actualDeliveryDate: '۱۴۰۳/۰۴/۲۰', deliveryAddress: 'انبار مرکزی کارخانه', paymentTerms: 'net30' as const,
      lines, ...totals, paidAmount: 0, balanceDue: totals.grandTotal, sentAt: '۱۴۰۳/۰۴/۱۶', notes: '', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۶', createdBy: 'مدیر خرید' };
  })(),
  (() => {
    const lines = [buildPOLine('item-001', 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', 'RM-PG-001', 'kg', 30000, 30000, 44500)];
    const totals = computePOTotals(lines);
    return { id: 'po-004', poNumber: 'PO-1403-00030', rfqId: 'rfq-003', rfqNumber: 'RFQ-1403-00012', prId: 'pr-001', prNumber: 'PR-1403-00018', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', vendorCode: 'VND-001',
      status: 'invoiced' as const, orderDate: '۱۴۰۳/۰۴/۱۱', requiredDeliveryDate: '۱۴۰۳/۰۴/۱۷', actualDeliveryDate: '۱۴۰۳/۰۴/۱۶', deliveryAddress: 'انبار مرکزی کارخانه', paymentTerms: 'net30' as const,
      lines, ...totals, paidAmount: 0, balanceDue: totals.grandTotal, sentAt: '۱۴۰۳/۰۴/۱۱', invoiceNumber: 'INV-9012', invoiceDate: '۱۴۰۳/۰۴/۱۶', glJournalVoucherId: 'JV-002',
      notes: '', attachments: [], createdAt: '۱۴۰۳/۰۴/۱۱', createdBy: 'مدیر خرید' };
  })(),
];

const MOCK_RECEIPTS: POReceipt[] = [
  { id: 'por-001', poId: 'po-003', poNumber: 'PO-1403-00033', receiptNumber: 'POR-1403-00016', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', receivedAt: '۱۴۰۳/۰۴/۲۰', receivedBy: 'محمد رضایی', vehiclePlate: 'الف-۱۲۳-ب', driverName: 'اکبر صادقی',
    lines: [{ poLineId: 'pol-1', itemId: 'item-002', itemNameFa: 'گرانول پلی‌پروپیلن', receivedQuantity: 12000, acceptedQuantity: 12000, rejectedQuantity: 0, batchNumber: 'LOT-4021' }],
    qualityStatus: 'accepted', notes: '', createdAt: '۱۴۰۳/۰۴/۲۰' },
  { id: 'por-002', poId: 'po-004', poNumber: 'PO-1403-00030', receiptNumber: 'POR-1403-00014', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', receivedAt: '۱۴۰۳/۰۴/۱۶', receivedBy: 'علی حسینی', vehiclePlate: 'ج-۴۵۶-د', driverName: 'حسن نوروزی',
    lines: [{ poLineId: 'pol-2', itemId: 'item-001', itemNameFa: 'گرانول پلاستیکی اچ‌دی‌پی‌ئی', receivedQuantity: 30000, acceptedQuantity: 30000, rejectedQuantity: 0, batchNumber: 'LOT-3987' }],
    qualityStatus: 'accepted', notes: '', createdAt: '۱۴۰۳/۰۴/۱۶' },
];

const MOCK_CONTRACTS: VendorContract[] = [
  { id: 'vc-001', contractNumber: 'VC-1403-00007', vendorId: 'vnd-001', vendorName: 'پتروپلیمر خاورمیانه', type: 'framework', title: 'قرارداد چارچوبی تأمین گرانول ۱۴۰۳',
    description: 'تأمین سالانه گرانول HDPE و PP با قیمت توافقی', status: 'active', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۴/۰۱/۰۱',
    totalValue: 15000000000, consumedValue: 3200000000, remainingValue: 11800000000, currency: 'IRR', paymentSchedule: 'پرداخت ۳۰ روزه پس از هر تحویل',
    milestones: [
      { id: genId('cm'), title: 'تحویل فصل بهار', dueDate: '۱۴۰۳/۰۳/۳۰', completedDate: '۱۴۰۳/۰۳/۲۸', value: 3200000000, status: 'completed' },
      { id: genId('cm'), title: 'تحویل فصل تابستان', dueDate: '۱۴۰۳/۰۶/۳۰', value: 3800000000, status: 'pending' },
    ],
    linkedPOIds: ['po-002', 'po-003', 'po-004'], autoRenew: true, renewalNoticeDays: 60, signatoryCompany: 'مدیرعامل شرکت پلاستیک ایران', signatoryVendor: 'رضا کاظمی',
    attachments: [], approvedBy: 'مدیرعامل', approvedAt: '۱۴۰۲/۱۲/۲۰', notes: '', createdAt: '۱۴۰۲/۱۲/۱۵' },
  { id: 'vc-002', contractNumber: 'VC-1403-00008', vendorId: 'vnd-003', vendorName: 'بسته‌بندی نوین ایران', type: 'supply', title: 'قرارداد تأمین کارتن و بسته‌بندی',
    description: 'تأمین ماهانه کارتن و استرچ فیلم', status: 'expiring_soon', startDate: '۱۴۰۲/۰۸/۰۱', endDate: '۱۴۰۳/۰۵/۲۵',
    totalValue: 2400000000, consumedValue: 2100000000, remainingValue: 300000000, currency: 'IRR', paymentSchedule: 'پرداخت ۱۵ روزه',
    milestones: [], linkedPOIds: [], autoRenew: false, renewalNoticeDays: 30, signatoryCompany: 'مدیر خرید', signatoryVendor: 'فاطمه رستمی',
    attachments: [], approvedBy: 'مدیر خرید', approvedAt: '۱۴۰۲/۰۷/۲۰', notes: 'نیاز به تصمیم تمدید', createdAt: '۱۴۰۲/۰۷/۱۵' },
  { id: 'vc-003', contractNumber: 'VC-1403-00005', vendorId: 'vnd-002', vendorName: 'تجهیزات صنعتی آریا', type: 'service', title: 'قرارداد نگهداری تجهیزات ۱۴۰۲',
    description: 'خدمات نگهداری پیشگیرانه ماشین‌آلات تزریق', status: 'expired', startDate: '۱۴۰۲/۰۱/۰۱', endDate: '۱۴۰۳/۰۱/۰۱',
    totalValue: 800000000, consumedValue: 800000000, remainingValue: 0, currency: 'IRR', paymentSchedule: 'پرداخت فصلی',
    milestones: [], linkedPOIds: [], autoRenew: false, renewalNoticeDays: 30, signatoryCompany: 'مدیر تولید', signatoryVendor: 'حمید یوسفی',
    attachments: [], approvedBy: 'مدیر تولید', approvedAt: '۱۴۰۱/۱۲/۲۰', notes: '', createdAt: '۱۴۰۱/۱۲/۱۵' },
];

// ── Store ────────────────────────────────────────────────────────────────────

interface ProcurementStore {
  vendors: Vendor[];
  purchaseRequests: PurchaseRequest[];
  rfqs: RFQ[];
  purchaseOrders: PurchaseOrder[];
  receipts: POReceipt[];
  contracts: VendorContract[];
  activeTab: string;

  setActiveTab: (tab: string) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API

  createVendor: (partial: Partial<Vendor>) => Vendor;
  approveVendor: (id: string, approverName: string) => void;
  blacklistVendor: (id: string, reason: string) => void;
  updateVendorScore: (vendorId: string) => void;

  createPurchaseRequest: (partial: Partial<PurchaseRequest>) => PurchaseRequest;
  approvePurchaseRequest: (id: string, approverName: string, approvedLines?: { lineId: string; approvedQuantity: number }[]) => void;
  createPRFromReorderSuggestions: () => PurchaseRequest[];

  createRFQ: (prId: string, vendorIds: string[], responseDeadline: string) => RFQ;
  receiveQuotation: (rfqId: string, vendorId: string, quotationData: Partial<VendorQuotation>) => void;
  awardRFQ: (rfqId: string, quotationId: string, awardedBy: string) => void;

  createPurchaseOrder: (partial: Partial<PurchaseOrder>) => PurchaseOrder;
  approvePurchaseOrder: (id: string, approverName: string) => void;
  sendPurchaseOrder: (id: string) => void;
  receivePOGoods: (poId: string, receiptData: Partial<POReceipt>) => POReceipt;
  recordPayment: (poId: string, amount: number, paymentDate: string, referenceNumber: string) => void;

  createContract: (partial: Partial<VendorContract>) => VendorContract;
  terminateContract: (id: string, reason: string) => void;
  linkPOToContract: (poId: string, contractId: string) => void;
  getExpiringContracts: (daysAhead: number) => VendorContract[];

  getProcurementStats: () => {
    totalVendors: number; activeVendors: number; pendingApprovalVendors: number;
    openPRs: number; openRFQs: number; pendingPOs: number; totalPOValueThisMonth: number;
    pendingReceipts: number; overduePayments: number; expiringContracts: number;
    totalPayablesOutstanding: number; avgVendorScore: number; topVendorId: string;
  };
  getVendorSpendAnalysis: () => { vendorId: string; vendorName: string; totalSpend: number; poCount: number; avgLeadTime: number }[];
  getItemPriceHistory: (itemId: string) => { date: string; vendorName: string; unitPrice: number; quantity: number; poNumber: string }[];
  getPRToGRNLeadTime: (prId: string) => number | null;
}

let seq = 100;
const nextSeq = () => ++seq;

// ── Server persistence helpers (BUG-PERSIST-001) ─────────────────────────────
//
// The backend ValidationPipe runs with `whitelist: true` +
// `forbidNonWhitelisted: true` (backend/src/main.ts), so payloads must contain
// ONLY the whitelisted DTO fields (backend/src/modules/inventory/dto/create-dtos.ts).

/** Demo mode keeps everything local — never touch the network. */
const whenLive = async <T>(call: () => Promise<T>): Promise<T | undefined> =>
  USE_MOCKS ? undefined : call();

/** zoneId/companyId required by the inventory create DTOs. */
const tenantIds = () => {
  const { zoneId, companyId } = useTenantStore.getState().tenant;
  return { zoneId: zoneId ?? '', companyId: companyId ?? '' };
};

/** Frontend priority (critical/urgent/…) → backend RequisitionPriority enum. */
const toServerPriority = (priority: string): string => {
  const p = priority.toLowerCase();
  if (p === 'critical' || p === 'urgent') return 'URGENT';
  if (p === 'high') return 'HIGH';
  if (p === 'low') return 'LOW';
  return 'NORMAL';
};

/** Local vendor → CreateVendorDto (only whitelisted fields). */
const toServerVendor = (vendor: Vendor): Record<string, unknown> => ({
  zoneId: tenantIds().zoneId,
  code: vendor.vendorCode,
  nameFa: vendor.nameFa,
  ...(vendor.nameEn ? { nameEn: vendor.nameEn } : {}),
  ...(vendor.taxId ? { taxId: vendor.taxId } : {}),
  ...(vendor.phone ? { phone: vendor.phone } : {}),
  ...(vendor.address ? { address: vendor.address } : {}),
  ...(vendor.paymentTerms ? { paymentTerms: vendor.paymentTerms } : {}),
  ...(vendor.notes ? { notes: vendor.notes } : {}),
});

/** Local PR → CreatePurchaseRequestDto (only whitelisted fields). */
const toServerPurchaseRequest = (pr: PurchaseRequest): Record<string, unknown> => {
  const { zoneId, companyId } = tenantIds();
  return {
    zoneId,
    companyId,
    purpose: pr.justification || '',
    requiredDate: pr.requiredDate,
    priority: toServerPriority(pr.priority),
    lines: pr.lines.map((l) => ({
      itemName: l.itemNameFa,
      unit: l.uom,
      requestedQty: l.requestedQuantity,
      ...(l.itemId ? { itemId: l.itemId } : {}),
      ...(l.itemSku ? { itemCode: l.itemSku } : {}),
      ...(l.estimatedUnitPrice ? { unitPrice: Math.round(l.estimatedUnitPrice) } : {}),
    })),
  };
};

/** Local PO → CreatePurchaseOrderDto (only whitelisted fields). */
const toServerPurchaseOrder = (po: PurchaseOrder): Record<string, unknown> => {
  const { zoneId, companyId } = tenantIds();
  return {
    zoneId,
    vendorName: po.vendorName,
    orderDate: po.orderDate,
    ...(companyId ? { companyId } : {}),
    ...(po.vendorId ? { vendorId: po.vendorId } : {}),
    ...(po.requiredDeliveryDate && po.requiredDeliveryDate !== '—' ? { expectedDate: po.requiredDeliveryDate } : {}),
    ...(po.paymentTerms ? { paymentTerms: po.paymentTerms } : {}),
    ...(po.deliveryAddress ? { deliveryAddress: po.deliveryAddress } : {}),
    ...(po.prId ? { purchaseRequestId: po.prId } : {}),
    ...(po.notes ? { notes: po.notes } : {}),
    lines: po.lines.map((l) => ({
      itemName: l.itemNameFa,
      unit: l.uom,
      orderedQty: l.orderedQuantity,
      unitPrice: Math.round(l.unitPrice),
      ...(l.itemId ? { itemId: l.itemId } : {}),
    })),
  };
};

export const useProcurementStore = create<ProcurementStore>()(
  persist(
    (set, get) => ({
      vendors: seedFromMock(MOCK_VENDORS),
      purchaseRequests: seedFromMock(MOCK_PRS),
      rfqs: seedFromMock(MOCK_RFQS),
      purchaseOrders: seedFromMock(MOCK_POS),
      receipts: seedFromMock(MOCK_RECEIPTS),
      contracts: seedFromMock(MOCK_CONTRACTS),
      activeTab: 'dashboard',

      // ── API Integration (COMP-004 / BUG-PERSIST-001): hydrate from backend ──
      // Server data REPLACES the local collection — an empty server list yields
      // an empty store (never the demo seed data).
      loadFromApi: async () => {
        if (USE_MOCKS) return;
        await Promise.all([
          loadCollection<Vendor>(
            () => vendorApi.list() as Promise<Vendor[]>,
            (rows) => set({ vendors: rows }),
          ),
          loadCollection<PurchaseRequest>(
            () => purchaseRequestApi.list() as Promise<PurchaseRequest[]>,
            (rows) => set({ purchaseRequests: rows }),
          ),
          loadCollection<PurchaseOrder>(
            () => purchaseOrderApi.list() as Promise<PurchaseOrder[]>,
            (rows) => set({ purchaseOrders: rows }),
          ),
        ]);
        // TODO(BACKEND): no list endpoints yet for RFQs (/inventory/rfqs), vendor
        // contracts (/inventory/contracts) or PO receipts — the wrappers in ../api
        // exist for the first two but the backend controllers do not, so those
        // collections stay local until the endpoints are implemented.
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      // ── Vendors ────────────────────────────────────────────────────────
      createVendor: (partial) => {
        const vendor: Vendor = {
          id: genId('vnd'), vendorCode: `VND-${String(get().vendors.length + 1).padStart(3, '0')}`,
          nameFa: partial.nameFa || '—', nameEn: partial.nameEn, taxId: partial.taxId || '',
          category: partial.category || 'other', subCategories: partial.subCategories || [], status: 'pending_approval',
          paymentTerms: partial.paymentTerms || 'net30', creditLimit: partial.creditLimit || 0, currentBalance: 0,
          address: partial.address || '', city: partial.city || '', province: partial.province || '', phone: partial.phone || '',
          website: partial.website, bankName: partial.bankName || '', bankAccount: partial.bankAccount || '',
          contacts: partial.contacts || [], documents: partial.documents || [], performanceHistory: [], overallScore: 0,
          approvedItemCategories: partial.approvedItemCategories || [], leadTimeDays: partial.leadTimeDays || 7,
          minimumOrderValue: partial.minimumOrderValue || 0, glAccountId: partial.glAccountId,
          createdAt: new Date().toISOString(), notes: partial.notes || '',
        };
        void persistMutation<Vendor>({
          optimistic: () => set((s) => ({ vendors: [vendor, ...s.vendors] })),
          request: () => whenLive(() => vendorApi.create(toServerVendor(vendor))),
          rollback: () => set((s) => ({ vendors: s.vendors.filter((v) => v.id !== vendor.id) })),
          reconcile: (server) => set((s) => ({ vendors: reconcileEntity(s.vendors, vendor.id, server) })),
          messageFa: 'خطا در ذخیره‌سازی تأمین‌کننده؛ رکورد ایجاد نشد',
        });
        return vendor;
      },
      approveVendor: (id, approverName) => {
        set((s) => ({ vendors: s.vendors.map((v) => (v.id === id ? { ...v, status: 'active' as const, approvedAt: new Date().toISOString().slice(0, 10), approvedBy: approverName } : v)) }));
      },
      blacklistVendor: (id, reason) => {
        set((s) => ({ vendors: s.vendors.map((v) => (v.id === id ? { ...v, status: 'blacklisted' as const, notes: `${v.notes} | لیست سیاه: ${reason}`.trim() } : v)) }));
      },
      updateVendorScore: (vendorId) => {
        set((s) => ({ vendors: s.vendors.map((v) => (v.id === vendorId ? { ...v, overallScore: computeVendorScore(v.performanceHistory) } : v)) }));
      },

      // ── Purchase Requests ─────────────────────────────────────────────
      createPurchaseRequest: (partial) => {
        const lines = (partial.lines || []).map((l) => ({ ...l, totalEstimated: l.requestedQuantity * l.estimatedUnitPrice }));
        const pr: PurchaseRequest = {
          id: genId('pr'), prNumber: generatePRNumber(nextSeq()), source: partial.source || 'manual', sourceRef: partial.sourceRef,
          requestedBy: partial.requestedBy || '—', requestedByDept: partial.requestedByDept || '—',
          requiredDate: partial.requiredDate || '—', status: 'pending_approval', priority: partial.priority || 'normal', lines,
          totalEstimated: lines.reduce((s, l) => s + l.totalEstimated, 0),
          justification: partial.justification || (partial.source === 'mrp_auto' || partial.source === 'reorder_auto' ? 'ایجاد خودکار بر اساس نیاز موجودی/تولید' : ''),
          attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        void persistMutation<PurchaseRequest>({
          optimistic: () => set((s) => ({ purchaseRequests: [pr, ...s.purchaseRequests] })),
          request: () => whenLive(() => purchaseRequestApi.create(toServerPurchaseRequest(pr))),
          rollback: () => set((s) => ({ purchaseRequests: s.purchaseRequests.filter((p) => p.id !== pr.id) })),
          reconcile: (server) => set((s) => ({ purchaseRequests: reconcileEntity(s.purchaseRequests, pr.id, server) })),
          messageFa: 'خطا در ذخیره‌سازی درخواست خرید؛ رکورد ایجاد نشد',
        });
        return pr;
      },
      approvePurchaseRequest: (id, approverName, approvedLines) => {
        set((s) => ({
          purchaseRequests: s.purchaseRequests.map((pr) =>
            pr.id === id
              ? {
                  ...pr, status: 'approved' as const, approvedBy: approverName, approvedAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString(),
                  lines: pr.lines.map((l) => {
                    const override = approvedLines?.find((a) => a.lineId === l.id);
                    return override ? { ...l, approvedQuantity: override.approvedQuantity } : { ...l, approvedQuantity: l.approvedQuantity ?? l.requestedQuantity };
                  }),
                }
              : pr
          ),
        }));
      },
      createPRFromReorderSuggestions: () => {
        const inventory = useInventoryStore.getState();
        const lowStockItems = inventory.items.filter((i) => i.availableQuantity <= i.reorderPoint);
        const groups = groupLinesByVendor(lowStockItems, get().vendors);
        const created: PurchaseRequest[] = [];

        groups.forEach((group) => {
          const lines: PRLine[] = group.items.map((item) => ({
            id: genId('prl'), itemId: item.id, itemNameFa: item.nameFa, itemSku: item.sku, uom: item.uom,
            requestedQuantity: item.reorderQuantity, estimatedUnitPrice: item.lastPurchasePrice,
            totalEstimated: item.reorderQuantity * item.lastPurchasePrice, requiredDate: '—', notes: '',
          }));
          const pr = get().createPurchaseRequest({
            source: 'reorder_auto', sourceRef: group.items.map((i) => i.sku).join(', '),
            requestedBy: 'سیستم بازسفارش خودکار', requestedByDept: 'انبار', priority: 'urgent', lines,
          });
          created.push(pr);
        });

        toast.success(`${created.length} درخواست خرید خودکار ایجاد شد`);
        return created;
      },

      // ── RFQ ───────────────────────────────────────────────────────────
      createRFQ: (prId, vendorIds, responseDeadline) => {
        const pr = get().purchaseRequests.find((p) => p.id === prId);
        const rfq: RFQ = {
          id: genId('rfq'), rfqNumber: generateRFQNumber(nextSeq()), prId, prNumber: pr?.prNumber ?? '',
          title: `استعلام برای ${pr?.prNumber ?? ''}`, description: pr?.justification ?? '', status: 'sent',
          sentToVendors: vendorIds, responseDeadline,
          quotations: vendorIds.map((vId) => {
            const vendor = get().vendors.find((v) => v.id === vId);
            return { id: genId('vq'), rfqId: '', vendorId: vId, vendorName: vendor?.nameFa ?? '—', quotationNumber: '', validUntil: '', paymentTerms: vendor?.paymentTerms ?? 'net30', deliveryTerms: '', lines: [], totalAmount: 0, discount: 0, finalAmount: 0, vatAmount: 0, grandTotal: 0, status: 'pending' as const, notes: '', attachments: [] };
          }),
          evaluationCriteria: { priceWeight: 50, deliveryWeight: 30, vendorScoreWeight: 20 },
          createdAt: new Date().toISOString(), createdBy: 'مدیر خرید',
        };
        rfq.quotations = rfq.quotations.map((q) => ({ ...q, rfqId: rfq.id }));
        const prevPr = get().purchaseRequests.find((p) => p.id === prId);
        // TODO(BACKEND): rfqApi posts to /inventory/rfqs — the backend has no RFQ
        // controller yet, so a live run surfaces the failure (rollback + toast).
        const persisted = persistMutation<RFQ>({
          optimistic: () =>
            set((s) => ({
              rfqs: [rfq, ...s.rfqs],
              purchaseRequests: s.purchaseRequests.map((p) => (p.id === prId ? { ...p, status: 'rfq_sent' as const, updatedAt: new Date().toISOString() } : p)),
            })),
          request: () => whenLive(() => rfqApi.create(rfq)),
          rollback: () =>
            set((s) => ({
              rfqs: s.rfqs.filter((r) => r.id !== rfq.id),
              purchaseRequests: prevPr ? s.purchaseRequests.map((p) => (p.id === prId ? prevPr : p)) : s.purchaseRequests,
            })),
          reconcile: (server) => set((s) => ({ rfqs: reconcileEntity(s.rfqs, rfq.id, server) })),
          messageFa: 'خطا در ذخیره‌سازی استعلام قیمت؛ رکورد ایجاد نشد',
        });
        // Success toast only in demo mode or once the server confirmed (BUG-PERSIST-001).
        if (USE_MOCKS) {
          toast.success(`استعلام قیمت برای ${vendorIds.length} تأمین‌کننده ارسال شد`);
        } else {
          void persisted.then((server) => {
            if (server) toast.success(`استعلام قیمت برای ${vendorIds.length} تأمین‌کننده ارسال شد`);
          });
        }
        return rfq;
      },

      receiveQuotation: (rfqId, vendorId, quotationData) => {
        const rfq = get().rfqs.find((r) => r.id === rfqId);
        if (!rfq) return;
        const vendor = get().vendors.find((v) => v.id === vendorId);

        const lines = quotationData.lines || [];
        const totalAmount = lines.reduce((s, l) => s + l.totalPrice, 0);
        const discount = quotationData.discount || 0;
        const finalAmount = Math.round(totalAmount * (1 - discount / 100));
        const vatAmount = Math.round(finalAmount * 0.1);
        const grandTotal = finalAmount + vatAmount;

        const updatedQuotation: VendorQuotation = {
          id: rfq.quotations.find((q) => q.vendorId === vendorId)?.id ?? genId('vq'), rfqId, vendorId, vendorName: vendor?.nameFa ?? '—',
          quotationNumber: quotationData.quotationNumber || '—', receivedAt: new Date().toISOString().slice(0, 10),
          validUntil: quotationData.validUntil || '—', paymentTerms: quotationData.paymentTerms || vendor?.paymentTerms || 'net30',
          deliveryTerms: quotationData.deliveryTerms || '', lines, totalAmount, discount, finalAmount, vatAmount, grandTotal,
          status: 'received', notes: quotationData.notes || '', attachments: [],
        };

        const allQuotations = rfq.quotations.map((q) => (q.vendorId === vendorId ? updatedQuotation : q));
        const scoredQuotations = allQuotations.map((q) =>
          q.vendorId === vendorId
            ? { ...q, evaluationScore: computeQuotationScore(q, allQuotations, vendor?.overallScore ?? 0, rfq.evaluationCriteria) }
            : q
        );

        const anyReceived = scoredQuotations.some((q) => q.status === 'received');
        set((s) => ({
          rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, quotations: scoredQuotations, status: anyReceived ? 'responses_received' as const : r.status } : r)),
        }));
        toast.success('پیشنهاد قیمت ثبت و امتیازدهی شد');
        // TODO(BACKEND): no quotation endpoint exists (neither in ../api nor in
        // the backend — /inventory/rfqs has no controller) — local-only for now.
        if (!USE_MOCKS) {
          reportMutationError({
            messageFa: 'پیشنهاد قیمت فقط به‌صورت محلی ثبت شد و در سرور ذخیره نشد',
            error: new Error('no backend endpoint for vendor quotations'),
          });
        }
      },

      awardRFQ: (rfqId, quotationId, awardedBy) => {
        const rfq = get().rfqs.find((r) => r.id === rfqId);
        const quotation = rfq?.quotations.find((q) => q.id === quotationId);
        if (!rfq || !quotation) return;

        set((s) => ({
          rfqs: s.rfqs.map((r) =>
            r.id === rfqId
              ? {
                  ...r, status: 'awarded' as const, awardedVendorId: quotation.vendorId, awardedQuotationId: quotation.id,
                  awardedAt: new Date().toISOString().slice(0, 10), awardedBy,
                  quotations: r.quotations.map((q) => (q.id === quotationId ? { ...q, status: 'awarded' as const } : q)),
                }
              : r
          ),
        }));

        const vendor = get().vendors.find((v) => v.id === quotation.vendorId);
        const poLines: POLine[] = quotation.lines.map((l) => {
          const lineTotal = l.offeredQuantity * l.unitPrice;
          const vatAmount = Math.round(lineTotal * 0.1);
          return { id: genId('pol'), itemId: l.itemId, itemNameFa: l.itemNameFa, itemSku: l.itemSku, uom: 'kg', orderedQuantity: l.offeredQuantity, receivedQuantity: 0, pendingQuantity: l.offeredQuantity, invoicedQuantity: 0, unitPrice: l.unitPrice, lineTotal, vatRate: 10, vatAmount, lineTotalWithVat: lineTotal + vatAmount, notes: '' };
        });

        get().createPurchaseOrder({
          rfqId: rfq.id, rfqNumber: rfq.rfqNumber, prId: rfq.prId, prNumber: rfq.prNumber,
          vendorId: quotation.vendorId, vendorName: quotation.vendorName, vendorCode: vendor?.vendorCode ?? '',
          requiredDeliveryDate: '—', deliveryAddress: 'انبار مرکزی کارخانه', paymentTerms: quotation.paymentTerms, lines: poLines,
        });
        set((s) => ({ purchaseRequests: s.purchaseRequests.map((p) => (p.id === rfq.prId ? { ...p, status: 'po_created' as const } : p)) }));
        toast.success('PO خودکار ایجاد شد از استعلام برنده');
      },

      // ── Purchase Orders ────────────────────────────────────────────────
      createPurchaseOrder: (partial) => {
        const lines = partial.lines || [];
        const totals = computePOTotals(lines);
        const po: PurchaseOrder = {
          id: genId('po'), poNumber: generatePONumber(nextSeq()), rfqId: partial.rfqId, rfqNumber: partial.rfqNumber,
          prId: partial.prId || '', prNumber: partial.prNumber || '', vendorId: partial.vendorId || '', vendorName: partial.vendorName || '', vendorCode: partial.vendorCode || '',
          status: 'draft', orderDate: new Date().toISOString().slice(0, 10), requiredDeliveryDate: partial.requiredDeliveryDate || '—',
          deliveryAddress: partial.deliveryAddress || '', paymentTerms: partial.paymentTerms || 'net30', lines,
          ...totals, paidAmount: 0, balanceDue: totals.grandTotal, notes: partial.notes || '', attachments: [],
          createdAt: new Date().toISOString(), createdBy: 'مدیر خرید',
        };
        void persistMutation<PurchaseOrder>({
          optimistic: () => set((s) => ({ purchaseOrders: [po, ...s.purchaseOrders] })),
          request: () => whenLive(() => purchaseOrderApi.create(toServerPurchaseOrder(po))),
          rollback: () => set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== po.id) })),
          reconcile: (server) => set((s) => ({ purchaseOrders: reconcileEntity(s.purchaseOrders, po.id, server) })),
          messageFa: 'خطا در ذخیره‌سازی سفارش خرید؛ رکورد ایجاد نشد',
        });
        return po;
      },
      approvePurchaseOrder: (id, approverName) => {
        set((s) => ({ purchaseOrders: s.purchaseOrders.map((po) => (po.id === id ? { ...po, status: 'approved' as const, approvedBy: approverName, approvedAt: new Date().toISOString().slice(0, 10) } : po)) }));
      },
      sendPurchaseOrder: (id) => {
        set((s) => ({ purchaseOrders: s.purchaseOrders.map((po) => (po.id === id ? { ...po, status: 'sent' as const, sentAt: new Date().toISOString() } : po)) }));
        toast.success('PO به تأمین‌کننده ارسال شد');
      },

      receivePOGoods: (poId, receiptData) => {
        const po = get().purchaseOrders.find((p) => p.id === poId);
        if (!po) throw new Error('PO not found');
        const lines = receiptData.lines || [];

        const receipt: POReceipt = {
          id: genId('por'), poId, poNumber: po.poNumber, receiptNumber: generatePORNumber(nextSeq()),
          vendorId: po.vendorId, vendorName: po.vendorName, receivedAt: new Date().toISOString().slice(0, 10),
          receivedBy: receiptData.receivedBy || '—', vehiclePlate: receiptData.vehiclePlate || '—', driverName: receiptData.driverName || '—',
          lines, qualityStatus: lines.some((l) => l.rejectedQuantity > 0) ? (lines.every((l) => l.acceptedQuantity === 0) ? 'rejected' : 'partially_accepted') : 'accepted',
          notes: receiptData.notes || '', createdAt: new Date().toISOString(),
        };

        // Cross-module: create + accept a real GRN in Inventory (real stock movement)
        const inventory = useInventoryStore.getState();
        const defaultWarehouse = inventory.warehouses[0];
        const acceptedValue = lines.reduce((sum, l) => {
          const poLine = po.lines.find((pl) => pl.id === l.poLineId);
          return sum + l.acceptedQuantity * (poLine?.unitPrice ?? 0);
        }, 0);

        const newGrn = inventory.createGrn({
          supplierId: po.vendorId, supplierName: po.vendorName, warehouseId: defaultWarehouse?.id ?? '', warehouseName: defaultWarehouse?.nameFa ?? '',
          receivedBy: receipt.receivedBy, poId: po.id, poNumber: po.poNumber, vehiclePlate: receipt.vehiclePlate,
          inventoryValueImpact: acceptedValue,
          lineItems: lines.map((l) => {
            const poLine = po.lines.find((pl) => pl.id === l.poLineId);
            return {
              id: genId('gli'), itemId: l.itemId, itemName: l.itemNameFa, lotNumber: l.batchNumber, expiryDate: l.expiryDate,
              orderedQuantity: poLine?.orderedQuantity ?? l.receivedQuantity, receivedQuantity: l.receivedQuantity,
              acceptedQuantity: l.acceptedQuantity, rejectedQuantity: l.rejectedQuantity, unitOfMeasure: poLine?.uom ?? 'kg',
              unitCost: poLine?.unitPrice ?? 0, totalCost: l.acceptedQuantity * (poLine?.unitPrice ?? 0),
              qcStatus: l.rejectedQuantity > 0 ? ('fail' as const) : ('pass' as const),
            };
          }),
        });
        inventory.acceptGrn(newGrn.id); // actually moves stock, matching how Inventory itself accepts GRNs

        // Cross-module: post AP voucher in Finance (Debit Inventory+VAT / Credit AP)
        const finance = useFinanceStore.getState();
        const inventoryAccount = finance.accounts.find((a) => a.code === '1104');
        const vatAccount = finance.accounts.find((a) => a.code === '1301');
        const apAccount = finance.accounts.find((a) => a.code === '2101');
        const vatAmount = Math.round(acceptedValue * 0.1);

        const voucher = finance.createVoucher({
          type: 'general', referenceType: 'purchase_order', referenceId: po.id,
          description: `خرید کالا — ${po.poNumber} — ${po.vendorName}`,
          entries: [
            { id: genId('je'), voucherId: '', accountId: inventoryAccount?.id ?? '', accountCode: inventoryAccount?.code ?? '1104', description: `افزایش موجودی - ${po.poNumber}`, debit: acceptedValue, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: acceptedValue, creditBaseCurrency: 0, sourceModule: 'procurement' },
            { id: genId('je'), voucherId: '', accountId: vatAccount?.id ?? '', accountCode: vatAccount?.code ?? '1301', description: `مالیات بر ارزش افزوده خرید - ${po.poNumber}`, debit: vatAmount, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: vatAmount, creditBaseCurrency: 0, sourceModule: 'procurement' },
            { id: genId('je'), voucherId: '', accountId: apAccount?.id ?? '', accountCode: apAccount?.code ?? '2101', description: `بستانکاری ${po.vendorName} - ${po.poNumber}`, debit: 0, credit: acceptedValue + vatAmount, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: acceptedValue + vatAmount, sourceModule: 'procurement' },
          ],
          status: 'draft',
        });
        finance.postVoucher(voucher.id);

        // Update PO received quantities and status
        const totalReceivedNow = new Map(lines.map((l) => [l.poLineId, l.receivedQuantity]));
        set((s) => ({
          receipts: [{ ...receipt, grnId: newGrn.id }, ...s.receipts],
          purchaseOrders: s.purchaseOrders.map((p) => {
            if (p.id !== poId) return p;
            const updatedLines = p.lines.map((pl) => {
              const justReceived = totalReceivedNow.get(pl.id) ?? 0;
              const receivedQuantity = pl.receivedQuantity + justReceived;
              return { ...pl, receivedQuantity, pendingQuantity: Math.max(0, pl.orderedQuantity - receivedQuantity) };
            });
            const fullyReceived = updatedLines.every((l) => l.pendingQuantity === 0);
            return {
              ...p, lines: updatedLines, status: fullyReceived ? ('fully_received' as const) : ('partially_received' as const),
              actualDeliveryDate: new Date().toISOString().slice(0, 10), glJournalVoucherId: voucher.id,
            };
          }),
        }));

        toast.success('دریافت کالا ثبت شد — GRN در انبار ثبت شد — سند مالی صادر شد');
        // TODO(BACKEND): no goods-receipt wrapper exists in ../api
        // (purchaseOrderApi.receive targets /purchase-orders/:id/receive, which the
        // backend does not expose; the real route is POST /inventory/goods-receipt).
        // The receipt, its GRN and the AP voucher are stored locally only.
        if (!USE_MOCKS) {
          reportMutationError({
            messageFa: 'رسید کالا فقط به‌صورت محلی ثبت شد و در سرور ذخیره نشد',
            error: new Error('no backend endpoint for PO goods receipt'),
          });
        }
        return receipt;
      },

      // TODO(BACKEND): `paymentDate` unused — no payment endpoint exists yet.
      recordPayment: (poId, amount, _paymentDate, referenceNumber) => {
        const po = get().purchaseOrders.find((p) => p.id === poId);
        if (!po) return;
        const newPaidAmount = po.paidAmount + amount;
        const newBalance = Math.max(0, po.grandTotal - newPaidAmount);

        const finance = useFinanceStore.getState();
        const apAccount = finance.accounts.find((a) => a.code === '2101');
        const bankAccount = finance.accounts.find((a) => a.code === '1102');
        const voucher = finance.createVoucher({
          type: 'general', referenceType: 'payment', referenceId: po.id,
          description: `پرداخت به ${po.vendorName} — ${po.poNumber} — سند ${referenceNumber}`,
          entries: [
            { id: genId('je'), voucherId: '', accountId: apAccount?.id ?? '', accountCode: apAccount?.code ?? '2101', description: `کاهش بدهی ${po.vendorName}`, debit: amount, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: amount, creditBaseCurrency: 0, sourceModule: 'procurement' },
            { id: genId('je'), voucherId: '', accountId: bankAccount?.id ?? '', accountCode: bankAccount?.code ?? '1102', description: `پرداخت بانکی - ${po.poNumber}`, debit: 0, credit: amount, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: amount, sourceModule: 'procurement' },
          ],
          status: 'draft',
        });
        finance.postVoucher(voucher.id);

        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((p) => (p.id === poId ? { ...p, paidAmount: newPaidAmount, balanceDue: newBalance, status: newBalance === 0 ? ('paid' as const) : p.status } : p)),
        }));
        toast.success('پرداخت ثبت شد و سند مالی صادر شد');
        // TODO(BACKEND): no PO-payment endpoint exists (neither in ../api nor in
        // the backend) — the payment and its journal voucher are local-only.
        if (!USE_MOCKS) {
          reportMutationError({
            messageFa: 'پرداخت فقط به‌صورت محلی ثبت شد و در سرور ذخیره نشد',
            error: new Error('no backend endpoint for PO payments'),
          });
        }
      },

      // ── Contracts ─────────────────────────────────────────────────────
      createContract: (partial) => {
        const contract: VendorContract = {
          id: genId('vc'), contractNumber: generateVCNumber(nextSeq()), vendorId: partial.vendorId || '', vendorName: partial.vendorName || '',
          type: partial.type || 'supply', title: partial.title || '—', description: partial.description || '', status: 'active',
          startDate: partial.startDate || '—', endDate: partial.endDate || '—', totalValue: partial.totalValue || 0, consumedValue: 0,
          remainingValue: partial.totalValue || 0, currency: partial.currency || 'IRR', paymentSchedule: partial.paymentSchedule || '',
          milestones: partial.milestones || [], linkedPOIds: [], autoRenew: partial.autoRenew || false, renewalNoticeDays: partial.renewalNoticeDays || 30,
          signatoryCompany: partial.signatoryCompany || '', signatoryVendor: partial.signatoryVendor || '', attachments: [],
          notes: partial.notes || '', createdAt: new Date().toISOString(),
        };
        void persistMutation<VendorContract>({
          optimistic: () => set((s) => ({ contracts: [contract, ...s.contracts] })),
          // TODO(BACKEND): vendorContractApi posts to /inventory/contracts, which
          // the backend does not expose yet — a live failure rolls back + toasts.
          request: () => whenLive(() => vendorContractApi.create(contract)),
          rollback: () => set((s) => ({ contracts: s.contracts.filter((c) => c.id !== contract.id) })),
          reconcile: (server) => set((s) => ({ contracts: reconcileEntity(s.contracts, contract.id, server) })),
          messageFa: 'خطا در ذخیره‌سازی قرارداد تأمین‌کننده؛ رکورد ایجاد نشد',
        });
        return contract;
      },
      terminateContract: (id, reason) => {
        set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? { ...c, status: 'terminated' as const, terminatedAt: new Date().toISOString().slice(0, 10), terminationReason: reason } : c)) }));
      },
      linkPOToContract: (poId, contractId) => {
        const po = get().purchaseOrders.find((p) => p.id === poId);
        if (!po) return;
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id === contractId
              ? { ...c, linkedPOIds: [...c.linkedPOIds, poId], consumedValue: c.consumedValue + po.grandTotal, remainingValue: Math.max(0, c.remainingValue - po.grandTotal) }
              : c
          ),
        }));
      },
      getExpiringContracts: (daysAhead) => get().contracts.filter((c) => c.status !== 'expired' && c.status !== 'terminated' && getDaysUntilExpiry(c.endDate) <= daysAhead && getDaysUntilExpiry(c.endDate) >= 0),

      // ── Computed ──────────────────────────────────────────────────────
      getProcurementStats: () => {
        const s = get();
        const totalPOValueThisMonth = s.purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0);
        const totalPayablesOutstanding = s.purchaseOrders.reduce((sum, po) => sum + po.balanceDue, 0);
        const activeVendors = s.vendors.filter((v) => v.status === 'active');
        const avgVendorScore = activeVendors.length ? Math.round((activeVendors.reduce((sum, v) => sum + v.overallScore, 0) / activeVendors.length) * 10) / 10 : 0;
        const topVendor = [...activeVendors].sort((a, b) => b.overallScore - a.overallScore)[0];
        return {
          totalVendors: s.vendors.length, activeVendors: activeVendors.length, pendingApprovalVendors: s.vendors.filter((v) => v.status === 'pending_approval').length,
          openPRs: s.purchaseRequests.filter((p) => ['pending_approval', 'approved', 'rfq_sent'].includes(p.status)).length,
          openRFQs: s.rfqs.filter((r) => ['sent', 'responses_received'].includes(r.status)).length,
          pendingPOs: s.purchaseOrders.filter((po) => ['draft', 'approved', 'sent'].includes(po.status)).length,
          totalPOValueThisMonth,
          pendingReceipts: s.purchaseOrders.filter((po) => ['sent', 'partially_received'].includes(po.status)).length,
          overduePayments: s.purchaseOrders.filter((po) => po.status === 'fully_received' && po.balanceDue > 0).length,
          expiringContracts: get().getExpiringContracts(60).length,
          totalPayablesOutstanding, avgVendorScore, topVendorId: topVendor?.id ?? '',
        };
      },

      getVendorSpendAnalysis: () => {
        const s = get();
        return s.vendors.map((v) => {
          const vendorPOs = s.purchaseOrders.filter((po) => po.vendorId === v.id);
          return { vendorId: v.id, vendorName: v.nameFa, totalSpend: vendorPOs.reduce((sum, po) => sum + po.grandTotal, 0), poCount: vendorPOs.length, avgLeadTime: v.leadTimeDays };
        }).sort((a, b) => b.totalSpend - a.totalSpend);
      },

      getItemPriceHistory: (itemId) => {
        const s = get();
        const history: { date: string; vendorName: string; unitPrice: number; quantity: number; poNumber: string }[] = [];
        s.purchaseOrders.forEach((po) => {
          po.lines.filter((l) => l.itemId === itemId).forEach((l) => {
            history.push({ date: po.orderDate, vendorName: po.vendorName, unitPrice: l.unitPrice, quantity: l.orderedQuantity, poNumber: po.poNumber });
          });
        });
        return history.sort((a, b) => a.date.localeCompare(b.date));
      },

      getPRToGRNLeadTime: (prId) => {
        const pr = get().purchaseRequests.find((p) => p.id === prId);
        if (!pr) return null;
        const po = get().purchaseOrders.find((p) => p.prId === prId);
        const receipt = get().receipts.find((r) => r.poId === po?.id);
        if (!receipt) return null;
        const created = new Date(pr.createdAt).getTime();
        const received = new Date(receipt.receivedAt).getTime();
        if (Number.isNaN(created) || Number.isNaN(received)) return null;
        return Math.round((received - created) / 86400000);
      },
    }),
    {
      name: 'procurement-store',
      storage: createJSONStorage(() => zustandLocalStorage),
    }
  )
);
