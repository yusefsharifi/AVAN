/**
 * Entity: Audit Trail
 * سیستم ثبت و پیگیری تمام عملیات CRUD در سطح front-end
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'TRANSFER' | 'SUSPEND' | 'ACTIVATE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
export type AuditEntityType = 'zone' | 'company' | 'user' | 'certificate' | 'waybill' | 'financial_invoice' | 'bascule' | 'device' | 'workflow' | 'setting' | 'notification' | 'report';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  
  // For UPDATE: store before/after diff
  diff?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  
  // For CREATE/DELETE: store snapshot
  snapshot?: Record<string, unknown>;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  portal: string;
  
  // Result
  success: boolean;
  errorMessage?: string;
  
  // Metadata
  zoneId?: string;
  companyId?: string;
}

export interface AuditFilter {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  actorId?: string;
  zoneId?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
}

// ── Helper functions ────────────────────────────────────────────────────
export function generateAuditId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function createDiff<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const diff: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    
    // Skip if both undefined or deeply equal (simple comparison for primitives)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }
  
  return diff;
}

export function filterAuditLogs(logs: AuditLogEntry[], filter: AuditFilter): AuditLogEntry[] {
  return logs.filter(log => {
    if (filter.entityType && log.entityType !== filter.entityType) return false;
    if (filter.entityId && log.entityId !== filter.entityId) return false;
    if (filter.action && log.action !== filter.action) return false;
    if (filter.actorId && log.actorId !== filter.actorId) return false;
    if (filter.zoneId && log.zoneId !== filter.zoneId) return false;
    if (filter.companyId && log.companyId !== filter.companyId) return false;
    if (filter.success !== undefined && log.success !== filter.success) return false;
    if (filter.dateFrom && log.timestamp < filter.dateFrom) return false;
    if (filter.dateTo && log.timestamp > filter.dateTo) return false;
    return true;
  });
}

export function groupAuditLogsByDate(logs: AuditLogEntry[]): Record<string, AuditLogEntry[]> {
  const grouped: Record<string, AuditLogEntry[]> = {};
  
  for (const log of logs) {
    const date = log.timestamp.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(log);
  }
  
  // Sort dates descending
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  );
}

export function getAuditActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    CREATE: 'ایجاد',
    UPDATE: 'ویرایش',
    DELETE: 'حذف',
    APPROVE: 'تأیید',
    REJECT: 'رد',
    TRANSFER: 'انتقال',
    SUSPEND: 'تعلیق',
    ACTIVATE: 'فعال‌سازی',
    LOGIN: 'ورود',
    LOGOUT: 'خروج',
    EXPORT: 'خروجی',
    IMPORT: 'ورودی',
  };
  return labels[action];
}

export function getAuditEntityLabel(entityType: AuditEntityType): string {
  const labels: Record<AuditEntityType, string> = {
    zone: 'شهرک صنعتی',
    company: 'شرکت',
    user: 'کاربر',
    certificate: 'گواهینامه',
    waybill: 'بارنامه',
    financial_invoice: 'صورت‌حساب مالی',
    bascule: 'باسکول',
    device: 'دستگاه',
    workflow: 'گردش کار',
    setting: 'تنظیمات',
    notification: 'اعلان',
    report: 'گزارش',
  };
  return labels[entityType];
}

export function getAuditActionColor(action: AuditAction): { bg: string; text: string } {
  const colors: Record<AuditAction, { bg: string; text: string }> = {
    CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700' },
    DELETE: { bg: 'bg-red-50', text: 'text-red-700' },
    APPROVE: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    REJECT: { bg: 'bg-red-50', text: 'text-red-700' },
    TRANSFER: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    SUSPEND: { bg: 'bg-amber-50', text: 'text-amber-700' },
    ACTIVATE: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    LOGIN: { bg: 'bg-slate-50', text: 'text-slate-700' },
    LOGOUT: { bg: 'bg-slate-50', text: 'text-slate-700' },
    EXPORT: { bg: 'bg-purple-50', text: 'text-purple-700' },
    IMPORT: { bg: 'bg-purple-50', text: 'text-purple-700' },
  };
  return colors[action];
}
