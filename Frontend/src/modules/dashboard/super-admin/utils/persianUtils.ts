// Persian/Jalali Date and Number Utilities

const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

export function toEnglishDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
}

export function formatPersianNumber(num: number): string {
  return toPersianDigits(num.toLocaleString('fa-IR'));
}

export function formatPersianCurrency(amount: number, unit: string = 'تومان'): string {
  if (amount >= 1000000000) {
    return `${toPersianDigits((amount / 1000000000).toFixed(1))} میلیارد ${unit}`;
  }
  if (amount >= 1000000) {
    return `${toPersianDigits((amount / 1000000).toFixed(1))} میلیون ${unit}`;
  }
  return `${formatPersianNumber(amount)} ${unit}`;
}

export function formatPersianPercent(value: number): string {
  return `${toPersianDigits(value.toFixed(0))}٪`;
}

// Simple Jalali date conversion (approximation for demo)
export function toJalali(date: Date | string): { year: number; month: number; day: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Simplified conversion - in production use a proper library like jalaali-js
  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();
  
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy - 621;
  
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + 
             Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  
  jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  
  return { year: jy, month: jm, day: jd };
}

const jalaliMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export function formatJalaliDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
  const j = toJalali(date);
  
  switch (format) {
    case 'short':
      return toPersianDigits(`${j.year}/${j.month.toString().padStart(2, '0')}/${j.day.toString().padStart(2, '0')}`);
    case 'long':
      return `${toPersianDigits(j.day)} ${jalaliMonths[j.month - 1]} ${toPersianDigits(j.year)}`;
    case 'full':
      const d = typeof date === 'string' ? new Date(date) : date;
      const time = `${toPersianDigits(d.getHours().toString().padStart(2, '0'))}:${toPersianDigits(d.getMinutes().toString().padStart(2, '0'))}`;
      return `${toPersianDigits(j.day)} ${jalaliMonths[j.month - 1]} ${toPersianDigits(j.year)} - ${time}`;
    default:
      return toPersianDigits(`${j.year}/${j.month}/${j.day}`);
  }
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'همین الان';
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  if (diffHour < 24) return `${toPersianDigits(diffHour)} ساعت پیش`;
  if (diffDay < 7) return `${toPersianDigits(diffDay)} روز پیش`;
  if (diffDay < 30) return `${toPersianDigits(Math.floor(diffDay / 7))} هفته پیش`;
  if (diffDay < 365) return `${toPersianDigits(Math.floor(diffDay / 30))} ماه پیش`;
  return `${toPersianDigits(Math.floor(diffDay / 365))} سال پیش`;
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDaysUntil(date: Date | string): string {
  const days = getDaysUntil(date);
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز گذشته`;
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  return `${toPersianDigits(days)} روز مانده`;
}
