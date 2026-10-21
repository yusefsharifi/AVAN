import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogParams {
  zoneId?: string;
  userId?: string;
  targetId?: string;
  targetType?: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        zoneId: params.zoneId || null,
        userId: params.userId || null,
        targetId: params.targetId || null,
        targetType: params.targetType || null,
        action: params.action,
        metadata: (params.metadata as any) || {},
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  async findByZone(zoneId: string, options?: { limit?: number; offset?: number }) {
    return this.prisma.auditLog.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async findByUser(userId: string, options?: { limit?: number; offset?: number }) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async findByTarget(targetId: string, targetType: string) {
    return this.prisma.auditLog.findMany({
      where: { targetId, targetType },
      orderBy: { createdAt: 'desc' },
    });
  }
}
