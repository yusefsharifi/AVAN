import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  FilterOrdersDto,
  OrderMilestoneDto,
} from '../dto/create-dtos';
import { calculateLineTotals, isValidOrderTransition } from '../utils/commercial.utils';
import { CommercialGatewayService } from './commercial-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommercialOrderService {
  private readonly logger = new Logger(CommercialOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CommercialGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateOrderDto, createdBy: string): Promise<any> {
    // Generate order number
    const year = new Date().getFullYear().toString();
    const dir = dto.direction === 'SALES' ? 'SO' : 'PO';
    const seqKey = REDIS_KEYS.commercialOrderSeq(dto.zoneId, dir, year);
    const seq = await this.redis.incr(seqKey);
    const orderNumber = `${dir}-${year}-${seq.toString().padStart(4, '0')}`;

    // Calculate totals
    let totalBeforeDiscount = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const lineResults = dto.lines.map((line) => {
      const calc = calculateLineTotals(
        line.quantity,
        line.unitPrice,
        line.discount || 0,
        line.taxRate ?? 9,
      );
      totalBeforeDiscount += calc.lineSubtotal;
      totalDiscount += calc.lineDiscount;
      totalTax += calc.lineTax;
      grandTotal += calc.lineTotal;
      return { ...line, ...calc };
    });

    const exchangeRate = dto.exchangeRate || 1;

    // Create order
    const order = await this.prisma.commercialOrder.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        orderNumber,
        direction: dto.direction as any,
        proformaId: dto.proformaId,
        rfqId: dto.rfqId,
        bidId: dto.bidId,
        partyId: dto.partyId,
        partyName: dto.partyName,
        status: 'CONFIRMED',
        totalBeforeDiscount: BigInt(totalBeforeDiscount),
        totalDiscount: BigInt(totalDiscount),
        totalTax: BigInt(totalTax),
        grandTotal: BigInt(grandTotal),
        currencyCode: dto.currencyCode || 'IRR',
        exchangeRate: new Prisma.Decimal(exchangeRate),
        paymentTerms: dto.paymentTerms,
        deliveryDate: dto.deliveryDate,
        deliveryLocation: dto.deliveryLocation,
        createdBy,
        lines: {
          create: lineResults.map((line) => ({
            lineNumber: line.lineNumber,
            itemCode: line.itemCode,
            itemName: line.itemName,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: BigInt(line.unitPrice),
            discount: new Prisma.Decimal(line.discount || 0),
            taxRate: new Prisma.Decimal(line.taxRate ?? 9),
            lineSubtotal: BigInt(line.lineSubtotal),
            lineDiscount: BigInt(line.lineDiscount),
            lineTax: BigInt(line.lineTax),
            lineTotal: BigInt(line.lineTotal),
            unit: line.unit || 'عدد',
          })),
        },
        milestoneRecords: dto.milestones
          ? {
              create: dto.milestones.map((m) => ({
                label: m.label,
                type: m.type as any,
                dueDate: m.dueDate,
                amount: m.amount ? BigInt(m.amount) : null,
                percentOfTotal: m.percentOfTotal ? new Prisma.Decimal(m.percentOfTotal) : null,
                notes: m.notes,
              })),
            }
          : undefined,
      },
      include: { lines: true, milestoneRecords: true },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: order.id,
      targetType: 'CommercialOrder',
      action: 'ORDER_CREATED',
      metadata: { orderNumber, direction: dto.direction, grandTotal },
    });

    return order;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterOrdersDto): Promise<any> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.direction) where.direction = filter.direction;
    if (filter.status) where.status = filter.status;
    if (filter.partyId) where.partyId = filter.partyId;

    const limit = filter.limit || 20;

    const data = await this.prisma.commercialOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { lines: true, milestoneRecords: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const order = await this.prisma.commercialOrder.findUnique({
      where: { id },
      include: { lines: true, milestoneRecords: true },
    });

    if (!order) {
      throw new AppException('ORDER_NOT_FOUND');
    }

    return order;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  async updateStatus(id: string, dto: UpdateOrderStatusDto, updatedBy: string): Promise<any> {
    const order = await this.findById(id);

    if (!isValidOrderTransition(order.status, dto.status)) {
      throw new AppException('ORDER_INVALID_TRANSITION', {
        details: { currentStatus: order.status, requestedStatus: dto.status },
      });
    }

    const updated = await this.prisma.commercialOrder.update({
      where: { id },
      data: { status: dto.status as any },
      include: { lines: true, milestoneRecords: true },
    });

    this.gateway.emitOrderStatusChanged({
      companyId: order.companyId,
      orderId: id,
      orderNumber: order.orderNumber,
      newStatus: dto.status,
    });

    await this.audit.log({
      zoneId: order.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'CommercialOrder',
      action: 'ORDER_STATUS_CHANGED',
      metadata: { orderNumber: order.orderNumber, from: order.status, to: dto.status },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE MILESTONE
  // ═══════════════════════════════════════════════════════════════════════════

  async completeMilestone(
    orderId: string,
    milestoneId: string,
    completedBy: string,
    notes?: string,
  ): Promise<any> {
    const order = await this.findById(orderId);

    const milestone = await this.prisma.orderMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.orderId !== orderId) {
      throw new AppException('ORDER_MILESTONE_NOT_FOUND');
    }

    if (milestone.status === 'COMPLETED') {
      throw new AppException('ORDER_MILESTONE_ALREADY_COMPLETED');
    }

    const updated = await this.prisma.orderMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes || milestone.notes,
      },
    });

    this.gateway.emitOrderMilestoneCompleted({
      companyId: order.companyId,
      orderId,
      milestoneId,
      label: milestone.label,
      type: milestone.type,
    });

    await this.audit.log({
      zoneId: order.zoneId,
      userId: completedBy,
      targetId: milestoneId,
      targetType: 'OrderMilestone',
      action: 'ORDER_MILESTONE_COMPLETED',
      metadata: { orderNumber: order.orderNumber, label: milestone.label, type: milestone.type },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERT TO INVOICE
  // ═══════════════════════════════════════════════════════════════════════════

  async convertToInvoice(id: string, convertedBy: string): Promise<any> {
    const order = await this.findById(id);

    if (order.status !== 'FULLY_RECEIVED') {
      throw new AppException('ORDER_INVALID_STATUS', {
        details: { currentStatus: order.status, requiredStatus: 'FULLY_RECEIVED' },
      });
    }

    // Update status
    const updated = await this.prisma.commercialOrder.update({
      where: { id },
      data: { status: 'INVOICED' },
      include: { lines: true, milestoneRecords: true },
    });

    await this.audit.log({
      zoneId: order.zoneId,
      userId: convertedBy,
      targetId: id,
      targetType: 'CommercialOrder',
      action: 'ORDER_INVOICED',
      metadata: { orderNumber: order.orderNumber, grandTotal: Number(order.grandTotal) },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getOrderMilestones(orderId: string): Promise<any[]> {
    return this.prisma.orderMilestone.findMany({
      where: { orderId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueMilestones(zoneId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    return this.prisma.orderMilestone.findMany({
      where: {
        order: { zoneId, deletedAt: null },
        status: 'PENDING',
        dueDate: { lt: today },
      },
      include: { order: { select: { id: true, orderNumber: true, companyId: true } } },
    });
  }

  async getOrderStats(zoneId: string, companyId?: string): Promise<any> {
    const where: any = { zoneId, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const all = await this.prisma.commercialOrder.findMany({ where });

    const byStatus: Record<string, number> = {};
    for (const status of ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'INVOICED', 'CLOSED', 'CANCELLED']) {
      byStatus[status] = all.filter((o) => o.status === status).length;
    }

    const salesValue = all
      .filter((o) => o.direction === 'SALES' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    const purchaseValue = all
      .filter((o) => o.direction === 'PURCHASE' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    return {
      total: all.length,
      byStatus,
      byDirection: {
        sales: all.filter((o) => o.direction === 'SALES').length,
        purchase: all.filter((o) => o.direction === 'PURCHASE').length,
      },
      totalSalesValue: salesValue,
      totalPurchaseValue: purchaseValue,
      avgFulfillmentDays: 0,
      overdueMilestones: 0,
    };
  }
}
