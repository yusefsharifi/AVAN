import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHubService } from './notification-hub.service';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('NotificationHubService', () => {
  let service: NotificationHubService;

  const mockNotification = {
    id: 'n1', module: 'PERMIT', eventType: 'permit.issued', priority: 'NORMAL',
    titleFa: 'مجوز صادر شد', bodyFa: 'body', actionUrl: null, actionLabelFa: null,
    entityType: 'PERMIT', entityId: 'p1', imageUrl: null, createdAt: new Date(), zoneId: 'z1',
  };

  const mockPrisma = {
    notification: {
      create: jest.fn().mockResolvedValue(mockNotification),
      findUnique: jest.fn().mockResolvedValue(mockNotification),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({}),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    notificationDelivery: {
      create: jest.fn().mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'IN_APP', status: 'PENDING',
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'IN_APP', status: 'PENDING', isRead: false,
        notification: mockNotification,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    userNotificationPreference: {
      create: jest.fn().mockResolvedValue({
        userId: 'u1', allEnabled: true, inAppEnabled: true, smsEnabled: true,
        emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
        dndEnabled: false, emailAddress: null,
      }),
      findUnique: jest.fn().mockResolvedValue({
        userId: 'u1', allEnabled: true, inAppEnabled: true, smsEnabled: true,
        emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
        dndEnabled: false, emailAddress: null,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    notificationRule: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
    notificationGroup: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'u1' }]),
    },
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockSms = {
    send: jest.fn().mockResolvedValue({ success: true, provider: 'kavenegar', messageId: '123' }),
    validateIranianPhone: jest.fn().mockReturnValue('09121234567'),
  };

  const mockEmail = {
    sendNotificationEmail: jest.fn().mockResolvedValue({ success: true, provider: 'smtp' }),
  };

  const mockPush = {
    sendFcm: jest.fn().mockResolvedValue({ success: true, sentCount: 1, failedCount: 0, invalidTokens: [] }),
    cleanupInvalidTokens: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock return values
    mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
    mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
      id: 'd1', recipientId: 'u1', channel: 'IN_APP', status: 'PENDING', isRead: false,
      notification: mockNotification,
    });
    mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
      userId: 'u1', allEnabled: true, inAppEnabled: true, smsEnabled: true,
      emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
      dndEnabled: false, emailAddress: null,
    });
    mockRedis.get.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationHubService,
        { provide: require('../../../prisma/prisma.service').PrismaService, useValue: mockPrisma },
        { provide: require('../../../redis/redis.service').RedisService, useValue: mockRedis },
        { provide: SmsService, useValue: mockSms },
        { provide: EmailService, useValue: mockEmail },
        { provide: PushNotificationService, useValue: mockPush },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<NotificationHubService>(NotificationHubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should create notification record', async () => {
      await service.send({
        module: 'PERMIT', eventType: 'permit.issued', priority: 'NORMAL',
        title: 'Permit Issued', titleFa: 'مجوز صادر شد', recipientId: 'u1',
      });
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should resolve recipients from role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

      await service.send({
        module: 'PERMIT', eventType: 'permit.issued', priority: 'NORMAL',
        title: 'Permit Issued', titleFa: 'مجوز صادر شد',
        recipientRole: 'COMPANY_ADMIN', zoneId: 'z1',
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: 'COMPANY_ADMIN' }) }),
      );
    });

    it('should create delivery records per channel', async () => {
      await service.send({
        module: 'PERMIT', eventType: 'permit.issued', priority: 'NORMAL',
        title: 'Permit Issued', titleFa: 'مجوز صادر شد', recipientId: 'u1',
      });
      expect(mockPrisma.notificationDelivery.create).toHaveBeenCalled();
    });

    it('should emit delivery event for each channel', async () => {
      await service.send({
        module: 'PERMIT', eventType: 'permit.issued', priority: 'NORMAL',
        title: 'Permit Issued', titleFa: 'مجوز صادر شد', recipientId: 'u1',
        channels: ['IN_APP'],
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'notification.deliver.in_app', expect.any(Object),
      );
    });
  });

  describe('dispatchToRecipient', () => {
    it('should always include IN_APP channel', async () => {
      await service.dispatchToRecipient('n1', 'u1');
      expect(mockPrisma.notificationDelivery.create).toHaveBeenCalled();
      const calls = mockPrisma.notificationDelivery.create.mock.calls;
      const channels = calls.map((c: any) => c[0].data.channel);
      expect(channels).toContain('IN_APP');
    });

    it('should filter channels by user preferences', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', allEnabled: true, inAppEnabled: true, smsEnabled: false,
        emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
        dndEnabled: false, emailAddress: null,
      });

      await service.dispatchToRecipient('n1', 'u1');

      const calls = mockPrisma.notificationDelivery.create.mock.calls;
      for (const call of calls) {
        expect(call[0].data.channel).not.toBe('SMS');
      }
    });

    it('should suppress non-CRITICAL during DND', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', allEnabled: true, inAppEnabled: true, smsEnabled: true,
        emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
        dndEnabled: true, dndStartTime: '00:00', dndEndTime: '23:59', dndDays: [],
        emailAddress: null,
      });

      await service.dispatchToRecipient('n1', 'u1');

      // Only IN_APP should remain (SMS, EMAIL, PUSH filtered by DND)
      const calls = mockPrisma.notificationDelivery.create.mock.calls;
      for (const call of calls) {
        expect(['IN_APP', 'WEBHOOK']).toContain(call[0].data.channel);
      }
    });
  });

  describe('deliverInApp', () => {
    it('should mark delivery as SENT and emit socket event', async () => {
      await service.deliverInApp('d1');
      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'SENT' }) }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.socket.new', expect.any(Object));
    });
  });

  describe('deliverSms', () => {
    it('should call SmsService.send', async () => {
      mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'SMS', status: 'PENDING', isRead: false,
        address: '09121234567', notification: mockNotification,
      });

      await service.deliverSms('d1');
      expect(mockSms.send).toHaveBeenCalled();
    });

    it('should schedule retry on failure', async () => {
      mockSms.send.mockResolvedValue({ success: false, provider: 'kavenegar', errorMessage: 'failed' });
      mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'SMS', status: 'PENDING', isRead: false,
        attemptCount: 0, maxAttempts: 3, address: '09121234567', notification: mockNotification,
      });

      await service.deliverSms('d1');
      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalled();
    });
  });

  describe('deliverEmail', () => {
    it('should call EmailService.sendNotificationEmail', async () => {
      mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'EMAIL', status: 'PENDING', isRead: false,
        address: 'test@test.com', notification: mockNotification,
      });

      await service.deliverEmail('d1');
      expect(mockEmail.sendNotificationEmail).toHaveBeenCalled();
    });
  });

  describe('deliverPush', () => {
    it('should call PushNotificationService.sendFcm', async () => {
      mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
        id: 'd1', recipientId: 'u1', channel: 'PUSH', status: 'PENDING', isRead: false,
        notification: mockNotification,
      });
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', fcmTokens: ['token1'], apnsTokens: [], allEnabled: true,
        inAppEnabled: true, smsEnabled: true, emailEnabled: true, pushEnabled: true,
      });

      await service.deliverPush('d1');
      expect(mockPush.sendFcm).toHaveBeenCalledWith(['token1'], expect.any(Object));
    });
  });

  describe('getInbox', () => {
    it('should return paginated results', async () => {
      const result = await service.getInbox('u1', 'z1', { limit: 10 } as any);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });
  });

  describe('markAsRead', () => {
    it('should update delivery status to READ', async () => {
      mockPrisma.notificationDelivery.findUnique.mockResolvedValue({
        id: 'd1', recipientId: 'u1', isRead: false,
      });

      await service.markAsRead('d1', 'u1');

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRead: true, status: 'READ' }) }),
      );
    });
  });

  describe('getPreferences', () => {
    it('should create default preferences if not exist', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue(null);
      await service.getPreferences('new-user');
      expect(mockPrisma.userNotificationPreference.create).toHaveBeenCalled();
    });

    it('should return existing preferences', async () => {
      const result = await service.getPreferences('u1');
      expect(result).toBeDefined();
    });
  });

  describe('isInDnd', () => {
    it('should return false for CRITICAL priority', async () => {
      const result = await service.isInDnd('u1', 'CRITICAL');
      expect(result).toBe(false);
    });

    it('should return true during DND hours', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', allEnabled: true, dndEnabled: true, dndStartTime: '00:00', dndEndTime: '23:59', dndDays: [],
        inAppEnabled: true, smsEnabled: true, emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
      });

      const result = await service.isInDnd('u1', 'NORMAL');
      expect(result).toBe(true);
    });

    it('should return false when DND not enabled', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', allEnabled: true, dndEnabled: false, dndStartTime: null, dndEndTime: null, dndDays: [],
        inAppEnabled: true, smsEnabled: true, emailEnabled: true, pushEnabled: true, fcmTokens: [], apnsTokens: [],
      });

      const result = await service.isInDnd('u1', 'NORMAL');
      expect(result).toBe(false);
    });
  });

  describe('resolveChannels', () => {
    it('should always include IN_APP', async () => {
      const channels = await service.resolveChannels('PERMIT', 'permit.issued', 'NORMAL');
      expect(channels).toContain('IN_APP');
    });

    it('should always include SMS for CRITICAL', async () => {
      const channels = await service.resolveChannels('HSE', 'hse.incident.critical', 'CRITICAL');
      expect(channels).toContain('SMS');
      expect(channels).toContain('IN_APP');
    });
  });

  describe('isThrottled', () => {
    it('should return false on first send', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.isThrottled('u1', 'group-key', 30);
      expect(result).toBe(false);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should return true within throttle window', async () => {
      mockRedis.get.mockResolvedValue('1');
      const result = await service.isThrottled('u1', 'group-key', 30);
      expect(result).toBe(true);
    });
  });

  describe('registerPushToken', () => {
    it('should add FCM token', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', fcmTokens: [], apnsTokens: [], allEnabled: true,
        inAppEnabled: true, smsEnabled: true, emailEnabled: true, pushEnabled: true,
      });

      await service.registerPushToken('u1', { token: 'fcm-token-1', platform: 'fcm' });

      expect(mockPrisma.userNotificationPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fcmTokens: ['fcm-token-1'] }) }),
      );
    });

    it('should add APNs token', async () => {
      mockPrisma.userNotificationPreference.findUnique.mockResolvedValue({
        userId: 'u1', fcmTokens: [], apnsTokens: [], allEnabled: true,
        inAppEnabled: true, smsEnabled: true, emailEnabled: true, pushEnabled: true,
      });

      await service.registerPushToken('u1', { token: 'apns-token-1', platform: 'apns' });

      expect(mockPrisma.userNotificationPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ apnsTokens: ['apns-token-1'] }) }),
      );
    });
  });
});
