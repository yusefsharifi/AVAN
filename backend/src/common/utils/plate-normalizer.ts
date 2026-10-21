// ═══════════════════════════════════════════════════════════════════════════════
// Iranian Plate Normalization Utilities
// ═══════════════════════════════════════════════════════════════════════════════

// Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ → 0-9
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
// Persian/Farsi digits ۰۱۲۳۴۵۶۷۸۹ → 0-9
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const DIGIT_MAP: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  DIGIT_MAP[ARABIC_INDIC_DIGITS[i]] = String(i);
  DIGIT_MAP[PERSIAN_DIGITS[i]] = String(i);
}

// Persian letters that appear on plates
const PLATE_LETTERS: Record<string, string> = {
  الف: 'A', ب: 'B', پ: 'P', ت: 'T', ث: 'S',
  ج: 'J', چ: 'CH', ح: 'H', خ: 'KH', د: 'D',
  ذ: 'Z', ر: 'R', ز: 'Z', ژ: 'ZH', س: 'S',
  ش: 'SH', ص: 'SD', ض: 'ZD', ط: 'T', ظ: 'Z',
  ع: 'A', غ: 'GH', ف: 'F', ق: 'Q', ک: 'K',
  گ: 'G', ل: 'L', م: 'M', ن: 'N', و: 'V',
  ه: 'H', ی: 'Y',
};

// Latin letters valid on Iranian plates
const VALID_LATIN_LETTERS = new Set([
  'A', 'B', 'P', 'T', 'S', 'J', 'CH', 'H', 'KH',
  'D', 'Z', 'R', 'ZH', 'SH', 'SD', 'ZD', 'GH',
  'F', 'Q', 'K', 'G', 'L', 'M', 'N', 'V', 'Y',
]);

export function normalizePlate(plate: string): string {
  if (!plate) return '';

  let result = plate.trim();

  // Convert Arabic-Indic digits to ASCII
  for (const [arabic, ascii] of Object.entries(DIGIT_MAP)) {
    result = result.split(arabic).join(ascii);
  }

  // Convert Persian letters to Latin equivalents
  for (const [persian, latin] of Object.entries(PLATE_LETTERS)) {
    result = result.split(persian).join(latin);
  }

  // Remove spaces, dashes, dots
  result = result.replace(/[\s\-\.]+/g, '');

  return result.toUpperCase();
}

export function formatPlatePersian(normalized: string): string {
  if (!normalized) return '';

  // Try to format as standard Iranian plate
  // Standard format: DD + Letter + DDD
  const match = normalized.match(/^(\d{2})([A-Z]+)(\d{3})$/);
  if (match) {
    const [, digits1, letter, digits2] = match;
    return `${toPersianDigits(digits1)} ${toPersianLetter(letter)} ${toPersianDigits(digits2)}`;
  }

  // If doesn't match standard format, return as-is with Persian digits
  return toPersianDigits(normalized);
}

function toPersianDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d)]);
}

function toPersianLetter(latin: string): string {
  const entry = Object.entries(PLATE_LETTERS).find(([, v]) => v === latin);
  return entry ? entry[0] : latin;
}

export function isValidIranianPlate(plate: string): boolean {
  const normalized = normalizePlate(plate);
  if (!normalized) return false;

  // Type 1: DD{letter}DDD (private: 22B123)
  const type1 = /^\d{2}[A-Z]{1}\d{3}$/;
  // Type 2: DDDD{letter}DD (old format)
  const type2 = /^\d{4}[A-Z]{1}\d{2}$/;
  // Type 3: DD{2letters}DDD (special)
  const type3 = /^\d{2}[A-Z]{2}\d{3}$/;
  // Type 4: DDDDD (trailer)
  const type4 = /^\d{5}$/;
  // Type 5: DD{letter}DDD with possible extras
  const type5 = /^\d{2}[A-Z]{1,2}\d{3,4}$/;

  return type1.test(normalized) || type2.test(normalized) ||
    type3.test(normalized) || type4.test(normalized) || type5.test(normalized);
}
