// M21: Super Admin Panel — Announcement Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { CreateAnnouncementDto, CreateMaintenanceWindowDto } from '../dto/create-dtos';
import { AuditComplianceService } from './audit-compliance.service';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async create(dto: CreateAnnouncementDto, createdBy: string): Promise<any> {
    const announcement = await this.prisma.systemAnnouncement.create({
      data: {
        title: dto.title, body: dto.body, type: dto.type, severity: dto.severity,
        targetZoneIds: dto.targetZoneIds || [], targetRoles: dto.targetRoles || [],
        publishAt: dto.publishAt ? new Date(dto.publishAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        channels: dto.channels, createdBy,
      },
    });

    if (!dto.publishAt || new Date(dto.publishAt) <= new Date()) {
      await this.deliver(announcement.id);
    }

    return announcement;
  }

  async deliver(announcementId: string): Promise<void> {
    const announcement = await this.prisma.systemAnnouncement.findUnique({ where: { id: announcementId } });
    if (!announcement) return;

    let recipientCount = 0;
    if (announcement.channels.includes('IN_APP')) {
      const where: any = {};
      if (announcement.targetZoneIds.length > 0) where.zoneId = { in: announcement.targetZoneIds };
      if (announcement.targetRoles.length > 0) where.role = { in: announcement.targetRoles };
      recipientCount = await this.prisma.user.count({ where });
    }

    await this.prisma.systemAnnouncement.update({
      where: { id: announcementId },
      data: { isDelivered: true, deliveredAt: new Date(), recipientCount },
    });
  }

  async getActiveAnnouncements(zoneId: string, role: string): Promise<any[]> {
    const now = new Date();
    return this.prisma.systemAnnouncement.findMany({
      where: {
        isActive: true, publishAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaintenanceWindow(dto: CreateMaintenanceWindowDto, createdBy: string): Promise<any> {
    return this.prisma.maintenanceWindow.create({
      data: {
        title: dto.title, description: dto.description,
        startAt: new Date(dto.startAt), endAt: new Date(dto.endAt),
        affectedZoneIds: dto.affectedZoneIds || [], affectedModules: dto.affectedModules || [],
        notifyBefore: dto.notifyBefore || 60, createdBy,
      },
    });
  }

  async activateMaintenance(windowId: string): Promise<void> {
    await this.prisma.maintenanceWindow.update({ where: { id: windowId }, data: { isActive: true } });
    await this.redis.set('maintenance:global', 'true', 60);
  }

  async deactivateMaintenance(windowId: string): Promise<void> {
    await this.prisma.maintenanceWindow.update({ where: { id: windowId }, data: { isActive: false } });
    await this.redis.del('maintenance:global');
  }

  async isInMaintenanceMode(zoneId?: string): Promise<boolean> {
    const val = await this.redis.get(zoneId ? `maintenance:${zoneId}` : 'maintenance:global');
    return val === 'true';
  }

  async findAll(): Promise<any[]> {
    return this.prisma.systemAnnouncement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getMaintenanceWindows(): Promise<any[]> {
    return this.prisma.maintenanceWindow.findMany({ orderBy: { startAt: 'desc' } });
  }
}
