import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { SendNotificationDto, FilterNotificationsDto, UpdateNotificationPreferenceDto, RegisterPushTokenDto } from '../dto/send-notification.dto';

@Injectable()
export class NotificationHubService {
  private readonly logger = new Logger(NotificationHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly push: PushNotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(dto: SendNotificationDto): Promise<void> {
    // 1. Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        recipientId: dto.recipientId,
        recipientRole: dto.recipientRole,
        recipientGroupId: dto.recipientGroupId,
        module: dto.module,
        eventType: dto.eventType,
        priority: dto.priority,
        title: dto.title,
        titleFa: dto.titleFa,
        body: dto.body,
        bodyFa: dto.bodyFa,
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
        actionLabelFa: dto.actionLabelFa,
        entityType: dto.entityType,
        entityId: dto.entityId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        groupKey: dto.groupKey,
        metadata: (dto.metadata || {}) as any,
        tags: dto.tags || [],
        createdBy: 'system',
      },
    });

    // 2. Resolve recipients
    const recipients = await this.resolveRecipients(dto);

    // 3. Check for grouping
    if (dto.groupKey) {
      const existingGroup = await this.prisma.notification.findFirst({
        where: { groupKey: dto.groupKey, isGrouped: false },
        orderBy: { createdAt: 'desc' },
      });
      if (existingGroup) {
        await this.prisma.notification.update({
          where: { id: existingGroup.id },
          data: { groupCount: { increment: 1 } },
        });
        return;
      }
    }

    // 4. Dispatch to each recipient
    for (const recipientId of recipients) {
      await this.dispatchToRecipient(notification.id, recipientId, dto);
    }
  }

  async dispatchToRecipient(notificationId: string, recipientId: string, dto?: SendNotificationDto): Promise<void> {
    const notification = dto ? null : await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification && !dto) return;

    const pref = await this.getPreferences(recipientId);
    const module = (notification || dto!)!.module;
    const eventType = (notification || dto!)!.eventType;
    const priority = (notification || dto!)!.priority;

    // Determine channels
    let channels: string[] = dto?.channels || await this.resolveChannels(module, eventType, priority, notification?.zoneId || undefined);

    // Apply user preferences
    if (pref && !pref.allEnabled && priority !== 'CRITICAL') return;

    if (pref) {
      if (!pref.inAppEnabled) channels = channels.filter(c => c !== 'IN_APP');
      if (!pref.smsEnabled) channels = channels.filter(c => c !== 'SMS');
      if (!pref.emailEnabled) channels = channels.filter(c => c !== 'EMAIL');
      if (!pref.pushEnabled) channels = channels.filter(c => c !== 'PUSH');
    }

    // DND check
    if (priority !== 'CRITICAL' && pref?.dndEnabled) {
      const inDnd = await this.isInDnd(recipientId, priority);
      if (inDnd) {
        channels = channels.filter(c => c !== 'SMS' && c !== 'EMAIL' && c !== 'PUSH');
        if (channels.length === 0) return;
      }
    }

    // Throttle check
    if (dto?.groupKey && priority !== 'CRITICAL') {
      const throttled = await this.isThrottled(recipientId, dto.groupKey, 30);
      if (throttled) return;
    }

    // Create delivery records and queue
    for (const channel of channels) {
      const delivery = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notificationId,
          recipientId,
          channel: channel as any,
          status: 'PENDING',
          address: this.getDeliveryAddress(channel, recipientId, pref),
          scheduledAt: notification?.scheduledAt,
        },
      });

      // Emit for async processing
      this.eventEmitter.emit(`notification.deliver.${channel.toLowerCase()}`, { deliveryId: delivery.id });
    }
  }

  async deliverInApp(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery) return;

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Emit via WebSocket
    this.eventEmitter.emit('notification.socket.new', {
      userId: delivery.recipientId,
      notification: {
        id: delivery.id,
        notificationId: delivery.notificationId,
        module: delivery.notification.module,
        eventType: delivery.notification.eventType,
        priority: delivery.notification.priority,
        titleFa: delivery.notification.titleFa,
        bodyFa: delivery.notification.bodyFa,
        actionUrl: delivery.notification.actionUrl,
        actionLabelFa: delivery.notification.actionLabelFa,
        entityType: delivery.notification.entityType,
        entityId: delivery.notification.entityId,
        imageUrl: delivery.notification.imageUrl,
        createdAt: delivery.notification.createdAt,
      },
    });

    // Update unread count in Redis
    await this.updateUnreadCount(delivery.recipientId);
  }

  async deliverSms(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery || !delivery.address) return;

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'QUEUED', attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
    });

    const message = delivery.notification.bodyFa || delivery.notification.titleFa;
    const result = await this.sms.send(delivery.address, message.substring(0, 160));

    if (result.success) {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'SENT', sentAt: new Date(), providerMessageId: result.messageId, providerResponse: result as any },
      });
    } else {
      await this.scheduleRetry(deliveryId, result.errorMessage);
    }
  }

  async deliverEmail(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery || !delivery.address) return;

    const pref = await this.prisma.userNotificationPreference.findUnique({ where: { userId: delivery.recipientId } });
    const emailAddr = pref?.emailAddress || delivery.address;

    const result = await this.email.sendNotificationEmail(
      emailAddr,
      delivery.notification.titleFa,
      delivery.notification.bodyFa || '',
      delivery.notification.actionUrl || undefined,
    );

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        failedAt: result.success ? null : new Date(),
        providerMessageId: result.messageId,
        errorMessage: result.errorMessage,
      },
    });
  }

  async deliverPush(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery) return;

    const pref = await this.prisma.userNotificationPreference.findUnique({ where: { userId: delivery.recipientId } });
    if (!pref) return;

    const tokens = [...(pref.fcmTokens || []), ...(pref.apnsTokens || [])];
    if (!tokens.length) return;

    const result = await this.push.sendFcm(pref.fcmTokens || [], {
      title: delivery.notification.titleFa,
      body: delivery.notification.bodyFa || delivery.notification.titleFa,
      actionUrl: delivery.notification.actionUrl || undefined,
    });

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: result.success ? 'SENT' : 'FAILED', sentAt: result.success ? new Date() : null },
    });

    if (result.invalidTokens.length) {
      await this.push.cleanupInvalidTokens(delivery.recipientId, result.invalidTokens);
    }
  }

  async scheduleRetry(deliveryId: string, errorMessage?: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) return;

    if (delivery.attemptCount >= delivery.maxAttempts) {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', failedAt: new Date(), errorMessage: errorMessage || 'Max retries exceeded' },
      });
      return;
    }

    const backoffMinutes = [5, 15, 60][delivery.attemptCount] || 60;
    const nextRetry = new Date(Date.now() + backoffMinutes * 60000);

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { nextRetryAt: nextRetry, errorMessage },
    });
  }

  async getInbox(userId: string, zoneId: string, filter: FilterNotificationsDto): Promise<any> {
    const where: any = { recipientId: userId };
    if (filter.module) where.notification = { module: filter.module };
    if (filter.isRead !== undefined) where.isRead = filter.isRead;
    if (filter.isDismissed !== undefined) where.isDismissed = filter.isDismissed;

    const limit = filter.limit || 20;
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where,
      include: { notification: true },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = deliveries.length > limit;
    const items = hasMore ? deliveries.slice(0, limit) : deliveries;

    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async getUnreadCount(userId: string, zoneId: string): Promise<any> {
    const cacheKey = REDIS_KEYS.notifUnread(userId);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const total = await this.prisma.notificationDelivery.count({
      where: { recipientId: userId, isRead: false, isDismissed: false },
    });

    const byModuleRaw = await this.prisma.notificationDelivery.groupBy({
      by: ['channel'],
      where: { recipientId: userId, isRead: false, isDismissed: false },
      _count: true,
    });

    const result = { total, byModule: {} as Record<string, number> };
    for (const row of byModuleRaw) {
      result.byModule[row.channel] = row._count;
    }

    await this.redis.set(cacheKey, JSON.stringify(result), 30);
    return result;
  }

  async markAsRead(deliveryId: string, userId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) return;
    if (delivery.recipientId !== userId) return;

    if (delivery.isRead) return;

    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { isRead: true, readAt: new Date(), status: 'READ' },
    });

    await this.updateUnreadCount(userId);
  }

  async markAllAsRead(userId: string, zoneId: string, module?: string): Promise<{ count: number }> {
    const where: any = { recipientId: userId, isRead: false };
    const result = await this.prisma.notificationDelivery.updateMany({ where, data: { isRead: true, readAt: new Date(), status: 'READ' } });
    await this.updateUnreadCount(userId);
    return { count: result.count };
  }

  async dismiss(deliveryId: string, userId: string): Promise<void> {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { isDismissed: true },
    });
  }

  async dismissAll(userId: string, zoneId: string): Promise<void> {
    await this.prisma.notificationDelivery.updateMany({
      where: { recipientId: userId },
      data: { isDismissed: true },
    });
  }

  async delete(deliveryId: string, userId: string): Promise<void> {
    await this.prisma.notificationDelivery.delete({ where: { id: deliveryId } });
  }

  async getPreferences(userId: string): Promise<any> {
    let pref = await this.prisma.userNotificationPreference.findUnique({ where: { userId } });
    if (!pref) {
      pref = await this.prisma.userNotificationPreference.create({
        data: { userId },
      });
    }
    return pref;
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferenceDto): Promise<any> {
    const pref = await this.getPreferences(userId);
    const updated = await this.prisma.userNotificationPreference.update({
      where: { userId },
      data: dto as any,
    });
    // Clear cache
    await this.redis.del(REDIS_KEYS.notifUnread(userId));
    return updated;
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    const pref = await this.getPreferences(userId);
    if (dto.platform === 'fcm') {
      const tokens = [...new Set([...(pref.fcmTokens || []), dto.token])];
      await this.prisma.userNotificationPreference.update({ where: { userId }, data: { fcmTokens: tokens } });
    } else if (dto.platform === 'apns') {
      const tokens = [...new Set([...(pref.apnsTokens || []), dto.token])];
      await this.prisma.userNotificationPreference.update({ where: { userId }, data: { apnsTokens: tokens } });
    }
  }

  async unregisterPushToken(userId: string, token: string): Promise<void> {
    const pref = await this.getPreferences(userId);
    const fcmTokens = (pref.fcmTokens || []).filter(t => t !== token);
    const apnsTokens = (pref.apnsTokens || []).filter(t => t !== token);
    await this.prisma.userNotificationPreference.update({ where: { userId }, data: { fcmTokens, apnsTokens } });
  }

  async isInDnd(userId: string, priority: string): Promise<boolean> {
    if (priority === 'CRITICAL') return false;
    const pref = await this.getPreferences(userId);
    if (!pref.dndEnabled) return false;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (pref.dndStartTime && pref.dndEndTime) {
      if (pref.dndStartTime > pref.dndEndTime) {
        // Overnight DND (e.g. 22:00 - 07:00)
        if (currentTime >= pref.dndStartTime || currentTime <= pref.dndEndTime) return true;
      } else {
        if (currentTime >= pref.dndStartTime && currentTime <= pref.dndEndTime) return true;
      }
    }

    return false;
  }

  async isThrottled(userId: string, groupKey: string, throttleMinutes: number): Promise<boolean> {
    const key = REDIS_KEYS.notifThrottle(userId, groupKey);
    const existing = await this.redis.get(key);
    if (existing) return true;
    await this.redis.set(key, '1', throttleMinutes * 60);
    return false;
  }

  async resolveChannels(module: string, eventType: string, priority: string, zoneId?: string): Promise<string[]> {
    const where: any = { module, eventType, isActive: true };
    if (zoneId) where.OR = [{ zoneId }, { zoneId: null }];
    else where.zoneId = null;

    const rules = await this.prisma.notificationRule.findMany({ where });
    const channels = new Set<string>(['IN_APP']);
    for (const rule of rules) {
      for (const ch of rule.channels) channels.add(ch);
    }
    if (priority === 'CRITICAL') channels.add('SMS');
    return Array.from(channels);
  }

  // ─── DASHBOARD ANALYTICS ──────────────────────────────────────────────────

  async getDashboard(zoneId: string, fromDate?: string, toDate?: string): Promise<any> {
    const now = new Date();
    const from = fromDate ? new Date(fromDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : now;

    const [overview, byChannel, byModule, byPriority, hourlyTrend, topEventTypes, retryStats] =
      await Promise.all([
        this.getOverviewStats(zoneId, from, to),
        this.getChannelStats(zoneId, from, to),
        this.getModuleStats(zoneId, from, to),
        this.getPriorityStats(zoneId, from, to),
        this.getHourlyTrend(zoneId, from, to),
        this.getTopEventTypes(zoneId, from, to, 10),
        this.getRetryStats(zoneId, from, to),
      ]);

    return {
      overview,
      byChannel,
      byModule,
      byPriority,
      hourlyTrend,
      topEventTypes,
      retryStats,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }

  private async getOverviewStats(zoneId: string, from: Date, to: Date): Promise<any> {
    const deliveryWhere = {
      createdAt: { gte: from, lte: to },
      notification: { zoneId },
    };

    const [
      totalCreated,
      totalDelivered,
      totalRead,
      totalFailed,
      totalPending,
      totalThrottled,
      totalDndSuppressed,
    ] = await Promise.all([
      this.prisma.notification.count({ where: { zoneId, createdAt: { gte: from, lte: to } } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, status: { in: ['SENT', 'DELIVERED', 'READ'] } } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, isRead: true } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, status: 'FAILED' } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, status: 'PENDING' } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, status: 'THROTTLED' } }),
      this.prisma.notificationDelivery.count({ where: { ...deliveryWhere, status: 'DND_SUPPRESSED' } }),
    ]);

    const deliveryRate = totalDelivered + totalFailed > 0
      ? ((totalDelivered / (totalDelivered + totalFailed)) * 100)
      : 0;
    const readRate = totalDelivered > 0
      ? ((totalRead / totalDelivered) * 100)
      : 0;

    return {
      totalCreated,
      totalDelivered,
      totalRead,
      totalFailed,
      totalPending,
      totalThrottled,
      totalDndSuppressed,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      readRate: Math.round(readRate * 10) / 10,
    };
  }

  private async getChannelStats(zoneId: string, from: Date, to: Date): Promise<any[]> {
    const results = await this.prisma.notificationDelivery.groupBy({
      by: ['channel', 'status'],
      where: {
        createdAt: { gte: from, lte: to },
        notification: { zoneId },
      },
      _count: true,
    });

    const channelMap: Record<string, { sent: number; delivered: number; failed: number; read: number; total: number }> = {};

    for (const row of results) {
      if (!channelMap[row.channel]) {
        channelMap[row.channel] = { sent: 0, delivered: 0, failed: 0, read: 0, total: 0 };
      }
      const ch = channelMap[row.channel];
      ch.total += row._count;
      if (['SENT', 'DELIVERED', 'READ'].includes(row.status)) ch.sent += row._count;
      if (['DELIVERED', 'READ'].includes(row.status)) ch.delivered += row._count;
      if (row.status === 'FAILED') ch.failed += row._count;
      if (row.status === 'READ') ch.read += row._count;
    }

    return Object.entries(channelMap).map(([channel, stats]) => ({
      channel,
      ...stats,
      deliveryRate: stats.sent + stats.failed > 0
        ? Math.round((stats.delivered / (stats.sent + stats.failed)) * 1000) / 10
        : 0,
      readRate: stats.delivered > 0
        ? Math.round((stats.read / stats.delivered) * 1000) / 10
        : 0,
    }));
  }

  private async getModuleStats(zoneId: string, from: Date, to: Date): Promise<any[]> {
    const results = await this.prisma.notification.groupBy({
      by: ['module'],
      where: { zoneId, createdAt: { gte: from, lte: to } },
      _count: true,
    });

    return results
      .map(r => ({ module: r.module, count: r._count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getPriorityStats(zoneId: string, from: Date, to: Date): Promise<any[]> {
    const results = await this.prisma.notification.groupBy({
      by: ['priority'],
      where: { zoneId, createdAt: { gte: from, lte: to } },
      _count: true,
    });

    return results.map(r => ({ priority: r.priority, count: r._count }));
  }

  private async getHourlyTrend(zoneId: string, from: Date, to: Date): Promise<any[]> {
    // Get daily counts for the last 30 days
    const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    const limit = Math.min(days, 30);

    const notifications = await this.prisma.notification.findMany({
      where: { zoneId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, priority: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyMap: Record<string, { total: number; critical: number; high: number }> = {};
    for (const n of notifications) {
      const day = n.createdAt.toISOString().substring(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { total: 0, critical: 0, high: 0 };
      dailyMap[day].total++;
      if (n.priority === 'CRITICAL') dailyMap[day].critical++;
      if (n.priority === 'HIGH') dailyMap[day].high++;
    }

    return Object.entries(dailyMap)
      .slice(-limit)
      .map(([date, stats]) => ({ date, ...stats }));
  }

  private async getTopEventTypes(zoneId: string, from: Date, to: Date, limit: number): Promise<any[]> {
    const results = await this.prisma.notification.groupBy({
      by: ['module', 'eventType'],
      where: { zoneId, createdAt: { gte: from, lte: to } },
      _count: true,
      orderBy: { _count: { eventType: 'desc' } },
      take: limit,
    });

    return results.map(r => ({
      module: r.module,
      eventType: r.eventType,
      count: r._count,
    }));
  }

  private async getRetryStats(zoneId: string, from: Date, to: Date): Promise<any> {
    const retried = await this.prisma.notificationDelivery.count({
      where: {
        createdAt: { gte: from, lte: to },
        notification: { zoneId },
        attemptCount: { gt: 1 },
      },
    });

    const avgAttempts = await this.prisma.notificationDelivery.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        notification: { zoneId },
      },
      _avg: { attemptCount: true },
    });

    return {
      retriedDeliveries: retried,
      avgAttemptCount: Math.round((avgAttempts._avg.attemptCount || 0) * 10) / 10,
    };
  }

  async getRealtimeStats(zoneId: string): Promise<any> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    const last5m = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      last24hSent,
      last1hSent,
      last5mSent,
      last24hFailed,
      activeRetries,
      unreadByModule,
      topRecipients,
    ] = await Promise.all([
      this.prisma.notificationDelivery.count({
        where: { createdAt: { gte: last24h }, status: { in: ['SENT', 'DELIVERED', 'READ'] }, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.count({
        where: { createdAt: { gte: last1h }, status: { in: ['SENT', 'DELIVERED', 'READ'] }, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.count({
        where: { createdAt: { gte: last5m }, status: { in: ['SENT', 'DELIVERED', 'READ'] }, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.count({
        where: { createdAt: { gte: last24h }, status: 'FAILED', notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.count({
        where: { nextRetryAt: { gt: now }, status: { notIn: ['FAILED', 'CANCELLED', 'READ'] }, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.groupBy({
        by: ['recipientId'],
        where: { isRead: false, isDismissed: false, notification: { zoneId } },
        _count: true,
        orderBy: { _count: { recipientId: 'desc' } },
        take: 5,
      }),
      this.prisma.notificationDelivery.groupBy({
        by: ['recipientId'],
        where: { createdAt: { gte: last24h }, notification: { zoneId } },
        _count: true,
        orderBy: { _count: { recipientId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      last24h: { sent: last24hSent, failed: last24hFailed },
      last1h: { sent: last1hSent },
      last5m: { sent: last5mSent },
      activeRetries,
      unreadTopRecipients: unreadByModule.map(r => ({ userId: r.recipientId, unread: r._count })),
      mostActiveRecipients: topRecipients.map(r => ({ userId: r.recipientId, count: r._count })),
    };
  }

  async getSmsProviderComparison(zoneId: string, from: Date, to: Date): Promise<any> {
    const logs = await this.prisma.smsProviderLog.findMany({
      where: { sentAt: { gte: from, lte: to } },
    });

    const providers: Record<string, { sent: number; delivered: number; failed: number; totalCost: number; avgLatencyMs: number }> = {};

    for (const log of logs) {
      if (!providers[log.provider]) {
        providers[log.provider] = { sent: 0, delivered: 0, failed: 0, totalCost: 0, avgLatencyMs: 0 };
      }
      const p = providers[log.provider];
      p.sent++;
      if (log.status === 'SENT' || log.deliveredAt) p.delivered++;
      if (log.status === 'FAILED') p.failed++;
      if (log.cost) p.totalCost += Number(log.cost);
    }

    return Object.entries(providers).map(([provider, stats]) => ({
      provider,
      ...stats,
      successRate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 1000) / 10 : 0,
    }));
  }

  async getUserEngagement(userId: string, zoneId: string): Promise<any> {
    const [totalReceived, totalRead, readDeliveries] = await Promise.all([
      this.prisma.notificationDelivery.count({
        where: { recipientId: userId, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.count({
        where: { recipientId: userId, isRead: true, notification: { zoneId } },
      }),
      this.prisma.notificationDelivery.findMany({
        where: { recipientId: userId, isRead: true, readAt: { not: null }, notification: { zoneId } },
        select: { createdAt: true, readAt: true, channel: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Calculate average read delay in minutes
    let avgReadDelayMin = 0;
    if (readDeliveries.length > 0) {
      const totalDelay = readDeliveries.reduce((sum, d) => {
        if (d.readAt && d.createdAt) {
          return sum + (d.readAt.getTime() - d.createdAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      avgReadDelayMin = Math.round(totalDelay / readDeliveries.length);
    }

    // Channel preference
    const channelCounts: Record<string, number> = {};
    for (const d of readDeliveries) {
      channelCounts[d.channel] = (channelCounts[d.channel] || 0) + 1;
    }
    const preferredChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, count]) => ({ channel, readCount: count }));

    return {
      totalReceived,
      totalRead,
      readRate: totalReceived > 0 ? Math.round((totalRead / totalReceived) * 1000) / 10 : 0,
      avgReadDelayMin,
      preferredChannels,
    };
  }

  // ─── WEBHOOK MANAGEMENT ──────────────────────────────────────────────────

  async createWebhookEndpoint(zoneId: string, dto: { url: string; events: string[]; secret?: string }, createdBy: string): Promise<any> {
    const secret = dto.secret || require('crypto').randomBytes(32).toString('hex');
    return this.prisma.webhookEndpoint.create({
      data: {
        zoneId,
        url: dto.url,
        secret,
        events: dto.events,
        createdBy,
      },
    });
  }

  async getWebhookEndpoints(zoneId: string): Promise<any[]> {
    return this.prisma.webhookEndpoint.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async testWebhookEndpoint(endpointId: string): Promise<{ success: boolean; responseMs: number; error?: string }> {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } });
    if (!endpoint) return { success: false, responseMs: 0, error: 'Endpoint not found' };
    if (!endpoint.isActive) return { success: false, responseMs: 0, error: 'Endpoint inactive' };

    const payload = {
      event: 'webhook.test',
      data: { message: 'IDOP webhook test', timestamp: new Date().toISOString() },
      zoneId: endpoint.zoneId,
    };

    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', endpoint.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IDOP-Signature': `sha256=${signature}`,
          'X-IDOP-Event': 'webhook.test',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseMs = Date.now() - start;

      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          lastSuccessAt: response.ok ? new Date() : undefined,
          lastFailureAt: !response.ok ? new Date() : undefined,
          failureCount: response.ok ? 0 : { increment: 1 },
        },
      });

      return { success: response.ok, responseMs };
    } catch (err: any) {
      const responseMs = Date.now() - start;
      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { lastFailureAt: new Date(), failureCount: { increment: 1 } },
      });
      return { success: false, responseMs, error: err.message };
    }
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async getWebhookDeliveries(endpointId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
    });
  }

  private async resolveRecipients(dto: SendNotificationDto): Promise<string[]> {
    if (dto.recipientId) return [dto.recipientId];

    if (dto.recipientRole && dto.zoneId) {
      const users = await this.prisma.user.findMany({
        where: { zoneId: dto.zoneId, role: dto.recipientRole as any },
        select: { id: true },
      });
      return users.map(u => u.id);
    }

    if (dto.recipientGroupId && dto.zoneId) {
      const group = await this.prisma.notificationGroup.findFirst({
        where: { zoneId: dto.zoneId, code: dto.recipientGroupId, isActive: true },
      });
      return group?.memberIds || [];
    }

    if (dto.zoneId) {
      const users = await this.prisma.user.findMany({
        where: { zoneId: dto.zoneId },
        select: { id: true },
      });
      return users.map(u => u.id);
    }

    return [];
  }

  private getDeliveryAddress(channel: string, recipientId: string, pref: any): string | null {
    if (channel === 'SMS') return pref?.phone || null;
    if (channel === 'EMAIL') return pref?.emailAddress || null;
    return null;
  }

  private async updateUnreadCount(userId: string): Promise<void> {
    const total = await this.prisma.notificationDelivery.count({
      where: { recipientId: userId, isRead: false, isDismissed: false },
    });
    await this.redis.set(REDIS_KEYS.notifUnread(userId), JSON.stringify({ total }), 30);
    this.eventEmitter.emit('notification.socket.unread', { userId, total });
  }
}
