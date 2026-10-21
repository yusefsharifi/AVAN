import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { CreateAccountCodeDto, UpdateAccountCodeDto } from '../dto/account-code.dto';
import { CHART_OF_ACCOUNTS_SEED } from '../data/chart-of-accounts.seed';

@Injectable()
export class AccountCodeService {
  private readonly logger = new Logger(AccountCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAccountCodeDto, createdBy: string): Promise<any> {
    // Check unique code per zone
    const existing = await this.prisma.accountCode.findFirst({
      where: { code: dto.code, zoneId: dto.zoneId || null },
    });

    if (existing) {
      throw new AppException('ACCOUNT_CODE_TAKEN');
    }

    // If parentId specified, verify it exists
    if (dto.parentId) {
      const parent = await this.prisma.accountCode.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new AppException('ACCOUNT_NOT_FOUND');
      }
    }

    const account = await this.prisma.accountCode.create({
      data: {
        zoneId: dto.zoneId || null,
        code: dto.code,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        type: dto.type as any,
        category: dto.category as any,
        parentId: dto.parentId,
        level: dto.level || 1,
        normalBalance: dto.normalBalance as any,
        description: dto.description,
        createdBy,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId || undefined,
      userId: createdBy,
      targetId: account.id,
      targetType: 'AccountCode',
      action: 'ACCOUNT_CREATED',
      metadata: { code: dto.code, nameFa: dto.nameFa },
    });

    return account;
  }

  async update(id: string, dto: UpdateAccountCodeDto, updatedBy: string): Promise<any> {
    const account = await this.prisma.accountCode.findUnique({ where: { id } });
    if (!account) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    const updated = await this.prisma.accountCode.update({
      where: { id },
      data: {
        ...(dto.nameFa !== undefined && { nameFa: dto.nameFa }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await this.audit.log({
      zoneId: account.zoneId || undefined,
      userId: updatedBy,
      targetId: id,
      targetType: 'AccountCode',
      action: 'ACCOUNT_UPDATED',
      metadata: dto as any,
    });

    return updated;
  }

  async findAll(zoneId?: string): Promise<any[]> {
    const where: any = { deletedAt: null };
    if (zoneId) {
      where.OR = [{ zoneId }, { zoneId: null }];
    } else {
      where.zoneId = null;
    }

    return this.prisma.accountCode.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async findTree(zoneId?: string): Promise<any[]> {
    const accounts = await this.findAll(zoneId);

    // Build hierarchical tree
    const accountMap = new Map<string, any>();
    const roots: any[] = [];

    for (const acc of accounts) {
      accountMap.set(acc.code, { ...acc, children: [] });
    }

    for (const acc of accounts) {
      const node = accountMap.get(acc.code)!;
      if (acc.parentCode && accountMap.has(acc.parentCode)) {
        accountMap.get(acc.parentCode)!.children.push(node);
      } else if (!acc.parentCode) {
        roots.push(node);
      }
    }

    return roots;
  }

  async findById(id: string): Promise<any> {
    const account = await this.prisma.accountCode.findUnique({ where: { id } });
    if (!account) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }
    return account;
  }

  async findByCode(code: string, zoneId?: string): Promise<any> {
    const account = await this.prisma.accountCode.findFirst({
      where: { code, zoneId: zoneId || null },
    });
    if (!account) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }
    return account;
  }

  async seedChartOfAccounts(zoneId: string, createdBy: string): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of CHART_OF_ACCOUNTS_SEED) {
      const existing = await this.prisma.accountCode.findFirst({
        where: { code: seed.code, zoneId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Find parent by code if parentCode is specified
      let parentId: string | undefined;
      if (seed.parentCode) {
        const parent = await this.prisma.accountCode.findFirst({
          where: { code: seed.parentCode, zoneId },
        });
        parentId = parent?.id;
      }

      await this.prisma.accountCode.create({
        data: {
          zoneId,
          code: seed.code,
          nameFa: seed.nameFa,
          nameEn: seed.nameEn,
          type: seed.type as any,
          category: seed.category as any,
          parentId,
          level: seed.level,
          normalBalance: seed.normalBalance as any,
          isSystem: seed.isSystem,
          description: seed.description,
          createdBy,
        },
      });

      created++;
    }

    await this.audit.log({
      zoneId,
      userId: createdBy,
      targetType: 'AccountCode',
      action: 'ACCOUNT_CREATED',
      metadata: { action: 'SEED', created, skipped },
    });

    return { created, skipped };
  }

  async deactivate(id: string, deactivatedBy: string): Promise<any> {
    const account = await this.prisma.accountCode.findUnique({ where: { id } });
    if (!account) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    if (account.isSystem) {
      throw new AppException('ACCOUNT_INACTIVE', { message: 'سرفصل سیستمی قابل غیرفعال کردن نیست' });
    }

    // Check if account has children
    const children = await this.prisma.accountCode.findMany({
      where: { parentId: id },
    });

    if (children.length > 0) {
      throw new AppException('ACCOUNT_INACTIVE', { message: 'سرفصل دارای زیرمجموعه است' });
    }

    const updated = await this.prisma.accountCode.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      zoneId: account.zoneId || undefined,
      userId: deactivatedBy,
      targetId: id,
      targetType: 'AccountCode',
      action: 'ACCOUNT_DEACTIVATED',
      metadata: { code: account.code, nameFa: account.nameFa },
    });

    return updated;
  }
}
