// src/modules/finance/utils/persianUtils.ts
// Re-exports and additions specific to finance module

const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatPersianNumber(num: number): string {
  return toPersianDigits(Math.round(num).toLocaleString('fa-IR'));
}

export function formatCurrency(amount: number, currency = 'ریال'): string {
  return `${formatPersianNumber(amount)} ${currency}`;
}

export function formatPersianCurrency(amount: number, unit = 'ریال'): string {
  if (amount >= 1_000_000_000)
    return `${toPersianDigits((amount / 1_000_000_000).toFixed(1))} میلیارد ${unit}`;
  if (amount >= 1_000_000)
    return `${toPersianDigits((amount / 1_000_000).toFixed(1))} میلیون ${unit}`;
  return `${formatPersianNumber(amount)} ${unit}`;
}

/** Validate YYYY/MM/DD Jalali string (with Persian or Latin digits) */
export function isValidJalaliDateString(v: string): boolean {
  if (!v) return false;
  const normalized = toEnglishDigits(v);
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) return false;
  const [y, m, d] = normalized.split('/').map(Number);
  if (y < 1300 || y > 1500) return false;
  if (m < 1 || m > 12) return false;
  const maxDay = m <= 6 ? 31 : m <= 11 ? 30 : 29;
  return d >= 1 && d <= maxDay;
}

/** Return today's Jalali date as YYYY/MM/DD */
export function jalaliToday(): string {
  const now = new Date();
  const gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365*gy) + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100)
           + Math.floor((gy2+399)/400) + gd + g_d_m[gm-1];
  let jy = -1595 + (33 * Math.floor(days/12053));
  days %= 12053;
  jy += 4 * Math.floor(days/1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days-1)/365); days = (days-1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
  const jd = 1 + (days < 186 ? days%31 : (days-186)%30);
  return `${jy}/${String(jm).padStart(2,'0')}/${String(jd).padStart(2,'0')}`;
}
