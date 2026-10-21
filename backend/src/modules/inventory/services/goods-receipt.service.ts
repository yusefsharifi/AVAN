import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateGoodsReceiptDto } from '../dto/create-dtos';
import type { PaginatedResult } from '../dto/enums';
import { StockService } from './stock.service';
import { InventoryGatewayService } from './inventory-gateway.service';
import { computeLineTotal } from '../utils/inventory.utils';

@Injectable()
export class GoodsReceiptService {
  private readonly logger = new Logger(GoodsReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly stockService: StockService,
    private readonly gateway: InventoryGatewayService,
  ) {}

  async create(dto: CreateGoodsReceiptDto, createdBy: string): Promise<any> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');

    const year = new Date().getFullYear();
    const seqKey = `inv:grn:seq:${wh.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const receiptNumber = `GRN-${wh.code}-${year}-${String(seq).padStart(6, '0')}`;

    let totalValue = 0n;
    const lineData: any[] = [];
    for (const line of dto.lines) {
      const acceptedQty = line.receivedQty;
      const { lineTotal } = computeLineTotal(line.receivedQty, BigInt(line.unitCost), 0, 9);
      totalValue += lineTotal;
      lineData.push({
        itemId: line.itemId, itemName: '', unit: '',
        purchaseOrderLineId: line.purchaseOrderLineId,
        orderedQty: line.receivedQty, receivedQty: line.receivedQty,
        acceptedQty, rejectedQty: 0, unitCost: BigInt(line.unitCost), totalCost: lineTotal,
        locationId: line.locationId, batchNumber: line.batchNumber,
        serialNumbers: line.serialNumbers || [], condition: line.condition || 'GOOD',
      });
    }

    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        zoneId: wh.zoneId, companyId: dto.companyId || wh.companyId, receiptNumber,
        warehouseId: dto.warehouseId, purchaseOrderId: dto.purchaseOrderId,
        vendorId: dto.vendorId, vendorName: dto.vendorName,
        vendorInvoiceNumber: dto.vendorInvoiceNumber || undefined, deliveryNote: dto.deliveryNote,
        receivedDate: dto.receivedDate, status: 'DRAFT',
        totalValue, requiresInspection: dto.requiresInspection || false,
        notes: dto.notes, createdBy,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    this.gateway.emitGrnCreated({ zoneId: wh.zoneId, receiptId: receipt.id, receiptNumber, vendorName: dto.vendorName, totalValue });
    await this.audit.log({ zoneId: wh.zoneId, action: 'GRN_CREATED', targetType: 'GoodsReceipt', targetId: receipt.id, userId: createdBy, metadata: { receiptNumber } });
    return receipt;
  }

  async confirm(id: string, confirmedBy: string): Promise<any> {
    const receipt = await this.prisma.goodsReceipt.findUnique({ where: { id }, include: { lines: true } });
    if (!receipt) throw new AppException('GRN_NOT_FOUND');
    if (receipt.status !== 'DRAFT') throw new AppException('GRN_INVALID_STATUS');

    for (const line of receipt.lines) {
      if (Number(line.acceptedQty) > 0) {
        await this.stockService.recordTransaction('RECEIPT', receipt.warehouseId, line.itemId, Number(line.acceptedQty), line.unitCost, confirmedBy, {
          sourceDocType: 'GOODS_RECEIPT', sourceDocId: receipt.id,
          locationId: line.locationId, batchNumber: line.batchNumber,
          zoneId: receipt.zoneId, companyId: receipt.companyId,
        });
      }
    }

    const updated = await this.prisma.goodsReceipt.update({ where: { id }, data: { status: 'CONFIRMED' } });
    await this.audit.log({ zoneId: receipt.zoneId, action: 'GRN_CONFIRMED', targetType: 'GoodsReceipt', targetId: id, userId: confirmedBy });
    return updated;
  }

  async findAll(zoneId: string, filter: any): Promise<PaginatedResult<any>> {
    const where: any = { zoneId };
    if (filter.status) where.status = filter.status;
    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { lines: true } }),
      this.prisma.goodsReceipt.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const receipt = await this.prisma.goodsReceipt.findUnique({ where: { id }, include: { lines: true } });
    if (!receipt) throw new AppException('GRN_NOT_FOUND');
    return receipt;
  }
}
