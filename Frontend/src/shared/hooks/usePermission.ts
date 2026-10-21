// ═══════════════════════════════════════════════════════════════════════════════
// usePermission Hook & Store — Client-Side Role-Based Access Control
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { permissionsApi } from '@/shared/api/permissions.api';

interface PermissionState {
  permissions: string[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  fetchPermissions: (force?: boolean) => Promise<void>;
  setPermissions: (permissions: string[]) => void;
  reset: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  fetchPermissions: async (force = false) => {
    const { isLoaded, isLoading } = get();
    if ((isLoaded && !force) || isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const res = await permissionsApi.getMyPermissions();
      set({
        permissions: res.permissions || [],
        isLoading: false,
        isLoaded: true,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        isLoaded: true,
        error: err.message || 'Failed to load user permissions',
      });
    }
  },

  setPermissions: (permissions: string[]) => {
    set({ permissions, isLoaded: true, isLoading: false });
  },

  reset: () => {
    set({ permissions: [], isLoading: false, isLoaded: false, error: null });
  },
}));

/**
 * Match a target permission against user's effective permissions.
 * Supports:
 * - Super admin wildcard '*'
 * - Exact string match
 * - Prefix wildcards (e.g., 'finance.*')
 * - 3-part ('mod.page.action') vs 4-part ('mod.sub.page.action') flexible matching
 */
export function matchPermission(target: string, userPermissions: string[]): boolean {
  if (!target) return true;
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(target)) return true;

  // Wildcard check on user perms (e.g. 'finance.*' matches 'finance.invoices.view')
  for (const p of userPermissions) {
    if (p.endsWith('.*')) {
      const prefix = p.slice(0, -2);
      if (target === prefix || target.startsWith(`${prefix}.`)) {
        return true;
      }
    }
  }

  // Flexible 3-part and 4-part matching
  const targetParts = target.split('.');
  if (targetParts.length === 4) {
    const [mod, sub, page, action] = targetParts;
    // User might have 3-part version: mod.page.action or mod.sub.action
    if (userPermissions.includes(`${mod}.${page}.${action}`)) return true;
    if (userPermissions.includes(`${mod}.${sub}.${action}`)) return true;
  } else if (targetParts.length === 3) {
    const [mod, key, action] = targetParts;
    // Target is 3-part: check if user has corresponding 4-part permission
    for (const p of userPermissions) {
      const pParts = p.split('.');
      if (pParts.length === 4 && pParts[0] === mod && pParts[3] === action) {
        if (pParts[1] === key || pParts[2] === key) {
          return true;
        }
      }
    }
  }

  return false;
}

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { permissions, isLoading, isLoaded, fetchPermissions, reset } = usePermissionStore();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAuthenticated) {
      if (isLoaded || permissions.length > 0) {
        reset();
      }
      return;
    }

    if (!isSuperAdmin && !isLoaded && !isLoading) {
      fetchPermissions();
    }
  }, [isAuthenticated, isSuperAdmin, isLoaded, isLoading, fetchPermissions, reset, permissions.length]);

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin) return true;
    return matchPermission(permission, permissions);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin) return true;
    if (perms.length === 0) return true;
    return perms.some((p) => matchPermission(p, permissions));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (!isAuthenticated) return false;
    if (isSuperAdmin) return true;
    if (perms.length === 0) return true;
    return perms.every((p) => matchPermission(p, permissions));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: isSuperAdmin ? ['*'] : permissions,
    isSuperAdmin,
    isLoading: !isSuperAdmin && isLoading,
    refreshPermissions: () => fetchPermissions(true),
  };
}

export default usePermission;
