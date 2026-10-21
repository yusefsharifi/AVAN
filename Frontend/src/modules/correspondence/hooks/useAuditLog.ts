import { useState, useCallback, useEffect } from 'react';
import { api } from '@/shared/api';
import type { AuditLogEntry, AuditAction } from '../types';

// Mock audit log data
const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'AL-001', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۴:۳۲', userId: 'U001', userName: 'احمد کریمی', action: 'APPROVE', resource: 'Letter', resourceId: 'LV2-1', oldValue: 'pending-approval', newValue: 'approved', ipAddress: '192.168.2.110', result: 'success', hash: 'a1b2c3d4e5f6', previousHash: '000000000000' },
  { id: 'AL-002', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۳:۴۵', userId: 'U002', userName: 'مریم رضایی', action: 'CREATE', resource: 'Letter', resourceId: 'LV2-5', ipAddress: '192.168.2.88', result: 'success', hash: 'b2c3d4e5f6a1', previousHash: 'a1b2c3d4e5f6' },
  { id: 'AL-003', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۲:۲۰', userId: 'U003', userName: 'زهرا امینی', action: 'REFER', resource: 'Letter', resourceId: 'LV2-4', newValue: 'مریم رضایی', ipAddress: '192.168.2.55', result: 'success', hash: 'c3d4e5f6a1b2', previousHash: 'b2c3d4e5f6a1' },
  { id: 'AL-004', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۱:۱۰', userId: 'U004', userName: 'حسین کاظمی', action: 'UPDATE', resource: 'Letter', resourceId: 'LV2-3', oldValue: 'draft', newValue: 'pending-approval', ipAddress: '192.168.2.44', result: 'success', hash: 'd4e5f6a1b2c3', previousHash: 'c3d4e5f6a1b2' },
  { id: 'AL-005', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۰:۰۵', userId: 'U001', userName: 'احمد کریمی', action: 'ARCHIVE', resource: 'Letter', resourceId: 'LV2-6', ipAddress: '192.168.2.110', result: 'success', hash: 'e5f6a1b2c3d4', previousHash: 'd4e5f6a1b2c3' },
  { id: 'AL-006', timestamp: '۱۴۰۳/۰۴/۱۵ ۱۶:۳۰', userId: 'U005', userName: 'رضا کریمی', action: 'EXPORT', resource: 'Report', resourceId: 'RPT-001', ipAddress: '192.168.2.33', result: 'success', hash: 'f6a1b2c3d4e5', previousHash: 'e5f6a1b2c3d4' },
  { id: 'AL-007', timestamp: '۱۴۰۳/۰۴/۱۵ ۱۴:۲۰', userId: 'U006', userName: 'سعید موسوی', action: 'REJECT', resource: 'Letter', resourceId: 'LV2-2', oldValue: 'pending-approval', newValue: 'returned', ipAddress: '192.168.5.8', result: 'success', hash: 'a1b2c3d4e5f7', previousHash: 'f6a1b2c3d4e5' },
  { id: 'AL-008', timestamp: '۱۴۰۳/۰۴/۱۵ ۱۱:۰۰', userId: 'U001', userName: 'احمد کریمی', action: 'SIGN', resource: 'Letter', resourceId: 'LV2-3', ipAddress: '192.168.2.110', result: 'success', hash: 'b2c3d4e5f6a2', previousHash: 'a1b2c3d4e5f7' },
];

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);

  // COMP-004: Try to load from backend API on mount
  useEffect(() => {
    api.get('/correspondence/audit-logs').then(res => {
      if (res.data?.length) setLogs(res.data);
    }).catch(() => {}); // Graceful fallback to mock data
  }, []);

  const [filter, setFilter] = useState<Partial<{ action: AuditAction; userId: string; resource: string }>>({});
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filteredLogs = logs.filter(log => {
    if (filter.action && log.action !== filter.action) return false;
    if (filter.userId && log.userId !== filter.userId) return false;
    if (filter.resource && log.resource !== filter.resource) return false;
    return true;
  });

  const paginatedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredLogs.length / perPage);

  const verifyIntegrity = useCallback(() => {
    for (let i = logs.length - 1; i > 0; i--) {
      if (logs[i].previousHash !== logs[i - 1].hash) {
        return { valid: false, brokenAt: logs[i].id };
      }
    }
    return { valid: true, brokenAt: undefined };
  }, [logs]);

  const addLog = useCallback((entry: Omit<AuditLogEntry, 'id' | 'hash' | 'previousHash'>) => {
    const prevHash = logs.length > 0 ? logs[0].hash : '000000000000';
    const data = `${entry.userId}${entry.action}${entry.resourceId}${entry.timestamp}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    const newLog: AuditLogEntry = {
      ...entry,
      id: `AL-${String(logs.length + 1).padStart(3, '0')}`,
      hash: Math.abs(hash).toString(16).padStart(12, '0'),
      previousHash: prevHash,
    };
    setLogs(prev => [newLog, ...prev]);
  }, [logs]);

  return {
    logs: paginatedLogs,
    allLogs: filteredLogs,
    totalLogs: filteredLogs.length,
    totalPages,
    page,
    setPage,
    filter,
    setFilter,
    verifyIntegrity,
    addLog,
  };
}
