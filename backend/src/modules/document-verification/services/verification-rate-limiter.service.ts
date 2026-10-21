// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Rate Limiter Service
// Multi-level rate limiting: session, IP, and global
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { RateLimitResult } from '../dto/enums';

// Lua script for atomic rate limiting
const RATE_LIMIT_SCRIPT = `
  local session_key = KEYS[1]
  local ip_key = KEYS[2]
  local global_key = KEYS[3]
  local session_limit = tonumber(ARGV[1])
  local ip_limit = tonumber(ARGV[2])
  local global_limit = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])

  local session_count = tonumber(redis.call('GET', session_key) or '0')
  local ip_count = tonumber(redis.call('GET', ip_key) or '0')
  local global_count = tonumber(redis.call('GET', global_key) or '0')

  if session_count >= session_limit then
    return {'session', tostring(session_count), '0'}
  end
  if ip_count >= ip_limit then
    return {'ip', tostring(ip_count), '0'}
  end
  if global_count >= global_limit then
    return {'global', tostring(global_count), '0'}
  end

  local new_session = redis.call('INCR', session_key)
  if new_session == 1 then redis.call('EXPIRE', session_key, ttl) end
  local new_ip = redis.call('INCR', ip_key)
  if new_ip == 1 then redis.call('EXPIRE', ip_key, ttl) end
  local new_global = redis.call('INCR', global_key)
  if new_global == 1 then redis.call('EXPIRE', global_key, ttl) end

  return {'ok', '0', '1'}
`;

@Injectable()
export class VerificationRateLimiter {
  private readonly logger = new Logger(VerificationRateLimiter.name);

  // Rate limits
  private readonly SESSION_LIMIT = 30;     // per hour
  private readonly IP_LIMIT = 100;         // per hour
  private readonly GLOBAL_LIMIT = 10000;   // per hour
  private readonly TTL = 3600;             // 1 hour in seconds
  private readonly MANUAL_LOOKUP_LIMIT = 10; // per IP for manual lookups

  constructor(
    @Optional() private readonly redis: Redis | null,
  ) {}

  /**
   * Check rate limits atomically using Lua script.
   * Falls through to allow if Redis is unavailable.
   */
  async checkRateLimit(
    sessionId: string,
    ipAddress: string,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600000), limitType: 'session' };
    }

    const sessionKey = `verify:rate:session:${sessionId}`;
    const ipKey = `verify:rate:ip:${ipAddress}`;
    const globalKey = 'verify:rate:global';

    try {
      const result = await this.redis.eval(
        RATE_LIMIT_SCRIPT,
        3,
        sessionKey,
        ipKey,
        globalKey,
        this.SESSION_LIMIT,
        this.IP_LIMIT,
        this.GLOBAL_LIMIT,
        this.TTL,
      ) as [string, string, string];

      const [limitType, count, allowed] = result;

      if (limitType !== 'ok') {
        this.logger.warn(`Rate limit exceeded: ${limitType} (count=${count}) from IP ${ipAddress}`);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + this.TTL * 1000),
          limitType: limitType as RateLimitResult['limitType'],
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, this.SESSION_LIMIT - parseInt(count || '0', 10)),
        resetAt: new Date(Date.now() + this.TTL * 1000),
        limitType: 'session',
      };
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      // Fail open — allow request if Redis is down
      return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600000), limitType: 'session' };
    }
  }

  /**
   * Check stricter rate limit for manual number lookups (10/hour per IP)
   */
  async checkManualLookupLimit(ipAddress: string): Promise<RateLimitResult> {
    if (!this.redis) {
      return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600000), limitType: 'ip' };
    }

    const key = `verify:rate:manual:${ipAddress}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, this.TTL);
      }
      if (count > this.MANUAL_LOOKUP_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + this.TTL * 1000),
          limitType: 'ip',
        };
      }
      return {
        allowed: true,
        remaining: this.MANUAL_LOOKUP_LIMIT - count,
        resetAt: new Date(Date.now() + this.TTL * 1000),
        limitType: 'ip',
      };
    } catch {
      return { allowed: true, remaining: 999, resetAt: new Date(Date.now() + 3600000), limitType: 'ip' };
    }
  }

  /**
   * Check if an IP is manually blocked by SUPER_ADMIN
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const result = await this.redis.get(`verify:blocked:${ipAddress}`);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Block an IP address
   */
  async blockIp(
    ipAddress: string,
    reason: string,
    durationHours: number,
  ): Promise<void> {
    if (!this.redis) return;
    const ttlSeconds = durationHours * 3600;
    await this.redis.set(
      `verify:blocked:${ipAddress}`,
      JSON.stringify({ reason, blockedAt: new Date().toISOString() }),
      'EX',
      ttlSeconds,
    );
    this.logger.warn(`IP blocked: ${ipAddress} for ${durationHours}h. Reason: ${reason}`);
  }

  /**
   * Unblock an IP address
   */
  async unblockIp(ipAddress: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(`verify:blocked:${ipAddress}`);
    this.logger.log(`IP unblocked: ${ipAddress}`);
  }

  /**
   * Extract or create session ID from request
   */
  getSessionId(req: { cookies?: Record<string, string>; headers?: Record<string, string | string[]> }): string {
    // 1. Check cookie
    if (req.cookies?.verify_session) {
      return req.cookies.verify_session;
    }
    // 2. Check header
    const headerVal = req.headers?.['x-verify-session'];
    if (headerVal) {
      return Array.isArray(headerVal) ? headerVal[0] : headerVal;
    }
    // 3. Generate new
    return crypto.randomUUID();
  }

  /**
   * Increment counters for a verification attempt
   */
  async incrementCounters(sessionId: string, ipAddress: string): Promise<void> {
    if (!this.redis) return;
    try {
      const sessionKey = `verify:rate:session:${sessionId}`;
      const ipKey = `verify:rate:ip:${ipAddress}`;
      const globalKey = 'verify:rate:global';

      const pipe = this.redis.pipeline();
      pipe.incr(sessionKey);
      pipe.expire(sessionKey, this.TTL);
      pipe.incr(ipKey);
      pipe.expire(ipKey, this.TTL);
      pipe.incr(globalKey);
      pipe.expire(globalKey, this.TTL);
      await pipe.exec();
    } catch {
      // Ignore counter errors
    }
  }
}
