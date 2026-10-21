// ============================================================================
// src/modules/dashboard/super-admin/store/useBasculeStore.ts
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNationalStore } from './useNationalStore';
import type { AuditLogEntry } from '@/entities/audit';
import { logisticsApi } from '@/shared/api/logistics.api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type BasculeStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER';

export interface BasculeDevice {
  id: string;
  deviceCode: string;
  zoneId: string;
  zoneCode: string;
  capacityTons: number;
  precisionKg: number;
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  serialNumber: string;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  calibrationCertificateNumber: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  minWeightKg: number;
  maxWeightKg: number;
  installationDate: string;
  locationInZone: string;
  status: BasculeStatus;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationRecord {
  id: string;
  deviceId: string;
  calibrationDate: string;
  nextCalibrationDate: string;
  certificateNumber: string;
  performedBy: string;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

function generateMockBascules(zones: { id: string; zoneCode: string }[]): BasculeDevice[] {
  if (zones.length === 0) return [];
  const devices: BasculeDevice[] = [];
  const statuses: BasculeStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_ORDER'];
  const manufacturers = ['Sartorius', 'Mettler Toledo', 'Avery Weigh-Tronix', 'Rice Lake', 'KERN & SOHN'];
  
  for (let i = 0; i < 18; i++) {
    const zone = zones[i % zones.length];
    const status = statuses[i % statuses.length];
    const calDate = new Date();
    calDate.setMonth(calDate.getMonth() - (i % 6));
    const nextCal = new Date(calDate);
    nextCal.setMonth(nextCal.getMonth() + 12);

    devices.push({
      id: `BSC-${i + 1}`,
      deviceCode: `BSC-${zone.zoneCode}-${String(i + 1).padStart(3, '0')}`,
      zoneId: zone.id,
      zoneCode: zone.zoneCode,
      capacityTons: [30, 50, 60, 80, 100, 120][i % 6],
      precisionKg: [1, 2, 5, 10][i % 4],
      manufacturer: manufacturers[i % manufacturers.length],
      model: `MDL-${1000 + i}`,
      yearOfManufacture: 2018 + (i % 7),
      serialNumber: `SN-${Date.now()}-${i}`,
      lastCalibrationDate: calDate.toISOString(),
      nextCalibrationDate: nextCal.toISOString(),
      calibrationCertificateNumber: `CAL-${i}`,
      assignedOperatorId: `OP-${i % 10}`,
      assignedOperatorName: `اپراتور ${toPersianDigits(i % 10 + 1)}`,
      minWeightKg: 100,
      maxWeightKg: (30 + (i % 6) * 20) * 1000,
      installationDate: new Date(calDate.getFullYear() - 1, calDate.getMonth(), 1).toISOString(),
      locationInZone: ['ورودی اصلی', 'ورودی فرعی', 'انبار A', 'انبار B', 'پارکینگ'][i % 5],
      status,
      createdAt: calDate.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return devices;
}

function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(d)]);
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

interface BasculeState {
  devices: BasculeDevice[];
  calibrations: CalibrationRecord[];
  isLoading: boolean;
  error: string | null;
}

interface BasculeActions {
  initBascules: (zones: { id: string; zoneCode: string }[]) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
  addDevice: (device: Omit<BasculeDevice, 'id' | 'createdAt' | 'updatedAt'>) => BasculeDevice;
  updateDevice: (id: string, partial: Partial<BasculeDevice>, actorId: string, actorName: string) => void;
  changeStatus: (id: string, status: BasculeStatus, reason: string, actorId: string, actorName: string) => void;
  addCalibration: (record: Omit<CalibrationRecord, 'id'>) => void;
  getExpiringCalibrations: (days: number) => BasculeDevice[];
  getDevicesByZone: (zoneId: string) => BasculeDevice[];
}

type FullBasculeState = BasculeState & BasculeActions;

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useBasculeStore = create<FullBasculeState>()(
  persist(
    (set, get) => ({
      devices: [],
      calibrations: [],
      isLoading: false,
      error: null,

      initBascules: (zones) => {
        set({ devices: [], calibrations: [] });
      },

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const scales = await logisticsApi.listScales();
          set({ devices: scales as unknown as BasculeDevice[], isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت باسکول‌ها' });
        }
      },

      addDevice: (device) => {
        const newDevice: BasculeDevice = {
          ...device,
          id: `BSC-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ devices: [...s.devices, newDevice] }));
        return newDevice;
      },

      updateDevice: (id, partial, actorId, actorName) => {
        const before = get().devices.find(d => d.id === id);
        set((s) => ({
          devices: s.devices.map((d) =>
            d.id === id ? { ...d, ...partial, updatedAt: new Date().toISOString() } : d
          ),
        }));
        useNationalStore.getState().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'bascule',
          entityId: id,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          portal: 'super-admin',
          success: true,
        } as AuditLogEntry);
      },

      changeStatus: (id, status, reason, actorId, actorName) => {
        get().updateDevice(id, { status, statusReason: reason }, actorId, actorName);
      },

      addCalibration: (record) => {
        const newRecord: CalibrationRecord = { ...record, id: `CAL-${Date.now()}` };
        set((s) => ({ calibrations: [...s.calibrations, newRecord] }));
        // Update device's next calibration date
        set((s) => ({
          devices: s.devices.map((d) =>
            d.id === record.deviceId
              ? { ...d, lastCalibrationDate: record.calibrationDate, nextCalibrationDate: record.nextCalibrationDate, calibrationCertificateNumber: record.certificateNumber }
              : d
          ),
        }));
      },

      getExpiringCalibrations: (days) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + days);
        return get().devices.filter((d) => new Date(d.nextCalibrationDate) < threshold);
      },

      getDevicesByZone: (zoneId) => get().devices.filter((d) => d.zoneId === zoneId),
    }),
    {
      name: 'super-admin-bascule-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
