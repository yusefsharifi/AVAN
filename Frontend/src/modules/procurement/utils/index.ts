import type { VendorPerformanceMetric, VendorQuotation, POLine, Vendor } from '../types';
import type { InventoryItem } from '@/modules/inventory';

export function generatePRNumber(seq: number): string {
  return `PR-1403-${String(seq).padStart(5, '0')}`;
}
export function generateRFQNumber(seq: number): string {
  return `RFQ-1403-${String(seq).padStart(5, '0')}`;
}
export function generatePONumber(seq: number): string {
  return `PO-1403-${String(seq).padStart(5, '0')}`;
}
export function generateVCNumber(seq: number): string {
  return `VC-1403-${String(seq).padStart(5, '0')}`;
}
export function generatePORNumber(seq: number): string {
  return `POR-1403-${String(seq).padStart(5, '0')}`;
}

/** Weighted average of the last 3 months: onTime*0.4 + quality*0.4 + priceCompliance*0.2 */
export function computeVendorScore(metrics: VendorPerformanceMetric[]): number {
  const last3 = metrics.slice(-3);
  if (last3.length === 0) return 0;
  const avg = (key: keyof VendorPerformanceMetric) => last3.reduce((s, m) => s + (m[key] as number), 0) / last3.length;
  const score = avg('onTimeDeliveryRate') * 0.4 + avg('qualityAcceptanceRate') * 0.4 + avg('priceComplianceRate') * 0.2;
  return Math.round(score * 10) / 10;
}

export function computeQuotationScore(
  quotation: VendorQuotation,
  allQuotations: VendorQuotation[],
  vendorScore: number,
  criteria: { priceWeight: number; deliveryWeight: number; vendorScoreWeight: number }
): number {
  const received = allQuotations.filter((q) => q.status === 'received' || q.status === 'awarded');
  const lowestPrice = Math.min(...received.map((q) => q.finalAmount).filter((v) => v > 0));
  const maxDeliveryDays = Math.max(...received.map((q) => Math.max(...q.lines.map((l) => l.deliveryDays), 1)), 1);
  const quotationDeliveryDays = Math.max(...quotation.lines.map((l) => l.deliveryDays), 1);

  const priceScore = lowestPrice > 0 && quotation.finalAmount > 0 ? (lowestPrice / quotation.finalAmount) * 100 * (criteria.priceWeight / 100) : 0;
  const deliveryScore = (1 - quotationDeliveryDays / maxDeliveryDays) * 100 * (criteria.deliveryWeight / 100);
  const vendorScorePart = vendorScore * (criteria.vendorScoreWeight / 100);

  return Math.round((priceScore + deliveryScore + vendorScorePart) * 10) / 10;
}

export function computePOTotals(lines: POLine[]): { subtotal: number; vatTotal: number; grandTotal: number } {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const vatTotal = lines.reduce((s, l) => s + l.vatAmount, 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}

export function getDaysUntilExpiry(dateStr: string): number {
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return 9999;
  return Math.round((d - Date.now()) / 86400000);
}

/** Groups low-stock items by their preferred vendor (first active vendor approved for the item's category) */
export function groupLinesByVendor(
  items: InventoryItem[],
  vendors: Vendor[]
): { vendorId: string; vendorName: string; items: InventoryItem[] }[] {
  const groups = new Map<string, { vendorId: string; vendorName: string; items: InventoryItem[] }>();
  items.forEach((item) => {
    const vendor = vendors.find((v) => v.status === 'active' && v.approvedItemCategories.includes(item.categoryName));
    const key = vendor?.id ?? 'unassigned';
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { vendorId: vendor?.id ?? '', vendorName: vendor?.nameFa ?? 'بدون تأمین‌کننده مشخص', items: [item] });
    }
  });
  return Array.from(groups.values());
}
