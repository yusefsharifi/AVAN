import { isFinancialNotEqual } from './financial-compare';

export interface VoucherLineInput {
  lineNumber: number;
  description: string;
  debitAccountId?: string;
  creditAccountId?: string;
  debitAmount?: number;
  creditAmount?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
}

/**
 * Validates double-entry bookkeeping rules for voucher lines.
 * Rules:
 * 1. Each line must have either debit OR credit (not both, not neither)
 * 2. Total debits must equal total credits
 * 3. All amounts must be non-negative
 * 4. No zero-amount lines
 */
export function validateDoubleEntry(lines: VoucherLineInput[]): ValidationResult {
  const errors: string[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  if (!lines || lines.length === 0) {
    return {
      isValid: false,
      errors: ['سند باید حداقل یک ردیف داشته باشد'],
      totalDebit: 0,
      totalCredit: 0,
    };
  }

  for (const line of lines) {
    const hasDebit = line.debitAccountId && line.debitAmount && line.debitAmount > 0;
    const hasCredit = line.creditAccountId && line.creditAmount && line.creditAmount > 0;

    if (!hasDebit && !hasCredit) {
      errors.push(`ردیف ${line.lineNumber}: باید بدهکار یا بستانکار وارد شود`);
      continue;
    }

    if (hasDebit && hasCredit) {
      errors.push(`ردیف ${line.lineNumber}: نمی‌توان همزمان بدهکار و بستانکار باشد`);
      continue;
    }

    if (hasDebit) {
      totalDebit += line.debitAmount!;
      if (line.debitAmount! < 0) {
        errors.push(`ردیف ${line.lineNumber}: مبلغ بدهکار نمی‌تواند منفی باشد`);
      }
    }

    if (hasCredit) {
      totalCredit += line.creditAmount!;
      if (line.creditAmount! < 0) {
        errors.push(`ردیف ${line.lineNumber}: مبلغ بستانکار نمی‌تواند منفی باشد`);
      }
    }
  }

  // BUG-004: Use epsilon comparison instead of strict !== for financial values
  if (isFinancialNotEqual(totalDebit, totalCredit)) {
    errors.push(
      `جمع بدهکار (${totalDebit.toLocaleString('fa-IR')}) با جمع بستانکار (${totalCredit.toLocaleString('fa-IR')}) برابر نیست`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
  };
}

/**
 * Calculate invoice line totals
 */
export interface InvoiceLineCalc {
  quantity: number;
  unitPrice: number;
  discount?: number;  // percentage
  taxRate?: number;   // percentage, default 9%
}

export interface InvoiceLineResult {
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineTotal: number;
}

export function calculateInvoiceLine(line: InvoiceLineCalc): InvoiceLineResult {
  const taxRate = line.taxRate ?? 9;
  const discountPct = line.discount ?? 0;

  const lineSubtotal = Math.round(line.quantity * line.unitPrice);
  const lineDiscount = Math.round(lineSubtotal * discountPct / 100);
  const taxableAmount = lineSubtotal - lineDiscount;
  const lineTax = Math.round(taxableAmount * taxRate / 100);
  const lineTotal = taxableAmount + lineTax;

  return {
    lineSubtotal,
    lineDiscount,
    lineTax,
    lineTotal,
  };
}

/**
 * Calculate days between two dates for aging analysis
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate DSO (Days Sales Outstanding)
 */
export function calculateDSO(
  accountsReceivable: number,
  annualRevenue: number,
): number {
  if (annualRevenue <= 0) return 0;
  const dailyRevenue = annualRevenue / 365;
  return Math.round(accountsReceivable / dailyRevenue);
}

/**
 * Calculate DPO (Days Payable Outstanding)
 */
export function calculateDPO(
  accountsPayable: number,
  annualCostOfGoodsSold: number,
): number {
  if (annualCostOfGoodsSold <= 0) return 0;
  const dailyCOGS = annualCostOfGoodsSold / 365;
  return Math.round(accountsPayable / dailyCOGS);
}
