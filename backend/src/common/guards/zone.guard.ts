import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../services/audit.service';
import { UserRole } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes';
import { JwtPayload } from './jwt.guard';

/**
 * SECURITY FIX (SEC-022): for SUPER_ADMIN the explicit data scope is ONLY
 * taken from query.zoneId or body.zoneId. request.params.id is no longer
 * used as a zoneId fallback (:id may be the identifier of any record — a
 * company, a user, …), which previously let a super admin silently pin the
 * zoneId on a request just by hitting a route whose :id happened to match a
 * zone.
 *
 * Behavior:
 *  - explicit zoneId present → validated against the DB (must exist and not
 *    be soft-deleted; otherwise 400), request.zoneId is set to it, and a
 *    USER_SCOPE_SELECTED audit entry is written (scope selection trail);
 *  - no explicit zoneId → request.zoneId stays undefined and the super
 *    admin's global access is preserved. Data-driven actions carry their
 *    zoneId in the body and the services record that value in the AuditLog.
 *
 * Non-super-admin users are unchanged: request.zoneId is always derived
 * from the server-side user record.
 */
@Injectable()
export class ZoneGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Super admin: explicit scope selection only (query/body — never params)
    if (user.role === UserRole.SUPER_ADMIN) {
      const explicitZoneId: string | null =
        request.query?.zoneId || request.body?.zoneId || null;

      if (explicitZoneId) {
        const zone = await this.prisma.zone.findUnique({
          where: { id: explicitZoneId },
        });

        if (!zone || zone.deletedAt) {
          throw new BadRequestException(ERROR_CODES.ZONE_NOT_FOUND);
        }

        request.zoneId = zone.id;

        // Audit the scope selection for traceability.
        await this.audit.log({
          userId: user.sub,
          targetId: zone.id,
          targetType: 'Zone',
          action: 'USER_SCOPE_SELECTED',
          metadata: { zoneId: zone.id },
        });
      } else {
        // Global access — no zone pinned.
        request.zoneId = undefined;
      }

      return true;
    }

    // Zone-level users: scope always comes from the server-side user record
    // (request.user was written by JwtGuard from the live DB state).
    //
    // SEC-025: GUARD users do NOT follow the zone/company scope pattern —
    // their data scope comes exclusively from an active GuardAssignment,
    // enforced by GuardScopeGuard (request.guardScope is populated there).
    if (user.role === UserRole.GUARD) {
      return true;
    }

    if (!user.zoneId) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Verify the zone exists (and was not soft-deleted) right now
    const zone = await this.prisma.zone.findUnique({
      where: { id: user.zoneId },
    });

    if (!zone || zone.deletedAt) {
      throw new ForbiddenException(ERROR_CODES.ZONE_NOT_FOUND);
    }

    // Attach zoneId to request for downstream use
    request.zoneId = user.zoneId;
    return true;
  }
}
