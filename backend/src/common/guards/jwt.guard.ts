import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_KEYS, REDIS_TTL } from '../utils/redis-keys';
import { ERROR_CODES } from '../constants/error-codes';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  role: string;
  zoneId?: string;
  companyId?: string;
  type: 'access' | 'refresh';
  jti: string;
  iat: number;
  exp: number;
  impersonatedBy?: string;
}

/**
 * Current auth state of a user as read from the database (or the short-lived
 * Redis cache). Used by JwtGuard so that authorization is ALWAYS based on the
 * server-side state — never on claims carried inside the token itself.
 */
interface UserAuthState {
  status: string;
  role: string;
  zoneId: string | null;
  companyId: string | null;
  deletedAt: string | null;
}

/**
 * SECURITY FIX (SEC-020): JwtGuard now validates the user's CURRENT state in
 * the database on every request (with a 45-second Redis cache to bound the
 * DB load). The value attached to request.user is ALWAYS derived from the
 * fresh DB record — never straight from the token payload.
 *
 * Consequences:
 *  - a banned/suspended/deleted user is rejected immediately (or within the
 *    45s cache window, and cache is invalidated by the existing
 *    `user:profile:${id}*` delPattern calls on update/suspend/softDelete);
 *  - a token signed BEFORE a role/zoneId/companyId change carries stale
 *    claims → its jti is blacklisted and the request is rejected, so any
 *    role/assignment change kills previously issued tokens immediately.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        ERROR_CODES.AUTH_TOKEN_INVALID,
      );
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_INVALID);
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.exists(
        REDIS_KEYS.authBlacklist(payload.jti),
      );
      if (isBlacklisted) {
        throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_INVALID);
      }

      // SECURITY FIX (SEC-020): resolve the user's CURRENT state from the
      // database (cached ~45s), compare with the token claims, and always
      // attach the fresh DB-derived identity to request.user.
      const dbUser = await this.resolveAuthState(payload.sub);

      // 1) Unknown or soft-deleted user → 401
      if (!dbUser || dbUser.deletedAt) {
        throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_INVALID);
      }

      // 2) Inactive account (SUSPENDED / BANNED / PENDING / …) → 401.
      //    The token itself is still valid — the account is not.
      if (dbUser.status !== 'ACTIVE') {
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_NOT_ACTIVE',
        });
      }

      // 3) Stale token: claims (role / zoneId / companyId) no longer match the
      //    current DB state → blacklist the jti (kills the token outright)
      //    and reject.
      const stale =
        payload.role !== dbUser.role ||
        (payload.zoneId ?? null) !== (dbUser.zoneId ?? null) ||
        (payload.companyId ?? null) !== (dbUser.companyId ?? null);

      if (stale) {
        await this.redis.set(
          REDIS_KEYS.authBlacklist(payload.jti),
          'stale-token',
          REDIS_TTL.BLACKLIST_TOKEN,
        );
        throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_INVALID);
      }

      // 4) Rewrite the payload from the up-to-date DB values. Note: keep the
      //    original iat/exp/jti and impersonation marker.
      const freshUser = {
        ...payload,
        role: dbUser.role,
        zoneId: dbUser.zoneId ?? undefined,
        companyId: dbUser.companyId ?? undefined,
      };
      (request as any).user = freshUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }
  }

  /**
   * Read the user's authoritative auth state: Redis cache first (45s),
   * Prisma fallback. Cache lives under `user:profile:${id}:auth` so the
   * existing `user:profile:${id}*` invalidation pattern (invoked on
   * update / suspend / softDelete on the user service) clears it.
   */
  private async resolveAuthState(userId: string): Promise<UserAuthState | null> {
    const cacheKey = REDIS_KEYS.userAuthState(userId);

    // Cache failures must never block authentication — fall through to Prisma.
    let cached: UserAuthState | null | undefined = null;
    try {
      cached = await this.redis.getJson<UserAuthState | null>(cacheKey);
    } catch {
      cached = null;
    }
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        role: true,
        zoneId: true,
        companyId: true,
        deletedAt: true,
      },
    });

    if (user) {
      const state: UserAuthState = {
        status: user.status,
        role: user.role,
        zoneId: user.zoneId ?? null,
        companyId: user.companyId ?? null,
        deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
      };
      try {
        await this.redis.setJson(cacheKey, state, REDIS_TTL.USER_AUTH_STATE);
      } catch {
        // cache write failure is non-fatal
      }
      return state;
    }

    // Unknown user — do not cache negative results (user may be created later).
    return null;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

export const JwtAuthGuard = JwtGuard;
