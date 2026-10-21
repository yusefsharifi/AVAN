// ═══════════════════════════════════════════════════════════════════════════════
// M17: Inventory & Warehouse — Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Weighted Average Cost calculation.
 * newAvgCost = (oldQty * oldAvgCost + newQty * newUnitCost) / (oldQty + newQty)
 *
 * Returns BigInt (rounded to nearest Rial).
 */
export function computeWeightedAvgCost(
  currentQty: number,
  currentAvgCost: bigint,
  newQty: number,
  newUnitCost: bigint,
): bigint {
  if (newQty <= 0) return currentAvgCost;
  if (currentQty <= 0) return newUnitCost;

  const currentValue = BigInt(Math.round(currentQty)) * currentAvgCost;
  const newValue = BigInt(Math.round(newQty)) * newUnitCost;
  const totalQty = BigInt(Math.round(currentQty + newQty));

  if (totalQty === 0n) return 0n;

  return (currentValue + newValue) / totalQty;
}

/**
 * Compute total value from quantity and unit cost.
 */
export function computeTotalValue(quantity: number, unitCost: bigint): bigint {
  return BigInt(Math.round(quantity)) * unitCost;
}

/**
 * Determine stock direction from transaction type.
 */
export function getTransactionDirection(type: string): 'IN' | 'OUT' | 'TRANSFER' {
  const inTypes = ['RECEIPT', 'RETURN_FROM_CUSTOMER', 'PRODUCTION_RECEIPT', 'SAMPLE'];
  const outTypes = ['ISSUE', 'RETURN_TO_VENDOR', 'PRODUCTION_ISSUE', 'SCRAP'];
  const transferTypes = ['TRANSFER'];

  if (inTypes.includes(type)) return 'IN';
  if (outTypes.includes(type)) return 'OUT';
  if (transferTypes.includes(type)) return 'TRANSFER';
  return 'IN';
}

/**
 * Compute line total with discount and tax.
 */
export function computeLineTotal(
  quantity: number,
  unitPrice: bigint,
  discountPct: number,
  taxRatePct: number,
): { lineTotal: bigint; taxAmount: bigint; discountAmount: bigint } {
  const gross = BigInt(Math.round(quantity)) * unitPrice;
  const discountAmount = BigInt(Math.round(Number(gross) * discountPct / 100));
  const afterDiscount = gross - discountAmount;
  const taxAmount = BigInt(Math.round(Number(afterDiscount) * taxRatePct / 100));
  const lineTotal = afterDiscount + taxAmount;

  return { lineTotal, taxAmount, discountAmount };
}

/**
 * Check if stock is below reorder point.
 */
export function isBelowReorderPoint(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint;
}

/**
 * Compute variance for physical count.
 */
export function computeVariance(systemQty: number, countedQty: number): number {
  return countedQty - systemQty;
}

/**
 * Compute variance value (variance * avgCost).
 */
export function computeVarianceValue(variance: number, avgCost: bigint): bigint {
  return BigInt(Math.round(variance)) * avgCost;
}

/**
 * Generate sequential number with prefix.
 */
export function generateSequenceNumber(
  prefix: string,
  companyCode: string,
  seq: number,
  year: number,
  padLength: number = 5,
): string {
  return `${prefix}-${companyCode}-${year}-${String(seq).padStart(padLength, '0')}`;
}

/**
 * Check if an item needs reorder based on current stock levels.
 */
export function needsReorder(
  currentStock: number,
  reorderPoint: number,
  safetyStock: number,
): 'CRITICAL' | 'WARNING' | 'OK' {
  if (currentStock <= safetyStock) return 'CRITICAL';
  if (currentStock <= reorderPoint) return 'WARNING';
  return 'OK';
}

/**
 * FIFO cost layer tracking.
 * Given a list of cost layers (oldest first), consume quantity and return cost.
 */
export function consumeFifoLayers(
  layers: { qty: number; unitCost: bigint; batchNumber?: string }[],
  quantityToConsume: number,
): { totalCost: bigint; consumedLayers: { qty: number; unitCost: bigint; batchNumber?: string }[]; remainingQty: number } {
  let remaining = quantityToConsume;
  let totalCost = 0n;
  const consumedLayers: { qty: number; unitCost: bigint; batchNumber?: string }[] = [];

  for (const layer of layers) {
    if (remaining <= 0) break;

    const consumeFromLayer = Math.min(remaining, layer.qty);
    totalCost += BigInt(Math.round(consumeFromLayer)) * layer.unitCost;
    consumedLayers.push({ qty: consumeFromLayer, unitCost: layer.unitCost, batchNumber: layer.batchNumber });
    remaining -= consumeFromLayer;
  }

  return { totalCost, consumedLayers, remainingQty: remaining };
}

/**
 * Compute available quantity (quantity - reserved).
 */
export function computeAvailableQty(quantity: number, reservedQty: number): number {
  return Math.max(0, quantity - reservedQty);
}

/**
 * Check if batch/serial tracking is required.
 */
export function validateTrackingRequirements(
  trackByBatch: boolean,
  trackBySerial: boolean,
  hasExpiry: boolean,
  batchNumber?: string,
  serialNumber?: string,
  expiryDate?: Date,
): string[] {
  const errors: string[] = [];
  if (trackByBatch && !batchNumber) errors.push('BATCH_REQUIRED');
  if (trackBySerial && !serialNumber) errors.push('SERIAL_REQUIRED');
  if (hasExpiry && !expiryDate) errors.push('EXPIRY_REQUIRED');
  return errors;
}
