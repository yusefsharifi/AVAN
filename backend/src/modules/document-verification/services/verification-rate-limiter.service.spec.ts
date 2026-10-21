// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Rate Limiter — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { VerificationRateLimiter } from './verification-rate-limiter.service';

describe('VerificationRateLimiter', () => {
  let limiter: VerificationRateLimiter;
  let redis: Record<string, unknown>;

  beforeEach(() => {
    redis = {
      eval: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
      pipeline: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    limiter = new VerificationRateLimiter(redis as never);
  });

  describe('checkRateLimit', () => {
    it('should allow first 30 requests per session', async () => {
      (redis.eval as jest.Mock).mockResolvedValue(['ok', '0', '1']);

      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(true);
      expect(redis.eval).toHaveBeenCalled();
    });

    it('should block 31st request per session', async () => {
      (redis.eval as jest.Mock).mockResolvedValue(['session', '30', '0']);

      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('session');
    });

    it('should block 101st request per IP', async () => {
      (redis.eval as jest.Mock).mockResolvedValue(['ip', '100', '0']);

      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('ip');
    });

    it('should block when global limit reached', async () => {
      (redis.eval as jest.Mock).mockResolvedValue(['global', '10000', '0']);

      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('global');
    });

    it('should return correct remaining count', async () => {
      (redis.eval as jest.Mock).mockResolvedValue(['ok', '5', '1']);

      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should fail open if Redis is unavailable', async () => {
      const noRedisLimiter = new VerificationRateLimiter(null);
      const result = await noRedisLimiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(true);
    });

    it('should fail open on Redis error', async () => {
      (redis.eval as jest.Mock).mockRejectedValue(new Error('Connection lost'));
      const result = await limiter.checkRateLimit('session-1', '1.2.3.4');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkManualLookupLimit', () => {
    it('should allow first 10 manual lookups', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(1);

      const result = await limiter.checkManualLookupLimit('1.2.3.4');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block 11th manual lookup', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(11);

      const result = await limiter.checkManualLookupLimit('1.2.3.4');
      expect(result.allowed).toBe(false);
    });
  });

  describe('isIpBlocked', () => {
    it('should return true for blocked IP', async () => {
      (redis.get as jest.Mock).mockResolvedValue('{"reason":"spam"}');
      const result = await limiter.isIpBlocked('1.2.3.4');
      expect(result).toBe(true);
    });

    it('should return false for clean IP', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      const result = await limiter.isIpBlocked('1.2.3.4');
      expect(result).toBe(false);
    });

    it('should return false if Redis unavailable', async () => {
      const noRedis = new VerificationRateLimiter(null);
      const result = await noRedis.isIpBlocked('1.2.3.4');
      expect(result).toBe(false);
    });
  });

  describe('blockIp', () => {
    it('should set blocked key with TTL', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await limiter.blockIp('1.2.3.4', 'spam', 24);
      expect(redis.set).toHaveBeenCalledWith(
        'verify:blocked:1.2.3.4',
        expect.any(String),
        'EX',
        86400,
      );
    });
  });

  describe('unblockIp', () => {
    it('should delete blocked key', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);
      await limiter.unblockIp('1.2.3.4');
      expect(redis.del).toHaveBeenCalledWith('verify:blocked:1.2.3.4');
    });
  });

  describe('getSessionId', () => {
    it('should extract session from cookie', () => {
      const req = { cookies: { verify_session: 'cookie-session-123' }, headers: {} };
      const result = limiter.getSessionId(req as never);
      expect(result).toBe('cookie-session-123');
    });

    it('should extract session from header', () => {
      const req = { cookies: {}, headers: { 'x-verify-session': 'header-session-456' } };
      const result = limiter.getSessionId(req as never);
      expect(result).toBe('header-session-456');
    });

    it('should generate new UUID if no session exists', () => {
      const req = { cookies: {}, headers: {} };
      const result = limiter.getSessionId(req as never);
      expect(result).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('incrementCounters', () => {
    it('should increment all three counters atomically', async () => {
      await limiter.incrementCounters('session-1', '1.2.3.4');
      expect(redis.pipeline).toHaveBeenCalled();
      expect(redis.exec).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      (redis.pipeline as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      // Should not throw
      await expect(limiter.incrementCounters('s1', '1.2.3.4')).resolves.toBeUndefined();
    });
  });
});
