import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreatePhysicalCountDto, SubmitCountResultsDto } from '../dto/create-dtos';
import type { PaginatedResult, PhysicalCountVarianceDto } from '../dto/enums';
import { StockService } from './stock.service';
import { InventoryGatewayService } from './inventory-gateway.service';
import { computeVariance, computeVarianceValue } from '../utils/inventory.utils';

@Injectable()
export class PhysicalCountService {
  private readonly logger = new Logger(PhysicalCountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly stockService: StockService,
    private readonly gateway: InventoryGatewayService,
  ) {}

  async create(dto: CreatePhysicalCountDto, createdBy: string): Promise<any> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');

    const year = new Date().getFullYear();
    const seqKey = `inv:cnt:seq:${wh.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const countNumber = `CNT-${wh.code}-${year}-${String(seq).padStart(4, '0')}`;

    // Get items to count
    const itemIds = dto.itemIds || [];
    let items: any[];
    if (itemIds.length > 0) {
      items = await this.prisma.item.findMany({ where: { id: { in: itemIds } } });
    } else {
      // Get all items with stock in this warehouse
      const entries = await this.prisma.stockEntry.findMany({ where: { warehouseId: dto.warehouseId }, distinct: ['itemId'] });
      const ids = entries.map((e) => e.itemId);
      items = await this.prisma.item.findMany({ where: { id: { in: ids } } });
    }

    // Create count lines with system qty
    const lineData: { itemId: string; itemName: string; itemCode: string; unit: string; systemQty: number }[] = [];
    for (const item of items) {
      const entries = await this.prisma.stockEntry.findMany({ where: { warehouseId: dto.warehouseId, itemId: item.id } });
      const systemQty = entries.reduce((sum, e) => sum + Number(e.quantity), 0);
      lineData.push({
        itemId: item.id, itemName: item.nameFa, itemCode: item.itemCode, unit: item.unit,
        systemQty,
      });
    }

    const count = await this.prisma.physicalCount.create({
      data: {
        zoneId: wh.zoneId, companyId: dto.companyId || wh.companyId,
        countNumber, warehouseId: dto.warehouseId,
        status: 'PLANNING', plannedDate: dto.plannedDate,
        notes: dto.notes, createdBy,
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    await this.audit.log({ zoneId: wh.zoneId, action: 'COUNT_CREATED', targetType: 'PhysicalCount', targetId: count.id, userId: createdBy, metadata: { countNumber } });
    return count;
  }

  async start(id: string, startedBy: string): Promise<any> {
    const count = await this.prisma.physicalCount.findUnique({ where: { id } });
    if (!count) throw new AppException('COUNT_NOT_FOUND');
    if (count.status !== 'PLANNING') throw new AppException('COUNT_INVALID_STATUS');
    const updated = await this.prisma.physicalCount.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    await this.audit.log({ zoneId: count.zoneId, action: 'COUNT_STARTED', targetType: 'PhysicalCount', targetId: id, userId: startedBy });
    return updated;
  }

  async submitResults(id: string, dto: SubmitCountResultsDto, submittedBy: string): Promise<any> {
    const count = await this.prisma.physicalCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new AppException('COUNT_NOT_FOUND');
    if (count.status !== 'IN_PROGRESS') throw new AppException('COUNT_INVALID_STATUS');

    let totalVarianceValue = 0n;

    for (const result of dto.lines) {
      const line = count.lines.find((l) => l.id === result.lineId);
      if (!line) continue;

      const variance = computeVariance(Number(line.systemQty), result.countedQty);
      const item = await this.prisma.item.findUnique({ where: { id: line.itemId } });
      const varianceValue = computeVarianceValue(variance, item?.avgCost || 0n);
      totalVarianceValue += varianceValue;

      await this.prisma.physicalCountLine.update({
        where: { id: result.lineId },
        data: { countedQty: result.countedQty, variance, varianceValue, countedBy: submittedBy, countedAt: new Date(), notes: result.notes },
      });
    }

    const updated = await this.prisma.physicalCount.update({
      where: { id },
      data: { status: 'VARIANCE_REVIEW', totalVarianceValue },
    });

    if (totalVarianceValue !== 0n) {
      this.gateway.emitCountVarianceAlert({ zoneId: count.zoneId, countId: id, countNumber: count.countNumber, warehouseId: count.warehouseId, totalVarianceValue });
    }

    await this.audit.log({ zoneId: count.zoneId, action: 'COUNT_COMPLETED', targetType: 'PhysicalCount', targetId: id, userId: submittedBy });
    return updated;
  }

  async reviewVariances(id: string): Promise<PhysicalCountVarianceDto> {
    const count = await this.prisma.physicalCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new AppException('COUNT_NOT_FOUND');

    const varianceLines = count.lines.filter((l) => l.variance !== null && Number(l.variance) !== 0).map((l) => ({
      itemId: l.itemId, itemName: l.itemName, itemCode: l.itemCode,
      systemQty: Number(l.systemQty), countedQty: Number(l.countedQty || 0),
      variance: Number(l.variance || 0),
      varianceValue: l.varianceValue || 0n,
      variancePct: Number(l.systemQty) > 0 ? Math.round(Number(l.variance || 0) / Number(l.systemQty) * 10000) / 100 : 0,
    }));

    const positiveVariance = varianceLines.filter((l) => l.variance > 0).reduce((s, l) => s + l.varianceValue, 0n);
    const negativeVariance = varianceLines.filter((l) => l.variance < 0).reduce((s, l) => s + l.varianceValue, 0n);

    return {
      countId: id, lines: varianceLines,
      totalVarianceValue: count.totalVarianceValue, positiveVariance, negativeVariance,
    };
  }

  async approve(id: string, approvedBy: string): Promise<any> {
    const count = await this.prisma.physicalCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new AppException('COUNT_NOT_FOUND');
    if (count.status !== 'VARIANCE_REVIEW') throw new AppException('COUNT_INVALID_STATUS');

    // Create adjustment transactions for lines with variance
    for (const line of count.lines) {
      if (line.variance !== null && Number(line.variance) !== 0) {
        const item = await this.prisma.item.findUnique({ where: { id: line.itemId } });
        const absVariance = Math.abs(Number(line.variance));
        const type = Number(line.variance) > 0 ? 'ADJUSTMENT_PLUS' : 'ADJUSTMENT_MINUS';
        await this.stockService.recordTransaction(type, count.warehouseId, line.itemId, absVariance, item?.avgCost || 0n, approvedBy, {
          sourceDocType: 'PHYSICAL_COUNT', sourceDocId: count.id,
          zoneId: count.zoneId, companyId: count.companyId || undefined, notes: `Physical count adjustment: ${line.itemName}`,
        });
      }
    }

    const updated = await this.prisma.physicalCount.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.audit.log({ zoneId: count.zoneId, action: 'COUNT_ADJUSTED', targetType: 'PhysicalCount', targetId: id, userId: approvedBy });
    return updated;
  }

  async findAll(zoneId: string, filter: any): Promise<PaginatedResult<any>> {
    const where: any = { zoneId };
    if (filter.status) where.status = filter.status;
    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.physicalCount.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.physicalCount.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const count = await this.prisma.physicalCount.findUnique({ where: { id }, include: { lines: true } });
    if (!count) throw new AppException('COUNT_NOT_FOUND');
    return count;
  }
}
