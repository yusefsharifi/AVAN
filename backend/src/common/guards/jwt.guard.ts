import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS } from '../utils/redis-keys';
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
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
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

      // Attach user to request
      (request as any).user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(ERROR_CODES.AUTH_TOKEN_EXPIRED);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

export const JwtAuthGuard = JwtGuard;

