// ── Allocation Engine (FIFO/FEFO) ───────────────────────────────────────────

import type { InventoryItem } from '../types';

const sortableDate = (value?: string) => Number((value || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '')) || Number.MAX_SAFE_INTEGER;
export function allocateFifo(lots: { id: string; remainingQuantity: number; receivedDate: string }[], requestedQty: number): { lotId: string; quantity: number }[] {
  const sorted = [...lots].sort((a, b) => sortableDate(a.receivedDate) - sortableDate(b.receivedDate));
  const allocations: { lotId: string; quantity: number }[] = [];
  let remaining = requestedQty;
  for (const lot of sorted) {
    if (remaining <= 0) break;
    const qty = Math.min(lot.remainingQuantity, remaining);
    allocations.push({ lotId: lot.id, quantity: qty });
    remaining -= qty;
  }
  return allocations;
}

export function allocateFefo(lots: { id: string; remainingQuantity: number; expiryDate?: string; receivedDate: string }[], requestedQty: number): { lotId: string; quantity: number }[] {
  const sorted = [...lots].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return sortableDate(a.expiryDate) - sortableDate(b.expiryDate);
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
  });
  const allocations: { lotId: string; quantity: number }[] = [];
  let remaining = requestedQty;
  for (const lot of sorted) {
    if (remaining <= 0) break;
    const qty = Math.min(lot.remainingQuantity, remaining);
    allocations.push({ lotId: lot.id, quantity: qty });
    remaining -= qty;
  }
  return allocations;
}

// ── Cost Calculators ────────────────────────────────────────────────────────

export function calculateWeightedAverageCost(existingQty: number, existingAvg: number, receivedQty: number, receivedCost: number): number {
  const totalQty = existingQty + receivedQty;
  if (totalQty === 0) return 0;
  return ((existingQty * existingAvg) + (receivedQty * receivedCost)) / totalQty;
}

export function calculateFifoCost(lots: { quantity: number; unitCost: number }[], issuedQty: number): number {
  let remaining = issuedQty;
  let totalCost = 0;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const qty = Math.min(lot.quantity, remaining);
    totalCost += qty * lot.unitCost;
    remaining -= qty;
  }
  return totalCost;
}

// ── ABC Classifier ──────────────────────────────────────────────────────────

export function classifyAbc(items: { id: string; consumptionValue: number }[]): { itemId: string; class: 'A' | 'B' | 'C' }[] {
  const totalValue = items.reduce((s, i) => s + i.consumptionValue, 0);
  const sorted = [...items].sort((a, b) => b.consumptionValue - a.consumptionValue);
  let cumulative = 0;
  return sorted.map(item => {
    cumulative += item.consumptionValue;
    const pct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
    const cls = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
    return { itemId: item.id, class: cls };
  });
}

// ── Reorder Engine ──────────────────────────────────────────────────────────

export function calculateReorderPoint(avgDailyUsage: number, leadTimeDays: number, safetyStock: number): number {
  return Math.ceil((avgDailyUsage * leadTimeDays) + safetyStock);
}

export function calculateSafetyStock(maxDailyUsage: number, maxLeadTime: number, avgDailyUsage: number, avgLeadTime: number): number {
  return Math.ceil((maxDailyUsage * maxLeadTime) - (avgDailyUsage * avgLeadTime));
}

export function calculateEOQ(annualDemand: number, orderCost: number, carryingCostPercent: number, unitCost: number): number {
  const carryingCost = unitCost * carryingCostPercent;
  if (carryingCost === 0) return 0;
  return Math.sqrt((2 * annualDemand * orderCost) / carryingCost);
}

// ── Variance Analyzer ───────────────────────────────────────────────────────

export function analyzeVariance(systemQty: number, countedQty: number, threshold: number = 2): {
  variance: number;
  variancePercent: number;
  requiresApproval: boolean;
  severity: 'none' | 'minor' | 'major' | 'critical';
} {
  const variance = countedQty - systemQty;
  const variancePercent = systemQty > 0 ? Math.abs(variance / systemQty) * 100 : 0;
  const requiresApproval = variancePercent > threshold || Math.abs(variance) > 10;
  const severity = variancePercent === 0 ? 'none' : variancePercent <= 2 ? 'minor' : variancePercent <= 5 ? 'major' : 'critical';
  return { variance, variancePercent, requiresApproval, severity };
}

// ── Barcode Generator ───────────────────────────────────────────────────────

export function generateBarcode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(8, '0')}`;
}

export function generateGRNNumber(): string {
  const year = 1403;
  const seq = Math.floor(Math.random() * 99999);
  return `GRN-${year}-${String(seq).padStart(5, '0')}`;
}

export function generateMRNumber(): string {
  const year = 1403;
  const seq = Math.floor(Math.random() * 99999);
  return `MR-${year}-${String(seq).padStart(5, '0')}`;
}

export function generateDONumber(): string {
  const year = 1403;
  const seq = Math.floor(Math.random() * 99999);
  return `DO-${year}-${String(seq).padStart(5, '0')}`;
}

export function generateTXNNumber(): string {
  const year = 1403;
  const seq = Math.floor(Math.random() * 999999);
  return `TXN-${year}-${String(seq).padStart(6, '0')}`;
}

// ── Item Filter ──────────────────────────────────────────────────────────────

export function filterItems(items: InventoryItem[], filters: { search?: string; category?: string; abcClass?: string; status?: string }): InventoryItem[] {
  return items.filter(item => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!item.nameFa?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q) && !item.barcode?.toLowerCase().includes(q)) return false;
    }
    if (filters.category && item.categoryId !== filters.category && item.categoryName !== filters.category) return false;
    if (filters.abcClass && item.abcClass !== filters.abcClass) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}
