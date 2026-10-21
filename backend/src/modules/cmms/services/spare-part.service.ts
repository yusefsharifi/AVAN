import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateSparePartDto, StockMovementDto, LinkAssetDto } from '../dto/create-dtos';
import type { SparePartReorderDto } from '../dto/enums';
import { CmmsGatewayService } from './cmms-gateway.service';
import { validateStockDeduction } from '../utils/cmms.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class SparePartService {
  private readonly logger = new Logger(SparePartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CmmsGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateSparePartDto, createdBy: string): Promise<any> {
    // Check duplicate part number
    const existing = await (this.prisma as any).sparePart.findFirst({
      where: { zoneId: dto.zoneId, partNumber: dto.partNumber },
    });
    if (existing) throw new AppException('SPARE_PART_NUMBER_DUPLICATE');

    const part = await (this.prisma as any).sparePart.create({
      data: {
        zoneId: dto.zoneId,
        partNumber: dto.partNumber,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        category: dto.category,
        unit: dto.unit || 'عدد',
        manufacturer: dto.manufacturer,
        supplierName: dto.supplierName,
        supplierContact: dto.supplierContact,
        minimumStock: new Prisma.Decimal(dto.minimumStock),
        maximumStock: new Prisma.Decimal(dto.maximumStock),
        reorderPoint: new Prisma.Decimal(dto.reorderPoint),
        reorderQuantity: new Prisma.Decimal(dto.reorderQuantity),
        storageLocation: dto.storageLocation,
        binNumber: dto.binNumber,
        unitCost: BigInt(dto.unitCost),
        notes: dto.notes,
        createdBy,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: createdBy, targetId: part.id, targetType: 'SparePart',
      action: 'SPARE_PART_CREATED',
      metadata: { partNumber: dto.partNumber, nameFa: dto.nameFa },
    });

    return part;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: string, dto: Partial<CreateSparePartDto>): Promise<any> {
    const existing = await this.findById(id);
    const updateData: any = {};

    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.manufacturer !== undefined) updateData.manufacturer = dto.manufacturer;
    if (dto.supplierName !== undefined) updateData.supplierName = dto.supplierName;
    if (dto.minimumStock !== undefined) updateData.minimumStock = new Prisma.Decimal(dto.minimumStock);
    if (dto.maximumStock !== undefined) updateData.maximumStock = new Prisma.Decimal(dto.maximumStock);
    if (dto.reorderPoint !== undefined) updateData.reorderPoint = new Prisma.Decimal(dto.reorderPoint);
    if (dto.reorderQuantity !== undefined) updateData.reorderQuantity = new Prisma.Decimal(dto.reorderQuantity);
    if (dto.storageLocation !== undefined) updateData.storageLocation = dto.storageLocation;
    if (dto.binNumber !== undefined) updateData.binNumber = dto.binNumber;
    if (dto.unitCost !== undefined) updateData.unitCost = BigInt(dto.unitCost);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return (this.prisma as any).sparePart.update({ where: { id }, data: updateData });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId, isActive: true };
    if (filter?.search) {
      where.OR = [
        { partNumber: { contains: filter.search, mode: 'insensitive' } },
        { nameFa: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter?.category) where.category = filter.category;
    if (filter?.isLowStock !== undefined) where.isLowStock = filter.isLowStock;

    const limit = filter?.limit || 20;
    const data = await (this.prisma as any).sparePart.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const part = await (this.prisma as any).sparePart.findUnique({
      where: { id },
      include: { assets: { include: { asset: true } } },
    });
    if (!part) throw new AppException('SPARE_PART_NOT_FOUND');
    return part;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async recordMovement(dto: StockMovementDto, performedBy: string): Promise<any> {
    const part = await (this.prisma as any).sparePart.findUnique({ where: { id: dto.sparePartId } });
    if (!part) throw new AppException('SPARE_PART_NOT_FOUND');

    const currentStock = Number(part.currentStock);
    let newStock: number;

    switch (dto.type) {
      case 'RECEIPT':
      case 'RETURN':
        newStock = currentStock + dto.quantity;
        break;
      case 'ISSUE':
      case 'SCRAP':
      case 'TRANSFER': {
        const validation = validateStockDeduction(
          currentStock,
          dto.quantity,
          Number(part.minimumStock),
          Number(part.reorderPoint),
        );
        if (!validation.valid) throw new AppException('SPARE_PART_INSUFFICIENT_STOCK');
        newStock = validation.newStock;
        break;
      }
      case 'ADJUSTMENT':
        newStock = dto.quantity; // absolute value
        break;
      default:
        throw new AppException('SPARE_PART_NOT_FOUND');
    }

    const totalCost = dto.unitCost ? dto.quantity * dto.unitCost : null;

    // Update stock
    await (this.prisma as any).sparePart.update({
      where: { id: dto.sparePartId },
      data: {
        currentStock: new Prisma.Decimal(newStock),
        isLowStock: newStock <= Number(part.minimumStock),
      },
    });

    // Create movement record
    const movement = await (this.prisma as any).sparePartMovement.create({
      data: {
        zoneId: part.zoneId,
        sparePartId: dto.sparePartId,
        workOrderId: dto.workOrderId,
        type: dto.type,
        quantity: new Prisma.Decimal(dto.quantity),
        beforeQty: new Prisma.Decimal(currentStock),
        afterQty: new Prisma.Decimal(newStock),
        unitCost: dto.unitCost ? BigInt(dto.unitCost) : null,
        totalCost: totalCost ? BigInt(Math.round(totalCost)) : null,
        reason: dto.reason,
        reference: dto.reference,
        performedBy,
      },
    });

    // Reorder alert
    if (newStock <= Number(part.reorderPoint)) {
      this.gateway.emitLowStock({
        zoneId: part.zoneId,
        sparePartId: part.id,
        partName: part.nameFa,
        currentStock: newStock,
        minimumStock: Number(part.minimumStock),
        reorderPoint: Number(part.reorderPoint),
      });
    }

    return movement;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW STOCK / REORDER
  // ═══════════════════════════════════════════════════════════════════════════

  async getLowStockParts(zoneId: string): Promise<any[]> {
    return (this.prisma as any).sparePart.findMany({
      where: { zoneId, isLowStock: true, isActive: true },
      orderBy: { currentStock: 'asc' },
    });
  }

  async getReorderAlerts(zoneId: string): Promise<SparePartReorderDto[]> {
    const parts = await (this.prisma as any).sparePart.findMany({
      where: { zoneId, isActive: true },
    });

    return parts
      .filter((p: any) => Number(p.currentStock) <= Number(p.reorderPoint))
      .map((p: any) => ({
        partId: p.id,
        partNumber: p.partNumber,
        partName: p.nameFa,
        currentStock: Number(p.currentStock),
        reorderPoint: Number(p.reorderPoint),
        suggestedQty: Number(p.reorderQuantity),
      }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVEMENT HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getStockMovementHistory(sparePartId: string, fromDate?: string, toDate?: string): Promise<any[]> {
    const where: any = { sparePartId };
    if (fromDate || toDate) {
      where.performedAt = {};
      if (fromDate) where.performedAt.gte = new Date(fromDate);
      if (toDate) where.performedAt.lte = new Date(toDate);
    }

    return (this.prisma as any).sparePartMovement.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      take: 100,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABILITY CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  async checkAvailability(sparePartId: string, requiredQty: number): Promise<{ available: boolean; currentStock: number }> {
    const part = await (this.prisma as any).sparePart.findUnique({ where: { id: sparePartId } });
    if (!part) throw new AppException('SPARE_PART_NOT_FOUND');

    return {
      available: Number(part.currentStock) >= requiredQty,
      currentStock: Number(part.currentStock),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LINK TO ASSET
  // ═══════════════════════════════════════════════════════════════════════════

  async linkToAsset(dto: LinkAssetDto): Promise<any> {
    const asset = await (this.prisma as any).asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');

    const part = await (this.prisma as any).sparePart.findUnique({ where: { id: dto.sparePartId || '' } });
    if (!part) throw new AppException('SPARE_PART_NOT_FOUND');

    return (this.prisma as any).assetSparePart.upsert({
      where: { assetId_sparePartId: { assetId: dto.assetId, sparePartId: dto.sparePartId } },
      update: { quantityRequired: new Prisma.Decimal(dto.quantityRequired), notes: dto.notes },
      create: {
        assetId: dto.assetId,
        sparePartId: dto.sparePartId,
        quantityRequired: new Prisma.Decimal(dto.quantityRequired),
        notes: dto.notes,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  async getInventoryValue(zoneId: string): Promise<{
    totalParts: number;
    totalValue: number;
    byCategory: { category: string; count: number; value: number }[];
  }> {
    const parts = await (this.prisma as any).sparePart.findMany({
      where: { zoneId, isActive: true },
    });

    let totalValue = 0;
    const catMap = new Map<string, { count: number; value: number }>();

    for (const p of parts) {
      const val = Number(p.currentStock) * Number(p.unitCost);
      totalValue += val;
      const existing = catMap.get(p.category) || { count: 0, value: 0 };
      existing.count++;
      existing.value += val;
      catMap.set(p.category, existing);
    }

    return {
      totalParts: parts.length,
      totalValue: Math.round(totalValue),
      byCategory: Array.from(catMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: Math.round(data.value),
      })),
    };
  }
}
