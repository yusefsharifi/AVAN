import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes';
import { JwtPayload } from './jwt.guard';

/**
 * SECURITY FIX (SEC-025): data scope for the GUARD role.
 *
 * GUARD must NOT follow the company-scope pattern (CompanyGuard). Instead its
 * scope comes exclusively from an ACTIVE GuardAssignment:
 *   isActive = true, validFrom <= now, validTo is null or in the future.
 *
 * When an active assignment exists, `request.guardScope = { zoneId, gateId }`
 * is attached to the request for services to read. Without an active
 * assignment the guard role has NO data scope at all → 403
 * (GUARD_NO_ACTIVE_ASSIGNMENT).
 *
 * Non-GUARD roles pass through: their scope is governed by ZoneGuard /
 * CompanyGuard.
 */
@Injectable()
export class GuardScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    if (user.role !== UserRole.GUARD) {
      return true;
    }

    const now = new Date();

    const assignment = await this.prisma.guardAssignment.findFirst({
      where: {
        guardId: user.sub,
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      select: { zoneId: true, gateId: true },
    });

    if (!assignment) {
      throw new ForbiddenException(ERROR_CODES.GUARD_NO_ACTIVE_ASSIGNMENT);
    }

    request.guardScope = {
      zoneId: assignment.zoneId,
      gateId: assignment.gateId ?? null,
    };
    // convenience mirrors so services reading request.zoneId / @ZoneId()
    // also see the assignment's zone
    request.zoneId = assignment.zoneId;

    return true;
  }
}
