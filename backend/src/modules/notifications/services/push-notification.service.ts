import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface PushResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  invalidTokens: string[];
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendFcm(tokens: string[], dto: {
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    data?: Record<string, string>;
  }): Promise<PushResult> {
    if (!tokens.length) return { success: true, sentCount: 0, failedCount: 0, invalidTokens: [] };

    // In production, use firebase-admin SDK
    // For now, log the attempt
    this.logger.log(`FCM push to ${tokens.length} tokens: ${dto.title}`);
    return { success: true, sentCount: tokens.length, failedCount: 0, invalidTokens: [] };
  }

  async sendApns(tokens: string[], dto: {
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    sound?: string;
    badge?: number;
  }): Promise<PushResult> {
    if (!tokens.length) return { success: true, sentCount: 0, failedCount: 0, invalidTokens: [] };
    this.logger.log(`APNs push to ${tokens.length} tokens: ${dto.title}`);
    return { success: true, sentCount: tokens.length, failedCount: 0, invalidTokens: [] };
  }

  async sendWebPush(subscription: WebPushSubscription, dto: {
    title: string;
    body: string;
    actionUrl?: string;
  }): Promise<void> {
    this.logger.log(`Web Push: ${dto.title}`);
  }

  async cleanupInvalidTokens(userId: string, invalidTokens: string[]): Promise<void> {
    if (!invalidTokens.length) return;

    const pref = await this.prisma.userNotificationPreference.findUnique({ where: { userId } });
    if (!pref) return;

    const fcmTokens = (pref.fcmTokens || []).filter(t => !invalidTokens.includes(t));
    const apnsTokens = (pref.apnsTokens || []).filter(t => !invalidTokens.includes(t));

    await this.prisma.userNotificationPreference.update({
      where: { userId },
      data: { fcmTokens, apnsTokens },
    });
  }

  async getVapidPublicKey(): Promise<string | null> {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}
