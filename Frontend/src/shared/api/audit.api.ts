import { api } from './client';

export interface AuditLogDto {
  id: string;
  zoneId?: string;
  userId?: string;
  targetId?: string;
  targetType?: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const auditApi = {
  listLogs: async (params?: Record<string, unknown>): Promise<AuditLogDto[]> => {
    const data = await api.get<unknown>('/super/audit/logs', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as AuditLogDto[] : [];
  },

  listSuspicious: async (): Promise<AuditLogDto[]> => {
    const data = await api.get<unknown>('/super/audit/suspicious');
    return Array.isArray(data) ? data as AuditLogDto[] : [];
  },

  listSuperActions: async (): Promise<AuditLogDto[]> => {
    const data = await api.get<unknown>('/super/audit/logs/super-actions');
    return Array.isArray(data) ? data as AuditLogDto[] : [];
  },
};
