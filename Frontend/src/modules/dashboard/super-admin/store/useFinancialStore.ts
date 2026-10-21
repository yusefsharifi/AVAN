// ============================================================================
// src/modules/dashboard/super-admin/store/useFinancialStore.ts
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNationalStore } from './useNationalStore';
import type { AuditLogEntry } from '@/entities/audit';
import { createDiff } from '@/entities/audit';
import { financeApiTyped } from '@/shared/api/finance.api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ServiceType =
  | 'land_lease'
  | 'utility'
  | 'permit_issuance'
  | 'municipal_services'
  | 'annual_tax';

export type CalculationMethod = 'fixed' | 'per_sqm' | 'per_employee';

export interface TariffTemplate {
  id: string;
  name: string;
  serviceType: ServiceType;
  baseAmount: number;
  calculationMethod: CalculationMethod;
  applicableZoneTypes: string[];
  currency: 'IRR';
  taxRate: number;
  effectiveDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID';

export interface InvoiceItem {
  id: string;
  title: string;
  amount: number;
  period: string;
  collectionIdentifier: string;
}

export interface Invoice {
  id: string;
  zoneId: string;
  companyIds: string[];
  targetedAllCompanies: boolean;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  description: string;
  status: InvoiceStatus;
  paymentDate?: string;
  paymentMethod?: 'bank_transfer' | 'cheque' | 'cash';
  receiptNumber?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type PaymentMethodType = 'bank_transfer' | 'cheque' | 'cash';

/* ------------------------------------------------------------------ */
/*  Mock Seed Data                                                    */
/* ------------------------------------------------------------------ */

function generateMockInvoices(): Invoice[] {
  const zones = ['NZ-000001', 'NZ-000002', 'NZ-000003', 'NZ-000004', 'NZ-000005'];
  const statuses: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'SENT', 'UNPAID', 'PARTIAL', 'PAID'];
  const items: Invoice[] = [];
  
  for (let i = 0; i < 35; i++) {
    const zoneIdx = i % 5;
    const total = [2_500_000, 5_000_000, 8_750_000, 12_000_000, 15_500_000, 3_200_000][i % 6];
    const statusIdx = i % 6;
    const status = statuses[statusIdx];
    const paidAmount = status === 'PAID' ? total : status === 'PARTIAL' ? Math.floor(total * 0.4) : 0;
    const dueOffsetDays = -90 + Math.floor(Math.random() * 180);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueOffsetDays);
    
    items.push({
      id: `INV-${String(i + 1).padStart(4, '0')}`,
      zoneId: zones[zoneIdx],
      companyIds: [`COM-${String(i + 1).padStart(4, '0')}`],
      targetedAllCompanies: false,
      items: [
        {
          id: `ITM-${i}`,
          title: ['اجاره زمین', 'خدمات آب', 'خدمات برق', 'پروانه بهره‌برداری', 'عوارض شهرداری'][i % 5],
          amount: total,
          period: '۱۴۰۳/۰۱ تا ۱۴۰۳/۰۳',
          collectionIdentifier: `COL-${i}`,
        },
      ],
      totalAmount: total,
      paidAmount,
      remainingAmount: total - paidAmount,
      dueDate: dueDate.toISOString(),
      description: 'صورت‌حساب دوره‌ای',
      status,
      paymentDate: status === 'PAID' || status === 'PARTIAL' ? new Date().toISOString() : undefined,
      paymentMethod: status === 'PAID' || status === 'PARTIAL' ? 'bank_transfer' : undefined,
      receiptNumber: status === 'PAID' ? `REC-${i}` : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    });
  }
  return items;
}

function generateMockTariffs(): TariffTemplate[] {
  return [
    {
      id: 'TAR-001',
      name: 'نرخ استاندارد اجاره زمین',
      serviceType: 'land_lease',
      baseAmount: 450000,
      calculationMethod: 'per_sqm',
      applicableZoneTypes: ['light', 'heavy', 'mixed'],
      currency: 'IRR',
      taxRate: 0.09,
      effectiveDate: new Date(Date.now() - 90 * 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 270 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'TAR-002',
      name: 'نرخ خدمات شهرداری',
      serviceType: 'municipal_services',
      baseAmount: 1200000,
      calculationMethod: 'fixed',
      applicableZoneTypes: ['light', 'heavy', 'special', 'mixed'],
      currency: 'IRR',
      taxRate: 0.09,
      effectiveDate: new Date(Date.now() - 60 * 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 300 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'TAR-003',
      name: 'حق صدور پروانه',
      serviceType: 'permit_issuance',
      baseAmount: 8500000,
      calculationMethod: 'fixed',
      applicableZoneTypes: ['heavy', 'special'],
      currency: 'IRR',
      taxRate: 0,
      effectiveDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 330 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  State & Actions                                                   */
/* ------------------------------------------------------------------ */

interface FinancialState {
  tariffTemplates: TariffTemplate[];
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
}

interface FinancialActions {
  initFinancialData: () => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
  addTariff: (tariff: Omit<TariffTemplate, 'id' | 'createdAt' | 'updatedAt'>) => TariffTemplate;
  updateTariff: (id: string, partial: Partial<TariffTemplate>) => void;
  deleteTariff: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'remainingAmount'>) => Invoice;
  updateInvoice: (id: string, partial: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  recordPayment: (
    id: string,
    amount: number,
    method: PaymentMethodType,
    receiptNumber: string,
    actorId: string,
    actorName: string
  ) => { success: boolean; error?: string };
  getFilteredInvoices: (filters: {
    zoneId?: string;
    status?: InvoiceStatus;
    dateFrom?: string;
    dateTo?: string;
    companyId?: string;
    minAmount?: number;
    maxAmount?: number;
  }) => Invoice[];
  getOverdueInvoices: () => Invoice[];
  getTotalRevenueByZone: () => Record<string, number>;
  getMonthlyCollectionTrend: () => { month: string; collected: number; issued: number }[];
  getDebtorsAboveThreshold: (threshold: number) => { companyId: string; totalUnpaid: number }[];
}

type FullFinancialState = FinancialState & FinancialActions;

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useFinancialStore = create<FullFinancialState>()(
  persist(
    (set, get) => ({
      tariffTemplates: [],
      invoices: [],
      isLoading: false,
      error: null,

      initFinancialData: () => {
        set({ tariffTemplates: [], invoices: [] });
      },

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const [invoicesRes] = await Promise.allSettled([
            financeApiTyped.listInvoices({ limit: 100 }),
          ]);
          const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value : [];
          set({
            invoices: invoices as unknown as Invoice[],
            tariffTemplates: [],
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت داده‌های مالی' });
        }
      },

      addTariff: (tariff) => {
        const newTariff: TariffTemplate = {
          ...tariff,
          id: `TAR-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ tariffTemplates: [...s.tariffTemplates, newTariff] }));
        return newTariff;
      },

      updateTariff: (id, partial) => {
        set((s) => ({
          tariffTemplates: s.tariffTemplates.map((t) =>
            t.id === id ? { ...t, ...partial, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      deleteTariff: (id) => {
        set((s) => ({ tariffTemplates: s.tariffTemplates.filter((t) => t.id !== id) }));
      },

      addInvoice: (invoice) => {
        const newInvoice: Invoice = {
          ...invoice,
          id: `INV-${Date.now()}`,
          remainingAmount: invoice.totalAmount - (invoice.paidAmount ?? 0),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ invoices: [...s.invoices, newInvoice] }));
        return newInvoice;
      },

      updateInvoice: (id, partial) => {
        set((s) => ({
          invoices: s.invoices.map((inv) =>
            inv.id === id
              ? {
                  ...inv,
                  ...partial,
                  remainingAmount:
                    (partial.totalAmount ?? inv.totalAmount) -
                    (partial.paidAmount ?? inv.paidAmount),
                  updatedAt: new Date().toISOString(),
                }
              : inv
          ),
        }));
      },

      deleteInvoice: (id) => {
        set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
      },

      recordPayment: (id, amount, method, receiptNumber, actorId, actorName) => {
        const inv = get().invoices.find((i) => i.id === id);
        if (!inv) return { success: false, error: 'صورت‌حساب یافت نشد.' };
        if (amount <= 0) return { success: false, error: 'مبلغ پرداخت باید مثبت باشد.' };
        if (amount > inv.remainingAmount) {
          return { success: false, error: 'مبلغ پرداخت از باقی‌مانده بیشتر است.' };
        }

        const newPaid = inv.paidAmount + amount;
        const newRemaining = inv.totalAmount - newPaid;
        let newStatus: InvoiceStatus = 'PARTIAL';
        if (newRemaining <= 0) newStatus = 'PAID';
        else if (newPaid === 0) newStatus = 'UNPAID';

        const updated: Invoice = {
          ...inv,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
          paymentDate: new Date().toISOString(),
          paymentMethod: method,
          receiptNumber,
          updatedAt: new Date().toISOString(),
        };

        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === id ? updated : i)),
        }));

        useNationalStore.getState().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'financial_invoice',
          entityId: id,
          diff: createDiff(inv as Record<string, unknown>, updated as Record<string, unknown>),
          snapshot: updated,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          portal: 'super-admin',
          success: true,
        } as AuditLogEntry);

        return { success: true };
      },

      getFilteredInvoices: (filters) => {
        let list = [...get().invoices];
        if (filters.zoneId) list = list.filter((i) => i.zoneId === filters.zoneId);
        if (filters.status) list = list.filter((i) => i.status === filters.status);
        if (filters.dateFrom) list = list.filter((i) => i.dueDate >= filters.dateFrom!);
        if (filters.dateTo) list = list.filter((i) => i.dueDate <= filters.dateTo!);
        if (filters.companyId) list = list.filter((i) => i.companyIds.includes(filters.companyId!));
        if (filters.minAmount !== undefined) list = list.filter((i) => i.totalAmount >= filters.minAmount!);
        if (filters.maxAmount !== undefined) list = list.filter((i) => i.totalAmount <= filters.maxAmount!);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getOverdueInvoices: () => {
        const now = new Date().toISOString();
        return get().invoices.filter((i) => i.dueDate < now && i.status !== 'PAID');
      },

      getTotalRevenueByZone: () => {
        const map: Record<string, number> = {};
        get().invoices
          .filter((i) => i.status === 'PAID')
          .forEach((i) => {
            map[i.zoneId] = (map[i.zoneId] ?? 0) + i.paidAmount;
          });
        return map;
      },

      getMonthlyCollectionTrend: () => {
        const months = new Map<string, { collected: number; issued: number }>();
        for (let m = 0; m < 6; m++) {
          const d = new Date();
          d.setMonth(d.getMonth() - m);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          months.set(key, { collected: 0, issued: 0 });
        }

        get().invoices.forEach((inv) => {
          const d = new Date(inv.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (months.has(key)) {
            const entry = months.get(key)!;
            entry.issued += inv.totalAmount;
            if (inv.status === 'PAID') entry.collected += inv.paidAmount;
            else if (inv.status === 'PARTIAL') entry.collected += inv.paidAmount;
          }
        });

        return Array.from(months.entries())
          .map(([month, data]) => ({ month, ...data }))
          .reverse();
      },

      getDebtorsAboveThreshold: (threshold) => {
        const companyMap = new Map<string, number>();
        get().invoices
          .filter((i) => i.status !== 'PAID')
          .forEach((i) => {
            i.companyIds.forEach((cid) => {
              companyMap.set(cid, (companyMap.get(cid) ?? 0) + i.remainingAmount);
            });
          });
        return Array.from(companyMap.entries())
          .filter(([, amount]) => amount > threshold)
          .map(([companyId, totalUnpaid]) => ({ companyId, totalUnpaid }));
      },
    }),
    {
      name: 'super-admin-financial-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
