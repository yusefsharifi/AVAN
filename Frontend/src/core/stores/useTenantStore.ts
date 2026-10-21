// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Store — COMP-004: Migrated from mock data to real API
// ═══════════════════════════════════════════════════════════════════════════════
//
// Previously used hardcoded MOCK_TENANTS. Now derives tenant context from
// the authenticated user's profile (role, zoneId, companyId) and provides
// permission checks based on the user's actual role.
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import type { TenantContext, PortalType, Permission } from '../types';

// Role-based default permissions (derived from user role, not hardcoded)
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    { id: 'super-admin.workflow.admin', portal: 'super-admin', module: 'workflow', action: 'admin', scope: 'global' },
    { id: 'super-admin.mobile.admin', portal: 'super-admin', module: 'mobile', action: 'admin', scope: 'global' },
    { id: 'super-admin.analytics.view', portal: 'super-admin', module: 'analytics', action: 'view', scope: 'global' },
  ],
  ZONE_MANAGER: [
    { id: 'zone.accounting.view', portal: 'city', module: 'accounting', action: 'view', scope: 'zone' },
    { id: 'zone.inventory.view', portal: 'city', module: 'inventory', action: 'view', scope: 'zone' },
    { id: 'zone.waybill.view', portal: 'city', module: 'waybill', action: 'view', scope: 'zone' },
    { id: 'zone.companies.view', portal: 'city', module: 'companies', action: 'view', scope: 'zone' },
  ],
  ZONE_OPERATOR: [
    { id: 'zone.inventory.view', portal: 'city', module: 'inventory', action: 'view', scope: 'zone' },
    { id: 'zone.waybill.view', portal: 'city', module: 'waybill', action: 'view', scope: 'zone' },
  ],
  COMPANY_ADMIN: [
    { id: 'company.accounting.view', portal: 'company', module: 'accounting', action: 'view', scope: 'company' },
    { id: 'company.accounting.edit', portal: 'company', module: 'accounting', action: 'edit', scope: 'company' },
    { id: 'company.inventory.view', portal: 'company', module: 'inventory', action: 'view', scope: 'company' },
    { id: 'company.inventory.edit', portal: 'company', module: 'inventory', action: 'edit', scope: 'company' },
    { id: 'company.waybill.create', portal: 'company', module: 'waybill', action: 'create', scope: 'company' },
    { id: 'company.waybill.view', portal: 'company', module: 'waybill', action: 'view', scope: 'company' },
  ],
  COMPANY_MANAGER: [
    { id: 'company.inventory.view', portal: 'company', module: 'inventory', action: 'view', scope: 'company' },
    { id: 'company.waybill.create', portal: 'company', module: 'waybill', action: 'create', scope: 'company' },
    { id: 'company.waybill.view', portal: 'company', module: 'waybill', action: 'view', scope: 'company' },
  ],
  COMPANY_STAFF: [
    { id: 'company.inventory.view', portal: 'company', module: 'inventory', action: 'view', scope: 'company' },
    { id: 'company.waybill.view', portal: 'company', module: 'waybill', action: 'view', scope: 'company' },
  ],
  GUARD: [
    { id: 'security.waybill.validate', portal: 'security', module: 'waybill', action: 'validate', scope: 'zone' },
    { id: 'security.gate.view', portal: 'security', module: 'gate', action: 'view', scope: 'zone' },
    { id: 'security.visitors.view', portal: 'security', module: 'visitors', action: 'view', scope: 'zone' },
  ],
};

// Derive portal type from user role
export function getPortalFromRole(role: string): PortalType {
  switch (role) {
    case 'SUPER_ADMIN': return 'super-admin';
    case 'ZONE_MANAGER':
    case 'ZONE_OPERATOR': return 'city';
    case 'COMPANY_ADMIN':
    case 'COMPANY_MANAGER':
    case 'COMPANY_STAFF':
    case 'DRIVER': return 'company';
    case 'GUARD': return 'security';
    default: return 'city';
  }
}

interface TenantStore {
  tenant: TenantContext;
  setZoneId: (zoneId: string | null) => void;
  setCompanyId: (companyId: string | null) => void;
  hasPermission: (moduleId: string, action: string) => boolean;
  canAccess: (permissionId: string) => boolean;
}

export const useTenantStore = create<TenantStore>((set, get) => ({
  tenant: {
    portal: 'city',
    zoneId: null,
    companyId: null,
    userId: '',
    userName: '',
    permissions: [],
  },

  setZoneId: (zoneId) => set((state) => ({
    tenant: { ...state.tenant, zoneId },
  })),

  setCompanyId: (companyId) => set((state) => ({
    tenant: { ...state.tenant, companyId },
  })),

  hasPermission: (moduleId, action) => {
    const { tenant } = get();
    return tenant.permissions.some((p) => p.module === moduleId && p.action === action);
  },

  canAccess: (permissionId) => {
    const { tenant } = get();
    return tenant.permissions.some((p) => p.id === permissionId);
  },
}));

// ── Auto-sync tenant when auth state changes ────────────────────────────────

if (typeof window !== 'undefined') {
  useAuthStore.subscribe((state) => {
    if (state.user && state.isAuthenticated) {
      const portal = getPortalFromRole(state.user.role);
      const permissions = ROLE_PERMISSIONS[state.user.role] || [];
      useTenantStore.setState({
        tenant: {
          portal,
          zoneId: state.user.zoneId || null,
          companyId: state.user.companyId || null,
          userId: state.user.id,
          userName: `${state.user.firstName} ${state.user.lastName}`,
          permissions,
        },
      });
    } else {
      // Reset tenant on logout
      useTenantStore.setState({
        tenant: {
          portal: 'city',
          zoneId: null,
          companyId: null,
          userId: '',
          userName: '',
          permissions: [],
        },
      });
    }
  });
}
