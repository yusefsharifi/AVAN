import {
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { PaginatedResult } from '../../common/dto/response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { UserResponseDto, UserProfileDto } from '../auth/dto/user-response.dto';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

export interface ActorContext {
  userId: string;
  role: UserRole;
  zoneId?: string;
  companyId?: string;
}

const ZONE_MANAGER_ASSIGNABLE: UserRole[] = [
  UserRole.ZONE_OPERATOR,
  UserRole.COMPANY_ADMIN,
  UserRole.GUARD,
  UserRole.DRIVER,
];

const COMPANY_ADMIN_ASSIGNABLE: UserRole[] = [
  UserRole.COMPANY_STAFF,
  UserRole.COMPANY_MANAGER,
];

const COMPANY_MANAGER_ASSIGNABLE: UserRole[] = [
  UserRole.COMPANY_STAFF,
];

function getAssignableRoles(actorRole: UserRole): UserRole[] {
  switch (actorRole) {
    case UserRole.SUPER_ADMIN:
      return Object.values(UserRole);
    case UserRole.ZONE_MANAGER:
      return ZONE_MANAGER_ASSIGNABLE;
    case UserRole.ZONE_OPERATOR:
      return [UserRole.GUARD];
    case UserRole.COMPANY_ADMIN:
      return COMPANY_ADMIN_ASSIGNABLE;
    case UserRole.COMPANY_MANAGER:
      return COMPANY_MANAGER_ASSIGNABLE;
    default:
      return [];
  }
}

function isCompanyRole(role: UserRole): boolean {
  return (
    role === UserRole.COMPANY_ADMIN ||
    role === UserRole.COMPANY_MANAGER ||
    role === UserRole.COMPANY_STAFF ||
    role === UserRole.DRIVER
  );
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  private buildScopedWhere(
    filter: FilterUsersDto,
    actor: ActorContext,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (actor.role === UserRole.SUPER_ADMIN) {
      if (filter.zoneId) where.zoneId = filter.zoneId;
      if (filter.companyId) where.companyId = filter.companyId;
    } else if (isCompanyRole(actor.role)) {
      where.companyId = actor.companyId || undefined;
    } else {
      where.zoneId = actor.zoneId || undefined;
    }

    if (filter.role) where.role = filter.role;
    if (filter.status) where.status = filter.status;

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async validateScope(
    targetZoneId: string | undefined | null,
    targetCompanyId: string | undefined | null,
    actor: ActorContext,
  ): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    if (isCompanyRole(actor.role)) {
      if (targetZoneId !== undefined && targetZoneId !== null) {
        throw new AppException('USER_CANNOT_CHANGE_ZONE');
      }
      if (targetCompanyId !== undefined && targetCompanyId !== null) {
        if (targetCompanyId !== actor.companyId) {
          throw new AppException('USER_COMPANY_MISMATCH');
        }
      }
      return;
    }

    if (actor.role === UserRole.ZONE_MANAGER || actor.role === UserRole.ZONE_OPERATOR) {
      if (targetZoneId !== undefined && targetZoneId !== null) {
        if (targetZoneId !== actor.zoneId) {
          throw new AppException('USER_ZONE_MISMATCH');
        }
      }
      if (targetCompanyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: targetCompanyId },
          select: { zoneId: true, deletedAt: true },
        });
        if (!company || company.deletedAt) {
          throw new AppException('COMPANY_NOT_FOUND');
        }
        if (company.zoneId !== actor.zoneId) {
          throw new AppException('USER_COMPANY_MISMATCH');
        }
      }
    }
  }

  private async getScopedTarget(id: string, actor: ActorContext) {
    const where: Prisma.UserWhereInput = { id, deletedAt: null };

    if (actor.role === UserRole.SUPER_ADMIN) {
      // no scope filter
    } else if (isCompanyRole(actor.role)) {
      where.companyId = actor.companyId || undefined;
    } else {
      where.zoneId = actor.zoneId || undefined;
    }

    const user = await this.prisma.user.findFirst({ where });
    if (!user) throw new AppException('USER_TARGET_OUT_OF_SCOPE');
    return user;
  }

  async create(dto: CreateUserDto, actor: ActorContext): Promise<unknown> {
    const targetRole = dto.role || UserRole.COMPANY_STAFF;

    if (targetRole === UserRole.SUPER_ADMIN) {
      throw new AppException('USER_ROLE_NOT_ALLOWED');
    }

    const allowed = getAssignableRoles(actor.role);
    if (!allowed.includes(targetRole)) {
      throw new AppException('USER_ROLE_NOT_ALLOWED');
    }

    let effectiveZoneId = dto.zoneId || null;
    let effectiveCompanyId = dto.companyId || null;

    if (actor.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can set anything; validate company belongs to zone if both provided
      if (effectiveCompanyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: effectiveCompanyId },
          select: { zoneId: true, deletedAt: true },
        });
        if (!company || company.deletedAt) {
          throw new AppException('COMPANY_NOT_FOUND');
        }
        if (effectiveZoneId && company.zoneId !== effectiveZoneId) {
          throw new AppException('USER_COMPANY_MISMATCH');
        }
        if (!effectiveZoneId) effectiveZoneId = company.zoneId;
      }
    } else if (isCompanyRole(actor.role)) {
      effectiveCompanyId = actor.companyId || effectiveCompanyId;
      effectiveZoneId = null;
      if (dto.zoneId) throw new AppException('USER_CANNOT_CHANGE_ZONE');
      if (dto.companyId && dto.companyId !== actor.companyId) {
        throw new AppException('USER_COMPANY_MISMATCH');
      }
    } else {
      // Zone roles
      effectiveZoneId = effectiveZoneId || actor.zoneId || null;
      if (dto.zoneId && dto.zoneId !== actor.zoneId) {
        throw new AppException('USER_ZONE_MISMATCH');
      }
      if (effectiveCompanyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: effectiveCompanyId },
          select: { zoneId: true, deletedAt: true },
        });
        if (!company || company.deletedAt) {
          throw new AppException('COMPANY_NOT_FOUND');
        }
        if (company.zoneId !== actor.zoneId) {
          throw new AppException('USER_COMPANY_MISMATCH');
        }
      }
    }

    if (isCompanyRole(targetRole) && !effectiveCompanyId) {
      throw new AppException('USER_SCOPE_VIOLATION');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new AppException('USER_EMAIL_TAKEN');

    const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existingPhone) throw new AppException('USER_PHONE_TAKEN');

    if (dto.nationalId) {
      const existingNid = await this.prisma.user.findUnique({ where: { nationalId: dto.nationalId } });
      if (existingNid) throw new AppException('USER_NATIONAL_ID_TAKEN');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        nationalId: dto.nationalId || null,
        zoneId: effectiveZoneId,
        companyId: effectiveCompanyId,
        role: targetRole,
        status: UserStatus.ACTIVE,
      },
    });

    await this.audit.log({
      userId: actor.userId,
      targetId: user.id,
      targetType: 'User',
      action: 'USER_REGISTERED',
      metadata: { email: dto.email, role: targetRole, zoneId: effectiveZoneId, companyId: effectiveCompanyId },
      zoneId: actor.zoneId,
    });

    return UserResponseDto.fromUser(user);
  }

  async findAll(filter: FilterUsersDto, actor: ActorContext): Promise<PaginatedResult<unknown>> {
    const where = this.buildScopedWhere(filter, actor);

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    if (filter.cursor) {
      const cursorUser = await this.prisma.user.findUnique({
        where: { id: filter.cursor },
      });
      if (cursorUser) {
        const items = await this.prisma.user.findMany({
          where: { ...where, createdAt: { gt: cursorUser.createdAt } },
          orderBy: { createdAt: 'asc' },
          take: limit + 1,
        });
        const hasNextPage = items.length > limit;
        const data = hasNextPage ? items.slice(0, limit) : items;
        return new PaginatedResult(
          data.map((u) => UserResponseDto.fromUser(u)),
          {
            cursor: data.length > 0 ? data[data.length - 1].id : undefined,
            hasNextPage,
            limit,
          },
        );
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResult(
      items.map((u) => UserResponseDto.fromUser(u)),
      { page, limit, total },
    );
  }

  async findById(id: string, actor: ActorContext): Promise<unknown> {
    const user = await this.getScopedTarget(id, actor);
    return UserResponseDto.fromUser(user);
  }

  async findByEmail(email: string): Promise<unknown | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findByPhone(phone: string): Promise<unknown | null> {
    return this.prisma.user.findFirst({
      where: { phone, deletedAt: null },
    });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: ActorContext,
  ): Promise<unknown> {
    const user = await this.getScopedTarget(id, actor);

    if (dto.role !== undefined) {
      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new AppException('USER_ROLE_NOT_ALLOWED');
      }
      if (actor.role !== UserRole.SUPER_ADMIN) {
        const allowed = getAssignableRoles(actor.role);
        if (!allowed.includes(dto.role)) {
          throw new AppException('USER_ROLE_NOT_ALLOWED');
        }
      }
    }

    if (dto.zoneId !== undefined) {
      if (isCompanyRole(actor.role)) {
        throw new AppException('USER_CANNOT_CHANGE_ZONE');
      }
      if (actor.role !== UserRole.SUPER_ADMIN && dto.zoneId !== user.zoneId) {
        throw new AppException('USER_CANNOT_CHANGE_ZONE');
      }
    }

    if (dto.companyId !== undefined) {
      await this.validateScope(
        dto.zoneId !== undefined ? dto.zoneId : user.zoneId,
        dto.companyId,
        actor,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.zoneId !== undefined && { zoneId: dto.zoneId }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.avatarKey !== undefined && { avatarKey: dto.avatarKey }),
      },
    });

    await this.redis.delPattern(`user:profile:${id}*`);
    await this.redis.delPattern(`user:permissions:${id}*`);

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: dto.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
      metadata: dto as any,
      zoneId: actor.zoneId,
    });

    return UserResponseDto.fromUser(updated);
  }

  async softDelete(id: string, actor: ActorContext): Promise<void> {
    if (id === actor.userId) {
      throw new AppException('USER_CANNOT_DELETE_SELF');
    }

    const user = await this.getScopedTarget(id, actor);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.BANNED },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.redis.delPattern(`user:profile:${id}*`);
    await this.redis.delPattern(`user:permissions:${id}*`);

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: 'USER_DELETED',
      zoneId: actor.zoneId,
    });
  }

  async suspend(id: string, reason: string, actor: ActorContext): Promise<void> {
    const user = await this.getScopedTarget(id, actor);

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: 'USER_SUSPENDED',
      metadata: { reason },
      zoneId: actor.zoneId,
    });
  }

  async setStatus(id: string, status: UserStatus, actor: ActorContext): Promise<void> {
    const user = await this.getScopedTarget(id, actor);

    await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    if (status === UserStatus.SUSPENDED || status === UserStatus.BANNED) {
      await this.prisma.userSession.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: status === UserStatus.ACTIVE ? 'USER_REACTIVATED' : 'USER_SUSPENDED',
      metadata: { status },
      zoneId: actor.zoneId,
    });
  }

  async reactivate(id: string, actor: ActorContext): Promise<void> {
    const user = await this.getScopedTarget(id, actor);

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: 'USER_REACTIVATED',
      zoneId: actor.zoneId,
    });
  }

  async resetPassword(id: string, actor: ActorContext): Promise<{ temporaryPassword: string }> {
    const user = await this.getScopedTarget(id, actor);

    const tempPassword = crypto.randomBytes(8).toString('base64url').slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });

    await this.prisma.userSession.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      userId: actor.userId,
      targetId: id,
      targetType: 'User',
      action: 'USER_PASSWORD_RESET',
      zoneId: actor.zoneId,
    });

    return { temporaryPassword: tempPassword };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVATAR
  // ══════════════════════════════════════════════════════════════════════════

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: key },
    });

    await this.redis.delPattern(`user:profile:${userId}*`);

    return { avatarUrl: key };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════════════════════════════════════

  async getActiveSessions(userId: string): Promise<unknown[]> {
    return this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async revokeSession(sessionId: string, requesterId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new AppException('SHIFT_NOT_FOUND');

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    await this.audit.log({
      userId: requesterId,
      targetId: sessionId,
      targetType: 'UserSession',
      action: 'SESSION_REVOKED',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  async grantPermission(
    userId: string,
    permission: string,
    grantedBy: string,
    expiresAt?: Date,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    await this.prisma.userPermission.upsert({
      where: {
        userId_permission: { userId, permission },
      },
      create: {
        userId,
        permission,
        grantedBy,
        expiresAt: expiresAt || null,
      },
      update: {
        grantedBy,
        expiresAt: expiresAt || null,
      },
    });

    await this.redis.del(REDIS_KEYS.userPermissions(userId));
    await this.redis.del(`user:permissions:effective:${userId}`);

    await this.audit.log({
      userId: grantedBy,
      targetId: userId,
      targetType: 'User',
      action: 'USER_PERMISSION_GRANTED',
      metadata: { permission, expiresAt },
    });
  }

  async revokePermission(userId: string, permission: string): Promise<void> {
    await this.prisma.userPermission.deleteMany({
      where: { userId, permission },
    });

    await this.redis.del(REDIS_KEYS.userPermissions(userId));
    await this.redis.del(`user:permissions:effective:${userId}`);

    await this.audit.log({
      targetId: userId,
      targetType: 'User',
      action: 'USER_PERMISSION_REVOKED',
      metadata: { permission },
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const cached = await this.redis.get(REDIS_KEYS.userPermissions(userId));
    if (cached) return JSON.parse(cached);

    const permissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { permission: true },
    });

    const result = permissions.map((p) => p.permission);
    await this.redis.setJson(REDIS_KEYS.userPermissions(userId), result, REDIS_TTL.USER_PERMISSIONS);
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2FA
  // ══════════════════════════════════════════════════════════════════════════

  async enable2FA(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');
    if (user.twoFactorEnabled) throw new AppException('AUTH_2FA_ALREADY_ENABLED');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'IDOP', secret);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_2FA_ENABLED',
      metadata: { step: 'initiated' },
    });

    return { qrCodeUrl: otpauth, secret };
  }

  async confirm2FA(userId: string, otpCode: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new AppException('USER_NOT_FOUND');

    const isValid = authenticator.verify({
      token: otpCode,
      secret: user.twoFactorSecret,
    });

    if (!isValid) throw new AppException('AUTH_2FA_CODE_INVALID');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_2FA_ENABLED',
      metadata: { step: 'confirmed' },
    });
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AppException('AUTH_INVALID_CREDENTIALS');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_2FA_DISABLED',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  async getProfile(userId: string): Promise<UserProfileDto> {
    const cached = await this.redis.getJson<UserProfileDto>(REDIS_KEYS.userProfile(userId));
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppException('USER_NOT_FOUND');

    const profile = UserProfileDto.fromUserProfile(user);
    await this.redis.setJson(REDIS_KEYS.userProfile(userId), profile, REDIS_TTL.USER_PROFILE);
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppException('USER_NOT_FOUND');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.avatarKey !== undefined && { avatarKey: dto.avatarKey }),
      },
    });

    await this.redis.del(REDIS_KEYS.userProfile(userId));
    return UserProfileDto.fromUserProfile(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new AppException('AUTH_INVALID_CREDENTIALS');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      userId,
      targetId: userId,
      targetType: 'User',
      action: 'USER_PASSWORD_CHANGED',
      metadata: { type: 'manual' },
    });
  }
}
