// ═══════════════════════════════════════════════════════════════════════════════
// Can Component — Declarative Authorization for UI Elements
// ═══════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { usePermission } from '@/shared/hooks/usePermission';

export interface CanProps {
  /**
   * Single permission required to render children
   */
  permission?: string;

  /**
   * At least one of these permissions must be present
   */
  anyPermission?: string[];

  /**
   * All of these permissions must be present
   */
  allPermissions?: string[];

  /**
   * Optional fallback to render when permission check fails (defaults to null)
   */
  fallback?: ReactNode;

  /**
   * Protected child elements
   */
  children: ReactNode;
}

export function Can({
  permission,
  anyPermission,
  allPermissions,
  fallback = null,
  children,
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermission();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (anyPermission && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
    return <>{fallback}</>;
  }

  if (allPermissions && allPermissions.length > 0 && !hasAllPermissions(allPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default Can;
