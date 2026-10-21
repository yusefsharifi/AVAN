// M21: Super Admin Panel — Enums and Interfaces
export {
  BillingCycle,
  SubscriptionStatus,
  AnnouncementType,
  AlertSeverity,
} from '@prisma/client';

export { UserRole } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; hasMore: boolean; cursor?: string };
}

export interface ZoneOnboardingResult {
  zone: any;
  manager: any;
  subscription: any;
  tempPassword: string;
}

export interface ZoneOverviewDto {
  zone: any;
  subscription: any;
  manager: any;
  stats: { companies: number; users: number; devices: number; storage: number };
  usage: { companies: number; users: number; storage: number; api: number; sms: number };
  healthScore: number;
  lastActivity: Date | null;
  alerts: any[];
}

export interface ZoneUsageReportDto {
  plan: any;
  limits: any;
  currentUsage: any;
  usagePercent: { companies: number; users: number; storage: number; api: number; sms: number };
  trend: { month: string; companies: number; users: number; api: number }[];
}

export interface PlanComparisonDto {
  plans: any[];
  features: string[];
}

export interface UsageLimitCheckDto {
  isOverLimit: boolean;
  violations: { resource: string; current: number; limit: number }[];
  warnings: { resource: string; current: number; limit: number; percent: number }[];
}

export interface FlagStatusDto {
  code: string;
  nameFa: string;
  value: boolean;
  source: string;
  overridden: boolean;
}

export interface SystemHealthDto {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  components: {
    database: { status: string; responseMs: number; connections: number };
    redis: { status: string; responseMs: number; memoryMb: number; hitRate: number };
    queues: { status: string; waiting: number; active: number; failed: number };
    storage: { status: string; usedGb: number; totalGb: number; objects: number };
    mqtt: { status: string; connected: boolean; clients: number };
    api: { status: string; requestsMin: number; errorRate: number; activeSockets: number };
  };
  system: { cpuPercent: number; memoryPercent: number; diskPercent: number };
  overallStatus: 'GREEN' | 'YELLOW' | 'RED';
}

export interface QueueStatusDto {
  queues: { name: string; waiting: number; active: number; completed: number; failed: number; delayed: number }[];
}

export interface DatabaseMetricsDto {
  connectionPoolSize: number;
  activeConnections: number;
  slowQueries: { query: string; duration: number; count: number }[];
  tableStats: { table: string; rowCount: number; sizeGb: number }[];
}

export interface ApiMetricsDto {
  requestsPerMinute: number;
  avgResponseMs: number;
  errorRate: number;
  top5ErrorEndpoints: { endpoint: string; count: number }[];
  activeConnections: number;
  wsConnections: number;
  requestsByModule: Record<string, number>;
}

export interface UserActivityDto {
  user: any;
  loginCount: number;
  lastLogin: Date | null;
  sessionsCount: number;
  actionsCount: number;
  recentAuditLogs: any[];
}

export interface ImpersonationResult {
  impersonationToken: string;
  expiresAt: Date;
  targetUser: any;
  sessionId: string;
}

export interface ImpersonationSession {
  sessionId: string;
  adminId: string;
  targetUserId: string;
  startedAt: Date;
  expiresAt: Date;
}

export interface SecurityPoliciesDto {
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireNumber: boolean;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  jwtExpiryMinutes: number;
  mfaRequired: { roles: string[] };
  allowedIpRanges: string[];
}

export interface SystemConfigDto {
  key: string;
  value: string;
  category: string;
  isEncrypted: boolean;
  description: string | null;
  updatedAt: Date;
}

export interface SuspiciousActivityDto {
  type: string;
  severity: string;
  description: string;
  userId?: string;
  zoneId?: string;
  timestamp: Date;
  details: any;
}

export interface DataRetentionDto {
  oldestRecord: Date | null;
  totalRecords: number;
  recordsByModule: Record<string, number>;
  retentionPolicy: { module: string; retentionDays: number }[];
  estimatedDeleteNext: number;
}

export interface PurgeResult {
  recordsDeleted: number;
  storageFreedGb: number;
}

export interface IntegrityCheckResult {
  totalChecks: number;
  issuesFound: number;
  issues: { table: string; type: string; count: number; description: string }[];
}

export interface PlatformKpiDto {
  zones: { total: number; active: number; trial: number; suspended: number };
  companies: { total: number; active: number; onboarding: number };
  users: { total: number; active30d: number; newThisMonth: number };
  devices: { total: number; online: number; offlineAlerts: number };
  revenue: { mtd: number; ytd: number; vsLastMonth: number };
  storage: { usedGb: number; totalGb: number; percentUsed: number };
  apiCalls: { today: number; thisMonth: number };
  smsSent: { today: number; thisMonth: number };
}

export interface TrendDataDto {
  date: string;
  value: number;
}

export interface ZoneRankingDto {
  zoneId: string;
  zoneName: string;
  value: number;
  rank: number;
}

export interface ComplianceReportDto {
  zoneId?: string;
  fromDate: string;
  toDate: string;
  format: 'pdf' | 'xlsx';
  includeAuditLogs?: boolean;
  includeUserActivity?: boolean;
  includeSystemEvents?: boolean;
}
