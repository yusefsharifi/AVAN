// M18: Reporting & BI — Enums and TypeScript interfaces
import {
  ReportCategory,
  ReportType,
  ScheduleFrequency,
  DeliveryChannel,
  ExportFormat,
  ExecutionStatus,
  WidgetType,
  DashboardType,
} from '@prisma/client';

// Re-export Prisma enums
export {
  ReportCategory,
  ReportType,
  ScheduleFrequency,
  DeliveryChannel,
  ExportFormat,
  ExecutionStatus,
  WidgetType,
  DashboardType,
};

// ─── TypeScript interfaces ─────────────────────────────────────────────────

export interface ReportConfig {
  dataSources: string[];
  fields: FieldConfig[];
  filters?: FilterConfig[];
  groupBy?: string[];
  orderBy?: OrderConfig[];
  aggregations?: AggConfig[];
  chartType?: string;
  chartConfig?: Record<string, unknown>;
}

export interface FieldConfig {
  source: string;
  field: string;
  labelFa: string;
  alias?: string;
  visible?: boolean;
}

export interface FilterConfig {
  field: string;
  operator: string;
  value: unknown;
  isRequired?: boolean;
}

export interface OrderConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AggConfig {
  field: string;
  function: string;
  alias: string;
}

export interface RunReportParams {
  fromDate?: string;
  toDate?: string;
  zoneId?: string;
  companyId?: string;
  period?: string;
  limit?: number;
  [key: string]: unknown;
}

export interface ReportResult {
  executionId: string;
  status: ExecutionStatus;
  rowCount?: number;
  data?: unknown[];
  fileKey?: string;
  fileUrl?: string;
  duration: number;
  generatedAt: Date;
}

export interface QueryPlan {
  sql: string;
  bindings: unknown[];
  model: string;
}

export interface ResolvedDates {
  fromDate: string;
  toDate: string;
}

export interface ZoneManagerDashboardDto {
  live: {
    vehiclesInside: number;
    visitorsInside: number;
    activeTrucks: number;
    barrierStatus: { gateId: string; isOpen: boolean; isOnline: boolean }[];
    openAlerts: number;
    lastIncidentAt?: Date;
  };
  today: {
    entries: number;
    exits: number;
    uniqueVehicles: number;
    weighings: number;
    weighRevenue: bigint;
    approvedPermits: number;
    openWorkOrders: number;
    attendanceRate: number;
  };
  trends: {
    trafficByDay: { date: string; entries: number; exits: number }[];
    revenueByDay: { date: string; amount: bigint }[];
    incidentsByDay: { date: string; count: number }[];
  };
  alerts: {
    overdueWO: number;
    slaBreaches: number;
    expiringPermits: number;
    lowStock: number;
    overdueCapas: number;
  };
  topCompanies: { company: string; entries: number; revenue: bigint }[];
  pendingApprovals: {
    permits: number;
    waybills: number;
    visitors: number;
    requisitions: number;
    letters: number;
  };
}

export interface CompanyDashboardDto {
  companyId: string;
  companyName: string;
  healthScore?: number;
  hseScore?: number;
  today: {
    employeesPresent: number;
    trucksInside: number;
    visitorsInside: number;
    pendingApprovals: number;
  };
  activePermits: number;
  upcomingMaintenance: number;
  openIncidents: number;
  pendingRequisitions: number;
  recentLetters: number;
  balanceDue: bigint;
}

export interface SuperAdminDashboardDto {
  totalZones: number;
  activeZones: number;
  totalCompanies: number;
  totalVehiclesNow: number;
  todayNational: {
    entries: number;
    exits: number;
    revenues: bigint;
    incidents: number;
  };
  zoneComparison: {
    zoneId: string;
    zoneName: string;
    entries: number;
    companies: number;
    revenue: bigint;
    occupancyRate: number;
  }[];
  alerts: {
    offlineDevices: number;
    criticalIncidents: number;
    systemErrors: number;
  };
  systemHealth: {
    dbResponseMs: number;
    redisLatencyMs: number;
    apiSuccessRate: number;
    activeWebSockets: number;
  };
}

export interface WidgetDataDto {
  widgetId: string;
  data: unknown;
  chartConfig?: Record<string, unknown>;
  refreshedAt: Date;
}

export interface MetricHistoryDto {
  date: string;
  value: unknown;
}

export interface TrendDto {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  data: { date: string; value: number }[];
}

export interface KpiProgressDto {
  kpiCode: string;
  module: string;
  target: number;
  actual: number;
  progressPercent: number;
  isAtRisk: boolean;
  period: string;
}

export interface TrafficReportFilter {
  gateId?: string;
  companyId?: string;
  vehicleType?: string;
}

export interface TrafficReportDto {
  summary: {
    totalEntries: number;
    totalExits: number;
    uniqueVehicles: number;
    deniedCount: number;
    overrideCount: number;
    avgDwellMinutes: number;
    peakHour: number;
    peakDay: string;
  };
  byGate: { gateId: string; gateName: string; entries: number; exits: number }[];
  byHour: number[];
  byDayOfWeek: number[];
  byVehicleType: Record<string, number>;
  byCompany: { companyId: string; companyName: string; count: number }[];
  trend: { date: string; entries: number; exits: number }[];
  denialReasons: { reason: string; count: number }[];
}

export interface RevenueReportDto {
  totalRevenue: bigint;
  bySource: { source: string; amount: bigint }[];
  topPayingCompanies: { company: string; amount: bigint }[];
  monthlyTrend: { month: string; revenue: bigint }[];
}

export interface HseReportDto {
  daysSinceLastIncident: number;
  totalIncidents: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  openCapas: number;
  overdueCapas: number;
  trend: { month: string; count: number }[];
}

export interface AttendanceReportDto {
  totalEmployees: number;
  avgPresentDays: number;
  absentRate: number;
  overtimeHours: number;
  byEmployee: {
    employeeId: string;
    employeeName: string;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    overtimeHours: number;
    lateCount: number;
  }[];
}

export interface MaintenanceReportDto {
  totalWorkOrders: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  avgCompletionHours: number;
  totalCost: bigint;
  slaComplianceRate: number;
}

export interface ExecutiveSummaryDto {
  zoneId: string;
  period: string;
  generatedAt: Date;
  kpis: { module: string; label: string; value: number; target?: number; status: string }[];
  highlights: string[];
  risks: string[];
}

export interface ZoneComparisonDto {
  metric: string;
  period: string;
  zones: { zoneId: string; zoneName: string; value: number; rank: number }[];
}

export interface CompanyScorecardDto {
  companyId: string;
  companyName: string;
  overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  scores: { category: string; score: number; weight: number }[];
  recommendations: string[];
}

export interface SignedReportResult {
  reportCode: string;
  title: string;
  data: unknown;
  generatedAt: Date;
}

export interface ScheduledReportDelivery {
  scheduleId: string;
  reportCode: string;
  executionId: string;
  channels: string[];
  recipients: string[];
  fileKey?: string;
}
