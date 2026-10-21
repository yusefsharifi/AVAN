// M18: Reporting & BI — Utility functions

/**
 * Compute the start and end Jalali dates for a period string.
 */
export function resolveRelativeDates(
  period: string,
): { fromDate: string; toDate: string } {
  const now = new Date();
  const today = formatJalaliDate(now);

  switch (period) {
    case 'today':
      return { fromDate: today, toDate: today };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = formatJalaliDate(yesterday);
      return { fromDate: yStr, toDate: yStr };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return { fromDate: formatJalaliDate(start), toDate: today };
    }
    case 'month': {
      const start = new Date(now);
      start.setDate(1);
      return { fromDate: formatJalaliDate(start), toDate: today };
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { fromDate: formatJalaliDate(start), toDate: today };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { fromDate: formatJalaliDate(start), toDate: today };
    }
    default: {
      // Handle relative patterns like "relative:-30d"
      const match = period.match(/^relative:(-?\d+)([dwmy])$/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        const start = new Date(now);
        switch (unit) {
          case 'd':
            start.setDate(start.getDate() + amount);
            break;
          case 'w':
            start.setDate(start.getDate() + amount * 7);
            break;
          case 'm':
            start.setMonth(start.getMonth() + amount);
            break;
          case 'y':
            start.setFullYear(start.getFullYear() + amount);
            break;
        }
        return { fromDate: formatJalaliDate(start), toDate: today };
      }
      return { fromDate: today, toDate: today };
    }
  }
}

/**
 * Simple Gregorian to Jalali conversion.
 * Returns "YYYY-MM-DD" in Jalali calendar.
 */
export function formatJalaliDate(date: Date): string {
  const gD = date.getDate();
  const gM = date.getMonth(); // 0-based
  const gY = date.getFullYear();

  const gDayNo = [
    0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
  ][gM] + gD;

  let jY: number;
  let jDayNo: number;

  if (gDayNo <= 79) {
    jY = gY - 622;
    jDayNo = gDayNo + 286;
  } else {
    jY = gY - 621;
    jDayNo = gDayNo - 79;
  }

  const jLeapDays = isJalaliLeapYear(jY) ? 1 : 0;
  const jDaysInMonth = [
    31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29 + jLeapDays,
  ];

  let jM = 0;
  let remaining = jDayNo;
  while (jM < 12 && remaining > jDaysInMonth[jM]) {
    remaining -= jDaysInMonth[jM];
    jM++;
  }
  jM++; // 1-based

  return `${jY}-${String(jM).padStart(2, '0')}-${String(remaining).padStart(2, '0')}`;
}

function isJalaliLeapYear(jY: number): boolean {
  const remainder = ((jY - 474) % 2820) + 474;
  const years = remainder < 0 ? 2820 + remainder : remainder;
  const positions = [
    1, 5, 9, 13, 17, 22, 26, 30, 34, 38, 43, 47, 51, 55, 59, 64, 68, 72,
    76, 80, 85, 89, 93, 97, 101, 106, 110, 114, 118, 122, 127, 131, 135,
    139, 143, 148, 152, 156, 160, 164, 169, 173, 177, 181, 185, 190, 194,
    198, 202, 206, 211, 215, 219, 223, 227, 232, 236, 240, 244, 248, 253,
    257, 261, 265, 269, 274, 278, 282, 286, 290, 294, 299,
  ];
  return positions.includes(years);
}

/**
 * Map data source string to Prisma model name.
 */
export function mapDataSourceToModel(dataSource: string): string {
  const mapping: Record<string, string> = {
    traffic: 'TrafficLog',
    gate: 'Gate',
    company: 'Company',
    permit: 'IssuedPermit',
    permitRequest: 'PermitRequest',
    waybill: 'Waybill',
    weighScale: 'WeighScale',
    letter: 'Letter',
    invoice: 'Invoice',
    leaseContract: 'LeaseContract',
    hseIncident: 'HseIncident',
    hseInspection: 'HseInspection',
    employee: 'Employee',
    attendance: 'AttendanceRecord',
    leaveRequest: 'LeaveRequest',
    payroll: 'Payroll',
    payslip: 'Payslip',
    workOrder: 'WorkOrder',
    asset: 'Asset',
    maintenancePlan: 'MaintenancePlan',
    warehouse: 'Warehouse',
    item: 'Item',
    stockEntry: 'StockEntry',
    stockTransaction: 'StockTransaction',
    goodsReceipt: 'GoodsReceipt',
    purchaseOrder: 'PurchaseOrder',
    materialRequisition: 'MaterialRequisition',
    proforma: 'Proforma',
    commercialOrder: 'CommercialOrder',
    rfq: 'RFQ',
    visitorRequest: 'VisitorRequest',
    signatureRequest: 'SignatureRequest',
  };
  return mapping[dataSource] || dataSource;
}

/**
 * Convert aggregation function to SQL snippet.
 */
export function buildAggFunction(fn: string, field: string): string {
  switch (fn) {
    case 'count':
      return `COUNT(*)`;
    case 'sum':
      return `SUM("${field}")`;
    case 'avg':
      return `AVG("${field}")`;
    case 'min':
      return `MIN("${field}")`;
    case 'max':
      return `MAX("${field}")`;
    case 'count_distinct':
      return `COUNT(DISTINCT "${field}")`;
    default:
      return `COUNT(*)`;
  }
}

/**
 * NEW-002: Validate field name for SQL safety.
 * Only allows alphanumeric characters, underscores, and dots.
 * Prevents SQL injection via field name interpolation.
 */
export function sanitizeFieldName(fieldName: string): string {
  // Only allow safe characters: letters, digits, underscores, dots
  const sanitized = fieldName.replace(/[^a-zA-Z0-9_.]/g, '');
  if (sanitized.length === 0 || sanitized.length > 128) {
    throw new Error(`Invalid field name: ${fieldName}`);
  }
  return sanitized;
}

/**
 * Sanitize filter value for SQL safety.
 */
export function sanitizeFilterValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return value.replace(/'/g, "''").replace(/;/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeFilterValue);
  }
  return value;
}

/**
 * Compute cron expression from schedule frequency.
 */
export function computeCronExpression(frequency: string): string {
  switch (frequency) {
    case 'DAILY':
      return '0 7 * * *'; // every day at 07:00
    case 'WEEKLY':
      return '0 7 * * 0'; // every Sunday at 07:00
    case 'MONTHLY':
      return '0 7 1 * *'; // 1st of every month at 07:00
    case 'QUARTERLY':
      return '0 7 1 1,4,7,10 *'; // 1st of each quarter at 07:00
    case 'ANNUAL':
      return '0 7 1 1 *'; // January 1st at 07:00
    default:
      return '0 7 * * *';
  }
}

/**
 * Compute the next run datetime from a cron expression.
 */
export function computeNextRunAt(
  cronExpression: string,
  from: Date = new Date(),
): Date {
  // Simple approximation for standard cron patterns
  const parts = cronExpression.split(' ');
  const next = new Date(from);

  if (parts[4] === '*') {
    // Monthly or more frequent
    next.setDate(next.getDate() + 1);
  } else {
    // Specific months
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
  }

  const hour = parseInt(parts[1], 10) || 7;
  const minute = parseInt(parts[0], 10) || 0;
  next.setHours(hour, minute, 0, 0);

  return next;
}

/**
 * Format file size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Compute dashboard hash for cache keying.
 */
export function computeDashboardCacheKey(
  prefix: string,
  zoneId: string,
  companyId?: string,
): string {
  return companyId
    ? `${prefix}:${zoneId}:${companyId}`
    : `${prefix}:${zoneId}`;
}

/**
 * Determine overall company rating from scores.
 */
export function determineOverallRating(
  scores: { category: string; score: number; weight: number }[],
): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  const totalWeight = scores.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 'POOR';
  const weighted =
    scores.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight;
  if (weighted >= 85) return 'EXCELLENT';
  if (weighted >= 70) return 'GOOD';
  if (weighted >= 50) return 'FAIR';
  return 'POOR';
}

/**
 * Convert raw data rows into chart.js compatible format.
 */
export function prepareChartData(
  data: Record<string, unknown>[],
  labelField: string,
  valueField: string,
  options?: { type?: string; colors?: string[] },
): Record<string, unknown> {
  const labels = data.map((r) => String(r[labelField]));
  const values = data.map((r) => Number(r[valueField]) || 0);
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
  ];

  return {
    labels,
    datasets: [
      {
        label: String(valueField),
        data: values,
        backgroundColor:
          options?.colors || defaultColors.slice(0, data.length),
      },
    ],
    chartType: options?.type || 'bar',
  };
}

/**
 * Build summary string for report execution.
 */
export function buildExecutionSummary(
  reportCode: string,
  rowCount: number,
  durationMs: number,
): string {
  const durationSec = (durationMs / 1000).toFixed(2);
  return `Report "${reportCode}" executed: ${rowCount} rows in ${durationSec}s`;
}

/**
 * Parse numeric metric values from JSON snapshot.
 */
export function extractMetricValue(
  metrics: Record<string, unknown>,
  key: string,
): number {
  const val = metrics[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}
