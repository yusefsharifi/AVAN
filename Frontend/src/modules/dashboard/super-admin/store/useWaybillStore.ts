// ============================================================================
// src/modules/dashboard/super-admin/store/useWaybillStore.ts
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNationalStore } from './useNationalStore';
import type { AuditLogEntry } from '@/entities/audit';
import { logisticsApi } from '@/shared/api/logistics.api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type WaybillStatus =
  | 'DRAFT'
  | 'PENDING_ORIGIN'
  | 'PENDING_DESTINATION'
  | 'NATIONAL_CONFIRMED'
  | 'REJECTED'
  | 'FLAGGED_FOR_AUDIT'
  | 'COMPLETED';

export interface WaybillRecord {
  id: string;
  waybillNumber: string;
  originZoneId: string;
  originCompanyId: string;
  destinationZoneId?: string;
  destinationAddress: string;
  vehiclePlate: string; // Iranian format
  driverName: string;
  driverNationalId: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  cargoType: string;
  status: WaybillStatus;
  issueDate: string;
  comment?: string;
  rejectionReason?: string;
  auditFlagReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaybillTemplate {
  id: string;
  zoneId: string;
  requiredFields: string[];
  approvalSteps: string[];
  autoChargePerTonKm: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

function generateWaybills(zones: { id: string }[], companies: { id: string; zoneId: string }[]): WaybillRecord[] {
  if (zones.length === 0 || companies.length === 0) return [];
  const records: WaybillRecord[] = [];
  const statuses: WaybillStatus[] = ['DRAFT', 'PENDING_ORIGIN', 'NATIONAL_CONFIRMED', 'REJECTED', 'FLAGGED_FOR_AUDIT', 'COMPLETED'];
  const cargoTypes = ['فولاد', 'سیمان', 'مواد شیمیایی', 'غلات', 'محصولات پتروشیمی', 'کاشی و سرامیک', 'شیشه'];
  const plates = [
    '۱۲ ب ۳۴۵ ایران ۶۶',
    '۵۶ ج ۷۸۹ ایران ۱۱',
    '۹۰ د ۱۲۳ ایران ۲۲',
    '۳۴ س ۵۶۷ ایران ۸۸',
    '۷۸ ص ۹۰۱ ایران ۳۳',
    '۱۲ ط ۳۴۵ ایران ۵۵',
    '۴۵ ق ۶۷۸ ایران ۷۷',
    '۸۹ ل ۰۱۲ ایران ۹۹',
    '۲۳ م ۴۵۶ ایران ۴۴',
    '۶۷ ن ۸۹۰ ایران ۱۱',
  ];

  for (let i = 0; i < 120; i++) {
    const origin = companies[i % companies.length];
    const destZone = zones[(i + 1) % zones.length];
    const status = statuses[i % statuses.length];
    const gross = 20000 + Math.floor(Math.random() * 40000);
    const tare = 8000 + Math.floor(Math.random() * 7000);
    
    records.push({
      id: `WB-${String(i + 1).padStart(5, '0')}`,
      waybillNumber: `1403-${String(i + 1).padStart(6, '0')}`,
      originZoneId: origin.zoneId,
      originCompanyId: origin.id,
      destinationZoneId: destZone.id,
      destinationAddress: `نشانی مقصد ${toPersianDigits(i + 1)}`,
      vehiclePlate: plates[i % plates.length],
      driverName: `راننده ${toPersianDigits(i + 1)}`,
      driverNationalId: String(1000000000 + i),
      grossWeightKg: gross,
      tareWeightKg: tare,
      netWeightKg: gross - tare,
      cargoType: cargoTypes[i % cargoTypes.length],
      status,
      issueDate: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
      rejectionReason: status === 'REJECTED' ? 'نقص در مدارک هویتی راننده' : undefined,
      auditFlagReason: status === 'FLAGGED_FOR_AUDIT' ? 'اختلاف وزن غیرعادی' : undefined,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return records;
}

function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(d)]);
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

interface WaybillState {
  waybills: WaybillRecord[];
  templates: WaybillTemplate[];
  isLoading: boolean;
  error: string | null;
}

interface WaybillActions {
  initWaybills: (zones: { id: string }[], companies: { id: string; zoneId: string }[]) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
  updateStatus: (id: string, status: WaybillStatus, payload?: { comment?: string; reason?: string; auditReason?: string }, actorId?: string, actorName?: string) => void;
  addTemplate: (template: Omit<WaybillTemplate, 'id' | 'createdAt'>) => WaybillTemplate;
  getFilteredWaybills: (filters: {
    dateFrom?: string;
    dateTo?: string;
    originZoneId?: string;
    destinationZoneId?: string;
    status?: WaybillStatus;
    plateSearch?: string;
    minWeight?: number;
    maxWeight?: number;
  }) => WaybillRecord[];
}

type FullWaybillState = WaybillState & WaybillActions;

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useWaybillStore = create<FullWaybillState>()(
  persist(
    (set, get) => ({
      waybills: [],
      templates: [],
      isLoading: false,
      error: null,

      initWaybills: (zones, companies) => {
        set({ waybills: [] });
      },

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const waybills = await logisticsApi.listWaybills({ limit: 100 });
          set({ waybills: waybills as unknown as WaybillRecord[], isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت بارنامه‌ها' });
        }
      },

      updateStatus: (id, status, payload, actorId = 'current-user', actorName = 'مدیر سیستم ملی') => {
        const before = get().waybills.find(w => w.id === id);
        set((s) => ({
          waybills: s.waybills.map((w) =>
            w.id === id
              ? {
                  ...w,
                  status,
                  comment: payload?.comment ?? w.comment,
                  rejectionReason: payload?.reason ?? w.rejectionReason,
                  auditFlagReason: payload?.auditReason ?? w.auditFlagReason,
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }));

        useNationalStore.getState().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: status === 'REJECTED' ? 'REJECT' : 'UPDATE',
          entityType: 'waybill',
          entityId: id,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          portal: 'super-admin',
          success: true,
          note: payload?.reason ?? payload?.comment ?? payload?.auditReason,
        } as AuditLogEntry);
      },

      addTemplate: (template) => {
        const newTemplate: WaybillTemplate = { ...template, id: `WT-${Date.now()}`, createdAt: new Date().toISOString() };
        set((s) => ({ templates: [...s.templates, newTemplate] }));
        return newTemplate;
      },

      getFilteredWaybills: (filters) => {
        let list = [...get().waybills];
        if (filters.dateFrom) list = list.filter(w => w.issueDate >= filters.dateFrom!);
        if (filters.dateTo) list = list.filter(w => w.issueDate <= filters.dateTo!);
        if (filters.originZoneId) list = list.filter(w => w.originZoneId === filters.originZoneId);
        if (filters.destinationZoneId) list = list.filter(w => w.destinationZoneId === filters.destinationZoneId);
        if (filters.status) list = list.filter(w => w.status === filters.status);
        if (filters.plateSearch) list = list.filter(w => w.vehiclePlate.includes(filters.plateSearch!));
        if (filters.minWeight !== undefined) list = list.filter(w => w.netWeightKg >= filters.minWeight!);
        if (filters.maxWeight !== undefined) list = list.filter(w => w.netWeightKg <= filters.maxWeight!);
        return list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      },
    }),
    {
      name: 'super-admin-waybill-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
