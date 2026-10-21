// ── Decimal Helpers ──────────────────────────────────────────────────────────

export function addDecimals(...values: number[]): number {
  return values.reduce((sum, v) => Math.round((sum + v) * 100) / 100, 0);
}

export function subtractDecimals(a: number, b: number): number {
  return Math.round((a - b) * 100) / 100;
}

export function multiplyDecimals(a: number, b: number): number {
  return Math.round(a * b * 100) / 100;
}

export function divideDecimals(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 100) / 100;
}

// ── Voucher Validators ───────────────────────────────────────────────────────

export function validateVoucherBalance(entries: { debit: number; credit: number }[]): { isBalanced: boolean; totalDebit: number; totalCredit: number; difference: number } {
  const totalDebit = addDecimals(...entries.map(e => e.debit));
  const totalCredit = addDecimals(...entries.map(e => e.credit));
  const difference = subtractDecimals(totalDebit, totalCredit);
  return { isBalanced: difference === 0, totalDebit, totalCredit, difference };
}

export function validatePeriodOpen(periodId: string, periodStatus: Record<string, 'open' | 'closed'>): boolean {
  return periodStatus[periodId] === 'open';
}

// ── Tax Calculators ──────────────────────────────────────────────────────────

export function calculateVAT(amount: number, rate: number = 0.09): number {
  return multiplyDecimals(amount, rate);
}

export function calculateWHT(amount: number, rate: number = 0.03): number {
  return multiplyDecimals(amount, rate);
}

export function calculateVATReturn(outputVAT: number, inputVAT: number): { netPayable: number; isRefund: boolean } {
  const netPayable = subtractDecimals(outputVAT, inputVAT);
  return { netPayable, isRefund: netPayable < 0 };
}

// ── Depreciation Engines ─────────────────────────────────────────────────────

export function calculateStraightLineDepreciation(cost: number, salvageValue: number, usefulLifeYears: number): number {
  if (usefulLifeYears === 0) return 0;
  return divideDecimals(subtractDecimals(cost, salvageValue), usefulLifeYears * 12);
}

export function calculateDecliningBalanceDepreciation(netBookValue: number, usefulLifeYears: number): number {
  if (usefulLifeYears === 0) return 0;
  const rate = 2 / usefulLifeYears;
  return multiplyDecimals(netBookValue, rate / 12);
}

export function calculateDepreciation(method: string, cost: number, salvageValue: number, usefulLifeYears: number, netBookValue: number): number {
  switch (method) {
    case 'straight_line': return calculateStraightLineDepreciation(cost, salvageValue, usefulLifeYears);
    case 'declining_balance': return calculateDecliningBalanceDepreciation(netBookValue, usefulLifeYears);
    default: return calculateStraightLineDepreciation(cost, salvageValue, usefulLifeYears);
  }
}

// ── FX Converters ────────────────────────────────────────────────────────────

export function convertCurrency(amount: number, fromRate: number, toRate: number): number {
  if (toRate === 0) return 0;
  return multiplyDecimals(amount, divideDecimals(fromRate, toRate));
}

// ── Report Formatters ────────────────────────────────────────────────────────

export function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 1000000000) return `${(amount / 1000000000).toFixed(1)} میلیارد ریال`;
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)} میلیون ریال`;
  return `${amount.toLocaleString('fa-IR')} ریال`;
}

export function formatAccountCode(code: string): string {
  return code.replace(/\./g, ' - ');
}

export function calculateAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

export function generateVoucherNumber(sequence: number): string {
  const year = new Date().getFullYear() === 2024 ? 1403 : 1403;
  return `JV-${year}-${String(sequence).padStart(6, '0')}`;
}

export function generateInvoiceNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear() === 2024 ? 1403 : 1403;
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`;
}
