// M21: Super Admin Panel — System Config Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { UpdateSystemConfigDto } from '../dto/create-dtos';
import type { SystemConfigDto, SecurityPoliciesDto } from '../dto/enums';
import { encrypt, decrypt, DEFAULT_CONFIG } from '../utils/super-admin.utils';
import { AuditComplianceService } from './audit-compliance.service';

// NEW-003: Fail in production if CONFIG_ENCRYPTION_KEY is not set
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: CONFIG_ENCRYPTION_KEY must be set in production');
}

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditCompliance: AuditComplianceService,
  ) {}

  async get(key: string): Promise<string | null> {
    const cacheKey = `config:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return cached;

    const config = await this.prisma.systemConfiguration.findUnique({ where: { key } });
    if (!config) return null;

    let value = config.value;
    if (config.isEncrypted && ENCRYPTION_KEY) {
      try { value = decrypt(value, ENCRYPTION_KEY); } catch { this.logger.error(`Failed to decrypt config: ${key}`); }
    }

    await this.redis.set(cacheKey, value, 1800);
    return value;
  }

  async set(dto: UpdateSystemConfigDto, updatedBy: string): Promise<void> {
    let value = dto.value;
    if (dto.isEncrypted && ENCRYPTION_KEY) {
      value = encrypt(value, ENCRYPTION_KEY);
    }

    await this.prisma.systemConfiguration.upsert({
      where: { key: dto.key },
      create: { key: dto.key, value, isEncrypted: dto.isEncrypted || false, description: dto.description || undefined, category: dto.key.split('_')[0], updatedBy },
      update: { value, isEncrypted: dto.isEncrypted || false, description: dto.description, updatedBy },
    });

    await this.redis.del(`config:${dto.key}`);
    await this.auditCompliance.logGlobalEvent('CONFIG_UPDATED', 'SUPER_ADMIN', updatedBy, undefined, 'SystemConfiguration', undefined, { key: dto.key });
  }

  async getAll(category?: string): Promise<SystemConfigDto[]> {
    const where = category ? { category } : {};
    const configs = await this.prisma.systemConfiguration.findMany({ where, orderBy: { key: 'asc' } });
    return configs.map((c) => ({
      key: c.key, value: c.isEncrypted ? '********' : c.value, category: c.category,
      isEncrypted: c.isEncrypted, description: c.description || null, updatedAt: c.updatedAt,
    }));
  }

  async getSecurityPolicies(): Promise<SecurityPoliciesDto> {
    return {
      passwordMinLength: parseInt(await this.get('PASSWORD_MIN_LENGTH') || '8'),
      passwordRequireUpper: true,
      passwordRequireNumber: true,
      maxLoginAttempts: parseInt(await this.get('MAX_LOGIN_ATTEMPTS') || '5'),
      sessionTimeoutMinutes: parseInt(await this.get('SESSION_TIMEOUT_MINUTES') || '30'),
      jwtExpiryMinutes: parseInt(await this.get('JWT_EXPIRY_MINUTES') || '15'),
      mfaRequired: { roles: ['SUPER_ADMIN'] },
      allowedIpRanges: [],
    };
  }

  async seedDefaults(): Promise<void> {
    for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
      const existing = await this.prisma.systemConfiguration.findUnique({ where: { key } });
      if (!existing) {
        let value = config.value;
        if (config.isEncrypted && value && ENCRYPTION_KEY) value = encrypt(value, ENCRYPTION_KEY);
        await this.prisma.systemConfiguration.create({ data: { key, value, isEncrypted: config.isEncrypted, description: config.description, category: key.split('_')[0] } });
      }
    }
  }
}
