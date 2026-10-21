import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NOTIFICATION_RULES_SEED, NOTIFICATION_TEMPLATES_SEED } from '../data/notification-seed.data';

@Injectable()
export class NotificationSeedService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedRules();
      await this.seedTemplates();
    } catch (err) {
      this.logger.warn('Notification seed skipped (DB may not be ready)');
    }
  }

  async seedRules(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of NOTIFICATION_RULES_SEED) {
      try {
        // Check if rule already exists (by unique compound key)
        const existing = await this.prisma.notificationRule.findFirst({
          where: {
            module: seed.module as any,
            eventType: seed.eventType,
            targetType: seed.targetType as any,
            targetValue: seed.targetValue || null,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.notificationRule.create({
          data: {
            module: seed.module as any,
            eventType: seed.eventType,
            targetType: seed.targetType as any,
            targetValue: seed.targetValue || null,
            channels: seed.channels as any,
            priority: seed.priority as any,
            conditions: seed.conditions || null,
            throttleEnabled: seed.throttleEnabled || false,
            throttleMinutes: seed.throttleMinutes || null,
            createdBy: 'system',
          },
        });

        created++;
      } catch (err) {
        this.logger.warn(`Failed to create rule ${seed.module}.${seed.eventType}: ${err}`);
        skipped++;
      }
    }

    this.logger.log(`Notification rules seed: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }

  async seedTemplates(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of NOTIFICATION_TEMPLATES_SEED) {
      try {
        // Check if template already exists
        const existing = await this.prisma.notificationTemplate.findFirst({
          where: {
            code: seed.code,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.notificationTemplate.create({
          data: {
            code: seed.code,
            module: seed.module as any,
            eventType: seed.eventType,
            channel: seed.channel as any,
            language: seed.language,
            subject: seed.subject || null,
            titleTemplate: seed.titleTemplate,
            bodyTemplate: seed.bodyTemplate,
            smsTemplate: seed.smsTemplate || null,
            htmlTemplate: seed.htmlTemplate || null,
            createdBy: 'system',
          },
        });

        created++;
      } catch (err) {
        this.logger.warn(`Failed to create template ${seed.code}: ${err}`);
        skipped++;
      }
    }

    this.logger.log(`Notification templates seed: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }
}
