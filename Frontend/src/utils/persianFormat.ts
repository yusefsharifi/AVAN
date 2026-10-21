// Persian digit conversion
export function toPersianDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
}

export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString());
}

export function formatRial(amount: number): string {
  return toPersianDigits(amount.toLocaleString()) + ' ریال';
}

export function formatCurrency(amount: number): string {
  return formatRial(amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Jalali <-> ISO date handling (fix4.md Task 5)
//
// Contract for this module:
//   * Dates travel as ISO `YYYY-MM-DD`; Jalali exists ONLY for display/input.
//   * `formatJalali()` is the shared renderer. It NEVER returns "Invalid Date":
//     `Invalid Date.toLocaleDateString()` *returns* that literal instead of
//     throwing, so a surrounding try/catch cannot intercept it -- validity has
//     to be checked explicitly (which is what the previous code failed to do).
//   * Conversion goes through the ICU Persian calendar rather than arithmetic,
//     so `formatJalali(iso)` and `toIsoDate()` are exact inverses of each other
//     and a value round-trips without drifting.
// ─────────────────────────────────────────────────────────────────────────────

const PERSIAN_PARTS = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/** Placeholder for a value that is present but not a parseable date. */
export const DATE_INVALID = '—';
/** Placeholder for an absent value. */
export const DATE_EMPTY = '';

interface JalaliParts {
  y: number;
  m: number;
  d: number;
}

/** Rewrite Persian/Arabic-Indic digits to ASCII so the input is parseable. */
function toLatinDigits(value: string): string {
  return value
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function localIso(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse `YYYY-MM-DD` (or an ISO datetime prefix) into a local Date, or null. */
function parseIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  // Reject impossible combinations such as 2025-02-31.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function persianParts(date: Date): JalaliParts | null {
  let y: number | undefined;
  let m: number | undefined;
  let d: number | undefined;
  for (const part of PERSIAN_PARTS.formatToParts(date)) {
    if (part.type === 'year') y = Number(part.value);
    else if (part.type === 'month') m = Number(part.value);
    else if (part.type === 'day') d = Number(part.value);
  }
  return y !== undefined && m !== undefined && d !== undefined ? { y, m, d } : null;
}

/**
 * Convert Jalali (y, m, d) to ISO `YYYY-MM-DD`.
 *
 * Years >= 1800 are treated as already-Gregorian so mixed data (some columns
 * already hold ISO, others Jalali) round-trips instead of being lost.
 * Returns `''` for anything that is not a real calendar date.
 */
export function jalaliToIso(y: number, m: number, d: number): string {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';

  if (y >= 1800) {
    return parseIso(`${pad(y, 4)}-${pad(m)}-${pad(d)}`) ? `${pad(y, 4)}-${pad(m)}-${pad(d)}` : '';
  }
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return '';

  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  if (d > monthLengths[m - 1]) return '';

  const dayOfYear = monthLengths.slice(0, m - 1).reduce((sum, n) => sum + n, 0) + d;
  let cursor = new Date(y + 621, 2, 21 + (dayOfYear - 1), 12, 0, 0, 0);

  for (let step = 0; step < 32; step += 1) {
    const got = persianParts(cursor);
    if (!got) return '';
    if (got.y === y && got.m === m && got.d === d) return localIso(cursor);

    const before = got.y < y || (got.y === y && (got.m < m || (got.m === m && got.d < d)));
    cursor = new Date(cursor.getTime() + (before ? 1 : -1) * 86_400_000);
  }
  return '';
}

/**
 * Parse a user-entered date into Jalali parts.
 *
 * The return value is ALWAYS an object so that the established call shape
 *   `jalaliToIso(...Object.values(parseJalaliInput(x)!) as [number, number, number])`
 * spreads to exactly three numbers. Unparseable input yields a `NaN` triple,
 * which `jalaliToIso` turns into `''` -- this keeps the existing `!`
 * assertions from crashing on `Object.values(null)` while still refusing to
 * invent a date.
 */
export function parseJalaliInput(input: string): JalaliParts {
  const invalid: JalaliParts = { y: NaN, m: NaN, d: NaN };
  if (!input) return invalid;

  const normalized = toLatinDigits(String(input).trim()).replace(/\//g, '-');
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  if (!match) return invalid;

  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/**
 * Normalise any accepted date input to canonical ISO `YYYY-MM-DD` for the wire.
 * Returns `''` when the value cannot be understood -- callers must not fall
 * back to a placeholder such as the literal string `امروز`.
 */
export function toIsoDate(value?: string | Date | null): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : localIso(value);
  }

  const raw = String(value).trim();
  if (raw === '') return '';
  if (/^(امروز|today)$/i.test(raw)) return localIso(new Date());

  const parts = parseJalaliInput(raw);
  return jalaliToIso(parts.y, parts.m, parts.d);
}

/**
 * Shared Jalali renderer -- the single place display formatting happens.
 * Returns `DATE_EMPTY` for absent values and `DATE_INVALID` for values that
 * are present but unparseable, never the literal text "Invalid Date".
 */
export function formatJalali(
  value?: string | Date | null,
  options: { withTime?: boolean } = {},
): string {
  if (value === undefined || value === null || value === '') return DATE_EMPTY;

  const date =
    value instanceof Date ? value : parseIso(toIsoDate(value) || String(value)) ?? parseIso(String(value));

  if (!date || Number.isNaN(date.getTime())) return DATE_INVALID;

  const base: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (options.withTime) {
    base.hour = '2-digit';
    base.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', base)
    .format(date)
    .replace(/[\u200f\u200e]/g, '');
}

/** ISO (or any accepted value) -> Jalali `YYYY/MM/DD` string. */
export function toJalaliStr(date?: string | Date | null): string {
  if (date === undefined || date === null || date === '') return DATE_EMPTY;
  return formatJalali(date);
}

/** ISO (or any accepted value) -> Jalali date + time string. */
export function toJalaliDateTime(date?: string | Date | null): string {
  if (date === undefined || date === null || date === '') return DATE_EMPTY;
  return formatJalali(date, { withTime: true });
}

export function jalaliNow(): string {
  return formatJalali(new Date());
}

export function daysUntilJalali(date?: string | Date | null): number {
  if (!date) return 0;
  const iso = typeof date === 'string' ? toIsoDate(date) : localIso(date);
  const target = parseIso(iso);
  if (!target) return 0;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function isOverdueJalali(date?: string | Date | null): boolean {
  if (!date) return false;
  return daysUntilJalali(date) < 0;
}
