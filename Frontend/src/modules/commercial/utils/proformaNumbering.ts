import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';

import type { ProformaDirection } from '../types';

export function generateProformaNumber(direction: ProformaDirection, jalaliYear: string, sequence: number): string {
  const prefix = direction === 'sales' ? 'PF-SALES' : 'PF-PUR';
  return `${prefix}-${jalaliYear}-${String(sequence).padStart(4, '0')}`;
}

export function autoGenerateProformaNumber(
  direction: ProformaDirection,
  existingProformas: any[],
): string {
  const jalaliYear = jalaliToday().split('/')[0];
  const usedNumbers = existingProformas
    .filter((p) => p.proformaNumber.startsWith(direction === 'sales' ? 'PF-SALES' : 'PF-PUR'))
    .map((p) => {
      const match = p.proformaNumber.match(/-\d{4}-\d{4}$/);
      return match ? parseInt(match[0].replace(/-/g, '')) : -1;
    });
  const maxSeq = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
  return generateProformaNumber(direction, jalaliYear, maxSeq + 1);
}

export function jalaliToday(): string {
  const now = new Date();
  const gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}