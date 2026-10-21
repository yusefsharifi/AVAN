import {
  computeWeightedAvgCost,
  computeTotalValue,
  getTransactionDirection,
  computeLineTotal,
  isBelowReorderPoint,
  computeVariance,
  computeVarianceValue,
  generateSequenceNumber,
  needsReorder,
  consumeFifoLayers,
  computeAvailableQty,
  validateTrackingRequirements,
} from './inventory.utils';

describe('Inventory Utility Functions', () => {
  describe('computeWeightedAvgCost', () => {
    it('should return new unit cost if no current stock', () => {
      const result = computeWeightedAvgCost(0, 0n, 10, 5000n);
      expect(result).toBe(5000n);
    });

    it('should return current avg cost if no new qty', () => {
      const result = computeWeightedAvgCost(10, 5000n, 0, 0n);
      expect(result).toBe(5000n);
    });

    it('should compute weighted average', () => {
      // 10 units at 1000, add 10 units at 2000 -> avg = 1500
      const result = computeWeightedAvgCost(10, 1000n, 10, 2000n);
      expect(result).toBe(1500n);
    });
  });

  describe('computeTotalValue', () => {
    it('should compute total value', () => {
      expect(computeTotalValue(10, 5000n)).toBe(50000n);
    });

    it('should handle zero quantity', () => {
      expect(computeTotalValue(0, 5000n)).toBe(0n);
    });
  });

  describe('getTransactionDirection', () => {
    it('should return IN for receipt types', () => {
      expect(getTransactionDirection('RECEIPT')).toBe('IN');
      expect(getTransactionDirection('RETURN_FROM_CUSTOMER')).toBe('IN');
      expect(getTransactionDirection('PRODUCTION_RECEIPT')).toBe('IN');
    });

    it('should return OUT for issue types', () => {
      expect(getTransactionDirection('ISSUE')).toBe('OUT');
      expect(getTransactionDirection('RETURN_TO_VENDOR')).toBe('OUT');
      expect(getTransactionDirection('SCRAP')).toBe('OUT');
    });

    it('should return TRANSFER', () => {
      expect(getTransactionDirection('TRANSFER')).toBe('TRANSFER');
    });

    it('should default to IN for unknown types', () => {
      expect(getTransactionDirection('UNKNOWN')).toBe('IN');
    });
  });

  describe('computeLineTotal', () => {
    it('should compute line total with discount and tax', () => {
      const result = computeLineTotal(10, 1000n, 10, 9);
      // gross = 10000, discount = 1000, after = 9000, tax = 810, total = 9810
      expect(result.discountAmount).toBe(1000n);
      expect(result.taxAmount).toBe(810n);
      expect(result.lineTotal).toBe(9810n);
    });
  });

  describe('isBelowReorderPoint', () => {
    it('should return true when below', () => {
      expect(isBelowReorderPoint(5, 10)).toBe(true);
    });

    it('should return false when above', () => {
      expect(isBelowReorderPoint(15, 10)).toBe(false);
    });

    it('should return true when equal', () => {
      expect(isBelowReorderPoint(10, 10)).toBe(true);
    });
  });

  describe('computeVariance', () => {
    it('should compute variance', () => {
      expect(computeVariance(100, 95)).toBe(-5);
      expect(computeVariance(100, 105)).toBe(5);
    });
  });

  describe('computeVarianceValue', () => {
    it('should compute variance value', () => {
      expect(computeVarianceValue(-5, 1000n)).toBe(-5000n);
    });
  });

  describe('generateSequenceNumber', () => {
    it('should generate formatted sequence number', () => {
      const result = generateSequenceNumber('TRX', 'TEH', 1, 2026, 5);
      expect(result).toBe('TRX-TEH-2026-00001');
    });
  });

  describe('needsReorder', () => {
    it('should return CRITICAL when below safety stock', () => {
      expect(needsReorder(2, 10, 5)).toBe('CRITICAL');
    });

    it('should return WARNING when below reorder point', () => {
      expect(needsReorder(8, 10, 5)).toBe('WARNING');
    });

    it('should return OK when above reorder point', () => {
      expect(needsReorder(15, 10, 5)).toBe('OK');
    });
  });

  describe('consumeFifoLayers', () => {
    it('should consume from FIFO layers', () => {
      const layers = [
        { qty: 5, unitCost: 100n },
        { qty: 10, unitCost: 200n },
      ];
      const result = consumeFifoLayers(layers, 7);
      // 5 from first layer @ 100, 2 from second @ 200
      expect(result.totalCost).toBe(900n);
      expect(result.consumedLayers).toHaveLength(2);
      expect(result.remainingQty).toBe(0);
    });

    it('should return remaining qty if layers insufficient', () => {
      const layers = [{ qty: 3, unitCost: 100n }];
      const result = consumeFifoLayers(layers, 5);
      expect(result.totalCost).toBe(300n);
      expect(result.remainingQty).toBe(2);
    });
  });

  describe('computeAvailableQty', () => {
    it('should compute available quantity', () => {
      expect(computeAvailableQty(100, 30)).toBe(70);
    });

    it('should not go negative', () => {
      expect(computeAvailableQty(30, 50)).toBe(0);
    });
  });

  describe('validateTrackingRequirements', () => {
    it('should return no errors for valid inputs', () => {
      const errors = validateTrackingRequirements(true, false, false, 'BATCH-001');
      expect(errors).toHaveLength(0);
    });

    it('should require batch number', () => {
      const errors = validateTrackingRequirements(true, false, false);
      expect(errors).toContain('BATCH_REQUIRED');
    });

    it('should require serial number', () => {
      const errors = validateTrackingRequirements(false, true, false, undefined, undefined);
      expect(errors).toContain('SERIAL_REQUIRED');
    });

    it('should require expiry date', () => {
      const errors = validateTrackingRequirements(false, false, true);
      expect(errors).toContain('EXPIRY_REQUIRED');
    });
  });
});
