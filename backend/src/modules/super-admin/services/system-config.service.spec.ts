import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from './system-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditComplianceService } from './audit-compliance.service';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let prisma: any;
  let redis: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      systemConfiguration: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    auditCompliance = {
      logGlobalEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  describe('get', () => {
    it('should return cached value if available', async () => {
      redis.get.mockResolvedValue('cached-value');

      const result = await service.get('SMS_API_KEY');

      expect(result).toBe('cached-value');
    });

    it('should query DB and cache result', async () => {
      redis.get.mockResolvedValue(null);
      prisma.systemConfiguration.findUnique.mockResolvedValue({
        key: 'SMS_API_KEY',
        value: 'test-key-123',
        isEncrypted: false,
      });

      const result = await service.get('SMS_API_KEY');

      expect(result).toBe('test-key-123');
      expect(redis.set).toHaveBeenCalledWith('config:SMS_API_KEY', 'test-key-123', 1800);
    });

    it('should decrypt encrypted values', async () => {
      redis.get.mockResolvedValue(null);
      // Create a real encrypted value
      const { encrypt } = require('../utils/super-admin.utils');
      const encrypted = encrypt('secret-value', process.env.CONFIG_ENCRYPTION_KEY as string);

      prisma.systemConfiguration.findUnique.mockResolvedValue({
        key: 'SMS_API_KEY',
        value: encrypted,
        isEncrypted: true,
      });

      const result = await service.get('SMS_API_KEY');

      expect(result).toBe('secret-value');
    });

    it('should return null if key not found', async () => {
      redis.get.mockResolvedValue(null);
      prisma.systemConfiguration.findUnique.mockResolvedValue(null);

      const result = await service.get('NONEXISTENT_KEY');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should upsert config value', async () => {
      await service.set({ key: 'SMS_API_KEY', value: 'new-key' }, 'admin-1');

      expect(prisma.systemConfiguration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'SMS_API_KEY' },
          create: expect.objectContaining({ value: 'new-key' }),
          update: expect.objectContaining({ value: 'new-key' }),
        }),
      );
    });

    it('should encrypt value when isEncrypted is true', async () => {
      await service.set({ key: 'SMS_API_KEY', value: 'secret', isEncrypted: true }, 'admin-1');

      const createCall = prisma.systemConfiguration.upsert.mock.calls[0][0];
      // Encrypted value should contain hex with colons (iv:tag:encrypted)
      expect(createCall.create.value).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    });

    it('should clear Redis cache', async () => {
      await service.set({ key: 'SMS_API_KEY', value: 'new-key' }, 'admin-1');

      expect(redis.del).toHaveBeenCalledWith('config:SMS_API_KEY');
    });

    it('should write global audit log', async () => {
      await service.set({ key: 'SMS_API_KEY', value: 'new-key' }, 'admin-1');

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'CONFIG_UPDATED',
        'SUPER_ADMIN',
        'admin-1',
        undefined,
        'SystemConfiguration',
        undefined,
        expect.objectContaining({ key: 'SMS_API_KEY' }),
      );
    });
  });

  describe('getAll', () => {
    it('should return all configs', async () => {
      prisma.systemConfiguration.findMany.mockResolvedValue([
        { key: 'SMS_API_KEY', value: 'masked', isEncrypted: false, category: 'SMS' },
        { key: 'EMAIL_HOST', value: 'smtp.test.com', isEncrypted: false, category: 'EMAIL' },
      ]);

      const result = await service.getAll();

      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      prisma.systemConfiguration.findMany.mockResolvedValue([
        { key: 'SMS_API_KEY', value: 'key', isEncrypted: false, category: 'SMS' },
      ]);

      const result = await service.getAll('SMS');

      expect(result).toHaveLength(1);
    });
  });

  describe('getSecurityPolicies', () => {
    it('should return security policies from config', async () => {
      redis.get.mockResolvedValue(null);
      prisma.systemConfiguration.findUnique.mockResolvedValue(null);

      const result = await service.getSecurityPolicies();

      expect(result).toHaveProperty('passwordMinLength');
      expect(result).toHaveProperty('maxLoginAttempts');
      expect(result).toHaveProperty('sessionTimeoutMinutes');
    });
  });
});
