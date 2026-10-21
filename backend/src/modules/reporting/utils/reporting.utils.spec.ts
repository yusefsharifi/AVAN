import {
  resolveRelativeDates,
  formatJalaliDate,
  mapDataSourceToModel,
  buildAggFunction,
  sanitizeFilterValue,
  computeCronExpression,
  computeNextRunAt,
  formatFileSize,
  computeDashboardCacheKey,
  determineOverallRating,
  prepareChartData,
  buildExecutionSummary,
  extractMetricValue,
} from './reporting.utils';

describe('Reporting Utility Functions', () => {
  describe('resolveRelativeDates', () => {
    it('should resolve today', () => {
      const result = resolveRelativeDates('today');
      expect(result.fromDate).toBe(result.toDate);
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should resolve yesterday', () => {
      const result = resolveRelativeDates('yesterday');
      expect(result.fromDate).toBe(result.toDate);
    });

    it('should resolve month', () => {
      const result = resolveRelativeDates('month');
      expect(result.fromDate).not.toBe(result.toDate);
    });

    it('should resolve quarter', () => {
      const result = resolveRelativeDates('quarter');
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should resolve year', () => {
      const result = resolveRelativeDates('year');
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should resolve relative:-30d pattern', () => {
      const result = resolveRelativeDates('relative:-30d');
      expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should default to today for unknown period', () => {
      const result = resolveRelativeDates('unknown');
      expect(result.fromDate).toBe(result.toDate);
    });
  });

  describe('formatJalaliDate', () => {
    it('should format a date to Jalali', () => {
      const result = formatJalaliDate(new Date(2026, 2, 21)); // March 21 = Nowruz
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.startsWith('140')).toBe(true);
    });
  });

  describe('mapDataSourceToModel', () => {
    it('should map known data sources', () => {
      expect(mapDataSourceToModel('traffic')).toBe('TrafficLog');
      expect(mapDataSourceToModel('company')).toBe('Company');
      expect(mapDataSourceToModel('invoice')).toBe('Invoice');
      expect(mapDataSourceToModel('employee')).toBe('Employee');
      expect(mapDataSourceToModel('workOrder')).toBe('WorkOrder');
    });

    it('should return source as-is for unknown', () => {
      expect(mapDataSourceToModel('unknown')).toBe('unknown');
    });
  });

  describe('buildAggFunction', () => {
    it('should build count function', () => {
      expect(buildAggFunction('count', 'id')).toBe('COUNT(*)');
    });

    it('should build sum function', () => {
      expect(buildAggFunction('sum', 'amount')).toBe('SUM("amount")');
    });

    it('should build avg function', () => {
      expect(buildAggFunction('avg', 'price')).toBe('AVG("price")');
    });

    it('should build min/max', () => {
      expect(buildAggFunction('min', 'date')).toBe('MIN("date")');
      expect(buildAggFunction('max', 'date')).toBe('MAX("date")');
    });

    it('should default to COUNT(*)', () => {
      expect(buildAggFunction('unknown', 'x')).toBe('COUNT(*)');
    });
  });

  describe('sanitizeFilterValue', () => {
    it('should return null for null/undefined', () => {
      expect(sanitizeFilterValue(null)).toBeNull();
      expect(sanitizeFilterValue(undefined)).toBeNull();
    });

    it('should escape single quotes in strings', () => {
      expect(sanitizeFilterValue("O'Brien")).toBe("O''Brien");
    });

    it('should remove semicolons', () => {
      expect(sanitizeFilterValue('test; DROP TABLE')).toBe('test DROP TABLE');
    });

    it('should sanitize array values', () => {
      const result = sanitizeFilterValue(["O'Brien", 'test;123']) as string[];
      expect(result[0]).toBe("O''Brien");
      expect(result[1]).toBe('test123');
    });

    it('should pass through numbers', () => {
      expect(sanitizeFilterValue(42)).toBe(42);
    });
  });

  describe('computeCronExpression', () => {
    it('should return daily cron', () => {
      expect(computeCronExpression('DAILY')).toBe('0 7 * * *');
    });

    it('should return weekly cron', () => {
      expect(computeCronExpression('WEEKLY')).toBe('0 7 * * 0');
    });

    it('should return monthly cron', () => {
      expect(computeCronExpression('MONTHLY')).toBe('0 7 1 * *');
    });

    it('should return quarterly cron', () => {
      expect(computeCronExpression('QUARTERLY')).toBe('0 7 1 1,4,7,10 *');
    });

    it('should default to daily for unknown', () => {
      expect(computeCronExpression('UNKNOWN')).toBe('0 7 * * *');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });
  });

  describe('computeDashboardCacheKey', () => {
    it('should compute key without companyId', () => {
      expect(computeDashboardCacheKey('stats', 'z-1')).toBe('stats:z-1');
    });

    it('should compute key with companyId', () => {
      expect(computeDashboardCacheKey('stats', 'z-1', 'c-1')).toBe('stats:z-1:c-1');
    });
  });

  describe('determineOverallRating', () => {
    it('should return EXCELLENT for high scores', () => {
      const scores = [{ category: 'quality', score: 90, weight: 1 }];
      expect(determineOverallRating(scores)).toBe('EXCELLENT');
    });

    it('should return GOOD', () => {
      const scores = [{ category: 'quality', score: 75, weight: 1 }];
      expect(determineOverallRating(scores)).toBe('GOOD');
    });

    it('should return FAIR', () => {
      const scores = [{ category: 'quality', score: 55, weight: 1 }];
      expect(determineOverallRating(scores)).toBe('FAIR');
    });

    it('should return POOR for low scores', () => {
      const scores = [{ category: 'quality', score: 30, weight: 1 }];
      expect(determineOverallRating(scores)).toBe('POOR');
    });

    it('should return POOR for zero weights', () => {
      expect(determineOverallRating([{ category: 'x', score: 100, weight: 0 }])).toBe('POOR');
    });
  });

  describe('prepareChartData', () => {
    it('should prepare chart data from rows', () => {
      const data = [
        { name: 'Ali', count: 5 },
        { name: 'Reza', count: 3 },
      ];

      const result = prepareChartData(data, 'name', 'count');
      expect(result.labels).toEqual(['Ali', 'Reza']);
      expect((result.datasets as any[])[0].data).toEqual([5, 3]);
    });
  });

  describe('buildExecutionSummary', () => {
    it('should build summary string', () => {
      const summary = buildExecutionSummary('SALES_REPORT', 150, 1234);
      expect(summary).toContain('SALES_REPORT');
      expect(summary).toContain('150 rows');
      expect(summary).toContain('1.23s');
    });
  });

  describe('extractMetricValue', () => {
    it('should extract number value', () => {
      expect(extractMetricValue({ revenue: 1000 }, 'revenue')).toBe(1000);
    });

    it('should extract string number', () => {
      expect(extractMetricValue({ revenue: '1000' }, 'revenue')).toBe(1000);
    });

    it('should return 0 for missing key', () => {
      expect(extractMetricValue({}, 'revenue')).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(extractMetricValue({ x: 'abc' }, 'x')).toBe(0);
    });
  });
});
