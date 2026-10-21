import { AgingBucket, ProformaApprovalStepConfig, CreditCheckResult } from '../dto/enums';

// ═══════════════════════════════════════════════════════════════════════════
// APPROVAL THRESHOLD LOGIC
//
// Determine approval chain based on proforma grandTotal (IRR):
//   ≤ 500,000,000 IRR → [مدیر فروش]
//   ≤ 2,000,000,000 IRR → [مدیر فروش, مدیر مالی]
//   > 2,000,000,000 IRR → [مدیر فروش, مدیر مالی, مدیرعامل]
// ═══════════════════════════════════════════════════════════════════════════

const IRR_500M = 500_000_000;
const IRR_2B = 2_000_000_000;

export function getApprovalSteps(grandTotal: number): ProformaApprovalStepConfig[] {
  if (grandTotal <= IRR_500M) {
    return [{ stepOrder: 1, roleFa: 'مدیر فروش' }];
  }

  if (grandTotal <= IRR_2B) {
    return [
      { stepOrder: 1, roleFa: 'مدیر فروش' },
      { stepOrder: 2, roleFa: 'مدیر مالی' },
    ];
  }

  return [
    { stepOrder: 1, roleFa: 'مدیر فروش' },
    { stepOrder: 2, roleFa: 'مدیر مالی' },
    { stepOrder: 3, roleFa: 'مدیرعامل' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTALLMENT SCHEDULE GENERATOR
//
// Generates a list of installment due dates and amounts.
// frequency: "monthly" | "biweekly"
// ═══════════════════════════════════════════════════════════════════════════

export interface InstallmentEntry {
  installmentNumber: number;
  dueDate: string; // Jalali-compatible YYYY-MM-DD
  amount: number;
}

export function generateInstallmentSchedule(
  totalAmount: number,
  count: number,
  frequency: 'monthly' | 'biweekly',
  startDate: string,
): InstallmentEntry[] {
  const baseAmount = Math.floor(totalAmount / count);
  const remainder = totalAmount - baseAmount * count;
  const entries: InstallmentEntry[] = [];

  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(start);

    if (frequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + i);
    } else {
      // biweekly = every 14 days
      dueDate.setDate(dueDate.getDate() + i * 14);
    }

    // Add remainder to the last installment
    const amount = i === count - 1 ? baseAmount + remainder : baseAmount;

    entries.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount,
    });
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGING BUCKET CALCULATOR
//
// Classifies an invoice into an aging bucket based on how many days overdue.
// ═══════════════════════════════════════════════════════════════════════════

export function computeDaysOverdue(dueDate: string, today: string): number {
  const due = new Date(dueDate);
  const now = new Date(today);
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function computeAgingBucket(dueDate: string, today: string): AgingBucket {
  const daysOverdue = computeDaysOverdue(dueDate, today);

  if (daysOverdue <= 0) return AgingBucket.CURRENT;
  if (daysOverdue <= 30) return AgingBucket.DAYS_1_30;
  if (daysOverdue <= 60) return AgingBucket.DAYS_31_60;
  if (daysOverdue <= 90) return AgingBucket.DAYS_61_90;
  return AgingBucket.OVER_90;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREDIT LIMIT CHECK
//
// Pure function to check whether a party can take on more credit.
// ═══════════════════════════════════════════════════════════════════════════

export function checkCreditLimit(
  creditLimit: number,
  creditUsed: number,
  newAmount: number,
): CreditCheckResult {
  const available = creditLimit - creditUsed;
  const newUsed = creditUsed + newAmount;
  const utilizationPercent = creditLimit > 0 ? Math.round((newUsed / creditLimit) * 100) : 0;

  return {
    allowed: creditLimit === 0 || newUsed <= creditLimit, // 0 = no limit
    creditLimit,
    creditUsed,
    available,
    utilizationPercent,
    warning: utilizationPercent > 90,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LINE TOTAL CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface LineCalcResult {
  lineSubtotal: number;
  lineDiscount: number;
  lineTax: number;
  lineTotal: number;
}

export function calculateLineTotals(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRate: number = 9,
): LineCalcResult {
  const lineSubtotal = Math.round(quantity * unitPrice);
  const lineDiscount = Math.round(lineSubtotal * discountPercent / 100);
  const taxableAmount = lineSubtotal - lineDiscount;
  const lineTax = Math.round(taxableAmount * taxRate / 100);
  const lineTotal = taxableAmount + lineTax;

  return { lineSubtotal, lineDiscount, lineTax, lineTotal };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS TRANSITION VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED'],
  PARTIALLY_RECEIVED: ['FULLY_RECEIVED'],
  FULLY_RECEIVED: ['INVOICED'],
  INVOICED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export function isValidOrderTransition(current: string, next: string): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}
