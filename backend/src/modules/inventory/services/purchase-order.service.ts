import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreatePurchaseOrderDto } from '../dto/create-dtos';
import type { PaginatedResult, POStatsDto } from '../dto/enums';
import { InventoryGatewayService } from './inventory-gateway.service';
import { computeLineTotal } from '../utils/inventory.utils';

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: InventoryGatewayService,
  ) {}

  async create(dto: CreatePurchaseOrderDto, createdBy: string): Promise<any> {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = zone?.code || 'SYS';
    const year = new Date().getFullYear();
    const seqKey = `inv:po:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const orderNumber = `PO-${zoneCode}-${year}-${String(seq).padStart(5, '0')}`;

    let subtotal = 0n;
    let totalTax = 0n;
    const lineData: any[] = [];

    for (const line of dto.lines) {
      const { lineTotal, taxAmount } = computeLineTotal(line.orderedQty, BigInt(line.unitPrice), line.discount || 0, line.taxRate || 9);
      const discount = BigInt(Math.round(Number(BigInt(line.unitPrice) * BigInt(Math.round(line.orderedQty))) * (line.discount || 0) / 100));
      subtotal += BigInt(line.unitPrice) * BigInt(Math.round(line.orderedQty));
      totalTax += taxAmount;
      lineData.push({
        itemId: line.itemId, itemName: line.itemName, unit: line.unit,
        orderedQty: line.orderedQty, receivedQty: 0, pendingQty: line.orderedQty,
        unitPrice: BigInt(line.unitPrice), discount: line.discount || 0, taxRate: line.taxRate || 9,
        lineTotal, dueDate: line.dueDate,
      });
    }

    const grandTotal = subtotal + totalTax;

    const po = await this.prisma.purchaseOrder.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, orderNumber,
        vendorId: dto.vendorId, vendorName: dto.vendorName,
        vendorPhone: dto.vendorPhone, vendorEmail: dto.vendorEmail,
        orderDate: dto.orderDate, expectedDate: dto.expectedDate,
        status: 'DRAFT', paymentTerms: dto.paymentTerms,
        deliveryAddress: dto.deliveryAddress, warehouseId: dto.warehouseId,
        purchaseRequestId: dto.purchaseRequestId,
        subtotal, totalTax, totalDiscount: 0n, grandTotal,
        notes: dto.notes, createdBy,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    await this.audit.log({ zoneId: dto.zoneId, action: 'PO_CREATED', targetType: 'PurchaseOrder', targetId: po.id, userId: createdBy, metadata: { orderNumber } });
    return po;
  }

  async approve(id: string, approvedBy: string): Promise<any> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new AppException('PO_NOT_FOUND');
    if (po.status !== 'DRAFT') throw new AppException('PO_INVALID_STATUS');
    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'APPROVED' } });
    await this.audit.log({ zoneId: po.zoneId, action: 'PO_APPROVED', targetType: 'PurchaseOrder', targetId: id, userId: approvedBy });
    return updated;
  }

  async sendToVendor(id: string, sentBy: string): Promise<any> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new AppException('PO_NOT_FOUND');
    if (po.status !== 'APPROVED') throw new AppException('PO_INVALID_STATUS');
    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'SENT_TO_VENDOR' } });
    this.gateway.emitPoSentToVendor({ zoneId: po.zoneId, companyId: po.companyId || undefined, orderId: id, orderNumber: po.orderNumber, vendorName: po.vendorName, grandTotal: po.grandTotal });
    await this.audit.log({ zoneId: po.zoneId, action: 'PO_SENT', targetType: 'PurchaseOrder', targetId: id, userId: sentBy });
    return updated;
  }

  async cancel(id: string, reason: string): Promise<any> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new AppException('PO_NOT_FOUND');
    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
    await this.audit.log({ zoneId: po.zoneId, action: 'PO_CANCELLED', targetType: 'PurchaseOrder', targetId: id });
    return updated;
  }

  async findAll(zoneId: string, filter: any): Promise<PaginatedResult<any>> {
    const where: any = { zoneId };
    if (filter.status) where.status = filter.status;
    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { lines: true } }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!po) throw new AppException('PO_NOT_FOUND');
    return po;
  }

  async getPOStats(zoneId: string): Promise<POStatsDto> {
    const all = await this.prisma.purchaseOrder.findMany({ where: { zoneId } });
    return {
      total: all.length,
      draft: all.filter((p) => p.status === 'DRAFT').length,
      approved: all.filter((p) => p.status === 'APPROVED').length,
      sentToVendor: all.filter((p) => p.status === 'SENT_TO_VENDOR').length,
      partiallyReceived: all.filter((p) => p.status === 'PARTIALLY_RECEIVED').length,
      fullyReceived: all.filter((p) => p.status === 'FULLY_RECEIVED').length,
      totalPOValue: all.reduce((s, p) => s + p.grandTotal, 0n),
      pendingDelivery: all.filter((p) => ['APPROVED', 'SENT_TO_VENDOR'].includes(p.status)).length,
    };
  }
}
