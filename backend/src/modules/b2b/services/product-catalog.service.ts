import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import { CreateProductCatalogDto } from '../dto/create-product.dto';
import { MarketplaceStatsDto } from '../dto/enums';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductCatalogService {
  private readonly logger = new Logger(ProductCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT CATALOG
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateProductCatalogDto, createdBy: string): Promise<any> {
    // Check SKU uniqueness within company if provided
    if (dto.sku) {
      const existing = await this.prisma.productCatalog.findFirst({
        where: { companyId: dto.companyId, sku: dto.sku },
      });
      if (existing) {
        throw new AppException('CATALOG_SKU_DUPLICATE');
      }
    }

    const product = await this.prisma.productCatalog.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        sku: dto.sku,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        categoryId: dto.categoryId,
        categoryPath: dto.categoryPath,
        description: dto.description,
        unit: dto.unit,
        minOrderQty: dto.minOrderQty ? new Prisma.Decimal(dto.minOrderQty) : null,
        leadTimeDays: dto.leadTimeDays,
        price: dto.price ? BigInt(dto.price) : null,
        certifications: dto.certifications || [],
        tags: dto.tags || [],
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: product.id,
      targetType: 'ProductCatalog',
      action: 'CATALOG_PRODUCT_ADDED',
      metadata: { nameFa: dto.nameFa, companyId: dto.companyId },
    });

    return product;
  }

  async update(id: string, dto: Partial<CreateProductCatalogDto>): Promise<any> {
    const existing = await this.prisma.productCatalog.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException('CATALOG_PRODUCT_NOT_FOUND');
    }

    const updateData: any = {};
    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price ? BigInt(dto.price) : null;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.minOrderQty !== undefined)
      updateData.minOrderQty = dto.minOrderQty ? new Prisma.Decimal(dto.minOrderQty) : null;
    if (dto.leadTimeDays !== undefined) updateData.leadTimeDays = dto.leadTimeDays;
    if (dto.certifications !== undefined) updateData.certifications = dto.certifications;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isAvailable !== undefined) updateData.isAvailable = dto.isAvailable;

    // Invalidate cache
    await this.redis.delPattern(`b2b:catalog:search:${existing.zoneId}:*`);

    return this.prisma.productCatalog.update({ where: { id }, data: updateData });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.productCatalog.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException('CATALOG_PRODUCT_NOT_FOUND');
    }

    // Soft delete by setting isAvailable=false
    await this.prisma.productCatalog.update({
      where: { id },
      data: { isAvailable: false },
    });

    // Invalidate cache
    await this.redis.delPattern(`b2b:catalog:search:${existing.zoneId}:*`);
  }

  async search(
    zoneId: string,
    query: string,
    categoryId?: string,
    isAvailable?: boolean,
  ): Promise<any[]> {
    // Check cache
    const queryHash = crypto
      .createHash('md5')
      .update(`${query}:${categoryId || ''}:${isAvailable !== undefined ? isAvailable : ''}`)
      .digest('hex');
    const cacheKey = REDIS_KEYS.b2bCatalogSearch(zoneId, queryHash);
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { zoneId };

    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    if (categoryId) where.categoryId = categoryId;

    if (query) {
      where.OR = [
        { nameFa: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    const results = await this.prisma.productCatalog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        company: { select: { id: true, nameFa: true } },
      },
    });

    await this.redis.setJson(cacheKey, results, REDIS_TTL.B2B_CATALOG_SEARCH);
    return results;
  }

  async getByCompany(companyId: string): Promise<any[]> {
    return this.prisma.productCatalog.findMany({
      where: { companyId, isAvailable: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const product = await this.prisma.productCatalog.findUnique({
      where: { id },
      include: { company: { select: { id: true, nameFa: true } } },
    });
    if (!product) {
      throw new AppException('CATALOG_PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string }> {
    const product = await this.prisma.productCatalog.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppException('CATALOG_PRODUCT_NOT_FOUND');
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileKey = `b2b-catalog/${product.companyId}/${productId}/${crypto.randomUUID()}.${ext}`;

    // In production: upload to MinIO
    // await this.minio.putObject(BUCKET, fileKey, file.buffer, file.size, { 'Content-Type': file.mimetype });

    // Append the key to the product's imageKeys array
    await this.prisma.productCatalog.update({
      where: { id: productId },
      data: {
        imageKeys: { push: fileKey },
      },
    });

    await this.audit.log({
      zoneId: product.zoneId,
      targetId: productId,
      targetType: 'ProductCatalog',
      action: 'CATALOG_PRODUCT_UPDATED',
      metadata: { productId, fileName: file.originalname, fileKey },
    });

    return { key: fileKey };
  }

  async incrementViewCount(productId: string): Promise<void> {
    await this.prisma.productCatalog.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async getCategoryTree(zoneId?: string): Promise<any[]> {
    const cacheKey = REDIS_KEYS.b2bCategories(zoneId || 'global');
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = { isActive: true };
    if (zoneId) {
      where.OR = [{ zoneId }, { zoneId: null }]; // Zone-specific + global
    } else {
      where.zoneId = null; // Global only
    }

    const categories = await this.prisma.b2BCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree
    const roots = categories.filter((c) => !c.parentId);
    const buildTree = (parentId: string): any[] => {
      return categories
        .filter((c) => c.parentId === parentId)
        .map((c) => ({
          ...c,
          children: buildTree(c.id),
        }));
    };

    const tree = roots.map((root) => ({
      ...root,
      children: buildTree(root.id),
    }));

    await this.redis.setJson(cacheKey, tree, REDIS_TTL.B2B_CATEGORIES);
    return tree;
  }

  async getMarketplaceStats(zoneId: string): Promise<MarketplaceStatsDto> {
    const [
      totalProducts,
      totalSuppliers,
      totalCategories,
      activeRfqs,
      completedTransactions,
      transactionAgg,
    ] = await Promise.all([
      this.prisma.productCatalog.count({
        where: { zoneId, isAvailable: true },
      }),
      this.prisma.supplierProfile.count({
        where: { zoneId, isActive: true },
      }),
      this.prisma.b2BCategory.count({
        where: { OR: [{ zoneId }, { zoneId: null }], isActive: true },
      }),
      this.prisma.rFQ.count({
        where: { zoneId, status: 'PUBLISHED' },
      }),
      this.prisma.b2BTransaction.count({
        where: { zoneId, status: 'COMPLETED' },
      }),
      this.prisma.b2BTransaction.aggregate({
        where: { zoneId },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalProducts,
      totalSuppliers,
      totalCategories,
      activeRfqs,
      completedTransactions,
      totalTransactionVolume: Number(transactionAgg._sum.amount || 0),
    };
  }
}
