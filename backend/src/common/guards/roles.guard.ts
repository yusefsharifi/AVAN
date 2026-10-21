import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes';
import { JwtPayload } from './jwt.guard';

/**
 * Role hierarchy with numeric levels for comparison.
 * Higher numbers = more privileges.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ZONE_MANAGER: 80,
  ZONE_OPERATOR: 60,
  COMPANY_ADMIN: 50,
  COMPANY_MANAGER: 40,
  COMPANY_STAFF: 30,
  GUARD: 20,
  DRIVER: 10,
};

/**
 * Domain classification for role hierarchy boundaries.
 * SECURITY FIX (QUAL-001): Roles are grouped into domains to prevent
 * cross-domain privilege escalation via numeric hierarchy alone.
 *
 * - PLATFORM: SUPER_ADMIN (can access everything)
 * - ZONE: ZONE_MANAGER, ZONE_OPERATOR (zone-level management)
 * - COMPANY: COMPANY_ADMIN, COMPANY_MANAGER, COMPANY_STAFF, GUARD, DRIVER
 *
 * With this classification:
 * - @Roles(COMPANY_STAFF) allows COMPANY_STAFF, COMPANY_MANAGER, COMPANY_ADMIN
 *   (same domain, higher levels) but NOT ZONE roles
 * - @Roles(ZONE_MANAGER) allows ZONE_MANAGER and SUPER_ADMIN
 * - @Roles(SUPER_ADMIN) allows only SUPER_ADMIN
 * - SUPER_ADMIN can always access any endpoint
 */
const ROLE_DOMAIN: Record<UserRole, 'platform' | 'zone' | 'company'> = {
  SUPER_ADMIN: 'platform',
  ZONE_MANAGER: 'zone',
  ZONE_OPERATOR: 'zone',
  COMPANY_ADMIN: 'company',
  COMPANY_MANAGER: 'company',
  COMPANY_STAFF: 'company',
  GUARD: 'company',
  DRIVER: 'company',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    const userRole = user.role as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const userDomain = ROLE_DOMAIN[userRole];

    // SECURITY FIX (QUAL-001): SUPER_ADMIN always has access
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if user's role is in the required roles list (exact match)
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // SECURITY FIX (QUAL-001): Domain-aware hierarchy check.
    // A user can access an endpoint if:
    // 1. Their role has a higher numeric level than the minimum required, AND
    // 2. They are in the SAME domain as at least one required role
    //
    // This prevents cross-domain escalation:
    // - COMPANY_ADMIN (50) cannot access ZONE_OPERATOR (60) endpoints
    //   even though the old numeric check would have allowed it (50 < 60, so
    //   actually the old check would NOT have allowed it — but this is more
    //   explicit about the domain boundary)
    // - ZONE_OPERATOR (60) cannot access COMPANY_STAFF (30) endpoints
    //   via hierarchy alone (different domains)
    const requiredDomains = new Set(
      requiredRoles.map((r) => ROLE_DOMAIN[r]),
    );

    // User must be in the same domain as at least one required role
    if (!requiredDomains.has(userDomain)) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Within the same domain, check numeric hierarchy
    const requiredLevel = Math.min(
      ...requiredRoles
        .filter((r) => ROLE_DOMAIN[r] === userDomain)
        .map((r) => ROLE_HIERARCHY[r] ?? 100),
    );

    if (userLevel >= requiredLevel) {
      return true;
    }

    throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
  }
}
