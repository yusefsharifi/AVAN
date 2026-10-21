// ═══════════════════════════════════════════════════════════════════════════════
// Financial Comparison Utilities — BUG-004: Safe float comparison for finance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum representable difference in Rials.
 * Since amounts are stored as BigInt in the database but accumulated as
 * JavaScript `number` (IEEE 754 double) in the application layer,
 * floating-point rounding errors can cause `a !== b` even when the
 * underlying integer values are equal.
 *
 * A tolerance of 1 Rial (the smallest currency unit) is sufficient
 * to absorb any IEEE 754 rounding error while still catching real
 * discrepancies.
 */
const FINANCIAL_EPSILON = 1;

/**
 * Compare two financial amounts for approximate equality.
 * Returns true if |a - b| <= FINANCIAL_EPSILON.
 *
 * Use this instead of `a === b` or `a !== b` for all financial
 * comparisons where values have been accumulated through floating-point
 * arithmetic.
 *
 * @example
 * // WRONG — may fail due to float rounding:
 * if (totalDebit !== totalCredit) { throw new Error('Unbalanced'); }
 *
 * // CORRECT — uses epsilon tolerance:
 * if (!isFinancialEqual(totalDebit, totalCredit)) { throw new Error('Unbalanced'); }
 */
export function isFinancialEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= FINANCIAL_EPSILON;
}

/**
 * Compare two financial amounts for inequality.
 * Returns true if |a - b| > FINANCIAL_EPSILON.
 *
 * @example
 * if (isFinancialNotEqual(totalDebit, totalCredit)) { throw new Error('Unbalanced'); }
 */
export function isFinancialNotEqual(a: number, b: number): boolean {
  return !isFinancialEqual(a, b);
}

/**
 * Check if a financial amount is approximately zero.
 * Useful for checking if a balance or difference is effectively zero.
 *
 * @example
 * if (isFinancialZero(difference)) { /* balanced * / }
 */
export function isFinancialZero(value: number): boolean {
  return Math.abs(value) <= FINANCIAL_EPSILON;
}
