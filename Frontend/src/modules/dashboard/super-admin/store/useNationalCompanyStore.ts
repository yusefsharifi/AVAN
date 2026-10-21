// src/modules/dashboard/super-admin/store/useNationalCompanyStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NationalCompany } from '@/entities/company';
import { computeDocumentStatus, calculateHealthScore } from '@/entities/company';
import { useNationalStore } from './useNationalStore';
import { createDiff } from '@/entities/audit';
import type { AuditLogEntry } from '@/entities/audit';
import { companiesApi } from '@/shared/api/companies.api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface CompanyFilters {
  zoneId?: string;
  nationalId?: string;
  name?: string;
  status?: string;
  industry?: string;
  province?: string;
  searchQuery?: string;
}

interface State {
  companies: NationalCompany[];
  companyFilters: CompanyFilters;
  selectedCompanyId: string | null;
  viewMode: 'table' | 'card' | 'map';
  sortBy: 'name' | 'status' | 'createdAt' | 'healthScore';
  sortDirection: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
}

interface Actions {
  initCompanies: (seed: NationalCompany[]) => void;
  loadFromApi: () => Promise<void>;
  addCompany: (company: NationalCompany, actorId: string, actorName: string) => { success: boolean; error?: string };
  updateCompany: (id: string, partial: Partial<NationalCompany>, actorId: string, actorName: string) => { success: boolean; error?: string };
  deleteCompany: (id: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  transferCompany: (id: string, newZoneId: string, reason: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  updateCompanyStatus: (id: string, status: string, actorId: string, actorName: string, note?: string) => { success: boolean; error?: string };
  recomputeDocuments: (id: string) => void;
  setFilters: (f: Partial<CompanyFilters>) => void;
  clearFilters: () => void;
  getCompanyById: (id: string) => NationalCompany | null;
  getCompaniesByZone: (zoneId: string) => NationalCompany[];
  getFilteredCompanies: () => NationalCompany[];
  setSelectedCompanyId: (id: string | null) => void;
  setViewMode: (v: 'table' | 'card' | 'map') => void;
  setSort: (by: State['sortBy'], dir: State['sortDirection']) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */
export const useNationalCompanyStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      companies: [],
      companyFilters: {},
      selectedCompanyId: null,
      viewMode: 'table',
      sortBy: 'createdAt',
      sortDirection: 'desc',
      isLoading: false,
      error: null,

      initCompanies: (seed) => {
        set({
          companies: seed.map((c) => ({
            ...c,
            documentStatus: computeDocumentStatus(c.documents),
            healthScore: calculateHealthScore(c),
          })),
        });
      },

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const nat = useNationalStore.getState();
          const zoneId = nat.parks[0]?.id || '';
          const companies = await companiesApi.listByZone(zoneId);
          set({
            companies: companies as unknown as NationalCompany[],
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت شرکت‌ها' });
        }
      },

      addCompany: (company, actorId, actorName) => {
        if (!company.zoneId) {
          return { success: false, error: 'انتخاب منطقه صنعتی برای ثبت شرکت الزامی است.' };
        }
        const zone = useNationalStore.getState().getParkById(company.zoneId);
        if (!zone) return { success: false, error: 'منطقه صنعتی انتخاب‌شده یافت نشد.' };
        if (zone.status !== 'active') return { success: false, error: 'منطقه صنعتی انتخاب‌شده فعال نیست.' };

        const now = new Date().toISOString();
        const enriched: NationalCompany = {
          ...company,
          documentStatus: computeDocumentStatus(company.documents),
          healthScore: calculateHealthScore(company),
          createdAt: company.createdAt ?? now,
          updatedAt: now,
        };

        set((state) => ({ companies: [...state.companies, enriched] }));

        useNationalStore.getState().addAuditLog({
          id: crypto.randomUUID(),
          timestamp: now,
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'CREATE',
          entityType: 'company',
          entityId: enriched.id,
          diff: createDiff({}, enriched as Record<string, unknown>),
          snapshot: enriched,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: enriched.zoneId,
          companyId: enriched.id,
        } as AuditLogEntry);

        return { success: true };
      },

      updateCompany: (id, partial, actorId, actorName) => {
        const state = get();
        const idx = state.companies.findIndex((c) => c.id === id);
        if (idx === -1) return { success: false, error: 'شرکت یافت نشد.' };
        const before = state.companies[idx];

        if (partial.zoneId && partial.zoneId !== before.zoneId) {
          const zone = useNationalStore.getState().getParkById(partial.zoneId);
          if (!zone) return { success: false, error: 'منطقه مقصد یافت نشد.' };
          if (zone.status !== 'active') return { success: false, error: 'منطقه مقصد فعال نیست.' };
        }

        const merged: NationalCompany = {
          ...before,
          ...partial,
          documents: partial.documents ?? before.documents,
          updatedAt: new Date().toISOString(),
        };
        merged.documentStatus = computeDocumentStatus(merged.documents);
        merged.healthScore = calculateHealthScore(merged);

        const next = [...state.companies];
        next[idx] = merged;
        set({ companies: next });

        useNationalStore.getState().addAuditLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'company',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, merged as Record<string, unknown>),
          snapshot: merged,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: merged.zoneId,
          companyId: id,
        } as AuditLogEntry);

        return { success: true };
      },

      deleteCompany: (id, actorId, actorName) => {
        const state = get();
        const before = state.companies.find((c) => c.id === id);
        if (!before) return { success: false, error: 'شرکت یافت نشد.' };

        set({
          companies: state.companies.filter((c) => c.id !== id),
          selectedCompanyId: state.selectedCompanyId === id ? null : state.selectedCompanyId,
        });

        useNationalStore.getState().addAuditLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'DELETE',
          entityType: 'company',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, {}),
          snapshot: before,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: before.zoneId,
          companyId: id,
        } as AuditLogEntry);

        return { success: true };
      },

      transferCompany: (id, newZoneId, reason, actorId, actorName) => {
        const state = get();
        const company = state.companies.find((c) => c.id === id);
        if (!company) return { success: false, error: 'شرکت یافت نشد.' };
        const zone = useNationalStore.getState().getParkById(newZoneId);
        if (!zone) return { success: false, error: 'منطقه مقصد یافت نشد.' };
        if (zone.status !== 'active') return { success: false, error: 'منطقه مقصد فعال نیست.' };

        const before = { ...company };
        const after: NationalCompany = {
          ...company,
          zoneId: newZoneId,
          zoneName: zone.nameFa,
          transferHistory: [
            ...(company.transferHistory || []),
            {
              fromZoneId: company.zoneId,
              toZoneId: newZoneId,
              reason,
              transferredAt: new Date().toISOString(),
              transferredBy: actorId,
            } as any,
          ],
          updatedAt: new Date().toISOString(),
        };
        after.documentStatus = computeDocumentStatus(after.documents);
        after.healthScore = calculateHealthScore(after);

        set({ companies: state.companies.map((c) => (c.id === id ? after : c)) });

        useNationalStore.getState().addAuditLog({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'TRANSFER',
          entityType: 'company',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, after as Record<string, unknown>),
          snapshot: after,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          note: reason,
          zoneId: newZoneId,
          companyId: id,
        } as AuditLogEntry);

        return { success: true };
      },

      updateCompanyStatus: (id, status, actorId, actorName, note) =>
        get().updateCompany(id, { status } as Partial<NationalCompany>, actorId, actorName),

      recomputeDocuments: (id) =>
        set((state) => ({
          companies: state.companies.map((c) =>
            c.id !== id
              ? c
              : {
                  ...c,
                  documentStatus: computeDocumentStatus(c.documents),
                  healthScore: calculateHealthScore(c),
                }
          ),
        })),

      setFilters: (f) => set((state) => ({ companyFilters: { ...state.companyFilters, ...f } })),
      clearFilters: () => set({ companyFilters: {} }),

      getCompanyById: (id) => get().companies.find((c) => c.id === id) ?? null,
      getCompaniesByZone: (zoneId) => get().companies.filter((c) => c.zoneId === zoneId),

      getFilteredCompanies: () => {
        const { companies, companyFilters, sortBy, sortDirection } = get();
        let list = [...companies];

        if (companyFilters.zoneId) list = list.filter((c) => c.zoneId === companyFilters.zoneId);
        if (companyFilters.status) list = list.filter((c) => c.status === companyFilters.status);
        if (companyFilters.industry) list = list.filter((c) => c.industry === companyFilters.industry);
        if (companyFilters.province) list = list.filter((c) => c.province === companyFilters.province);
        if (companyFilters.nationalId) list = list.filter((c) => c.nationalId?.includes(companyFilters.nationalId!));
        if (companyFilters.name) list = list.filter((c) => c.name?.includes(companyFilters.name!));
        if (companyFilters.searchQuery) {
          const q = companyFilters.searchQuery.trim().toLowerCase();
          list = list.filter((c) =>
            `${c.name} ${c.nationalId} ${c.brand}`.toLowerCase().includes(q)
          );
        }

        list.sort((a, b) => {
          const dir = sortDirection === 'asc' ? 1 : -1;
          if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '') * dir;
          if (sortBy === 'status') return (a.status ?? '').localeCompare(b.status ?? '') * dir;
          if (sortBy === 'healthScore') return ((a.healthScore ?? 0) - (b.healthScore ?? 0)) * dir;
          return ((a.createdAt ?? '') > (b.createdAt ?? '') ? 1 : -1) * dir;
        });

        return list;
      },

      setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
      setViewMode: (v) => set({ viewMode: v }),
      setSort: (by, dir) => set({ sortBy: by, sortDirection: dir }),
    }),
    {
      name: 'super-admin-company-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        companies: state.companies,
        companyFilters: state.companyFilters,
        selectedCompanyId: state.selectedCompanyId,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
      }),
    }
  )
);
