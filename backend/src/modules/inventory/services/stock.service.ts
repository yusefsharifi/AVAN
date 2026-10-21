import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { AdjustStockDto, TransferStockDto } from '../dto/create-dtos';
import type { StockAvailabilityDto } from '../dto/enums';
import { InventoryGatewayService } from './inventory-gateway.service';
import { computeWeightedAvgCost, getTransactionDirection, computeAvailableQty, computeTotalValue } from '../utils/inventory.utils';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: InventoryGatewayService,
  ) {}

  async getStock(warehouseId: string, itemId?: string, batchNumber?: string): Promise<any[]> {
    const where: any = { warehouseId, quantity: { gt: 0 } };
    if (itemId) where.itemId = itemId;
    if (batchNumber) where.batchNumber = batchNumber;
    return this.prisma.stockEntry.findMany({ where, include: { item: { select: { itemCode: true, nameFa: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async recordTransaction(
    type: string,
    warehouseId: string,
    itemId: string,
    quantity: number,
    unitCost: bigint,
    performedBy: string,
    options?: { locationId?: string | null; batchNumber?: string | null; serialNumber?: string | null; sourceDocType?: string | null; sourceDocId?: string | null; notes?: string | null; toWarehouseId?: string | null; fromLocationId?: string | null; toLocationId?: string | null; zoneId?: string | null; companyId?: string | null; },
  ): Promise<any> {
    const direction = getTransactionDirection(type);
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new AppException('WAREHOUSE_NOT_FOUND');

    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new AppException('ITEM_NOT_FOUND');

    // Generate transaction number
    const year = new Date().getFullYear();
    const seqKey = `inv:trx:seq:${warehouse.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const transactionNumber = `TRX-${warehouse.code}-${year}-${String(seq).padStart(7, '0')}`;

    const totalCost = computeTotalValue(quantity, unitCost);

    // Handle OUT transactions - check stock
    if (direction === 'OUT' || direction === 'TRANSFER') {
      const available = await this.checkAvailability(itemId, quantity, warehouseId);
      if (!available.available) throw new AppException('STOCK_INSUFFICIENT');
    }

    // Create transaction record
    const transaction = await this.prisma.stockTransaction.create({
      data: {
        zoneId: options?.zoneId || warehouse.zoneId,
        companyId: options?.companyId || warehouse.companyId,
        transactionNumber,
        type: type as any,
        status: 'CONFIRMED',
        warehouseId,
        itemId,
        quantity,
        unitCost,
        totalCost,
        direction,
        sourceDocType: options?.sourceDocType,
        sourceDocId: options?.sourceDocId,
        batchNumber: options?.batchNumber,
        serialNumber: options?.serialNumber,
        fromLocationId: options?.fromLocationId,
        toLocationId: options?.toLocationId,
        fromWarehouseId: direction === 'TRANSFER' ? warehouseId : undefined,
        toWarehouseId: options?.toWarehouseId,
        notes: options?.notes,
        processedBy: performedBy,
        processedAt: new Date(),
      },
    });

    // Update stock entries
    if (direction === 'IN') {
      await this.createOrUpdateStockEntry(warehouseId, itemId, quantity, unitCost, options);
      // Update item avg cost
      const newAvgCost = await this.computeWeightedAvgCost(itemId, warehouseId, quantity, unitCost);
      await this.prisma.item.update({ where: { id: itemId }, data: { avgCost: newAvgCost, lastCost: unitCost } });
    } else if (direction === 'OUT') {
      await this.decrementStockEntry(warehouseId, itemId, quantity, options);
    } else if (direction === 'TRANSFER' && options?.toWarehouseId) {
      await this.decrementStockEntry(warehouseId, itemId, quantity, options);
      await this.createOrUpdateStockEntry(options.toWarehouseId, itemId, quantity, unitCost, { ...options, warehouseId: options.toWarehouseId });
    }

    // Check reorder alerts
    await this.checkReorderAlert(itemId, warehouse.zoneId, options?.companyId || undefined);

    // Emit socket event
    this.gateway.emitStockMovement({
      zoneId: warehouse.zoneId,
      itemId,
      itemName: item.nameFa,
      type,
      quantity,
      warehouseId,
      processedBy: performedBy,
    });

    return transaction;
  }

  async computeWeightedAvgCost(itemId: string, warehouseId: string, newQty: number, newUnitCost: bigint): Promise<bigint> {
    const entries = await this.prisma.stockEntry.findMany({ where: { itemId, warehouseId } });
    const currentQty = entries.reduce((sum, e) => sum + Number(e.quantity), 0);
    const totalValue = entries.reduce((sum, e) => sum + e.totalValue, 0n);
    const currentAvgCost = currentQty > 0 ? totalValue / BigInt(currentQty) : 0n;
    return computeWeightedAvgCost(currentQty, currentAvgCost, newQty, newUnitCost);
  }

  async reserveStock(itemId: string, warehouseId: string, quantity: number, _sourceDocId: string): Promise<void> {
    const entries = await this.prisma.stockEntry.findMany({ where: { itemId, warehouseId, quantity: { gt: 0 } } });
    let remaining = quantity;

    for (const entry of entries) {
      if (remaining <= 0) break;
      const available = Number(entry.availableQty);
      const toReserve = Math.min(remaining, available);
      if (toReserve > 0) {
        await this.prisma.stockEntry.update({
          where: { id: entry.id },
          data: { reservedQty: { increment: toReserve }, availableQty: { decrement: toReserve } },
        });
        remaining -= toReserve;
      }
    }
  }

  async releaseReservation(itemId: string, warehouseId: string, quantity: number, _sourceDocId: string): Promise<void> {
    const entries = await this.prisma.stockEntry.findMany({ where: { itemId, warehouseId, reservedQty: { gt: 0 } } });
    let remaining = quantity;

    for (const entry of entries) {
      if (remaining <= 0) break;
      const reserved = Number(entry.reservedQty);
      const toRelease = Math.min(remaining, reserved);
      if (toRelease > 0) {
        await this.prisma.stockEntry.update({
          where: { id: entry.id },
          data: { reservedQty: { decrement: toRelease }, availableQty: { increment: toRelease } },
        });
        remaining -= toRelease;
      }
    }
  }

  async transferStock(itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number, performedBy: string, fromLocationId?: string, toLocationId?: string): Promise<any> {
    const fromWh = await this.prisma.warehouse.findUnique({ where: { id: fromWarehouseId } });
    const toWh = await this.prisma.warehouse.findUnique({ where: { id: toWarehouseId } });
    if (!fromWh || !toWh) throw new AppException('WAREHOUSE_NOT_FOUND');

    // Get current cost
    const entries = await this.prisma.stockEntry.findMany({ where: { itemId, warehouseId: fromWarehouseId } });
    const unitCost = entries.length > 0 ? entries[0].unitCost : 0n;

    // Record single TRANSFER transaction (handles both decrement source + increment destination)
    return this.recordTransaction('TRANSFER', fromWarehouseId, itemId, quantity, unitCost, performedBy, { fromLocationId, toLocationId, toWarehouseId, zoneId: fromWh.zoneId });

    return { success: true };
  }

  async adjustStock(dto: AdjustStockDto, adjustedBy: string): Promise<any> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');

    // Get current avg cost
    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new AppException('ITEM_NOT_FOUND');

    const absQty = Math.abs(dto.quantity);
    const type = dto.quantity > 0 ? 'ADJUSTMENT_PLUS' : 'ADJUSTMENT_MINUS';

    return this.recordTransaction(type, dto.warehouseId, dto.itemId, absQty, item.avgCost, adjustedBy, { notes: dto.reason, zoneId: wh.zoneId });
  }

  async getTransactionHistory(itemId: string, fromDate?: string, toDate?: string, warehouseId?: string): Promise<any[]> {
    const where: any = { itemId };
    if (warehouseId) where.warehouseId = warehouseId;
    if (fromDate || toDate) {
      where.processedAt = {};
      if (fromDate) where.processedAt.gte = new Date(fromDate);
      if (toDate) where.processedAt.lte = new Date(toDate);
    }
    return this.prisma.stockTransaction.findMany({ where, orderBy: { processedAt: 'desc' }, take: 100 });
  }

  async checkAvailability(itemId: string, requiredQty: number, warehouseId?: string): Promise<StockAvailabilityDto> {
    const where: any = { itemId, quantity: { gt: 0 } };
    if (warehouseId) where.warehouseId = warehouseId;

    const entries = await this.prisma.stockEntry.findMany({ where });
    const totalQty = entries.reduce((sum, e) => sum + Number(e.quantity), 0);
    const reservedQty = entries.reduce((sum, e) => sum + Number(e.reservedQty), 0);
    const availableQty = totalQty - reservedQty;

    return {
      available: availableQty >= requiredQty,
      totalQty,
      availableQty,
      reservedQty,
      deficit: Math.max(0, requiredQty - availableQty),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async createOrUpdateStockEntry(warehouseId: string, itemId: string, quantity: number, unitCost: bigint, options?: any): Promise<void> {
    // Try to find existing entry for same batch
    const existing = await this.prisma.stockEntry.findFirst({
      where: { warehouseId, itemId, batchNumber: options?.batchNumber || null, serialNumber: options?.serialNumber || null },
    });

    if (existing) {
      const newQty = Number(existing.quantity) + quantity;
      const newValue = existing.totalValue + computeTotalValue(quantity, unitCost);
      const newAvgCost = newQty > 0 ? newValue / BigInt(newQty) : 0n;
      await this.prisma.stockEntry.update({
        where: { id: existing.id },
        data: { quantity: newQty, totalValue: newValue, unitCost: newAvgCost, availableQty: computeAvailableQty(newQty, Number(existing.reservedQty)), lastMovementAt: new Date() },
      });
    } else {
      await this.prisma.stockEntry.create({
        data: {
          zoneId: options?.zoneId || '',
          companyId: options?.companyId,
          warehouseId,
          locationId: options?.locationId,
          itemId,
          quantity,
          reservedQty: 0,
          availableQty: quantity,
          batchNumber: options?.batchNumber,
          serialNumber: options?.serialNumber,
          expiryDate: options?.expiryDate,
          unitCost,
          totalValue: computeTotalValue(quantity, unitCost),
          lastMovementAt: new Date(),
        },
      });
    }
  }

  private async decrementStockEntry(warehouseId: string, itemId: string, quantity: number, options?: any): Promise<void> {
    const entries = await this.prisma.stockEntry.findMany({
      where: { warehouseId, itemId, availableQty: { gt: 0 } },
      orderBy: { createdAt: 'asc' }, // FIFO
    });

    let remaining = quantity;
    for (const entry of entries) {
      if (remaining <= 0) break;
      const available = Number(entry.availableQty);
      const decrement = Math.min(remaining, available);
      const newQty = Number(entry.quantity) - decrement;
      await this.prisma.stockEntry.update({
        where: { id: entry.id },
        data: { quantity: newQty, availableQty: computeAvailableQty(newQty, Number(entry.reservedQty)), totalValue: computeTotalValue(newQty, entry.unitCost), lastMovementAt: new Date() },
      });
      remaining -= decrement;
    }
    if (remaining > 0) {
      throw new AppException('STOCK_INSUFFICIENT');
    }
  }

  private async checkReorderAlert(itemId: string, zoneId: string, companyId?: string): Promise<void> {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return;

    const entries = await this.prisma.stockEntry.findMany({ where: { itemId } });
    const currentStock = entries.reduce((sum, e) => sum + Number(e.availableQty), 0);
    const reorderPoint = Number(item.reorderPoint);

    if (reorderPoint > 0 && currentStock <= reorderPoint) {
      this.gateway.emitLowStockAlert({
        zoneId, companyId, itemId, itemName: item.nameFa,
        currentStock, reorderPoint, reorderQty: Number(item.reorderQty),
      });
    }
  }
}
