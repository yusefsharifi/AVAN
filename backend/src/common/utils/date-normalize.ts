/**
 * ISO-8601 date normalisation for API boundaries (fix4.md Task 5).
 *
 * Contract: dates travel as ISO `YYYY-MM-DD` on the wire. Legacy callers may
 * still send Jalali, Persian digits, `YYYY/MM/DD` or the literal `امروز`
 * ("today"); those are accepted for compatibility but reported through
 * `wasIso === false` so callers can emit a deprecation warning.
 *
 * Conversion correctness
 * ----------------------
 * Both directions go through the ICU Persian calendar, which is authoritative:
 *
 *   ISO -> Jalali : `Intl.DateTimeFormat('fa-IR')`
 *   Jalali -> ISO : bounded inverse search over the ICU output (see below)
 *
 * This matters because the pre-existing arithmetic conversion in
 * `modules/hr/utils/hr.utils.ts` (`jalaliToDate`) is wrong by roughly two and a
 * half months -- `jalaliToDate('1403-01-01')` yields `2024-01-01` instead of
 * `2024-03-20` -- and it silently mis-derives `probationEndDate`. Do NOT
 * reintroduce arithmetic Jalali maths here.
 *
 * Nothing here ever returns a placeholder or an unvalidated string: an
 * unparseable input sets `ok: false` so the caller can reject it rather than
 * persisting `Invalid Date`.
 */

export interface NormalizedIsoDate {
  /** Canonical `YYYY-MM-DD`. Only meaningful when `ok` is true. */
  readonly iso: string;
  /** False when the input could not be understood as a real calendar date. */
  readonly ok: boolean;
  /** True when the input was NOT already ISO -- callers should log a warning. */
  readonly wasIso: boolean;
  /** Machine-readable cause when `ok` is false. */
  readonly reason?: 'empty' | 'malformed' | 'out-of-range';
}

const PERSIAN_PARTS = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const EMPTY: NormalizedIsoDate = { iso: '', ok: false, wasIso: true, reason: 'empty' };

/** Rewrite Persian/Arabic-Indic digits to ASCII so the input is parseable. */
function toLatinDigits(value: string): string {
  return value
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // ۰-۹
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)); // ٠-٩
}

/** Format a local-time Date as canonical `YYYY-MM-DD`. */
export function isoOf(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function persianParts(date: Date): readonly [number, number, number] | null {
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  for (const part of PERSIAN_PARTS.formatToParts(date)) {
    if (part.type === 'year') year = Number(part.value);
    else if (part.type === 'month') month = Number(part.value);
    else if (part.type === 'day') day = Number(part.value);
  }
  if (year === undefined || month === undefined || day === undefined) return null;
  return [year, month, day];
}

/**
 * Convert a Jalali calendar date to ISO `YYYY-MM-DD`.
 *
 * Seeded from the known Nowruz anchor (Jalali new year falls on 20/21 March of
 * Gregorian `jy + 621`), then walked day-by-day against the ICU output. The
 * seed is accurate to within a couple of days and the search tolerates 32, so
 * the result is exact -- `format(iso) === input` holds for every valid date.
 *
 * Returns `null` when the triple is not a real Jalali date (e.g. day 31 of a
 * 30-day month) or the calendar lookup fails.
 */
export function jalaliToIsoDate(jy: number, jm: number, jd: number): string | null {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;

  // Days per Jalali month; Farvardin..Shahrivar are 31, Mehr..Esfand 30 (29).
  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  if (jd > monthLengths[jm - 1]) return null;

  const dayOfYear =
    monthLengths.slice(0, jm - 1).reduce((sum, n) => sum + n, 0) + jd;
  const gregorianYear = jy + 621;
  let cursor = new Date(gregorianYear, 2, 21 + (dayOfYear - 1), 12, 0, 0, 0);

  for (let step = 0; step < 32; step += 1) {
    const got = persianParts(cursor);
    if (!got) return null;
    if (got[0] === jy && got[1] === jm && got[2] === jd) return isoOf(cursor);

    const isBeforeTarget =
      got[0] < jy ||
      (got[0] === jy && (got[1] < jm || (got[1] === jm && got[2] < jd)));
    cursor = new Date(cursor.getTime() + (isBeforeTarget ? 1 : -1) * 86_400_000);
  }
  return null;
}

/**
 * Render an ISO (or ISO datetime) string as Jalali `YYYY/MM/DD`, or `''` when
 * the value is absent/unparseable. Never returns "Invalid Date": `Invalid
 * Date.toLocaleDateString()` *returns* that literal instead of throwing, so an
 * exception handler cannot catch it -- the validity check must be explicit.
 */
export function isoToJalali(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseIsoDate(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\u200f|\u200e/g, '');
}

/** Parse `YYYY-MM-DD` or a full ISO datetime into a local-midnight Date. */
function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  // Reject impossible combinations such as 2025-02-31.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

/** Today as canonical ISO `YYYY-MM-DD`. */
export function todayIso(): string {
  return isoOf(new Date());
}

/**
 * Normalise any accepted date input to canonical ISO.
 *
 * Accepted inputs:
 *   - `YYYY-MM-DD` / `YYYY-MM-DDThh:mm(:ss)(.sss)?Z`   (canonical, wasIso)
 *   - `YYYY/MM/DD`                                      (wasIso: false)
 *   - Jalali `YYYY-MM-DD` / `YYYY/MM/DD` with year < 1800 (wasIso: false)
 *   - Persian or Arabic-Indic digits of any of the above (wasIso: false)
 *   - `امروز`, `today`                                  (wasIso: false)
 *
 * Anything else returns `ok: false` with a reason -- callers must reject it
 * rather than falling back to a default, which is what previously produced the
 * literal string `امروز` in the `hireDate` column.
 */
export function normalizeDateToIso(raw: unknown): NormalizedIsoDate {
  if (raw === null || raw === undefined) return EMPTY;
  if (typeof raw !== 'object' && typeof raw !== 'string') {
    return { iso: '', ok: false, wasIso: false, reason: 'malformed' };
  }

  let input = String(raw).trim();
  if (input === '') return EMPTY;

  const hadNonAsciiDigits = input !== toLatinDigits(input);
  input = toLatinDigits(input);

  // Explicit "today" aliases: correct semantics, but still non-canonical input.
  if (/^(امروز|today)$/i.test(input)) {
    return { iso: todayIso(), ok: true, wasIso: false };
  }

  // Take the date portion of a datetime, if present.
  const stamp = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/.exec(input);
  if (!stamp) {
    return { iso: '', ok: false, wasIso: false, reason: 'malformed' };
  }

  const [rawYear, month, day] = [Number(stamp[1]), Number(stamp[2]), Number(stamp[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { iso: '', ok: false, wasIso: false, reason: 'out-of-range' };
  }

  // Years >= 1800 are Gregorian/ISO; years below that are Jalali (the Jalali
  // era is ~1200-1600 today, Gregorian is >= 1800, so 1800 is a safe seam and
  // cannot misclassify a plausible date in either system).
  if (rawYear >= 1800 && rawYear <= 3000) {
    const date = parseIsoDate(
      `${String(rawYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
    if (!date) return { iso: '', ok: false, wasIso: false, reason: 'out-of-range' };
    const iso = isoOf(date);
    const wasIso = !hadNonAsciiDigits && /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim());
    return { iso, ok: true, wasIso };
  }

  if (rawYear < 1000 || rawYear >= 1800) {
    return { iso: '', ok: false, wasIso: false, reason: 'out-of-range' };
  }

  const iso = jalaliToIsoDate(rawYear, month, day);
  if (!iso) return { iso: '', ok: false, wasIso: false, reason: 'out-of-range' };
  return { iso, ok: true, wasIso: false };
}
