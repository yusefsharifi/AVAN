import {
  getApprovalSteps,
  generateInstallmentSchedule,
  computeDaysOverdue,
  computeAgingBucket,
  checkCreditLimit,
  calculateLineTotals,
  isValidOrderTransition,
} from './commercial.utils';

describe('Commercial Utility Functions', () => {
  describe('getApprovalSteps', () => {
    it('should return 1 step for small amounts', () => {
      const steps = getApprovalSteps(100_000_000);
      expect(steps).toHaveLength(1);
      expect(steps[0].roleFa).toBe('مدیر فروش');
    });

    it('should return 2 steps for medium amounts', () => {
      const steps = getApprovalSteps(1_000_000_000);
      expect(steps).toHaveLength(2);
      expect(steps[1].roleFa).toBe('مدیر مالی');
    });

    it('should return 3 steps for large amounts', () => {
      const steps = getApprovalSteps(3_000_000_000);
      expect(steps).toHaveLength(3);
      expect(steps[2].roleFa).toBe('مدیرعامل');
    });
  });

  describe('generateInstallmentSchedule', () => {
    it('should generate monthly installments', () => {
      const entries = generateInstallmentSchedule(1200000, 3, 'monthly', '2026-01-01');
      expect(entries).toHaveLength(3);
      expect(entries[0].amount).toBe(400000);
      expect(entries[0].installmentNumber).toBe(1);
      // Last installment gets the remainder
      expect(entries[2].amount).toBe(400000);
    });

    it('should generate biweekly installments', () => {
      const entries = generateInstallmentSchedule(1000000, 4, 'biweekly', '2026-01-01');
      expect(entries).toHaveLength(4);
      expect(entries[1].dueDate).toBe('2026-01-15');
    });
  });

  describe('computeDaysOverdue', () => {
    it('should return 0 if not overdue', () => {
      expect(computeDaysOverdue('2026-01-10', '2026-01-05')).toBe(0);
    });

    it('should compute days overdue', () => {
      expect(computeDaysOverdue('2026-01-01', '2026-01-06')).toBe(5);
    });
  });

  describe('computeAgingBucket', () => {
    it('should classify CURRENT if not overdue', () => {
      expect(computeAgingBucket('2026-01-10', '2026-01-05')).toBe('CURRENT');
    });

    it('should classify 1-30 days overdue', () => {
      expect(computeAgingBucket('2026-01-01', '2026-01-15')).toBe('DAYS_1_30');
    });

    it('should classify 31-60 days overdue', () => {
      expect(computeAgingBucket('2026-01-01', '2026-02-15')).toBe('DAYS_31_60');
    });

    it('should classify 61-90 days overdue', () => {
      expect(computeAgingBucket('2026-01-01', '2026-03-15')).toBe('DAYS_61_90');
    });

    it('should classify over 90 days', () => {
      expect(computeAgingBucket('2026-01-01', '2026-05-01')).toBe('OVER_90');
    });
  });

  describe('checkCreditLimit', () => {
    it('should allow when within limit', () => {
      const result = checkCreditLimit(1000000, 500000, 200000);
      expect(result.allowed).toBe(true);
      expect(result.utilizationPercent).toBe(70);
    });

    it('should reject when over limit', () => {
      const result = checkCreditLimit(1000000, 800000, 300000);
      expect(result.allowed).toBe(false);
      expect(result.utilizationPercent).toBe(110);
    });

    it('should warn at high utilization', () => {
      const result = checkCreditLimit(1000000, 850000, 100000);
      expect(result.warning).toBe(true);
    });

    it('should allow unlimited (0 limit)', () => {
      const result = checkCreditLimit(0, 999999, 1000000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('calculateLineTotals', () => {
    it('should compute line total with tax', () => {
      const result = calculateLineTotals(10, 1000000, 0, 9);
      expect(result.lineSubtotal).toBe(10000000);
      expect(result.lineDiscount).toBe(0);
      expect(result.lineTax).toBe(900000);
      expect(result.lineTotal).toBe(10900000);
    });

    it('should apply discount before tax', () => {
      const result = calculateLineTotals(10, 1000000, 10, 9);
      expect(result.lineDiscount).toBe(1000000);
      expect(result.lineTax).toBe(810000);
      expect(result.lineTotal).toBe(9810000);
    });
  });

  describe('isValidOrderTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidOrderTransition('DRAFT', 'CONFIRMED')).toBe(true);
      expect(isValidOrderTransition('CONFIRMED', 'IN_PRODUCTION')).toBe(true);
      expect(isValidOrderTransition('SHIPPED', 'PARTIALLY_RECEIVED')).toBe(true);
      expect(isValidOrderTransition('FULLY_RECEIVED', 'INVOICED')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidOrderTransition('CLOSED', 'DRAFT')).toBe(false);
      expect(isValidOrderTransition('CANCELLED', 'CONFIRMED')).toBe(false);
      expect(isValidOrderTransition('DRAFT', 'INVOICED')).toBe(false);
    });
  });
});
