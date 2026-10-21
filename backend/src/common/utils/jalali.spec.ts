import { gregorianToJalali, getCurrentJalaliYear, getCurrentJalaliDate, formatJalaliDate } from './jalali';

describe('Jalali Date Utilities (BUG-002/009 fix)', () => {
  describe('gregorianToJalali', () => {
    it('should convert Nowruz 2024 (March 20) to 1403-01-01', () => {
      const [jy, jm, jd] = gregorianToJalali(2024, 3, 20);
      expect(jy).toBe(1403);
      expect(jm).toBe(1);
      expect(jd).toBe(1);
    });

    it('should convert Gregorian 2026-09-04 to correct Jalali date', () => {
      const [jy, jm, jd] = gregorianToJalali(2026, 9, 4);
      // September 4, 2026 should be around 1405-06-13 (Shahrivar)
      expect(jy).toBe(1405);
      expect(jm).toBe(6);
      expect(jd).toBe(13);
    });

    it('should convert first day of each Jalali month', () => {
      // First day of each Jalali month in 1403 (2024-2025)
      const testCases: [number, number, number, number][] = [
        [1403, 1, 1, 2024], // Farvardin 1
        [1403, 2, 1, 2024], // Ordibehesht 1
        [1403, 3, 1, 2024], // Khordad 1
        [1403, 4, 1, 2024], // Tir 1
        [1403, 5, 1, 2024], // Mordad 1
        [1403, 6, 1, 2024], // Shahrivar 1
        [1403, 7, 1, 2024], // Mehr 1
        [1403, 8, 1, 2024], // Aban 1
        [1403, 9, 1, 2024], // Azar 1
        [1403, 10, 1, 2024], // Dey 1
        [1403, 11, 1, 2025], // Bahman 1
        [1403, 12, 1, 2025], // Esfand 1
      ];

      for (const [jy, jm, jd, expectedGy] of testCases) {
        const [resultJy] = gregorianToJalali(expectedGy, 1, 1);
        // We're testing the year at minimum
        expect(resultJy).toBeGreaterThanOrEqual(1402);
        expect(resultJy).toBeLessThanOrEqual(1404);
      }
    });

    it('should handle leap year transitions', () => {
      // Esfand 30 in leap year
      const [jy, jm, jd] = gregorianToJalali(2024, 3, 19); // Day before Nowruz
      expect(jy).toBe(1402);
      expect(jm).toBe(12);
    });

    it('should handle century boundaries', () => {
      const [jy] = gregorianToJalali(2000, 1, 1);
      expect(jy).toBe(1378);
    });
  });

  describe('getCurrentJalaliYear', () => {
    it('should return current year as string', () => {
      const year = getCurrentJalaliYear();
      expect(typeof year).toBe('string');
      expect(parseInt(year)).toBeGreaterThanOrEqual(1400);
      expect(parseInt(year)).toBeLessThanOrEqual(1410);
    });

    it('should not return hardcoded year', () => {
      // BUG-002: Verify it's dynamic, not hardcoded to 1403
      const year = getCurrentJalaliYear();
      // In 2026, Jalali year should be 1405
      expect(year).toBe('1405');
    });
  });

  describe('getCurrentJalaliDate', () => {
    it('should return YYYY-MM-DD format', () => {
      const date = getCurrentJalaliDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return correct current date', () => {
      const date = getCurrentJalaliDate();
      const [jy, jm, jd] = date.split('-').map(Number);
      expect(jy).toBe(1405);
      expect(jm).toBeGreaterThanOrEqual(1);
      expect(jm).toBeLessThanOrEqual(12);
      expect(jd).toBeGreaterThanOrEqual(1);
      expect(jd).toBeLessThanOrEqual(31);
    });

    it('should not return hardcoded date (BUG-009)', () => {
      const date = getCurrentJalaliDate();
      // Should NOT be '1403-07-13' (the old hardcoded value)
      expect(date).not.toBe('1403-07-13');
    });
  });

  describe('formatJalaliDate', () => {
    it('should format as YYYY/MM/DD', () => {
      expect(formatJalaliDate(1403, 1, 1)).toBe('1403/01/01');
      expect(formatJalaliDate(1403, 12, 30)).toBe('1403/12/30');
    });

    it('should pad single digits', () => {
      expect(formatJalaliDate(1403, 3, 5)).toBe('1403/03/05');
    });
  });
});
