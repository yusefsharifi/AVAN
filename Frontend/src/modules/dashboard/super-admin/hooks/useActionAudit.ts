import { useCallback } from 'react';
import { useNationalStore } from '../store/useNationalStore';
import type { AuditLogEntry } from '@/entities/audit';

export function useActionAudit() {
  const addAuditLog = useNationalStore((s) => s.addAuditLog);

  const log = useCallback(
    (
      action: AuditLogEntry['action'],
      entityType: AuditLogEntry['entityType'],
      entityId: string,
      payload: Partial<Omit<AuditLogEntry, 'id' | 'timestamp' | 'action' | 'entityType' | 'entityId'>>
    ) => {
      const entry: AuditLogEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        actorId: 'current-user',        // TODO: replace with real auth context
        actorName: 'مدیر سیستم ملی',
        actorRole: 'SUPER_ADMIN',
        action,
        entityType,
        entityId,
        ipAddress: '127.0.0.1',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        portal: 'super-admin',
        success: true,
        ...payload,
      } as AuditLogEntry;

      addAuditLog(entry);
    },
    [addAuditLog]
  );

  return { log };
}
