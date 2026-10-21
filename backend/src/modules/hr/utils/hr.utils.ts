// ═══════════════════════════════════════════════════════════════════════════════
// M15: HR & Payroll — Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

import { isoOf, normalizeDateToIso } from '../../../common/utils/date-normalize';

/**
 * Iranian income tax calculation using progressive brackets (1402/1403).
 * Tax is computed monthly from annual brackets:
 *   Annual exempt: up to 120,000,000 IRR
 *   Annual 10%: 120,000,001 - 240,000,000
 *   Annual 15%: 240,000,001 - 360,000,000
 *   Annual 20%: 360,000,001 - 480,000,000
 *   Annual 25%: 480,000,001 - 600,000,000
 *   Annual 30%: above 600,000,000
 *
 * Monthly = annual / 12
 */
export function computeIncomeTax(monthlySalary: bigint): bigint {
  if (monthlySalary <= 0) return 0n;

  // Convert to annual, compute tax on annual, divide by 12
  const annualSalary = monthlySalary * 12n;

  // Brackets in IRR (annual)
  const EXEMPT_LIMIT = 120_000_000n;
  const BRACKET_10 = 240_000_000n;
  const BRACKET_15 = 360_000_000n;
  const BRACKET_20 = 480_000_000n;
  const BRACKET_25 = 600_000_000n;

  let annualTax = 0n;

  if (annualSalary <= EXEMPT_LIMIT) {
    return 0n;
  }

  let remaining = annualSalary - EXEMPT_LIMIT;

  // 10% bracket: 120M to 240M
  const bracket10Size = BRACKET_10 - EXEMPT_LIMIT;
  if (remaining > 0n) {
    const taxable = remaining > bracket10Size ? bracket10Size : remaining;
    annualTax += (taxable * 10n) / 100n;
    remaining -= taxable;
  }

  // 15% bracket: 240M to 360M
  const bracket15Size = BRACKET_15 - BRACKET_10;
  if (remaining > 0n) {
    const taxable = remaining > bracket15Size ? bracket15Size : remaining;
    annualTax += (taxable * 15n) / 100n;
    remaining -= taxable;
  }

  // 20% bracket: 360M to 480M
  const bracket20Size = BRACKET_20 - BRACKET_15;
  if (remaining > 0n) {
    const taxable = remaining > bracket20Size ? bracket20Size : remaining;
    annualTax += (taxable * 20n) / 100n;
    remaining -= taxable;
  }

  // 25% bracket: 480M to 600M
  const bracket25Size = BRACKET_25 - BRACKET_20;
  if (remaining > 0n) {
    const taxable = remaining > bracket25Size ? bracket25Size : remaining;
    annualTax += (taxable * 25n) / 100n;
    remaining -= taxable;
  }

  // 30% bracket: above 600M
  if (remaining > 0n) {
    annualTax += (remaining * 30n) / 100n;
  }

  // Monthly tax = annual / 12
  return annualTax / 12n;
}

/**
 * Compute overtime pay at Iranian labor law rates.
 * Weekday: 1.4x hourly rate
 * Weekend/Holiday: 1.6x hourly rate
 */
export function computeOvertimePay(
  baseSalary: bigint,
  workDaysInMonth: number,
  overtimeHoursWeekday: number,
  overtimeHoursWeekend: number,
): bigint {
  if (workDaysInMonth <= 0 || baseSalary <= 0n) return 0n;

  const hourlyRate = baseSalary / BigInt(workDaysInMonth * 8);
  const weekdayPay = hourlyRate * BigInt(Math.round(overtimeHoursWeekday * 140)) / 100n;
  const weekendPay = hourlyRate * BigInt(Math.round(overtimeHoursWeekend * 160)) / 100n;

  return weekdayPay + weekendPay;
}

/**
 * Compute social security deductions.
 * Employee: 7% of gross
 * Employer: 23% of gross (not deducted from employee)
 */
export function computeSocialSecurity(
  grossSalary: bigint,
): { employee: bigint; employer: bigint } {
  return {
    employee: (grossSalary * 7n) / 100n,
    employer: (grossSalary * 23n) / 100n,
  };
}

/**
 * Count workdays between two Jalali dates (inclusive).
 * Excludes weekends (Thursday-Friday in Iran) and provided holidays.
 * @param startJalali YYYY-MM-DD
 * @param endJalali YYYY-MM-DD
 * @param holidays Set of holiday date strings "YYYY-MM-DD"
 * @returns number of workdays
 */
export function countWorkdays(
  startJalali: string,
  endJalali: string,
  holidays: Set<string>,
): number {
  const start = jalaliToDate(startJalali);
  const end = jalaliToDate(endJalali);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateStr = dateToJalali(current);
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat

    // Iran weekend: Thursday (4) and Friday (5)
    if (dayOfWeek !== 4 && dayOfWeek !== 5) {
      if (!holidays.has(dateStr)) {
        count++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Convert Jalali date string (YYYY-MM-DD) to JavaScript Date.
 * Simple approximate conversion (accurate enough for workday counting).
 */
export function jalaliToDate(jalaliDate: string): Date {
  const [jy, jm, jd] = jalaliDate.split('-').map(Number);

  // Jalali to Gregorian conversion
  const gy = jy + 621;
  const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayOfYear = monthOffsets[jm - 1] + jd;

  // Adjust for leap year
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const adjustedDayOfYear = dayOfYear + (isLeap && jm > 6 ? 1 : 0);

  const date = new Date(gy, 0, adjustedDayOfYear);
  return date;
}

/**
 * Convert JavaScript Date to Jalali date string (YYYY-MM-DD).
 */
export function dateToJalali(date: Date): string {
  const gY = date.getFullYear();
  const gM = date.getMonth() + 1;
  const gD = date.getDate();

  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (gY % 4 === 0 && gY % 100 !== 0) || gY % 400 === 0;
  if (isLeapYear) gDaysInMonth[1] = 29;

  const gy = gY - 621;
  const dayOfYear = gDaysInMonth.slice(0, gM - 1).reduce((s, d) => s + d, 0) + gD;

  // Rough Jalali day of year offset
  const jDayOfYear = dayOfYear - 79; // approximate offset

  let jy = gy;
  let jm = 1;
  let jd = 1;

  if (jDayOfYear <= 0) {
    jy -= 1;
    jm = jDayOfYear <= -186 ? 9 : jDayOfYear <= -155 ? 10 : jDayOfYear <= -124 ? 11 : 12;
    // More precise calculation using fixed table
    const dayInPrevYear = jDayOfYear + (jy % 4 === 0 ? 366 : 365);
    const jMonths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    let remaining = dayInPrevYear;
    jm = 12;
    for (let i = 11; i >= 0; i--) {
      if (remaining <= jMonths[i]) {
        jm = i + 1;
        jd = remaining;
        break;
      }
      remaining -= jMonths[i];
    }
    return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  }

  const jMonths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let remaining = jDayOfYear;
  jm = 1;

  for (let i = 0; i < 12; i++) {
    if (remaining <= jMonths[i]) {
      jm = i + 1;
      jd = remaining;
      return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
    }
    remaining -= jMonths[i];
  }

  // Fallback
  return `${jy}-${String(jm).padStart(2, '0')}-${String(Math.min(remaining, 29)).padStart(2, '0')}`;
}

/**
 * Get current Jalali date as YYYY-MM-DD string.
 */
export function getCurrentJalaliDate(): string {
  return dateToJalali(new Date());
}

/**
 * Get Jalali year from date string.
 */
export function getJalaliYear(dateStr: string): number {
  return parseInt(dateStr.split('-')[0], 10);
}

/**
 * Get Jalali month from date string.
 */
export function getJalaliMonth(dateStr: string): number {
  return parseInt(dateStr.split('-')[1], 10);
}

/**
 * Add days to a Jalali date string.
 */
export function addJalaliDays(jalaliDate: string, days: number): string {
  const date = jalaliToDate(jalaliDate);
  date.setDate(date.getDate() + days);
  return dateToJalali(date);
}

/**
 * Calculate difference in days between two Jalali dates.
 */
export function jalaliDaysDifference(from: string, to: string): number {
  const d1 = jalaliToDate(from);
  const d2 = jalaliToDate(to);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate probation end date (90 days after hire date).
 *
 * Returns ISO `YYYY-MM-DD`. Input may be ISO (the normal, DTO-normalised path)
 * or legacy Jalali, which is converted first.
 *
 * Note: the previous implementation piped through `addJalaliDays`, which relies
 * on the arithmetic `jalaliToDate` helper. That helper is inaccurate by roughly
 * 2.5 months (`jalaliToDate('1403-01-01')` returns `2024-01-01` instead of
 * `2024-03-20`), so probation dates derived from it were wrong. Adding calendar
 * days in Gregorian space is exact and needs no Jalali maths at all.
 */
export function computeProbationEndDate(hireDate: string): string {
  const normalized = normalizeDateToIso(hireDate);
  if (!normalized.ok) return '';

  const [year, month, day] = normalized.iso.split('-').map(Number);
  const start = new Date(year, month - 1, day, 12, 0, 0, 0);
  start.setDate(start.getDate() + 90);
  return isoOf(start);
}

/**
 * Calculate monthly loan installment with optional interest.
 */
export function computeLoanInstallment(
  amount: bigint,
  installmentCount: number,
  interestRate: number, // e.g. 0.0 for zero interest
): bigint {
  if (installmentCount <= 0) return amount;
  if (interestRate <= 0) {
    return amount / BigInt(installmentCount);
  }

  // Simple interest: total = amount * (1 + rate)
  const totalInterest = BigInt(Math.round(Number(amount) * interestRate));
  const totalWithInterest = amount + totalInterest;
  return totalWithInterest / BigInt(installmentCount);
}

/**
 * Determine performance rating from overall score (1-5 scale).
 */
export function determinePerformanceRating(score: number): string {
  if (score >= 4.5) return 'EXCEPTIONAL';
  if (score >= 3.5) return 'EXCEEDS';
  if (score >= 2.5) return 'MEETS';
  if (score >= 1.5) return 'BELOW';
  return 'UNSATISFACTORY';
}

/**
 * Compute weighted overall score for performance review.
 * Quality: 25%, Attendance: 15%, Initiative: 15%,
 * Teamwork: 15%, Communication: 15%, Technical: 15%
 */
export function computeOverallScore(scores: {
  quality?: number;
  attendance?: number;
  initiative?: number;
  teamwork?: number;
  communication?: number;
  technical?: number;
}): { overallScore: number; overallRating: string } {
  const weights = {
    quality: 0.25,
    attendance: 0.15,
    initiative: 0.15,
    teamwork: 0.15,
    communication: 0.15,
    technical: 0.15,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const val = scores[key as keyof typeof scores];
    if (val !== undefined && val !== null) {
      weightedSum += val * weight;
      totalWeight += weight;
    }
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const overallRating = determinePerformanceRating(overallScore);

  return { overallScore: Math.round(overallScore * 100) / 100, overallRating };
}
