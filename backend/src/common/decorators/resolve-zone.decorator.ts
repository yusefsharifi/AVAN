import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import { JwtPayload } from '../guards/jwt.guard';

/**
 * Step-4 TASK 3 — resolve the zone a write should be scoped to.
 *
 * Background: `ZoneGuard` gives a SUPER_ADMIN a zone only when the request
 * already carries one, so `request.zoneId` is `undefined` for platform admins
 * (their `User.zoneId` is null). Controllers that did `{ ...dto, zoneId }` off
 * `@ZoneId()` therefore wrote `zoneId: undefined` and the insert failed deep in
 * Prisma with a 500.
 *
 * Resolution order — deliberately NO "just pick the first zone" fallback:
 *   1. `body.zoneId`  — an explicit choice (the frontend zone selector)
 *   2. `query.zoneId` — an explicit choice on list/report style routes
 *   3. the session zone ZoneGuard attached (zone/company users: unchanged path)
 *   4. otherwise, for a SUPER_ADMIN, a 400 telling the operator to choose;
 *      for anyone else, the usual 403.
 *
 * Never silently defaults, because a platform admin acting on the wrong zone
 * would be a data-integrity bug that no later check could detect.
 */
export const ResolveZoneId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    const fromBody =
      typeof request.body?.zoneId === 'string' && request.body.zoneId.trim() !== ''
        ? (request.body.zoneId as string)
        : undefined;
    const fromQuery =
      typeof request.query?.zoneId === 'string' && request.query.zoneId.trim() !== ''
        ? (request.query.zoneId as string)
        : undefined;
    const fromSession =
      typeof request.zoneId === 'string' && request.zoneId.trim() !== ''
        ? (request.zoneId as string)
        : typeof user?.zoneId === 'string' && user.zoneId.trim() !== ''
          ? user.zoneId
          : undefined;

    const resolved = fromBody ?? fromQuery ?? fromSession;
    if (resolved) return resolved;

    if (user?.role === UserRole.SUPER_ADMIN) {
      // Persian, HTTP 400: the client must ask the operator to pick a zone.
      throw new AppException('ZONE_REQUIRED');
    }

    throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
  },
);
