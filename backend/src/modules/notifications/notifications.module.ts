import { Module, Global, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationHubService } from './services/notification-hub.service';
import { SmsService } from './services/sms.service';
import { EmailService } from './services/email.service';
import { PushNotificationService } from './services/push-notification.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationAdminController } from './controllers/notification-admin.controller';
import { NotificationGateway } from './gateway/notification.gateway';
import { NotificationSeedService } from './services/notification-seed.service';
import { setNotificationSender } from './utils/notify.helper';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController, NotificationAdminController],
  providers: [
    NotificationHubService,
    SmsService,
    EmailService,
    PushNotificationService,
    NotificationGateway,
    NotificationSeedService,
  ],
  exports: [NotificationHubService, SmsService, EmailService, PushNotificationService, NotificationGateway],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly hub: NotificationHubService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Wire the notify helper to the hub service
    setNotificationSender(async (payload) => {
      await this.hub.send({
        module: payload.module,
        eventType: payload.eventType,
        priority: payload.priority || 'NORMAL',
        zoneId: payload.zoneId,
        companyId: payload.companyId,
        recipientId: payload.recipientId,
        recipientRole: payload.recipientRole,
        recipientGroupId: payload.recipientGroupId,
        title: payload.titleFa,
        titleFa: payload.titleFa,
        body: payload.bodyFa,
        bodyFa: payload.bodyFa,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actionUrl: payload.actionUrl,
        actionLabelFa: payload.actionLabelFa,
        metadata: payload.metadata,
        templateCode: payload.templateCode,
        templateVariables: payload.templateVariables,
      });
    });

    // Register event listeners for async delivery
    this.eventEmitter.on('notification.deliver.in_app', async (data: { deliveryId: string }) => {
      await this.hub.deliverInApp(data.deliveryId);
    });
    this.eventEmitter.on('notification.deliver.sms', async (data: { deliveryId: string }) => {
      await this.hub.deliverSms(data.deliveryId);
    });
    this.eventEmitter.on('notification.deliver.email', async (data: { deliveryId: string }) => {
      await this.hub.deliverEmail(data.deliveryId);
    });
    this.eventEmitter.on('notification.deliver.push', async (data: { deliveryId: string }) => {
      await this.hub.deliverPush(data.deliveryId);
    });
    this.eventEmitter.on('notification.deliver.webhook', async (data: { deliveryId: string }) => {
      // Webhook delivery — find endpoints and POST
    });
  }
}
