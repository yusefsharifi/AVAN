import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../guards/jwt.guard';

/**
 * The actor whose scope should be resolved. After JwtGuard completes,
 * payload fields always reflect the CURRENT server-side state (SEC-020);
 * for supervisory roles, guards place an explicitly SELECTED scope from
 * query/body onto request.zoneId / request.companyId — callers may override
 * the user's own values with those explicit selections.
 */
export interface ScopeActor {
  role: UserRole | string;
  zoneId?: string | null;
  companyId?: string | null;
}

/**
 * SECURITY FIX (SEC-024): centralizes the multi-tenant scope resolution so
 * services never read zoneId/companyId from arbitrary client inputs.
 *
 * resolveZoneScope:
 *  - SUPER_ADMIN: uses the explicit zone selection when one was made
 *    (request.zoneId === user.zoneId after ZoneGuard), otherwise null
 *    (= platform-wide);
 *  - ZONE roles: user.zoneId;
 *  - COMPANY roles: zoneId of the user's company (resolved via the company
 *    relation, so it is always server-derived).
 *
 * resolveCompanyScope:
 *  - SUPER_ADMIN / ZONE roles: explicit companyId selection, otherwise null
 *    (= every company in the platform / zone);
 *  - COMPANY roles: always the user's own companyId.
 */
@Injectable()
export class ScopeService {
  // Roles whose data scope covers a whole zone or the platform
  private static readonly SUPERVISOR_ROLES: string[] = [
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.ZONE_OPERATOR,
  ];

  private static readonly COMPANY_ROLE_LIST: string[] = [
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
    UserRole.COMPANY_STAFF,
    UserRole.DRIVER,
  ];

  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(role: ScopeActor['role']): boolean {
    return role === UserRole.SUPER_ADMIN;
  }

  private isZoneRole(role: ScopeActor['role']): boolean {
    return role === UserRole.ZONE_MANAGER || role === UserRole.ZONE_OPERATOR;
  }

  private isCompanyRole(role: ScopeActor['role']): boolean {
    return ScopeService.COMPANY_ROLE_LIST.includes(role as string);
  }

  async resolveZoneScope(user: ScopeActor): Promise<string | null> {
    if (this.isSuperAdmin(user.role)) {
      // zoneId is only set when the super admin explicitly selected one
      // (ZoneGuard) or when impersonating a user with a zone (server-derived).
      return user.zoneId || null;
    }

    if (this.isZoneRole(user.role)) {
      return user.zoneId || null;
    }

    if (this.isCompanyRole(user.role) && user.companyId) {
      // Server-derived: zoneId comes from the company relation, never from
      // client input.
      const company = await this.prisma.company.findUnique({
        where: { id: user.companyId },
        select: { zoneId: true, deletedAt: true },
      });
      if (!company || company.deletedAt) return null;
      return company.zoneId;
    }

    return user.zoneId || null;
  }

  async resolveCompanyScope(user: ScopeActor): Promise<string | null> {
    if (
      ScopeService.SUPERVISOR_ROLES.includes(user.role as string)
    ) {
      // Only an explicit company selection narrows the scope; otherwise
      // "all companies within the platform/zone".
      return user.companyId || null;
    }

    return user.companyId || null;
  }
}
