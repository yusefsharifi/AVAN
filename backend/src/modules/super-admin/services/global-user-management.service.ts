// M21: Super Admin Panel — Global User Management Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { GlobalUserFilterDto, ImpersonateUserDto } from '../dto/create-dtos';
import type { PaginatedResult, UserActivityDto, ImpersonationResult } from '../dto/enums';
import { AuditComplianceService } from './audit-compliance.service';
import { randomUUID } from 'crypto';

@Injectable()
export class GlobalUserManagementService {
  private readonly logger = new Logger(GlobalUserManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async findAllUsers(filter: GlobalUserFilterDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.role) where.role = filter.role;
    if (filter.search) where.OR = [{ firstName: { contains: filter.search, mode: 'insensitive' } }, { lastName: { contains: filter.search, mode: 'insensitive' } }, { email: { contains: filter.search, mode: 'insensitive' } }];

    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, zoneId: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit } };
  }

  async getUserActivity(userId: string, days: number): Promise<UserActivityDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentAuditLogs = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "GlobalAuditLog" WHERE "userId" = $1 AND "timestamp" > $2 ORDER BY "timestamp" DESC LIMIT 50`,
      userId, since,
    ) as any[];

    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
      loginCount: recentAuditLogs.filter((l: any) => l.action === 'LOGIN').length,
      lastLogin: user.lastLoginAt,
      sessionsCount: 1,
      actionsCount: recentAuditLogs.length,
      recentAuditLogs,
    };
  }

  async forceLogout(userId: string, reason: string, forcedBy: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    // Add to blacklist in Redis
    await this.redis.set(`auth:blacklist:${userId}`, 'force_logout', 86400);

    await this.auditCompliance.logGlobalEvent('FORCE_LOGOUT', 'SUPER_ADMIN', forcedBy, user.zoneId || undefined, 'User', userId, { reason });
  }

  async impersonateUser(dto: ImpersonateUserDto, adminId: string, ipAddress: string): Promise<ImpersonationResult> {
    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.targetUserId } });
    if (!targetUser) throw new AppException('USER_NOT_FOUND');

    const sessionId = randomUUID();
    const durationMinutes = dto.durationMinutes || 30;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Store impersonation session
    await this.redis.set(`super:impersonation:${sessionId}`, JSON.stringify({ adminId, targetUserId: dto.targetUserId, startedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() }), durationMinutes * 60);

    // Create audit log
    await this.auditCompliance.logGlobalEvent('IMPERSONATION_START', 'SUPER_ADMIN', adminId, targetUser.zoneId ?? undefined, 'User', dto.targetUserId, { reason: dto.reason, durationMinutes, sessionId }, ipAddress);

    return {
      impersonationToken: `impersonate-${sessionId}`,
      expiresAt,
      targetUser: { id: targetUser.id, firstName: targetUser.firstName, lastName: targetUser.lastName, email: targetUser.email, role: targetUser.role },
      sessionId,
    };
  }

  async endImpersonation(sessionId: string): Promise<void> {
    await this.redis.del(`super:impersonation:${sessionId}`);
    await this.auditCompliance.logGlobalEvent('IMPERSONATION_END', 'SUPER_ADMIN', undefined, undefined, 'Session', sessionId, {});
  }

  async updateUserRole(userId: string, newRole: any, reason: string, updatedBy: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppException('USER_NOT_FOUND');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: newRole } });
    await this.auditCompliance.logGlobalEvent('ROLE_CHANGED', 'SUPER_ADMIN', updatedBy, user.zoneId || undefined, 'User', userId, { oldRole: user.role, newRole, reason });
    return updated;
  }
}
