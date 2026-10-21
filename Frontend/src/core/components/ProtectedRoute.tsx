import { Navigate, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuthStore, getPortalFromRole } from '../stores';
import type { PortalType } from '../types';
import { usePermission } from '@/shared/hooks/usePermission';
import { getRequiredPermissionForRoute } from '@/core/constants/route-permissions';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ZONE_MANAGER'
  | 'ZONE_OPERATOR'
  | 'COMPANY_ADMIN'
  | 'COMPANY_MANAGER'
  | 'COMPANY_STAFF'
  | 'GUARD'
  | 'DRIVER';

const PORTAL_DEFAULT_PATH: Record<PortalType, string> = {
  'super-admin': '/super-admin/dashboard',
  'city': '/city/dashboard',
  'company': '/company/dashboard',
  'security': '/security/validation',
};

export function getDefaultPathForRole(role: string | undefined): string {
  if (!role) return '/login';
  const portal = getPortalFromRole(role);
  return PORTAL_DEFAULT_PATH[portal] ?? '/city/dashboard';
}

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, requiredPermission, children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const { hasPermission, isSuperAdmin, isLoading: isPermissionLoading } = usePermission();

  if (isInitializing || (isAuthenticated && !isSuperAdmin && isPermissionLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0047E1]" />
          <span className="text-xs text-slate-500 font-medium">در حال بررسی مجوزهای دسترسی...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // 1. Role-based check
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/access-denied" replace />;
  }

  // 2. Permission-based check (explicit prop or automatically matched from route-permissions)
  const targetPermission = requiredPermission || getRequiredPermissionForRoute(location.pathname);
  if (targetPermission && !isSuperAdmin && !hasPermission(targetPermission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
