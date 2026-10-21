// src/modules/dashboard/super-admin/store/useAlertStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNationalStore } from './useNationalStore';
import type { AuditLogEntry } from '@/entities/audit';
import { iotApi } from '@/shared/api/iot.api';

export type AlertType = 'INCIDENT' | 'MAINTENANCE' | 'HSE_ALERT' | 'SECURITY' | 'FINANCE_DISPUTE' | 'DEVICE_OFFLINE' | 'CERTIFICATE_EXPIRY';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';

export interface AlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  sourceModule: string;
  zoneId?: string;
  companyId?: string;
  title: string;
  message: string;
  assignedOwnerId?: string;
  assignedOwnerName?: string;
  slaDeadline?: string;
  escalationLevel: number;
  status: AlertStatus;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertState {
  alerts: AlertItem[];
  isCrisisMode: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AlertActions {
  initAlerts: (count?: number) => void;
  loadFromApi: () => Promise<void>;
  acknowledgeAlert: (id: string, userId: string, userName: string) => void;
  dispatchAlert: (id: string, ownerId: string, ownerName: string) => void;
  resolveAlert: (id: string, notes: string) => void;
  escalateAlert: (id: string) => void;
  toggleCrisisMode: (v: boolean) => void;
  getAlertStats: () => Record<AlertStatus, number>;
}

const generateId = () => crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

function seedAlerts(): AlertItem[] {
  const types: AlertType[] = ['INCIDENT', 'MAINTENANCE', 'HSE_ALERT', 'SECURITY', 'FINANCE_DISPUTE', 'DEVICE_OFFLINE', 'CERTIFICATE_EXPIRY'];
  const sevs: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
  const items: AlertItem[] = [];
  for (let i = 0; i < 25; i++) {
    const sev = sevs[i % 4];
    items.push({
      id: `ALT-${String(i + 1).padStart(4, '0')}`,
      type: types[i % types.length],
      severity: sev,
      sourceModule: ['bascule', 'certificate', 'financial', 'waybill', 'system'][i % 5],
      zoneId: `zone-${(i % 5) + 1}`,
      companyId: i % 3 === 0 ? `comp-${i}` : undefined,
      title: `هشدار ${i + 1}`,
      message: `توضیحات هشدار شماره ${i + 1}`,
      escalationLevel: sev === 'critical' ? 2 : sev === 'high' ? 1 : 0,
      status: ['NEW', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED'][i % 4] as AlertStatus,
      createdAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return items;
}

export const useAlertStore = create<AlertState & AlertActions>()(
  persist(
    (set, get) => ({
      alerts: [],
      isCrisisMode: false,
      isLoading: false,
      error: null,

      initAlerts: () => set({ alerts: [] }),

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const alerts = await iotApi.listAlerts({ limit: 100 });
          set({ alerts: alerts as unknown as AlertItem[], isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت هشدارها' });
        }
      },

      acknowledgeAlert: (id, userId, userName) => {
        set(s => ({
          alerts: s.alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' as AlertStatus, assignedOwnerId: userId, assignedOwnerName: userName, updatedAt: new Date().toISOString() } : a)
        }));
      },

      dispatchAlert: (id, ownerId, ownerName) => {
        set(s => ({
          alerts: s.alerts.map(a => a.id === id ? { ...a, status: 'DISPATCHED' as AlertStatus, assignedOwnerId: ownerId, assignedOwnerName: ownerName, updatedAt: new Date().toISOString() } : a)
        }));
      },

      resolveAlert: (id, notes) => {
        set(s => ({
          alerts: s.alerts.map(a => a.id === id ? { ...a, status: 'RESOLVED' as AlertStatus, resolutionNotes: notes, updatedAt: new Date().toISOString() } : a)
        }));
      },

      escalateAlert: (id) => {
        set(s => ({
          alerts: s.alerts.map(a => a.id === id ? { ...a, escalationLevel: a.escalationLevel + 1, updatedAt: new Date().toISOString() } : a)
        }));
      },

      toggleCrisisMode: (v) => {
        set({ isCrisisMode: v });
        if (v) {
          // Simulate notification toast
          import('sonner').then(({ toast }) => toast.error('حالت بحرانی فعال شد! تمامی مدیران مناطق مطلع شدند.'));
        }
      },

      getAlertStats: () => {
        const stats: Record<AlertStatus, number> = { NEW: 0, ACKNOWLEDGED: 0, DISPATCHED: 0, RESOLVED: 0 };
        get().alerts.forEach(a => stats[a.status] = (stats[a.status] ?? 0) + 1);
        return stats;
      },
    }),
    { name: 'super-admin-alert-storage', storage: createJSONStorage(() => localStorage) }
  )
);
