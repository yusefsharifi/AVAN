import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { CompanyOnboardingRecord, HSERecord, MeterReading, OperationalAlert, UtilityMeter } from '../types/zoneManagement.types';
import { companiesApi } from '@/shared/api/companies.api';
import { iotApi } from '@/shared/api/iot.api';

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface ZoneManagementStore {
  onboardingRecords: CompanyOnboardingRecord[];
  utilityMeters: UtilityMeter[];
  meterReadings: MeterReading[];
  operationalAlerts: OperationalAlert[];
  hseRecords: HSERecord[];
  isLoading: boolean;
  loadFromApi: () => Promise<void>;
  addHSERecord: (record: Omit<HSERecord, 'id' | 'createdAt'>) => void;
  addOnboardingRecord: (record: Omit<CompanyOnboardingRecord, 'id' | 'createdAt'>) => void;
  addUtilityMeter: (meter: Omit<UtilityMeter, 'id'>) => void;
  addMeterReading: (reading: Omit<MeterReading, 'id' | 'consumption'>) => void;
  addOperationalAlert: (alert: Omit<OperationalAlert, 'id' | 'createdAt' | 'status'>) => void;
  updateOperationalAlert: (id: string, updates: Partial<OperationalAlert>) => void;
}

export const useZoneManagementStore = create<ZoneManagementStore>()(
  persist(
    (set) => ({
      onboardingRecords: [],
      utilityMeters: [],
      meterReadings: [],
      operationalAlerts: [],
      hseRecords: [],
      isLoading: false,

      loadFromApi: async () => {
        set({ isLoading: true } as any);
        try {
          const [alertsRes] = await Promise.allSettled([
            iotApi.listActiveAlerts(),
          ]);
          const updates: Partial<ZoneManagementStore> = { isLoading: false } as any;
          if (alertsRes.status === 'fulfilled') {
            updates.operationalAlerts = alertsRes.value as unknown as OperationalAlert[];
          }
          set(updates as any);
        } catch {
          set({ isLoading: false } as any);
        }
      },
      addHSERecord: (record) => set((state) => ({ hseRecords: [{ ...record, id: id('hse'), createdAt: '۱۴۰۳/۰۴/۲۰' }, ...state.hseRecords] })),
      addOnboardingRecord: (record) => set((state) => ({ onboardingRecords: [{ ...record, id: id('onb'), createdAt: '۱۴۰۳/۰۴/۲۰' }, ...state.onboardingRecords] })),
      addUtilityMeter: (meter) => set((state) => ({ utilityMeters: [{ ...meter, id: id('meter') }, ...state.utilityMeters] })),
      addMeterReading: (reading) => set((state) => {
        const consumption = Math.max(0, reading.currentValue - reading.previousValue);
        const meter = state.utilityMeters.find((item) => item.id === reading.meterId);
        const isAnomaly = Boolean(meter && consumption > meter.anomalyThreshold);

        return {
          meterReadings: [{ ...reading, id: id('reading'), consumption }, ...state.meterReadings],
          utilityMeters: state.utilityMeters.map((item) => item.id === reading.meterId ? { ...item, lastReading: reading.currentValue, lastReadingDate: reading.readingDate } : item),
          operationalAlerts: isAnomaly ? [{
            id: id('utility-alert'),
            type: 'utility',
            severity: 'high',
            title: `مصرف غیرعادی ${meter?.utilityType === 'electricity' ? 'برق' : meter?.utilityType === 'water' ? 'آب' : 'گاز'}`,
            description: `مصرف ${consumption.toLocaleString('fa-IR')} از حد آستانه کنتور ${meter?.code} بیشتر است.`,
            companyName: meter?.companyName,
            owner: 'تیم تأسیسات',
            status: 'open',
            createdAt: '۱۴۰۳/۰۴/۲۰',
          }, ...state.operationalAlerts] : state.operationalAlerts,
        };
      }),
      addOperationalAlert: (alert) => set((state) => ({ operationalAlerts: [{ ...alert, id: id('alert'), createdAt: '۱۴۰۳/۰۴/۲۰', status: 'open' }, ...state.operationalAlerts] })),
      updateOperationalAlert: (alertId, updates) => set((state) => ({ operationalAlerts: state.operationalAlerts.map((alert) => alert.id === alertId ? { ...alert, ...updates } : alert) })),
    }),
    { name: 'zone-management-store', storage: createJSONStorage(() => zustandLocalStorage) },
  ),
);
