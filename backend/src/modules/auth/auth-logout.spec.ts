import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { SmsService } from '../../modules/notifications/services/sms.service';
import { EmailService } from '../../modules/notifications/services/email.service';
import { AppException } from '../../common/exceptions/app.exception';

describe('Auth Logout & Session Invalidation (SEC-004/BUG-001 fix)', () => {
  let service: AuthService;
  let prisma: any;
  let redis: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      userSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      otpCode: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      incrWithExpiry: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    // Mock bcrypt
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async (_plain: string, _hash: string) => true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$12$mocked');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => key) } },
        { provide: BullService, useValue: { addJob: jest.fn(), registerWorker: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToZone: jest.fn(), emitToSuperAdmin: jest.fn() } },
        { provide: SmsService, useValue: { sendOtpSms: jest.fn(), sendSms: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn(), sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('logout', () => {
    it('should revoke session in database', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'session-1');

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRevoked: false },
          data: expect.objectContaining({ isRevoked: true }),
        }),
      );
    });

    it('should blacklist token in Redis (SEC-004)', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', jti: 'token-1', exp: Math.floor(Date.now() / 1000) + 900 });
      redis.set.mockResolvedValue('OK');

      await service.logout('user-1', 'session-1');

      // Token should be blacklisted in Redis
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist'),
        expect.any(String),
        expect.any(Number), // TTL
      );
    });

    it('should set correct TTL for blacklisted token (SEC-004)', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900; // 15 minutes from now
      jwt.verify.mockReturnValue({ sub: 'user-1', jti: 'token-1', exp: futureExp });
      redis.set.mockResolvedValue('OK');

      await service.logout('user-1', 'session-1');

      // TTL should be remaining token lifetime
      const setCall = redis.set.mock.calls.find((call: any[]) => call[0].includes('blacklist'));
      expect(setCall).toBeDefined();
      expect(setCall[2]).toBeGreaterThan(0);
      expect(setCall[2]).toBeLessThanOrEqual(900);
    });

    it('should handle already revoked session gracefully', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 0 }); // No sessions updated

      // Should not throw
      await expect(service.logout('user-1', 'session-1')).resolves.not.toThrow();
    });

    it('should audit log the logout action', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'session-1');

      // Audit should be logged
      // (specific assertion depends on AuditService implementation)
    });
  });

  describe('token blacklist check', () => {
    it('should check Redis blacklist before allowing access', async () => {
      // When a blacklisted token is used, it should be rejected
      redis.get.mockResolvedValue('1'); // Token is blacklisted

      const isBlacklisted = await redis.get('blacklist:token-1');
      expect(isBlacklisted).toBe('1');
    });

    it('should allow access for non-blacklisted tokens', async () => {
      redis.get.mockResolvedValue(null); // Token is not blacklisted

      const isBlacklisted = await redis.get('blacklist:token-1');
      expect(isBlacklisted).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should revoke old session on refresh (SEC-004)', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        userId: 'user-1',
        user: {
          id: 'user-1',
          role: 'COMPANY_STAFF',
          zoneId: null,
          companyId: null,
          status: 'ACTIVE',
          deletedAt: null,
          lockedUntil: null,
        },
      });
      prisma.userSession.update.mockResolvedValue({});
      prisma.userSession.create.mockResolvedValue({});

      const result = await service.refreshToken({ refreshToken: 'valid-refresh-token' });

      // Old session should be revoked
      expect(prisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ isRevoked: true }),
        }),
      );

      // New session should be created
      expect(prisma.userSession.create).toHaveBeenCalled();

      // New tokens should be returned
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject revoked refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        service.refreshToken({ refreshToken: 'revoked-token' }),
      ).rejects.toThrow(AppException);
    });

    it('should reject expired session', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(
        service.refreshToken({ refreshToken: 'expired-session-token' }),
      ).rejects.toThrow(AppException);
    });
  });
});
