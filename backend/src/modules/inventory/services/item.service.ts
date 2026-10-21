import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateItemDto, FilterItemsDto } from '../dto/create-dtos';
import type { PaginatedResult, LowStockDto, ExpiringItemDto, StockLevelDto, InventoryValuationDto } from '../dto/enums';
import * as crypto from 'crypto';

@Injectable()
export class ItemService {
  private readonly logger = new Logger(ItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateItemDto, createdBy: string): Promise<any> {
    // Generate itemCode
    const companyCode = dto.companyId ? (await this.prisma.company.findUnique({ where: { id: dto.companyId } }))?.nameEn?.substring(0, 3).toUpperCase() || 'ITM' : 'ITM';
    const seqKey = `inv:item:seq:${dto.companyId || dto.zoneId}`;
    const seq = await this.redis.incr(seqKey);
    const itemCode = `ITM-${companyCode}-${String(seq).padStart(6, '0')}`;

    // Validate category
    const category = await this.prisma.itemCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new AppException('ITEM_NOT_FOUND');

    // Validate barcode uniqueness
    if (dto.barcode) {
      const existing = await this.prisma.item.findFirst({ where: { barcode: dto.barcode } });
      if (existing) throw new AppException('ITEM_BARCODE_DUPLICATE');
    }

    const item = await this.prisma.item.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        itemCode,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        categoryId: dto.categoryId,
        type: dto.type,
        unit: dto.unit,
        altUnit: dto.altUnit,
        altUnitConversion: dto.altUnitConversion,
        brand: dto.brand,
        model: dto.model,
        specifications: dto.specifications,
        barcode: dto.barcode,
        minStock: dto.minStock || 0,
        maxStock: dto.maxStock,
        reorderPoint: dto.reorderPoint || 0,
        reorderQty: dto.reorderQty || 0,
        leadTimeDays: dto.leadTimeDays || 7,
        trackByBatch: dto.trackByBatch || false,
        trackBySerial: dto.trackBySerial || false,
        hasExpiry: dto.hasExpiry || false,
        expiryWarningDays: dto.expiryWarningDays || 30,
        valuationMethod: dto.valuationMethod || 'WEIGHTED_AVG',
        taxRate: dto.taxRate || 9,
        isService: dto.isService || false,
        isStorable: dto.isStorable !== false,
        isPurchasable: dto.isPurchasable !== false,
        isSalable: dto.isSalable !== false,
        notes: dto.notes,
        createdBy,
      },
    });

    await this.audit.log({ zoneId: dto.zoneId, action: 'ITEM_CREATED', targetType: 'Item', targetId: item.id, userId: createdBy, metadata: { itemCode, nameFa: dto.nameFa } });
    return item;
  }

  async update(id: string, dto: Partial<CreateItemDto>, _updatedBy: string): Promise<any> {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new AppException('ITEM_NOT_FOUND');
    return this.prisma.item.update({ where: { id }, data: { ...dto } });
  }

  async findAll(filter: FilterItemsDto): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.type) where.type = filter.type;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.search) {
      where.OR = [
        { nameFa: { contains: filter.search, mode: 'insensitive' } },
        { nameEn: { contains: filter.search, mode: 'insensitive' } },
        { itemCode: { contains: filter.search, mode: 'insensitive' } },
        { barcode: { contains: filter.search } },
      ];
    }

    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.item.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.item.count({ where }),
    ]);

    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const item = await this.prisma.item.findUnique({ where: { id }, include: { category: true } });
    if (!item || item.deletedAt) throw new AppException('ITEM_NOT_FOUND');
    return item;
  }

  async findByBarcode(barcode: string): Promise<any | null> {
    return this.prisma.item.findFirst({ where: { barcode, deletedAt: null } });
  }

  async getLowStockItems(zoneId: string, companyId?: string): Promise<LowStockDto[]> {
    const where: any = { zoneId, deletedAt: null, isActive: true };
    if (companyId) where.companyId = companyId;

    const items = await this.prisma.item.findMany({ where });
    const result: LowStockDto[] = [];

    for (const item of items) {
      const stockEntries = await this.prisma.stockEntry.findMany({ where: { itemId: item.id } });
      const currentStock = stockEntries.reduce((sum, e) => sum + Number(e.availableQty), 0);
      const reorderPoint = Number(item.reorderPoint);

      if (currentStock <= reorderPoint && reorderPoint > 0) {
        result.push({
          itemId: item.id,
          itemCode: item.itemCode,
          itemNameFa: item.nameFa,
          currentStock,
          reorderPoint,
          reorderQty: Number(item.reorderQty),
          leadTimeDays: item.leadTimeDays,
        });
      }
    }

    return result;
  }

  async getExpiringItems(zoneId: string, withinDays: number): Promise<ExpiringItemDto[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const entries = await this.prisma.stockEntry.findMany({
      where: { zoneId, expiryDate: { not: null, lte: futureDate }, quantity: { gt: 0 } },
      include: { item: { select: { itemCode: true, nameFa: true } }, warehouse: { select: { nameFa: true } } },
    });

    return entries.map((e) => ({
      itemId: e.itemId,
      itemCode: e.item.itemCode,
      itemNameFa: e.item.nameFa,
      batchNumber: e.batchNumber,
      expiryDate: e.expiryDate!,
      quantity: Number(e.quantity),
      warehouseId: e.warehouseId,
      warehouseName: e.warehouse.nameFa,
      daysUntilExpiry: Math.ceil((e.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  async getStockLevel(itemId: string, warehouseId?: string): Promise<StockLevelDto> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new AppException('ITEM_NOT_FOUND');

    const where: any = { itemId };
    if (warehouseId) where.warehouseId = warehouseId;

    const entries = await this.prisma.stockEntry.findMany({ where, include: { warehouse: { select: { id: true, nameFa: true } } } });

    const totalQty = entries.reduce((sum, e) => sum + Number(e.quantity), 0);
    const availableQty = entries.reduce((sum, e) => sum + Number(e.availableQty), 0);
    const reservedQty = entries.reduce((sum, e) => sum + Number(e.reservedQty), 0);
    const totalValue = entries.reduce((sum, e) => sum + e.totalValue, 0n);

    const warehouseMap = new Map<string, { warehouseId: string; warehouseName: string; qty: number; value: bigint }>();
    for (const e of entries) {
      const key = e.warehouseId;
      const existing = warehouseMap.get(key);
      if (existing) {
        existing.qty += Number(e.quantity);
        existing.value += e.totalValue;
      } else {
        warehouseMap.set(key, { warehouseId: e.warehouseId, warehouseName: e.warehouse.nameFa, qty: Number(e.quantity), value: e.totalValue });
      }
    }

    const avgCost = totalQty > 0 ? totalValue / BigInt(totalQty) : 0n;
    const lastEntry = entries.sort((a, b) => (b.lastMovementAt?.getTime() || 0) - (a.lastMovementAt?.getTime() || 0))[0];

    return {
      itemId, itemCode: item.itemCode, itemNameFa: item.nameFa,
      totalQty, availableQty, reservedQty,
      byWarehouse: Array.from(warehouseMap.values()),
      avgCost, totalValue, lastMovement: lastEntry?.lastMovementAt || undefined,
    };
  }

  async uploadImage(id: string, file: Express.Multer.File): Promise<string> {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new AppException('ITEM_NOT_FOUND');
    const ext = file.originalname.split('.').pop() || 'jpg';
    const imageKey = `inv-items/${item.companyId || item.zoneId}/${id}/${crypto.randomUUID()}.${ext}`;
    const currentKeys = (item.imageKeys as string[]) || [];
    await this.prisma.item.update({ where: { id }, data: { imageKeys: [...currentKeys, imageKey] } });
    return imageKey;
  }

  async getInventoryValuation(zoneId: string, companyId?: string): Promise<InventoryValuationDto> {
    const where: any = { zoneId, deletedAt: null, isActive: true };
    if (companyId) where.companyId = companyId;

    const items = await this.prisma.item.findMany({ where });
    const entries = await this.prisma.stockEntry.findMany({ where: { zoneId } });

    let totalValue = 0n;
    const categoryMap = new Map<string, { categoryId: string; categoryName: string; count: number; value: bigint }>();
    const warehouseMap = new Map<string, { warehouseId: string; warehouseName: string; count: number; value: bigint }>();

    for (const entry of entries) {
      totalValue += entry.totalValue;

      // Populate warehouse map
      const whKey = entry.warehouseId;
      const whExisting = warehouseMap.get(whKey);
      if (whExisting) {
        whExisting.count++;
        whExisting.value += entry.totalValue;
      } else {
        warehouseMap.set(whKey, { warehouseId: whKey, warehouseName: whKey, count: 1, value: entry.totalValue });
      }
    }

    // Populate category map from items
    for (const item of items) {
      const catId = item.categoryId;
      const catExisting = categoryMap.get(catId);
      const itemStock = entries.filter((e) => e.itemId === item.id).reduce((s, e) => s + e.totalValue, 0n);
      if (catExisting) {
        catExisting.count++;
        catExisting.value += itemStock;
      } else {
        categoryMap.set(catId, { categoryId: catId, categoryName: catId, count: 1, value: itemStock });
      }
    }

    const lowStockCount = items.filter((i) => {
      const stock = entries.filter((e) => e.itemId === i.id).reduce((s, e) => s + Number(e.availableQty), 0);
      return stock <= Number(i.reorderPoint) && Number(i.reorderPoint) > 0;
    }).length;

    return {
      totalItems: items.length,
      totalValue,
      byCategory: Array.from(categoryMap.values()),
      byWarehouse: Array.from(warehouseMap.values()),
      lowStockCount,
      expiringSoonCount: 0,
    };
  }
}
