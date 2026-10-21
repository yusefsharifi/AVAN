// ═══════════════════════════════════════════════════════════════════════════════
// Jalali Date Utilities — shared across all modules (BUG-002, BUG-009)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert Gregorian date to Jalali [year, month, day].
 * Algorithm: Iranian calendar (Farhang-e Badi) approximation.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

/**
 * Get current Jalali year.
 * BUG-002: Never hardcode year — always compute from current date.
 */
export function getCurrentJalaliYear(): string {
  const now = new Date();
  const [jy] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return String(jy);
}

/**
 * Get current Jalali date as YYYY-MM-DD string.
 * BUG-009: Never hardcode dates — always compute from current date.
 */
export function getCurrentJalaliDate(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

/**
 * Format Jalali date for display: YYYY/MM/DD
 */
export function formatJalaliDate(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}
