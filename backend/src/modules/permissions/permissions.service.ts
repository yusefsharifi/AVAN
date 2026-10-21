import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { PERMISSIONS_CATALOG, getAllPermissionStrings } from './permissions.catalog';
import type { PermissionModule } from './permissions.catalog';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getCatalog(): PermissionModule[] {
    return PERMISSIONS_CATALOG;
  }

  getAllPermissions(): string[] {
    return getAllPermissionStrings();
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `user:permissions:effective:${userId}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return cached;

    if (this.prisma.user?.findUnique) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === 'SUPER_ADMIN') {
        const superPerms = ['*'];
        await this.redis.setJson(cacheKey, superPerms, REDIS_TTL.USER_PERMISSIONS);
        return superPerms;
      }
    }

    const [rolePerms, userPerms] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: {
          role: {
            assignments: { some: { userId } },
          },
        },
        select: { permission: true },
      }),
      this.prisma.userPermission.findMany({
        where: {
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { permission: true },
      }),
    ]);

    const permSet = new Set<string>();
    rolePerms.forEach((rp) => permSet.add(rp.permission));
    userPerms.forEach((up) => permSet.add(up.permission));

    const result = Array.from(permSet);
    await this.redis.setJson(cacheKey, result, REDIS_TTL.USER_PERMISSIONS);
    return result;
  }

  async has(userId: string, permission: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;

    // Flexible fallback: match between 3-part and 4-part formats
    const parts = permission.split('.');
    if (parts.length === 4) {
      const [mod, sub, page, action] = parts;
      if (perms.includes(`${mod}.${page}.${action}`)) return true;
      if (perms.includes(`${mod}.${sub}.${action}`)) return true;
    } else if (parts.length === 3) {
      const [mod, key, action] = parts;
      for (const p of perms) {
        const pParts = p.split('.');
        if (pParts.length === 4 && pParts[0] === mod && pParts[3] === action) {
          if (pParts[1] === key || pParts[2] === key) {
            return true;
          }
        }
      }
    }

    return false;
  }

  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = `user:permissions:effective:${userId}`;
    await this.redis.del(cacheKey);
    await this.redis.del(REDIS_KEYS.userPermissions(userId));
  }

  async invalidateAll(): Promise<void> {
    await this.redis.delPattern('user:permissions:effective:*');
  }
}
