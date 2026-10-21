import type { BOMLine } from '../types';

let seqCounter = 0;
const nextSeq = () => (++seqCounter).toString().padStart(5, '0');

export function generateSalesOrderNumber(): string {
  return `SO-1403-${nextSeq()}`;
}
export function generateWorkOrderNumber(): string {
  return `WO-1403-${nextSeq()}`;
}
export function generateQCNumber(): string {
  return `QC-1403-${nextSeq()}`;
}
export function generateNCRNumber(): string {
  return `NCR-1403-${nextSeq()}`;
}
export function generateBOMNumber(): string {
  return `BOM-${nextSeq()}`;
}

/** availability * performance * quality, each 0-100, returns 0-100 */
export function calculateOEE(availability: number, performance: number, quality: number): number {
  return Math.round(((availability / 100) * (performance / 100) * (quality / 100)) * 100 * 10) / 10;
}

export function calculateMRPShortage(
  required: number,
  available: number,
  safetyStock: number
): { shortage: number; suggestPR: boolean } {
  const shortage = Math.max(0, required - (available - safetyStock));
  return { shortage, suggestPR: shortage > 0 };
}

const WEEK_DAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

/** returns 6 Persian day names (Sat–Thu) starting from the given date */
export function getWeekDays(startDate: string): string[] {
  const d = new Date(startDate || Date.now());
  const startIdx = d.getDay(); // 0=Sun..6=Sat — approximate mapping, purely for display labels
  const days: string[] = [];
  for (let i = 0; i < 6; i++) {
    days.push(WEEK_DAYS_FA[(startIdx + i) % 7]);
  }
  return days;
}

export function isOverdue(scheduledEnd: string): boolean {
  const d = new Date(scheduledEnd);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function calculateProductionCost(
  bomLines: BOMLine[],
  plannedQty: number,
  itemPrices: Record<string, number>
): number {
  return bomLines.reduce((sum, line) => {
    const unitCost = itemPrices[line.itemId] ?? 0;
    return sum + line.effectiveQuantity * plannedQty * unitCost;
  }, 0);
}
