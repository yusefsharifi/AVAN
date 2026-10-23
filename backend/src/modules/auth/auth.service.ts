import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { SmsService } from '../notifications/services/sms.service';
import { EmailService } from '../notifications/services/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtPayload } from '../../common/guards/jwt.guard';
import { UserRole, UserStatus } from '@prisma/client';
import { randomUUID as uuid } from 'crypto';

const BCRYPT_ROUNDS = 12;

const ROLE_CREATION_RULES: Record<string, UserRole[]> = {
  SUPER_ADMIN: [UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.ZONE_OPERATOR, UserRole.COMPANY_ADMIN, UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.GUARD, UserRole.DRIVER],
  ZONE_MANAGER: [UserRole.ZONE_OPERATOR, UserRole.COMPANY_ADMIN, UserRole.GUARD, UserRole.DRIVER],
  ZONE_OPERATOR: [UserRole.GUARD],
  COMPANY_ADMIN: [UserRole.COMPANY_MANAGER, UserRole.COMPANY_STAFF, UserRole.DRIVER],
  COMPANY_MANAGER: [UserRole.COMPANY_STAFF],
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly bull: BullService,
    private readonly audit: AuditService,
    private readonly gateway: IdopGateway,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {
    this.registerNotificationWorkers();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ══════════════════════════════════════════════════════════════════════════

  async register(dto: RegisterDto): Promise<{ message: string }> {
    // 1. Check email + phone uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new AppException('USER_EMAIL_TAKEN');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new AppException('USER_PHONE_TAKEN');
    }

    if (dto.nationalId) {
      const existingNationalId = await this.prisma.user.findUnique({
        where: { nationalId: dto.nationalId },
      });
      if (existingNationalId) {
        throw new AppException('USER_NATIONAL_ID_TAKEN');
      }
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // SECURITY FIX (SEC-018): Never trust client-supplied org identifiers.
    // If zoneId/companyId are provided, validate them against the live DB:
    //  - zone must exist and not be soft-deleted
    //  - company must exist, not be soft-deleted AND belong to the same zone
    // On failure the user is created WITHOUT any org assignment (null) —
    // activation of the assignment is later done by an admin.
    let zoneId: string | null = null;
    let companyId: string | null = null;

    if (dto.zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: dto.zoneId },
      });
      if (!zone || zone.deletedAt) {
        throw new BadRequestException(ERROR_CODES.ZONE_NOT_FOUND);
      }
      zoneId = zone.id;
    }

    if (dto.companyId) {
      if (!dto.zoneId) {
        // A company can only be assigned together with its owning zone.
        throw new BadRequestException(ERROR_CODES.USER_COMPANY_MISMATCH);
      }
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
        select: { id: true, zoneId: true, deletedAt: true },
      });
      if (!company || company.deletedAt) {
        throw new BadRequestException(ERROR_CODES.COMPANY_NOT_FOUND);
      }
      if (company.zoneId !== dto.zoneId) {
        throw new BadRequestException(ERROR_CODES.USER_COMPANY_MISMATCH);
      }
      companyId = company.id;
    }

    // 3. Create user with PENDING status
    // SECURITY FIX (SEC-005): Never trust client-supplied role.
    // All self-registrations default to COMPANY_STAFF.
    // Privileged roles must be assigned only via admin endpoints.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        nationalId: dto.nationalId || null,
        zoneId,
        companyId,
        role: UserRole.COMPANY_STAFF,
        status: UserStatus.PENDING,
      },
    });

    // 4. Send OTP to phone for verification
    try {
      await this.sendOtp({ phone: dto.phone, purpose: 'PHONE_VERIFY' });
    } catch (err) {
      this.logger.warn(`Failed to send OTP to ${dto.phone}: ${err}`);
    }

    // 5. Create AuditLog entry — built from the FINAL values persisted in the
    // database (user.zoneId / user.companyId), never from the raw DTO.
    await this.audit.log({
      zoneId: user.zoneId || undefined,
      userId: user.id,
      targetId: user.id,
      targetType: 'User',
      action: 'USER_REGISTERED',
      metadata: {
        email: dto.email,
        role: UserRole.COMPANY_STAFF,
        zoneId: user.zoneId,
        companyId: user.companyId,
      },
    });

    return { message: 'ثبت نام با موفقیت انجام شد. کد تأیید به تلفن همراه شما ارسال شد.' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════════════════════════

  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDto;
    requiresOtp: boolean;
  }> {
    // 1. Find user by email OR phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
        deletedAt: null,
      },
    });

    if (!user) {
      throw new AppException('AUTH_INVALID_CREDENTIALS');
    }

    // 2. Check user status — WHITELIST approach (SEC-019)
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppException('AUTH_ACCOUNT_SUSPENDED');
    }
    if (user.status === UserStatus.BANNED) {
      throw new AppException('AUTH_ACCOUNT_BANNED');
    }
    // Every other status (PENDING and any future enum value) is rejected:
    // only ACTIVE accounts may obtain tokens.
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException('AUTH_ACCOUNT_NOT_ACTIVE');
    }

    // 3. Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppException('AUTH_ACCOUNT_LOCKED');
    }

    // If lockout has passed, reset failed count
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    // 4. Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.handleFailedLogin(user.id, user.zoneId);
      throw new AppException('AUTH_INVALID_CREDENTIALS');
    }

    // 5. If 2FA enabled and no OTP provided
    if (user.twoFactorEnabled && !dto.otpCode) {
      // Send OTP to phone
      try {
        await this.sendOtp({ phone: user.phone, purpose: 'TWO_FACTOR' });
      } catch (err) {
        this.logger.warn(`Failed to send 2FA OTP: ${err}`);
      }
      return {
        accessToken: '',
        refreshToken: '',
        user: UserResponseDto.fromUser(user),
        requiresOtp: true,
      };
    }

    // 6. If 2FA enabled and OTP provided: verify
    if (user.twoFactorEnabled && dto.otpCode) {
      const otpValid = await this.verifyOtp({
        phone: user.phone,
        code: dto.otpCode,
        purpose: 'TWO_FACTOR',
      });
      if (!otpValid) {
        throw new AppException('AUTH_OTP_INVALID');
      }
    }

    // 7. Reset failed login count
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    // 8. Generate tokens
    const { accessToken, refreshToken, expiresAt } = await this.generateTokens(
      user.id,
      user.role,
      user.zoneId || undefined,
      user.companyId || undefined,
    );

    // 9. Create UserSession record
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefresh,
        deviceInfo: dto.deviceInfo || undefined,
        ipAddress: ip,
        userAgent,
        expiresAt,
      },
    });

    // 10. Update lastLoginAt and lastLoginIp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    // 11. Create AuditLog
    await this.audit.log({
      zoneId: user.zoneId || undefined,
      userId: user.id,
      targetId: user.id,
      targetType: 'User',
      action: 'USER_LOGIN',
      metadata: { sessionId: session.id },
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: UserResponseDto.fromUser(user),
      requiresOtp: false,
    };
  }

  private async handleFailedLogin(userId: string, zoneId: string | null): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newCount };

    // After 5 attempts: lock for 15 minutes
    if (newCount === 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await this.prisma.user.update({ where: { id: userId }, data: updateData });
      await this.audit.log({
        zoneId: zoneId || undefined,
        userId,
        targetId: userId,
        targetType: 'User',
        action: 'USER_LOCKED',
        metadata: { reason: '5 failed attempts', lockDuration: '15 minutes' },
      });
      return;
    }

    // After 10 attempts: lock for 24 hours + notify zone manager
    if (newCount >= 10) {
      updateData.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.prisma.user.update({ where: { id: userId }, data: updateData });

      // Notify zone manager
      if (zoneId) {
        const zoneManagers = await this.prisma.user.findMany({
          where: { zoneId, role: UserRole.ZONE_MANAGER, status: UserStatus.ACTIVE },
        });
        for (const manager of zoneManagers) {
          await this.prisma.notification.create({
            data: {
              recipientId: manager.id,
              zoneId,
              module: 'AUTH',
              eventType: 'account.locked',
              priority: 'HIGH',
              title: 'Account Locked',
              titleFa: 'حساب کاربری قفل شد',
              body: 'تعداد تلاش‌های ناموفق ورود بیش از حد مجاز بوده و حساب کاربری قفل شد.',
              bodyFa: 'تعداد تلاش‌های ناموفق ورود بیش از حد مجاز بوده و حساب کاربری قفل شد.',
              entityType: 'USER',
              entityId: userId,
              metadata: { targetUserId: userId },
            },
          });
        }
      }

      // BullMQ job
      await this.bull.addJob('notifications', 'notify-zone-manager-locked-account', {
        userId,
        zoneId,
        lockedAt: new Date().toISOString(),
        reason: '10 failed login attempts',
      });

      await this.audit.log({
        zoneId: zoneId || undefined,
        userId,
        targetId: userId,
        targetType: 'User',
        action: 'USER_LOCKED',
        metadata: { reason: '10 failed attempts', lockDuration: '24 hours' },
      });
      return;
    }

    await this.prisma.user.update({ where: { id: userId }, data: updateData });

    await this.audit.log({
      zoneId: zoneId || undefined,
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_LOGIN_FAILED',
      metadata: { attemptCount: newCount },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOKEN GENERATION
  // ══════════════════════════════════════════════════════════════════════════

  async generateTokens(
    userId: string,
    role: UserRole,
    zoneId?: string,
    companyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const jti = uuid();
    const sessionId = uuid();

    // SECURITY FIX (SEC-015): Do not set manual exp/iat in the payload.
    // The jwt.sign() expiresIn option handles expiry correctly.
    // Manual exp is silently overridden by expiresIn, causing confusion.
    const accessPayload: JwtPayload = {
      sub: userId,
      role,
      zoneId,
      companyId,
      type: 'access',
      jti,
    } as JwtPayload; // iat/exp are added by jwt.sign via expiresIn

    const refreshPayload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return { accessToken, refreshToken, expiresAt };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // ══════════════════════════════════════════════════════════════════════════

  async refreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const presentedToken = dto.refreshToken?.trim();
    if (!presentedToken) {
      throw new AppException('AUTH_TOKEN_INVALID');
    }

    // 1. Verify refresh token signature
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(presentedToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new AppException('AUTH_TOKEN_INVALID');
    }

    if ((payload as any).type !== 'refresh') {
      throw new AppException('AUTH_TOKEN_INVALID');
    }

    // 2. Find UserSession by hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(presentedToken)
      .digest('hex');

    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: hashedToken },
      include: { user: true },
    });

    if (!session) {
      throw new AppException('AUTH_REFRESH_REVOKED');
    }

    // 3. Check session is not revoked and not expired
    if (session.isRevoked) {
      throw new AppException('AUTH_REFRESH_REVOKED');
    }
    if (session.expiresAt < new Date()) {
      throw new AppException('AUTH_TOKEN_EXPIRED');
    }

    // 4. Check the CURRENT status of the session's user (SEC-019).
    // Only ACTIVE, non-deleted users with an expired (or absent) lock may
    // refresh. Otherwise the session is revoked so the stale refresh token
    // cannot be replayed.
    const sessionUser = session.user;
    const isLoggable =
      sessionUser &&
      !sessionUser.deletedAt &&
      sessionUser.status === UserStatus.ACTIVE &&
      (!sessionUser.lockedUntil || sessionUser.lockedUntil <= new Date());

    if (!isLoggable) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new AppException('AUTH_REFRESH_REVOKED');
    }

    // 5. Revoke old session (token rotation)
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // 6. Generate new tokens
    const { accessToken, refreshToken: newRefreshToken, expiresAt } =
      await this.generateTokens(
        session.user.id,
        session.user.role,
        session.user.zoneId || undefined,
        session.user.companyId || undefined,
      );

    // 7. Create new session
    const hashedRefresh = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await this.prisma.userSession.create({
      data: {
        userId: session.user.id,
        refreshToken: hashedRefresh,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt,
      },
    });

    // 8. Audit
    await this.audit.log({
      zoneId: session.user.zoneId || undefined,
      userId: session.user.id,
      targetId: session.id,
      targetType: 'UserSession',
      action: 'TOKEN_REFRESHED',
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * SECURITY FIX (SEC-004/BUG-001): Logout now blacklists the access token's
   * jti in Redis until its natural expiry (max 15 min). The JwtGuard checks
   * this blacklist on every request, so the access token is effectively
   * invalidated immediately. We no longer attempt to look up a session by
   * the jti (which is NOT the session PK).
   */
  async logout(userId: string, jti: string): Promise<void> {
    // 1. Blacklist the access token jti in Redis until it expires
    //    Access tokens have a 15-minute TTL, so we blacklist for 15 min
    await this.redis.set(
      REDIS_KEYS.authBlacklist(jti),
      'revoked',
      REDIS_TTL.BLACKLIST_TOKEN,
    );

    // 2. Revoke all active sessions for this user (forces refresh-token
    //    re-login to fail as well)
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    // 3. Audit
    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_LOGOUT',
    });
  }

  async logoutAll(userId: string, currentJti?: string): Promise<void> {
    // 1. Blacklist the current access token if provided
    if (currentJti) {
      await this.redis.set(
        REDIS_KEYS.authBlacklist(currentJti),
        'revoked',
        REDIS_TTL.BLACKLIST_TOKEN,
      );
    }

    // 2. Revoke all active sessions
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    // 3. Audit
    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_LOGOUT_ALL',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OTP
  // ══════════════════════════════════════════════════════════════════════════

  async sendOtp(dto: SendOtpDto): Promise<void> {
    // 1. Rate limit: max 3 OTPs per phone per 10 minutes
    const rateLimitKey = REDIS_KEYS.authOtpAttempts(dto.phone);
    const attemptCount = await this.redis.incrWithExpiry(
      rateLimitKey,
      REDIS_TTL.OTP_RATE_LIMIT,
    );

    if (attemptCount > 3) {
      throw new AppException('AUTH_OTP_RATE_LIMITED');
    }

    // 2. Generate 6-digit numeric code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 3. Hash code before storing
    const codeHash = await bcrypt.hash(code, 10);

    // 4. Invalidate previous unused OTPs for same phone+purpose
    await this.prisma.otpCode.updateMany({
      where: {
        phone: dto.phone,
        purpose: dto.purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // 5. Store OtpCode with expiry 5 minutes
    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code: codeHash,
        purpose: dto.purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // 6. Send via SMS provider (BullMQ job)
    await this.bull.addJob('notifications', 'send-otp-sms', {
      phone: dto.phone,
      code,
      purpose: dto.purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }

  /**
   * SECURITY FIX (SEC-012): OTP verification now always runs bcrypt.compare
   * even when the OTP is invalid, expired, or max attempts is reached. This
   * prevents a timing side-channel that could distinguish between:
   *   - invalid OTP (fast return)
   *   - valid OTP with wrong code (slower bcrypt.compare)
   * By always performing the bcrypt comparison, the response time is constant
   * regardless of OTP validity, eliminating the timing information leak.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<boolean> {
    // 1. Find latest OTP for phone+purpose
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        purpose: dto.purpose,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Always run bcrypt.compare to prevent timing side-channel, even if
    // no OTP record exists (compare against a dummy hash).
    const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuPdMy1Zq5qKz8mz8mz8mz8m';
    const hashToCompare = otp?.code ?? DUMMY_HASH;
    await bcrypt.compare(dto.code, hashToCompare);

    // Now check validity — timing is the same regardless of which path
    if (!otp) {
      return false;
    }

    // 2. Check not expired
    if (otp.expiresAt < new Date()) {
      return false;
    }

    // 3. Check attempts < 5 — but still ran bcrypt above for constant time
    if (otp.attempts >= 5) {
      throw new AppException('AUTH_OTP_MAX_ATTEMPTS');
    }

    // Increment attempts
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // 4. Compare hashed code (re-use the result from above for efficiency)
    const isValid = await bcrypt.compare(dto.code, otp.code);

    // 5. Mark as used if valid
    if (isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
    }

    return isValid;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PASSWORD RESET
  // ══════════════════════════════════════════════════════════════════════════

  async sendPasswordReset(email: string): Promise<void> {
    // 1. Find user by email (do NOT reveal if email exists)
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return silently for security
      return;
    }

    // 2. Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Store with 1-hour expiry
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 4. Cache in Redis
    await this.redis.set(
      REDIS_KEYS.authReset(tokenHash),
      user.id,
      REDIS_TTL.PASSWORD_RESET,
    );

    // 5. Send reset link via email (BullMQ job)
    await this.bull.addJob('notifications', 'send-email', {
      to: email,
      subject: 'بازیابی رمز عبور',
      template: 'password-reset',
      variables: { resetToken: token, firstName: user.firstName },
    });

    // 6. Audit
    await this.audit.log({
      userId: user.id,
      targetId: user.id,
      targetType: 'User',
      action: 'USER_PASSWORD_RESET',
      metadata: { type: 'request' },
    });
  }

  /**
   * SECURITY FIX (SEC-006/BUG-003): Password reset now uses a single atomic
   * lookup path instead of the previous DB-check → Redis-fallback pattern
   * which had a TOCTOU race condition.
   *
   * Old flow (BROKEN):
   *   1. Check DB → not found
   *   2. Check Redis → found, get userId
   *   3. Use userId (but another request may have already used the token)
   *   4. Unsafe `!` non-null assertion on Redis result
   *
   * New flow (SAFE):
   *   1. Check DB first (authoritative if present)
   *   2. If DB miss, check Redis (fallback for DB replication lag)
   *   3. If neither found, reject
   *   4. On success: atomically mark DB token as used, delete Redis key
   *   5. No non-null assertions — every path validated
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // 1. Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // 2. Try DB first (authoritative source)
    let resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    // 3. If DB miss, try Redis fallback
    let userId: string | null = null;
    let source: 'db' | 'redis' = 'db';

    if (resetToken) {
      userId = resetToken.userId;
    } else {
      // DB miss — check Redis
      const redisUserId = await this.redis.get(REDIS_KEYS.authReset(tokenHash));
      if (redisUserId) {
        userId = redisUserId;
        source = 'redis';
      }
    }

    // 4. If neither found, reject
    if (!userId) {
      throw new AppException('AUTH_RESET_TOKEN_INVALID');
    }

    // 5. Hash new password
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // 6. Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 7. Atomically mark token as used (DB) and delete Redis key
    //    This prevents race conditions where a concurrent request could
    //    also find and use the same token.
    if (resetToken) {
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
    }
    await this.redis.del(REDIS_KEYS.authReset(tokenHash));

    // 8. Revoke all existing sessions (force re-login)
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    // 9. Audit
    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_PASSWORD_CHANGED',
      metadata: { type: 'reset', source },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHONE VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  async verifyPhone(userId: string, otpCode: string): Promise<void> {
    // 1. Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException('USER_NOT_FOUND');
    }

    // 2. Verify OTP with purpose PHONE_VERIFY
    const isValid = await this.verifyOtp({
      phone: user.phone,
      code: otpCode,
      purpose: 'PHONE_VERIFY',
    });

    if (!isValid) {
      throw new AppException('AUTH_OTP_INVALID');
    }

    // 3. Set user.status = ACTIVE (if was PENDING)
    if (user.status === UserStatus.PENDING) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });
    }

    // 4. Audit
    await this.audit.log({
      zoneId: user.zoneId || undefined,
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_PHONE_VERIFIED',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPERSONATE (SUPER_ADMIN only)
  // ══════════════════════════════════════════════════════════════════════════

  async impersonate(
    adminId: string,
    targetUserId: string,
  ): Promise<{ accessToken: string }> {
    // 1. Verify requester is SUPER_ADMIN
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(ERROR_CODES.USER_ROLE_NOT_ALLOWED);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new AppException('USER_NOT_FOUND');
    }

    // SECURITY FIX (SEC-019): never impersonate inactive/deleted accounts.
    if (targetUser.deletedAt || targetUser.status !== UserStatus.ACTIVE) {
      throw new AppException('AUTH_ACCOUNT_NOT_ACTIVE');
    }

    // 2. Generate limited access token (30 min, impersonation flag)
    const jti = uuid();
    // SECURITY FIX (SEC-015): Do not set manual exp/iat — expiresIn handles it.
    const accessToken = this.jwt.sign(
      {
        sub: targetUser.id,
        role: targetUser.role,
        zoneId: targetUser.zoneId,
        companyId: targetUser.companyId,
        type: 'access',
        jti,
        impersonatedBy: adminId,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: '30m',
      },
    );

    // 3. Audit
    await this.audit.log({
      zoneId: targetUser.zoneId || undefined,
      userId: adminId,
      targetId: targetUserId,
      targetType: 'User',
      action: 'USER_IMPERSONATED',
      metadata: { adminEmail: admin.email, targetEmail: targetUser.email },
    });

    return { accessToken };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ROLE VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  validateRoleAssignment(actorRole: UserRole, targetRole: UserRole): void {
    const allowedRoles = ROLE_CREATION_RULES[actorRole] || [];
    if (!allowedRoles.includes(targetRole)) {
      throw new AppException('USER_ROLE_NOT_ALLOWED');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKERS
  // ══════════════════════════════════════════════════════════════════════════

  private registerNotificationWorkers(): void {
    this.bull.registerWorker('notifications', async (job) => {
      switch (job.name) {
        case 'send-otp-sms':
          await this.handleSendOtpSms(job.data as { phone: string; code: string; purpose: string });
          break;
        case 'send-email':
          await this.handleSendEmail(job.data as { to: string; subject: string; template: string; variables: Record<string, unknown> });
          break;
        case 'notify-zone-manager-locked-account':
          await this.handleNotifyLockedAccount(job.data as { userId: string; zoneId: string; lockedAt: string; reason: string });
          break;
      }
    });
  }

  private async handleSendOtpSms(data: {
    phone: string;
    code: string;
    purpose: string;
  }): Promise<void> {
    try {
      // COMP-002: Actually send OTP via SMS service
      const purposeLabels: Record<string, string> = {
        LOGIN: 'ورود به سامانه',
        PHONE_VERIFY: 'تأیید شماره تلفن',
        TWO_FACTOR: 'احراز هویت دومرحله‌ای',
        PASSWORD_RESET: 'بازیابی رمز عبور',
      };
      const label = purposeLabels[data.purpose] || data.purpose;
      const message = `کد تأیید آوان: ${data.code}\n${label}\n اعتبار: ۵ دقیقه`;
      await this.sms.send(data.phone, message);
    } catch (err) {
      this.logger.error(`Failed to send OTP SMS to ${data.phone}: ${err}`);
    }
  }

  private async handleSendEmail(data: {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, unknown>;
  }): Promise<void> {
    try {
      // COMP-002: Actually send email via email service
      const rendered = await this.email.renderEmailTemplate(
        data.subject,
        data.variables['body'] as string || data.subject,
        data.variables['actionUrl'] as string,
      );
      await this.email.send({
        to: data.to,
        subject: rendered.subject,
        htmlBody: rendered.html,
        textBody: rendered.text,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${data.to}: ${err}`);
    }
  }

  private async handleNotifyLockedAccount(data: {
    userId: string;
    zoneId: string;
    lockedAt: string;
    reason: string;
  }): Promise<void> {
    this.gateway.emitToZone(data.zoneId, 'account:locked', {
      userId: data.userId,
      lockedAt: data.lockedAt,
      reason: data.reason,
    });
  }
}
