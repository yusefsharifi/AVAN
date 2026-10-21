import {
  computeMTBF,
  computeMTTR,
  computeDepreciatedValue,
  monthsBetween,
  computeSlaDeadline,
  isValidWorkOrderTransition,
  selectBestTechnician,
  validateStockDeduction,
  computeWorkOrderCosts,
  computeDowntimeMinutes,
  computeNextDueDate,
} from './cmms.utils';

describe('CMMS Utility Functions', () => {
  describe('computeMTBF', () => {
    it('should return total operational hours if no failures', () => {
      const created = new Date('2026-01-01T00:00:00Z');
      const to = new Date('2026-01-02T00:00:00Z');
      expect(computeMTBF([], created, to)).toBe(24);
    });

    it('should compute MTBF from failure dates', () => {
      const created = new Date('2026-01-01T00:00:00Z');
      const failure1 = new Date('2026-01-02T00:00:00Z');
      const failure2 = new Date('2026-01-04T00:00:00Z');
      const to = new Date('2026-01-06T00:00:00Z');
      // total = 24 (create->f1) + 48 (f1->f2) + 48 (f2->to) = 120h / 2 failures = 60
      expect(computeMTBF([failure1, failure2], created, to)).toBe(60);
    });
  });

  describe('computeMTTR', () => {
    it('should return 0 if no resolved repairs', () => {
      expect(computeMTTR([{ failedAt: new Date(), restoredAt: null }])).toBe(0);
    });

    it('should compute average repair time', () => {
      const records = [
        { failedAt: new Date('2026-01-01T00:00:00Z'), restoredAt: new Date('2026-01-01T02:00:00Z') },
        { failedAt: new Date('2026-01-02T00:00:00Z'), restoredAt: new Date('2026-01-02T06:00:00Z') },
      ];
      // (2 + 6) / 2 = 4
      expect(computeMTTR(records)).toBe(4);
    });
  });

  describe('computeDepreciatedValue', () => {
    it('should return purchase price if no depreciation', () => {
      expect(computeDepreciatedValue(1000000n, 0, 0)).toBe(1000000n);
    });

    it('should compute straight-line depreciation', () => {
      // 100M IRR, 20% annual rate, 12 months old
      const result = computeDepreciatedValue(100_000_000n, 20, 12);
      // Depreciation per month = 100M * (20*100) / (12*10000) = 100M * 2000 / 120000 = ~1666666
      expect(result).toBeLessThan(100_000_000n);
      expect(result).toBeGreaterThan(0n);
    });

    it('should not go below salvage value', () => {
      const result = computeDepreciatedValue(1000n, 100, 100, 200n);
      expect(result).toBeGreaterThanOrEqual(200n);
    });
  });

  describe('monthsBetween', () => {
    it('should compute months between two dates', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 5, 15);
      expect(monthsBetween(start, end)).toBe(5);
    });
  });

  describe('computeSlaDeadline', () => {
    it('should use custom SLA hours', () => {
      const now = new Date();
      const deadline = computeSlaDeadline('NORMAL' as any, 10);
      const diffHours = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      expect(diffHours).toBe(10);
    });

    it('should use default for EMERGENCY', () => {
      const now = new Date();
      const deadline = computeSlaDeadline('EMERGENCY' as any);
      const diffHours = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      expect(diffHours).toBe(2);
    });

    it('should use default for LOW', () => {
      const now = new Date();
      const deadline = computeSlaDeadline('LOW' as any);
      const diffHours = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      expect(diffHours).toBe(72);
    });
  });

  describe('isValidWorkOrderTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidWorkOrderTransition('APPROVED', 'ASSIGNED')).toBe(true);
      expect(isValidWorkOrderTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(isValidWorkOrderTransition('COMPLETED', 'VERIFIED')).toBe(true);
      expect(isValidWorkOrderTransition('IN_PROGRESS', 'ON_HOLD')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidWorkOrderTransition('CLOSED', 'APPROVED')).toBe(false);
      expect(isValidWorkOrderTransition('COMPLETED', 'ASSIGNED')).toBe(false);
      expect(isValidWorkOrderTransition('CANCELLED', 'APPROVED')).toBe(false);
    });
  });

  describe('selectBestTechnician', () => {
    it('should return null if no candidates', () => {
      expect(selectBestTechnician([], 'مکانیک')).toBeNull();
    });

    it('should select technician with matching skill and lowest workload', () => {
      const candidates = [
        { id: 't-1', name: 'Ali', specializations: ['مکانیک'], isAvailable: true, isActive: true, activeWorkOrders: 5 },
        { id: 't-2', name: 'Reza', specializations: ['مکانیک'], isAvailable: true, isActive: true, activeWorkOrders: 2 },
        { id: 't-3', name: 'Sara', specializations: ['برق'], isAvailable: true, isActive: true, activeWorkOrders: 1 },
      ];

      const result = selectBestTechnician(candidates, 'مکانیک');
      expect(result?.id).toBe('t-2');
    });

    it('should skip inactive technicians', () => {
      const candidates = [
        { id: 't-1', name: 'Ali', specializations: ['مکانیک'], isAvailable: true, isActive: false, activeWorkOrders: 0 },
      ];

      expect(selectBestTechnician(candidates, 'مکانیک')).toBeNull();
    });

    it('should return any available when no required skill', () => {
      const candidates = [
        { id: 't-1', name: 'Ali', specializations: [], isAvailable: true, isActive: true, activeWorkOrders: 3 },
      ];

      const result = selectBestTechnician(candidates, null);
      expect(result?.id).toBe('t-1');
    });
  });

  describe('validateStockDeduction', () => {
    it('should validate sufficient stock', () => {
      const result = validateStockDeduction(100, 10, 20, 30);
      expect(result.valid).toBe(true);
      expect(result.newStock).toBe(90);
    });

    it('should reject insufficient stock', () => {
      const result = validateStockDeduction(5, 10, 20, 30);
      expect(result.valid).toBe(false);
      expect(result.newStock).toBe(-5);
    });

    it('should detect low stock', () => {
      const result = validateStockDeduction(30, 15, 20, 25);
      expect(result.valid).toBe(true);
      expect(result.wouldBeLowStock).toBe(true);
      expect(result.wouldTriggerReorder).toBe(true);
    });
  });

  describe('computeWorkOrderCosts', () => {
    it('should compute total costs', () => {
      const result = computeWorkOrderCosts(8, 100000, 500000, 200000);
      expect(result.laborCost).toBe(800000);
      expect(result.partsCost).toBe(500000);
      expect(result.contractorCost).toBe(200000);
      expect(result.totalCost).toBe(1500000);
    });
  });

  describe('computeDowntimeMinutes', () => {
    it('should compute downtime in minutes', () => {
      const failedAt = new Date('2026-01-01T08:00:00Z');
      const restoredAt = new Date('2026-01-01T10:30:00Z');
      expect(computeDowntimeMinutes(failedAt, restoredAt)).toBe(150);
    });
  });

  describe('computeNextDueDate', () => {
    it('should compute next due date for time-based trigger', () => {
      const completedAt = new Date('2026-01-01');
      const result = computeNextDueDate('TIME_BASED', completedAt, 30, 'day', null, null);
      expect(result.nextDueAt).toBeDefined();
    });

    it('should compute next due date for meter-based trigger', () => {
      const result = computeNextDueDate('METER_BASED', new Date(), null, null, 10000, 5000);
      expect(result.nextDueMeter).toBe(15000);
    });
  });
});
