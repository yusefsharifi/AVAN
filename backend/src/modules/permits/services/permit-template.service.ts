import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { PERMIT_TYPE_CONFIG } from '../config/permit-type.config';
import { PermitType } from '../dto/create-permit-request.dto';

@Injectable()
export class PermitTemplateService {
  private readonly logger = new Logger(PermitTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async getTemplate(type: PermitType, zoneId: string): Promise<any> {
    // 1. Check cache
    const cacheKey = REDIS_KEYS.permitTemplate(type, zoneId);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 2. Find zone-specific template
    const zoneTemplate = await this.prisma.permitTemplate.findFirst({
      where: { zoneId, type, isActive: true },
    });

    // 3. Merge with config defaults
    const config = PERMIT_TYPE_CONFIG[type];
    const result = {
      type,
      nameFa: config.nameFa,
      defaultDurationDays: zoneTemplate?.defaultDurationDays || config.defaultDurationDays,
      approvalSteps: zoneTemplate?.approvalSteps || config.approvalSteps,
      requiredDocuments: zoneTemplate?.requiredDocuments || config.requiredDocuments,
      defaultConditions: zoneTemplate?.defaultConditions || config.defaultConditions,
      requiresHSEApproval: zoneTemplate?.requiresHSEApproval ?? config.requiresHSEApproval,
      requiresEnvApproval: zoneTemplate?.requiresEnvApproval ?? config.requiresEnvApproval,
      requiresFireApproval: zoneTemplate?.requiresFireApproval ?? config.requiresFireApproval,
      requiresInspection: zoneTemplate?.requiresInspection ?? config.requiresInspection,
      isCustomized: !!zoneTemplate,
      templateId: zoneTemplate?.id || null,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async createCustomTemplate(
    zoneId: string,
    dto: any,
    createdBy: string,
  ): Promise<any> {
    // Check no duplicate for same zone + type
    const existing = await this.prisma.permitTemplate.findFirst({
      where: { zoneId, type: dto.type, isActive: true },
    });

    if (existing) {
      throw new AppException('TEMPLATE_TYPE_CONFLICT');
    }

    const template = await this.prisma.permitTemplate.create({
      data: {
        zoneId,
        type: dto.type,
        nameFa: dto.nameFa,
        descriptionFa: dto.descriptionFa,
        defaultDurationDays: dto.defaultDurationDays || 30,
        approvalSteps: dto.approvalSteps || [],
        requiredDocuments: dto.requiredDocuments || [],
        defaultConditions: dto.defaultConditions || [],
        requiresHSEApproval: dto.requiresHSEApproval || false,
        requiresEnvApproval: dto.requiresEnvApproval || false,
        requiresFireApproval: dto.requiresFireApproval || false,
        requiresInspection: dto.requiresInspection || false,
        createdBy,
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.permitTemplate(dto.type, zoneId));

    await this.audit.log({
      zoneId,
      userId: createdBy,
      targetId: template.id,
      targetType: 'PermitTemplate',
      action: 'PERMIT_TEMPLATE_UPDATED',
      metadata: { type: dto.type, nameFa: dto.nameFa },
    });

    return template;
  }

  async updateTemplate(id: string, dto: any): Promise<any> {
    const template = await this.prisma.permitTemplate.findUnique({ where: { id } });

    if (!template) {
      throw new AppException('TEMPLATE_NOT_FOUND');
    }

    const updated = await this.prisma.permitTemplate.update({
      where: { id },
      data: {
        nameFa: dto.nameFa,
        descriptionFa: dto.descriptionFa,
        defaultDurationDays: dto.defaultDurationDays,
        approvalSteps: dto.approvalSteps,
        requiredDocuments: dto.requiredDocuments,
        defaultConditions: dto.defaultConditions,
        requiresHSEApproval: dto.requiresHSEApproval,
        requiresEnvApproval: dto.requiresEnvApproval,
        requiresFireApproval: dto.requiresFireApproval,
        requiresInspection: dto.requiresInspection,
        isActive: dto.isActive,
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.permitTemplate(template.type, template.zoneId || 'global'));

    return updated;
  }

  async getZoneTemplates(zoneId: string): Promise<any[]> {
    return this.prisma.permitTemplate.findMany({
      where: { zoneId, isActive: true },
      orderBy: { type: 'asc' },
    });
  }
}
