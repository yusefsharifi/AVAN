import {
  computeIncomeTax,
  computeOvertimePay,
  computeSocialSecurity,
  countWorkdays,
  jalaliToDate,
  dateToJalali,
  computeProbationEndDate,
  computeLoanInstallment,
  determinePerformanceRating,
  computeOverallScore,
} from './hr.utils';

describe('HR Utility Functions', () => {
  describe('computeIncomeTax', () => {
    it('should return 0 for zero salary', () => {
      expect(computeIncomeTax(0n)).toBe(0n);
    });

    it('should return 0 for salary within exempt limit', () => {
      // 10M/month = 120M/year, within exempt
      expect(computeIncomeTax(10_000_000n)).toBe(0n);
    });

    it('should compute tax for salary above exempt limit', () => {
      // 15M/month = 180M/year, 60M above exempt -> 10% = 6M annual -> 500K monthly
      const tax = computeIncomeTax(15_000_000n);
      expect(tax).toBe(500_000n);
    });

    it('should compute progressive tax for high salary', () => {
      // 50M/month = 600M/year
      // 120M exempt
      // 120M at 10% = 12M
      // 120M at 15% = 18M
      // 120M at 20% = 24M
      // 120M at 25% = 30M
      // Total annual = 84M -> monthly = 7M
      const tax = computeIncomeTax(50_000_000n);
      expect(tax).toBe(7_000_000n);
    });
  });

  describe('computeOvertimePay', () => {
    it('should return 0 for invalid inputs', () => {
      expect(computeOvertimePay(0n, 22, 4, 0)).toBe(0n);
      expect(computeOvertimePay(1000n, 0, 4, 0)).toBe(0n);
    });

    it('should compute overtime pay', () => {
      // baseSalary = 10,000,000, 22 workdays, 8 hours/day
      // hourlyRate = 10M / (22 * 8) = 56,818
      // 2 weekday hours: 56818 * 2.8 = ~159,090
      const pay = computeOvertimePay(10_000_000n, 22, 2, 0);
      expect(pay).toBeGreaterThan(0n);
    });
  });

  describe('computeSocialSecurity', () => {
    it('should compute 7% employee and 23% employer', () => {
      const result = computeSocialSecurity(10_000_000n);
      expect(result.employee).toBe(700_000n);
      expect(result.employer).toBe(2_300_000n);
    });
  });

  describe('countWorkdays', () => {
    it('should count workdays excluding weekends', () => {
      // Monday to Friday = 5 workdays (Thu+Fri are weekend in Iran)
      // Let's use a known range
      const holidays = new Set<string>();
      const count = countWorkdays('1404-01-01', '1404-01-07', holidays);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(5);
    });
  });

  describe('jalaliToDate', () => {
    it('should convert Jalali date to Gregorian', () => {
      const date = jalaliToDate('1404-01-01');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });
  });

  describe('dateToJalali', () => {
    it('should convert Gregorian date to Jalali', () => {
      const jalali = dateToJalali(new Date(2025, 2, 21)); // March 21, 2025 = Nowruz
      expect(jalali).toMatch(/^1404-01-\d{2}$/);
    });
  });

  describe('computeProbationEndDate', () => {
    it('should return date 90 days after hire', () => {
      const result = computeProbationEndDate('1404-01-01');
      expect(result).toMatch(/^1404-/);
      // Should be approximately 90 days later
    });
  });

  describe('computeLoanInstallment', () => {
    it('should compute zero-interest installment', () => {
      const result = computeLoanInstallment(12_000_000n, 12, 0);
      expect(result).toBe(1_000_000n);
    });

    it('should compute installment with interest', () => {
      const result = computeLoanInstallment(10_000_000n, 10, 0.1);
      // 10M * 1.1 = 11M / 10 = 1.1M
      expect(result).toBe(1_100_000n);
    });
  });

  describe('determinePerformanceRating', () => {
    it('should return EXCEPTIONAL for high scores', () => {
      expect(determinePerformanceRating(4.8)).toBe('EXCEPTIONAL');
    });

    it('should return EXCEEDS', () => {
      expect(determinePerformanceRating(4.0)).toBe('EXCEEDS');
    });

    it('should return MEETS', () => {
      expect(determinePerformanceRating(3.0)).toBe('MEETS');
    });

    it('should return BELOW', () => {
      expect(determinePerformanceRating(2.0)).toBe('BELOW');
    });

    it('should return UNSATISFACTORY for low scores', () => {
      expect(determinePerformanceRating(1.0)).toBe('UNSATISFACTORY');
    });
  });

  describe('computeOverallScore', () => {
    it('should compute weighted score', () => {
      const result = computeOverallScore({
        quality: 5,
        attendance: 4,
        initiative: 4,
        teamwork: 3,
        communication: 4,
        technical: 4,
      });

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(5);
      expect(result.overallRating).toBeDefined();
    });

    it('should handle partial scores', () => {
      const result = computeOverallScore({ quality: 4 });
      expect(result.overallScore).toBe(4);
      expect(result.overallRating).toBe('EXCEEDS');
    });
  });
});
