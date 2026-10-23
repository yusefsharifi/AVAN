/**
 * SECURITY FIX (SEC-024): shared access context passed from B2B controllers
 * to services. Values are ALWAYS server-derived:
 *  - zoneId: request.zoneId (set by ZoneGuard / JwtGuard from the DB state)
 *  - companyId: request.companyId (set by CompanyGuard from the DB state or
 *    the token-refreshed user record)
 *  - role: the user's current role (JwtGuard writes it from the DB state)
 *
 * When `role` is a supervisory role (SUPER_ADMIN / ZONE_MANAGER /
 * ZONE_OPERATOR) the data scope covers the zone/platform, so company-level
 * ownership filters are skipped — everything else is narrowed to the actor's
 * company or to records explicitly shared (public / invited) with it.
 */
export interface B2BAccessContext {
  zoneId?: string | null;
  companyId?: string | null;
  role?: string | null;
}

const SUPERVISOR_ROLES = new Set(['SUPER_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR']);

export function isSupervisorRole(role: string | null | undefined): boolean {
  return !!role && SUPERVISOR_ROLES.has(role);
}

export interface DataScope {
  zoneId?: string | null;
  companyId?: string | null;
}

/**
 * Build the Prisma `where` fragment restricting reads to the actor's scope:
 * zone filter always applies when a zone scope exists; company roles are
 * additionally narrowed to their own company OR records shared with them.
 */
export function buildB2BScopeWhere(scope: DataScope | undefined, role: string | null | undefined) {
  const where: Record<string, unknown> = {};
  if (scope?.zoneId) where['zoneId'] = scope.zoneId;
  if (scope?.companyId && !isSupervisorRole(role)) {
    where['companyId'] = scope.companyId;
  }
  return where;
}
