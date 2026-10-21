import { isFinancialEqual, isFinancialNotEqual, isFinancialZero } from './financial-compare';

describe('Financial Compare Utilities (BUG-004 fix)', () => {
  describe('isFinancialEqual', () => {
    it('should return true for identical values', () => {
      expect(isFinancialEqual(1000, 1000)).toBe(true);
    });

    it('should return true for values within epsilon (1 Rial)', () => {
      expect(isFinancialEqual(1000, 1001)).toBe(true);
      expect(isFinancialEqual(1001, 1000)).toBe(true);
    });

    it('should return true for zero values', () => {
      expect(isFinancialEqual(0, 0)).toBe(true);
    });

    it('should return false for values differing by more than epsilon', () => {
      expect(isFinancialEqual(1000, 1002)).toBe(false);
      expect(isFinancialEqual(1000, 998)).toBe(false);
    });

    it('should handle negative values', () => {
      expect(isFinancialEqual(-1000, -1000)).toBe(true);
      expect(isFinancialEqual(-1000, -1001)).toBe(true);
      expect(isFinancialEqual(-1000, -1002)).toBe(false);
    });

    it('should handle BigInt-to-number conversions (IEEE 754 rounding)', () => {
      // Simulate the pattern: Number(BigInt) + Number(BigInt) can cause rounding
      const a = Number(BigInt('9007199254740993')); // 2^53 + 1
      const b = Number(BigInt('9007199254740993')); // Same value
      // Both become 9007199254740992 due to IEEE 754
      expect(isFinancialEqual(a, b)).toBe(true);
    });

    it('should handle large financial amounts', () => {
      expect(isFinancialEqual(999999999999, 999999999999)).toBe(true);
      // Differ by 1 Rial = within epsilon
      expect(isFinancialEqual(999999999999, 1000000000000)).toBe(true);
      // Differ by more than 1 Rial
      expect(isFinancialEqual(999999999999, 1000000000002)).toBe(false);
    });

    it('should handle floating-point accumulation pattern', () => {
      // Pattern from the bug: 0.1 + 0.2 !== 0.3 in JavaScript
      // In financial context with integer Rials:
      const values = [100, 200, 300, 400, 500];
      const sum = values.reduce((a, b) => a + b, 0);
      expect(isFinancialEqual(sum, 1500)).toBe(true);
    });
  });

  describe('isFinancialNotEqual', () => {
    it('should return false for equal values', () => {
      expect(isFinancialNotEqual(1000, 1000)).toBe(false);
    });

    it('should return true for unequal values', () => {
      expect(isFinancialNotEqual(1000, 2000)).toBe(true);
    });

    it('should return false for values within epsilon', () => {
      expect(isFinancialNotEqual(1000, 1001)).toBe(false);
    });
  });

  describe('isFinancialZero', () => {
    it('should return true for zero', () => {
      expect(isFinancialZero(0)).toBe(true);
    });

    it('should return true for values within epsilon', () => {
      expect(isFinancialZero(0.5)).toBe(true);
      expect(isFinancialZero(-0.5)).toBe(true);
    });

    it('should return false for non-zero values', () => {
      expect(isFinancialZero(100)).toBe(false);
      expect(isFinancialZero(-100)).toBe(false);
    });

    it('should return false for values just outside epsilon', () => {
      expect(isFinancialZero(2)).toBe(false);
      expect(isFinancialZero(-2)).toBe(false);
    });
  });
});
