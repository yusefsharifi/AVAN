import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { SmsService } from '../notifications/services/sms.service';
import { EmailService } from '../notifications/services/email.service';
import { AppException } from '../../common/exceptions/app.exception';
import { UserRole, UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

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

    // Mock bcrypt — default to true (passwords match), individual tests override
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async (_plain: string, _hash: string) => true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$12$mocked');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-token'), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => key) } },
        { provide: BullService, useValue: { addJob: jest.fn(), registerWorker: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToZone: jest.fn(), emitToSuperAdmin: jest.fn() } },
        { provide: SmsService, useValue: { send: jest.fn().mockResolvedValue(undefined) } },
        { provide: EmailService, useValue: { send: jest.fn().mockResolvedValue(undefined), renderEmailTemplate: jest.fn().mockResolvedValue({ subject: '', html: '', text: '' }) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create user with PENDING status', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1', status: 'PENDING' });
      prisma.otpCode.updateMany.mockResolvedValue({});
      prisma.otpCode.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@test.com',
        phone: '09121234567',
        password: 'Test1234',
        firstName: 'Ali',
        lastName: 'Rezaei',
      });

      expect(result.message).toContain('ثبت نام');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@test.com',
          phone: '09121234567',
          password: 'Test1234',
          firstName: 'Ali',
          lastName: 'Rezaei',
        }),
      ).rejects.toThrow(AppException);
    });

    it('should reject duplicate phone', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing' }); // phone check

      await expect(
        service.register({
          email: 'new@test.com',
          phone: '09121234567',
          password: 'Test1234',
          firstName: 'Ali',
          lastName: 'Rezaei',
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        phone: '09121234567',
        firstName: 'Ali',
        lastName: 'Rezaei',
        role: UserRole.COMPANY_STAFF,
        status: 'ACTIVE',
        zoneId: null,
        companyId: null,
        avatarKey: null,
        createdAt: new Date(),
        passwordHash: '$2b$12$LJ3m4yVz13gKpT4e1O.xWeJ0U4M7x9B9QZ8Bz7kT3e5y6y7z8x9', // bcrypt of 'Test1234'
        failedLoginCount: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.userSession.create.mockResolvedValue({ id: 'session-1' });
      prisma.otpCode.updateMany.mockResolvedValue({});

      const result = await service.login(
        { identifier: 'test@test.com', password: 'Test1234' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.requiresOtp).toBe(false);
    });

    it('should throw on wrong password', async () => {
      const bcrypt = require('bcrypt');
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const mockUser = {
        id: 'user-1',
        passwordHash: '$2b$12$wronghash',
        status: 'ACTIVE',
        zoneId: null,
        failedLoginCount: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      await expect(
        service.login({ identifier: 'test@test.com', password: 'WrongPass1' }, '127.0.0.1', 'test'),
      ).rejects.toThrow(AppException);
    });

    it('should lock account after 5 failed attempts', async () => {
      const bcrypt = require('bcrypt');
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2b$12$wronghash',
        status: 'ACTIVE',
        zoneId: 'zone-1',
        failedLoginCount: 4,
        lockedUntil: null,
        twoFactorEnabled: false,
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, failedLoginCount: 5 });

      await expect(
        service.login({ identifier: 'test@test.com', password: 'Wrong' }, '127.0.0.1', 'test'),
      ).rejects.toThrow(AppException);
    });

    it('should throw SUSPENDED error for suspended user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        status: 'SUSPENDED',
      });

      await expect(
        service.login({ identifier: 'test@test.com', password: 'Test1234' }, '127.0.0.1', 'test'),
      ).rejects.toThrow(AppException);
    });

    it('should throw BANNED error for banned user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        status: 'BANNED',
      });

      await expect(
        service.login({ identifier: 'test@test.com', password: 'Test1234' }, '127.0.0.1', 'test'),
      ).rejects.toThrow(AppException);
    });

    it('should require OTP when 2FA is enabled', async () => {
      const mockUser = {
        id: 'user-1',
        passwordHash: '$2b$12$LJ3m4yVz13gKpT4e1O.xWeJ0U4M7x9B9QZ8Bz7kT3e5y6y7z8x9',
        status: 'ACTIVE',
        zoneId: null,
        failedLoginCount: 0,
        lockedUntil: null,
        twoFactorEnabled: true,
        phone: '09121234567',
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.otpCode.updateMany.mockResolvedValue({});
      prisma.otpCode.create.mockResolvedValue({});

      const result = await service.login(
        { identifier: 'test@test.com', password: 'Test1234' },
        '127.0.0.1',
        'test',
      );

      expect(result.requiresOtp).toBe(true);
      expect(result.accessToken).toBe('');
    });
  });

  describe('refreshToken', () => {
    it('should return new token pair', async () => {
      const jwtService = { sign: jest.fn().mockReturnValue('new-token'), verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'refresh' }) };
      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        userId: 'user-1',
        user: { id: 'user-1', role: 'COMPANY_STAFF', zoneId: null, companyId: null },
      });
      prisma.userSession.update.mockResolvedValue({});
      prisma.userSession.create.mockResolvedValue({});

      // Override JWT in the service instance
      (service as any).jwt = jwtService;

      const result = await service.refreshToken({ refreshToken: 'valid-token' });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw on revoked session', async () => {
      const jwtService = { sign: jest.fn(), verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'refresh' }) };
      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });

      (service as any).jwt = jwtService;

      await expect(
        service.refreshToken({ refreshToken: 'revoked-token' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('sendOtp', () => {
    it('should rate limit to 3 OTPs per 10 minutes', async () => {
      redis.incrWithExpiry.mockResolvedValue(4);

      await expect(
        service.sendOtp({ phone: '09121234567', purpose: 'LOGIN' }),
      ).rejects.toThrow(AppException);
    });

    it('should create OTP and send SMS', async () => {
      redis.incrWithExpiry.mockResolvedValue(1);
      prisma.otpCode.updateMany.mockResolvedValue({});
      prisma.otpCode.create.mockResolvedValue({});

      await service.sendOtp({ phone: '09121234567', purpose: 'LOGIN' });

      expect(prisma.otpCode.create).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should return true on valid code', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '$2b$10$hashedcode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0,
      });
      prisma.otpCode.update.mockResolvedValue({});

      // Mock bcrypt compare
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.verifyOtp({
        phone: '09121234567',
        code: '123456',
        purpose: 'LOGIN',
      });

      expect(result).toBe(true);
    });

    it('should return false on expired code', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '$2b$10$hashedcode',
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
      });

      const result = await service.verifyOtp({
        phone: '09121234567',
        code: '123456',
        purpose: 'LOGIN',
      });

      expect(result).toBe(false);
    });

    it('should lock after 5 wrong attempts', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        code: '$2b$10$hashedcode',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 5,
      });
      prisma.otpCode.update.mockResolvedValue({});

      await expect(
        service.verifyOtp({ phone: '09121234567', code: '000000', purpose: 'LOGIN' }),
      ).rejects.toThrow(AppException);
    });
  });
});
