// src/modules/dashboard/super-admin/store/useNationalStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { IndustrialZone, ZoneStatus } from '@/entities/zone';
import {
  calculateZoneOccupancy,
  ZONE_CODE_PATTERN,
  NATIONAL_ZONE_ID_PATTERN,
} from '@/entities/zone';
import type { NationalCompany, CompanyStatus } from '@/entities/company';
import type { UserEntity, UserRole, UserStatus, UserScopeType } from '@/entities/user';
import type { AuditLogEntry } from '@/entities/audit';
import { createDiff } from '@/entities/audit';
import { zonesApi } from '@/shared/api/zones.api';
import { companiesApi } from '@/shared/api/companies.api';
import { usersApi } from '@/shared/api/users.api';

/* ------------------------------------------------------------------ */
/*  Local Types                                                      */
/* ------------------------------------------------------------------ */
export interface ZoneFilters {
  province?: string;
  city?: string;
  status?: ZoneStatus;
  plan?: string;
  minOccupancy?: number;
  maxOccupancy?: number;
  hasWeighbridge?: boolean;
  searchQuery?: string;
}

export interface UserFilters {
  searchQuery?: string;
  role?: UserRole;
  status?: UserStatus;
  scopeType?: UserScopeType;
  zoneId?: string;
  companyId?: string;
}

export interface CompanyFilters {
  searchQuery?: string;
  zoneId?: string;
  status?: CompanyStatus;
  legalType?: string;
  companyType?: string;
}

export interface NationalAlert {
  id: string;
  type: 'capacity' | 'suspension' | 'incident' | 'compliance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  zoneId?: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: string;
}

export interface BriefingItem {
  id: string;
  title: string;
  content: string;
  postedAt: string;
  priority: 'normal' | 'high';
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  order: number;
  visible: boolean;
  config: Record<string, unknown>;
}

interface KPI {
  totalParks: number;
  totalCapacity: number;
  occupiedCapacity: number;
  avgOccupancyRate: number;
  activeParks: number;
  suspendedParks: number;
  totalCompanies: number;
  totalUsers: number;
  alertsCount: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                          */
/* ------------------------------------------------------------------ */
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const defaultKPI = (): KPI => ({
  totalParks: 0,
  totalCapacity: 0,
  occupiedCapacity: 0,
  avgOccupancyRate: 0,
  activeParks: 0,
  suspendedParks: 0,
  totalCompanies: 0,
  totalUsers: 0,
  alertsCount: 0,
});

const buildKPI = (
  parks: IndustrialZone[],
  alerts: NationalAlert[],
  totalCompanies = 0,
  totalUsers = 0
): KPI => {
  const totalParks = parks.length;
  const activeParks = parks.filter((p) => p.status === 'active').length;
  const suspendedParks = parks.filter((p) => p.status === 'suspended').length;
  const totalCapacity = parks.reduce((s, p) => s + (p.infrastructure?.totalAreaSqM ?? 0), 0);
  const occupiedCapacity = parks.reduce(
    (s, p) => s + (p.infrastructure?.totalAreaSqM ?? 0) * (calculateZoneOccupancy(p.plots ?? []) / 100),
    0
  );
  const avgOccupancyRate =
    totalParks > 0
      ? Math.round(
          (parks.reduce((s, p) => s + calculateZoneOccupancy(p.plots ?? []), 0) / totalParks) * 10
        ) / 10
      : 0;

  return {
    totalParks,
    totalCapacity: Math.round(totalCapacity * 100) / 100,
    occupiedCapacity: Math.round(occupiedCapacity * 100) / 100,
    avgOccupancyRate,
    activeParks,
    suspendedParks,
    totalCompanies,
    totalUsers,
    alertsCount: alerts.filter((a) => !a.resolved).length,
  };
};

/* ------------------------------------------------------------------ */
/*  State & Actions                                                  */
/* ------------------------------------------------------------------ */
export interface NationalState {
  parks: IndustrialZone[];
  companies: NationalCompany[];
  users: UserEntity[];
  kpi: KPI;
  alerts: NationalAlert[];
  briefing: BriefingItem[];
  watchlist: string[];
  dashboardWidgets: DashboardWidget[];
  auditLogs: AuditLogEntry[];
  selectedParkId: string | null;
  activeNavGroup: string;
  sidebarCollapsed: boolean;
  zoneFilters: ZoneFilters;
  userFilters: UserFilters;
  companyFilters: CompanyFilters;
  isLoading: boolean;
  error: string | null;
}

export interface NationalActions {
  /* COMP-004: API loading */
  loadFromApi: () => Promise<void>;

  /* Parks */
  initParks: (seed: IndustrialZone[]) => void;
  addPark: (park: IndustrialZone, actorId: string, actorName: string) => { success: boolean; error?: string };
  updatePark: (id: string, partial: Partial<IndustrialZone>, actorId: string, actorName: string) => { success: boolean; error?: string };
  deletePark: (id: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  suspendPark: (id: string, reason: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  activatePark: (id: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  validateZoneCode: (code: string, excludeId?: string) => boolean;
  validateNationalZoneId: (nzId: string, excludeId?: string) => boolean;
  getParkById: (id: string) => IndustrialZone | null;
  getParkByCode: (code: string) => IndustrialZone | null;
  getActiveParks: () => IndustrialZone[];
  getParksByProvince: (province: string) => IndustrialZone[];
  getFilteredParks: () => IndustrialZone[];
  getAvailableCapacity: (zoneId: string) => number;

  /* Companies */
  initCompanies: (seed: NationalCompany[]) => void;
  addCompany: (company: NationalCompany, actorId: string, actorName: string) => { success: boolean; error?: string };
  updateCompany: (id: string, partial: Partial<NationalCompany>, actorId: string, actorName: string) => { success: boolean; error?: string };
  deleteCompany: (id: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  getCompanyById: (id: string) => NationalCompany | null;
  getCompaniesByZoneId: (zoneId: string) => NationalCompany[];
  getFilteredCompanies: () => NationalCompany[];
  countCompaniesByZoneId: (zoneId: string) => number;

  /* Users */
  initUsers: (seed: UserEntity[]) => void;
  addUser: (user: UserEntity, actorId: string, actorName: string) => { success: boolean; error?: string };
  updateUser: (id: string, partial: Partial<UserEntity>, actorId: string, actorName: string) => { success: boolean; error?: string };
  removeUser: (id: string, actorId: string, actorName: string) => { success: boolean; error?: string };
  getUserById: (id: string) => UserEntity | null;
  getUsersByZoneId: (zoneId: string) => UserEntity[];
  getUsersByCompanyId: (companyId: string) => UserEntity[];
  getFilteredUsers: () => UserEntity[];
  validateUserNationalId: (nationalId: string, excludeId?: string) => boolean;
  validateUserEmail: (email: string, excludeId?: string) => boolean;
  validateUserMobile: (mobile: string, excludeId?: string) => boolean;

  /* Alerts & Audit */
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  addAuditLog: (entry: AuditLogEntry) => void;
  getAuditLogs: () => AuditLogEntry[];
  getAuditLogsByEntity: (entityType: string, entityId: string) => AuditLogEntry[];

  /* Filters / UI */
  setZoneFilters: (filters: Partial<ZoneFilters>) => void;
  clearZoneFilters: () => void;
  setUserFilters: (filters: Partial<UserFilters>) => void;
  clearUserFilters: () => void;
  setCompanyFilters: (filters: Partial<CompanyFilters>) => void;
  clearCompanyFilters: () => void;
  setSelectedParkId: (id: string | null) => void;
  setActiveNavGroup: (group: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  recalculateKPI: () => void;
  setWidgets: (widgets: DashboardWidget[]) => void;
}

type FullState = NationalState & NationalActions;

/* ------------------------------------------------------------------ */
/*  Store                                                            */
/* ------------------------------------------------------------------ */
export const useNationalStore = create<FullState>()(
  persist(
    (set, get) => ({
      parks: [],
      companies: [],
      users: [],
      kpi: defaultKPI(),
      alerts: [],
      briefing: [],
      watchlist: [],
      dashboardWidgets: [],
      auditLogs: [],
      selectedParkId: null,
      activeNavGroup: 'zones',
      sidebarCollapsed: false,
      zoneFilters: {},
      userFilters: {},
      companyFilters: {},
      isLoading: false,
      error: null,

      /* ================== COMP-004: API LOADING ================== */
      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const [parksRes, companiesRes, usersRes] = await Promise.allSettled([
            zonesApi.list(),
            companiesApi.listByZone(''),
            usersApi.list({ limit: 100 }),
          ]);

          const parks = parksRes.status === 'fulfilled' ? parksRes.value : [];
          const companies = companiesRes.status === 'fulfilled' ? companiesRes.value : [];
          const users = usersRes.status === 'fulfilled' ? usersRes.value.items : [];

          set((state) => ({
            parks: parks as unknown as IndustrialZone[],
            companies: companies as unknown as NationalCompany[],
            users: users as unknown as UserEntity[],
            kpi: buildKPI(
              parks as unknown as IndustrialZone[],
              state.alerts,
              companies.length,
              users.length,
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت داده‌ها' });
        }
      },

      /* ================== PARKS ================== */
      initParks: (seed) => {
        set((state) => {
          const merged = seed.map((s) => ({
            ...s,
            createdAt: s.createdAt ?? new Date().toISOString(),
            updatedAt: s.updatedAt ?? new Date().toISOString(),
          }));
          return {
            parks: merged,
            kpi: buildKPI(merged, state.alerts, state.kpi.totalCompanies, state.kpi.totalUsers),
          };
        });
      },

      addPark: (park, actorId, actorName) => {
        const state = get();
        if (state.parks.some((p) => p.zoneCode === park.zoneCode))
          return { success: false, error: 'کد منطقه صنعتی تکراری است.' };
        if (park.nationalZoneId && state.parks.some((p) => p.nationalZoneId === park.nationalZoneId))
          return { success: false, error: 'شناسه ملی منطقه صنعتی تکراری است.' };

        const now = new Date().toISOString();
        const newPark: IndustrialZone = {
          ...park,
          createdAt: park.createdAt ?? now,
          updatedAt: now,
        };

        const nextParks = [...state.parks, newPark];
        const nextKPI = buildKPI(nextParks, state.alerts, state.kpi.totalCompanies, state.kpi.totalUsers);
        set({ parks: nextParks, kpi: nextKPI, selectedParkId: newPark.id });

        get().addAuditLog({
          id: generateId(),
          timestamp: now,
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'CREATE',
          entityType: 'zone',
          entityId: newPark.id,
          diff: createDiff({}, newPark as Record<string, unknown>),
          snapshot: newPark,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: newPark.id,
        } as AuditLogEntry);

        return { success: true };
      },

      updatePark: (id, partial, actorId, actorName) => {
        const state = get();
        const idx = state.parks.findIndex((p) => p.id === id);
        if (idx === -1) return { success: false, error: 'منطقه یافت نشد.' };

        const before = state.parks[idx];
        const after: IndustrialZone = {
          ...before,
          ...partial,
          updatedAt: new Date().toISOString(),
        };

        const nextParks = [...state.parks];
        nextParks[idx] = after;
        const nextKPI = buildKPI(nextParks, state.alerts, state.kpi.totalCompanies, state.kpi.totalUsers);
        set({ parks: nextParks, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'zone',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, after as Record<string, unknown>),
          snapshot: after,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: id,
        } as AuditLogEntry);

        return { success: true };
      },

      deletePark: (id, actorId, actorName) => {
        const state = get();
        const before = state.parks.find((p) => p.id === id);
        if (!before) return { success: false, error: 'منطقه یافت نشد.' };

        const nextParks = state.parks.filter((p) => p.id !== id);
        const nextKPI = buildKPI(nextParks, state.alerts, state.kpi.totalCompanies, state.kpi.totalUsers);
        set({
          parks: nextParks,
          kpi: nextKPI,
          selectedParkId: state.selectedParkId === id ? null : state.selectedParkId,
        });

        get().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'DELETE',
          entityType: 'zone',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, {}),
          snapshot: before,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: id,
        } as AuditLogEntry);

        return { success: true };
      },

      suspendPark: (id, reason, actorId, actorName) =>
        get().updatePark(id, { status: 'suspended' } as Partial<IndustrialZone>, actorId, actorName),

      activatePark: (id, actorId, actorName) =>
        get().updatePark(id, { status: 'active' } as Partial<IndustrialZone>, actorId, actorName),

      validateZoneCode: (code, excludeId) => {
        if (!ZONE_CODE_PATTERN.test(code)) return false;
        return !get().parks.some((p) => p.zoneCode === code && p.id !== excludeId);
      },

      validateNationalZoneId: (nzId, excludeId) => {
        if (!NATIONAL_ZONE_ID_PATTERN.test(nzId)) return false;
        return !get().parks.some((p) => p.nationalZoneId === nzId && p.id !== excludeId);
      },

      getParkById: (id) => get().parks.find((p) => p.id === id) ?? null,
      getParkByCode: (code) => get().parks.find((p) => p.zoneCode === code) ?? null,
      getActiveParks: () => get().parks.filter((p) => p.status === 'active'),
      getParksByProvince: (province) => get().parks.filter((p) => p.province === province),
      getFilteredParks: () => {
        const { parks, zoneFilters } = get();
        return parks.filter((p) => {
          if (zoneFilters.status && p.status !== zoneFilters.status) return false;
          if (zoneFilters.province && p.province !== zoneFilters.province) return false;
          if (zoneFilters.city && p.city !== zoneFilters.city) return false;
          if (zoneFilters.plan && (p as any).masterPlan !== zoneFilters.plan) return false;
          if (zoneFilters.hasWeighbridge !== undefined) {
            const has = !!(p as any).infrastructure?.weighbridge;
            if (has !== zoneFilters.hasWeighbridge) return false;
          }
          if (zoneFilters.minOccupancy !== undefined && calculateZoneOccupancy(p.plots ?? []) < zoneFilters.minOccupancy) return false;
          if (zoneFilters.maxOccupancy !== undefined && calculateZoneOccupancy(p.plots ?? []) > zoneFilters.maxOccupancy) return false;
          if (zoneFilters.searchQuery) {
            const q = zoneFilters.searchQuery.trim().toLowerCase();
            const text = `${p.nameFa} ${p.zoneCode} ${p.province} ${p.city}`.toLowerCase();
            if (!text.includes(q)) return false;
          }
          return true;
        });
      },
      getAvailableCapacity: (zoneId) => {
        const park = get().getParkById(zoneId);
        if (!park) return 0;
        // `park` is the zone, but calculateZoneOccupancy takes its PLOTS. The
        // other four call sites all pass `p.plots ?? []`; passing the zone made
        // `plots.length` undefined (so the empty guard never fired) and then
        // `plots.filter(...)` threw "park.filter is not a function".
        const occ = calculateZoneOccupancy(park.plots ?? []);
        return Math.max(0, (park.infrastructure?.totalAreaSqM ?? 0) * (1 - occ / 100));
      },

      /* ================== COMPANIES ================== */
      initCompanies: (seed) => {
        set((state) => {
          const merged = seed.map((s) => ({
            ...s,
            createdAt: s.createdAt ?? new Date().toISOString(),
            updatedAt: s.updatedAt ?? new Date().toISOString(),
          }));
          return {
            companies: merged,
            kpi: { ...state.kpi, totalCompanies: merged.length },
          };
        });
      },

      addCompany: (company, actorId, actorName) => {
        const state = get();
        if (state.companies.some((c) => c.nationalId === company.nationalId))
          return { success: false, error: 'شناسه ملی شرکت تکراری است.' };
        if (state.companies.some((c) => c.registrationNumber === company.registrationNumber))
          return { success: false, error: 'شماره ثبت شرکت تکراری است.' };

        const now = new Date().toISOString();
        const newCompany: NationalCompany = {
          ...company,
          createdAt: company.createdAt ?? now,
          updatedAt: now,
        };

        const nextCompanies = [...state.companies, newCompany];
        const nextKPI = buildKPI(state.parks, state.alerts, nextCompanies.length, state.kpi.totalUsers);
        set({ companies: nextCompanies, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: now,
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'CREATE',
          entityType: 'company',
          entityId: newCompany.id,
          diff: createDiff({}, newCompany as Record<string, unknown>),
          snapshot: newCompany,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: newCompany.zoneId,
          companyId: newCompany.id,
        } as AuditLogEntry);

        return { success: true };
      },

      updateCompany: (id, partial, actorId, actorName) => {
        const state = get();
        const idx = state.companies.findIndex((c) => c.id === id);
        if (idx === -1) return { success: false, error: 'شرکت یافت نشد.' };

        const before = state.companies[idx];
        const after: NationalCompany = {
          ...before,
          ...partial,
          updatedAt: new Date().toISOString(),
        };

        const nextCompanies = [...state.companies];
        nextCompanies[idx] = after;
        const nextKPI = buildKPI(state.parks, state.alerts, nextCompanies.length, state.kpi.totalUsers);
        set({ companies: nextCompanies, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'company',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, after as Record<string, unknown>),
          snapshot: after,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: after.zoneId,
          companyId: after.id,
        } as AuditLogEntry);

        return { success: true };
      },

      deleteCompany: (id, actorId, actorName) => {
        const state = get();
        const before = state.companies.find((c) => c.id === id);
        if (!before) return { success: false, error: 'شرکت یافت نشد.' };

        const nextCompanies = state.companies.filter((c) => c.id !== id);
        const nextKPI = buildKPI(state.parks, state.alerts, nextCompanies.length, state.kpi.totalUsers);
        set({ companies: nextCompanies, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
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
          companyId: before.id,
        } as AuditLogEntry);

        return { success: true };
      },

      getCompanyById: (id) => get().companies.find((c) => c.id === id) ?? null,
      getCompaniesByZoneId: (zoneId) => get().companies.filter((c) => c.zoneId === zoneId),
      getFilteredCompanies: () => {
        const { companies, companyFilters } = get();
        return companies.filter((c) => {
          if (companyFilters.zoneId && c.zoneId !== companyFilters.zoneId) return false;
          if (companyFilters.status && c.status !== companyFilters.status) return false;
          if (companyFilters.legalType && c.legalType !== companyFilters.legalType) return false;
          if (companyFilters.companyType && c.companyType !== companyFilters.companyType) return false;
          if (companyFilters.searchQuery) {
            const q = companyFilters.searchQuery.trim().toLowerCase();
            const text = `${c.nameFa} ${c.nameEn ?? ''} ${c.nationalId} ${c.registrationNumber}`.toLowerCase();
            if (!text.includes(q)) return false;
          }
          return true;
        });
      },
      countCompaniesByZoneId: (zoneId) => get().companies.filter((c) => c.zoneId === zoneId).length,

      /* ================== USERS ================== */
      initUsers: (seed) => {
        set((state) => {
          const merged = seed.map((s) => ({
            ...s,
            displayName: `${s.firstName} ${s.lastName}`,
            createdAt: s.createdAt ?? new Date().toISOString(),
            updatedAt: s.updatedAt ?? new Date().toISOString(),
          }));
          return { users: merged, kpi: { ...state.kpi, totalUsers: merged.length } };
        });
      },

      addUser: (user, actorId, actorName) => {
        const state = get();
        if (state.users.some((u) => u.nationalId === user.nationalId))
          return { success: false, error: 'کدملی تکراری است.' };
        if (state.users.some((u) => u.email === user.email))
          return { success: false, error: 'ایمیل تکراری است.' };
        if (state.users.some((u) => u.mobile === user.mobile))
          return { success: false, error: 'موبایل تکراری است.' };

        const now = new Date().toISOString();
        const newUser: UserEntity = {
          ...user,
          displayName: `${user.firstName} ${user.lastName}`,
          createdAt: user.createdAt ?? now,
          updatedAt: now,
        };

        const nextUsers = [...state.users, newUser];
        const nextKPI = buildKPI(state.parks, state.alerts, state.kpi.totalCompanies, nextUsers.length);
        set({ users: nextUsers, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: now,
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'CREATE',
          entityType: 'user',
          entityId: newUser.id,
          diff: createDiff({}, newUser as Record<string, unknown>),
          snapshot: newUser,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: newUser.zoneId,
          companyId: newUser.companyId,
        } as AuditLogEntry);

        return { success: true };
      },

      updateUser: (id, partial, actorId, actorName) => {
        const state = get();
        const idx = state.users.findIndex((u) => u.id === id);
        if (idx === -1) return { success: false, error: 'کاربر یافت نشد.' };

        const before = state.users[idx];
        const after: UserEntity = {
          ...before,
          ...partial,
          displayName:
            partial.firstName || partial.lastName
              ? `${partial.firstName ?? before.firstName} ${partial.lastName ?? before.lastName}`
              : before.displayName,
          updatedAt: new Date().toISOString(),
        };

        const nextUsers = [...state.users];
        nextUsers[idx] = after;
        const nextKPI = buildKPI(state.parks, state.alerts, state.kpi.totalCompanies, nextUsers.length);
        set({ users: nextUsers, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'user',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, after as Record<string, unknown>),
          snapshot: after,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: after.zoneId,
          companyId: after.companyId,
        } as AuditLogEntry);

        return { success: true };
      },

      removeUser: (id, actorId, actorName) => {
        const state = get();
        const before = state.users.find((u) => u.id === id);
        if (!before) return { success: false, error: 'کاربر یافت نشد.' };

        const nextUsers = state.users.filter((u) => u.id !== id);
        const nextKPI = buildKPI(state.parks, state.alerts, state.kpi.totalCompanies, nextUsers.length);
        set({ users: nextUsers, kpi: nextKPI });

        get().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId,
          actorName,
          actorRole: 'SUPER_ADMIN',
          action: 'DELETE',
          entityType: 'user',
          entityId: id,
          diff: createDiff(before as Record<string, unknown>, {}),
          snapshot: before,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          portal: 'super-admin',
          success: true,
          zoneId: before.zoneId,
          companyId: before.companyId,
        } as AuditLogEntry);

        return { success: true };
      },

      getUserById: (id) => get().users.find((u) => u.id === id) ?? null,
      getUsersByZoneId: (zoneId) => get().users.filter((u) => u.zoneId === zoneId),
      getUsersByCompanyId: (companyId) => get().users.filter((u) => u.companyId === companyId),
      getFilteredUsers: () => {
        const { users, userFilters } = get();
        return users.filter((u) => {
          if (userFilters.role && u.role !== userFilters.role) return false;
          if (userFilters.status && u.status !== userFilters.status) return false;
          if (userFilters.scopeType && u.scopeType !== userFilters.scopeType) return false;
          if (userFilters.zoneId && u.zoneId !== userFilters.zoneId) return false;
          if (userFilters.companyId && u.companyId !== userFilters.companyId) return false;
          if (userFilters.searchQuery) {
            const q = userFilters.searchQuery.trim().toLowerCase();
            const text = `${u.firstName} ${u.lastName} ${u.email} ${u.mobile} ${u.nationalId}`.toLowerCase();
            if (!text.includes(q)) return false;
          }
          return true;
        });
      },
      validateUserNationalId: (nationalId, excludeId) => {
        return !get().users.some((u) => u.nationalId === nationalId && u.id !== excludeId);
      },
      validateUserEmail: (email, excludeId) => {
        return !get().users.some((u) => u.email === email && u.id !== excludeId);
      },
      validateUserMobile: (mobile, excludeId) => {
        return !get().users.some((u) => u.mobile === mobile && u.id !== excludeId);
      },

      /* ================== ALERTS ================== */
      acknowledgeAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
        })),
      resolveAlert: (alertId) =>
        set((state) => {
          const nextAlerts = state.alerts.map((a) =>
            a.id === alertId ? { ...a, resolved: true, acknowledged: true } : a
          );
          return {
            alerts: nextAlerts,
            kpi: { ...state.kpi, alertsCount: nextAlerts.filter((a) => !a.resolved).length },
          };
        }),

      /* ================== AUDIT ================== */
      addAuditLog: (entry) =>
        set((state) => ({
          auditLogs: [entry, ...state.auditLogs].slice(0, 2000),
        })),
      getAuditLogs: () => get().auditLogs,
      getAuditLogsByEntity: (entityType, entityId) =>
        get().auditLogs.filter((l) => l.entityType === entityType && l.entityId === entityId),

      /* ================== FILTERS / UI ================== */
      setZoneFilters: (filters) => set({ zoneFilters: { ...get().zoneFilters, ...filters } }),
      clearZoneFilters: () => set({ zoneFilters: {} }),
      setUserFilters: (filters) => set({ userFilters: { ...get().userFilters, ...filters } }),
      clearUserFilters: () => set({ userFilters: {} }),
      setCompanyFilters: (filters) => set({ companyFilters: { ...get().companyFilters, ...filters } }),
      clearCompanyFilters: () => set({ companyFilters: {} }),
      setSelectedParkId: (id) => set({ selectedParkId: id }),
      setActiveNavGroup: (group) => set({ activeNavGroup: group }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      recalculateKPI: () => {
        const state = get();
        set({ kpi: buildKPI(state.parks, state.alerts, state.kpi.totalCompanies, state.kpi.totalUsers) });
      },
      setWidgets: (widgets) => set({ dashboardWidgets: widgets }),
    }),
    {
      name: 'super-admin-national-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        parks: state.parks,
        companies: state.companies,
        users: state.users,
        kpi: state.kpi,
        alerts: state.alerts,
        briefing: state.briefing,
        watchlist: state.watchlist,
        dashboardWidgets: state.dashboardWidgets,
        auditLogs: state.auditLogs,
        selectedParkId: state.selectedParkId,
        zoneFilters: state.zoneFilters,
        userFilters: state.userFilters,
        companyFilters: state.companyFilters,
        activeNavGroup: state.activeNavGroup,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
