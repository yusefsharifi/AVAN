import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateRequisitionDto, ApproveRequisitionDto, IssueItemsDto, FilterRequisitionsDto } from '../dto/create-dtos';
import type { PaginatedResult, RequisitionStatsDto } from '../dto/enums';
import { StockService } from './stock.service';
import { InventoryGatewayService } from './inventory-gateway.service';

@Injectable()
export class MaterialRequisitionService {
  private readonly logger = new Logger(MaterialRequisitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly stockService: StockService,
    private readonly gateway: InventoryGatewayService,
  ) {}

  async create(dto: CreateRequisitionDto, createdBy: string, createdByName: string): Promise<any> {
    // Generate requisition number
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    const companyCode = company?.nameEn?.substring(0, 3).toUpperCase() || 'REQ';
    const year = new Date().getFullYear();
    const seqKey = `inv:req:seq:${dto.companyId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const requisitionNumber = `REQ-${companyCode}-${year}-${String(seq).padStart(5, '0')}`;

    // Create requisition
    const requisition = await this.prisma.materialRequisition.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        requisitionNumber,
        requestedBy: createdBy,
        requestedByName: createdByName,
        departmentId: dto.departmentId,
        purpose: dto.purpose,
        requiredDate: dto.requiredDate,
        status: 'DRAFT',
        priority: dto.priority,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((line, idx) => ({
            itemId: line.itemId,
            itemName: '',
            itemCode: '',
            unit: '',
            requestedQty: line.requestedQty,
            pendingQty: line.requestedQty,
            warehouseId: line.warehouseId,
            notes: line.notes,
          })),
        },
      },
      include: { lines: true },
    });

    // Enrich lines with item details
    for (const line of requisition.lines) {
      const item = await this.prisma.item.findUnique({ where: { id: line.itemId } });
      if (item) {
        await this.prisma.requisitionLine.update({
          where: { id: line.id },
          data: { itemName: item.nameFa, itemCode: item.itemCode, unit: item.unit },
        });
      }
    }

    await this.audit.log({ zoneId: dto.zoneId, action: 'REQUISITION_CREATED', targetType: 'MaterialRequisition', targetId: requisition.id, userId: createdBy, metadata: { requisitionNumber } });
    return this.prisma.materialRequisition.findUnique({ where: { id: requisition.id }, include: { lines: true } });
  }

  async submit(id: string, submittedBy: string): Promise<any> {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id } });
    if (!req) throw new AppException('REQUISITION_NOT_FOUND');
    if (req.status !== 'DRAFT') throw new AppException('REQUISITION_INVALID_STATUS');

    const updated = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });

    // Find department manager for approval
    // Emit notification
    await this.audit.log({ zoneId: req.zoneId, action: 'REQUISITION_SUBMITTED', targetType: 'MaterialRequisition', targetId: id, userId: submittedBy });
    return updated;
  }

  async approve(id: string, dto: ApproveRequisitionDto, approverId: string, approverName: string): Promise<any> {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id }, include: { lines: true } });
    if (!req) throw new AppException('REQUISITION_NOT_FOUND');
    if (req.status !== 'PENDING_APPROVAL') throw new AppException('REQUISITION_INVALID_STATUS');

    if (dto.approved) {
      // Set approved quantities
      const lines = dto.lines || req.lines.map((l) => ({ lineId: l.id, approvedQty: Number(l.requestedQty) }));
      for (const line of lines) {
        const reqLine = req.lines.find((l) => l.id === line.lineId);
        if (reqLine) {
          await this.prisma.requisitionLine.update({
            where: { id: line.lineId },
            data: { approvedQty: line.approvedQty, pendingQty: line.approvedQty - Number(reqLine.issuedQty) },
          });
        }
      }

      const updated = await this.prisma.materialRequisition.update({
        where: { id },
        data: { status: 'APPROVED', approverId, approverName, approvedAt: new Date() },
      });

      this.gateway.emitRequisitionApproved({
        requestedBy: req.requestedBy, requisitionId: id, requisitionNumber: req.requisitionNumber, approverName,
      });

      await this.audit.log({ zoneId: req.zoneId, action: 'REQUISITION_APPROVED', targetType: 'MaterialRequisition', targetId: id, userId: approverId });
      return updated;
    } else {
      const updated = await this.prisma.materialRequisition.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: dto.rejectionReason, approverId },
      });
      await this.audit.log({ zoneId: req.zoneId, action: 'REQUISITION_REJECTED', targetType: 'MaterialRequisition', targetId: id, userId: approverId });
      return updated;
    }
  }

  async issue(dto: IssueItemsDto, issuedBy: string): Promise<any> {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id: dto.requisitionId }, include: { lines: true } });
    if (!req) throw new AppException('REQUISITION_NOT_FOUND');
    if (req.status !== 'APPROVED' && req.status !== 'PARTIALLY_ISSUED') throw new AppException('REQUISITION_INVALID_STATUS');

    for (const line of dto.lines) {
      const reqLine = req.lines.find((l) => l.id === line.lineId);
      if (!reqLine) throw new AppException('REQUISITION_NOT_FOUND');

      const pending = Number(reqLine.pendingQty);
      if (line.issuedQty > pending) throw new AppException('REQUISITION_EXCEEDS_APPROVED');

      // Record stock issue
      const item = await this.prisma.item.findUnique({ where: { id: reqLine.itemId } });
      await this.stockService.recordTransaction('ISSUE', line.warehouseId, reqLine.itemId, line.issuedQty, item?.avgCost || 0n, issuedBy, {
        sourceDocType: 'REQUISITION',
        sourceDocId: req.id,
        locationId: line.locationId,
        batchNumber: line.batchNumber,
        zoneId: req.zoneId,
      });

      // Update line
      const newIssuedQty = Number(reqLine.issuedQty) + line.issuedQty;
      const newPendingQty = Number(reqLine.approvedQty || reqLine.requestedQty) - newIssuedQty;
      await this.prisma.requisitionLine.update({
        where: { id: line.lineId },
        data: { issuedQty: newIssuedQty, pendingQty: Math.max(0, newPendingQty), unitCost: item?.avgCost, warehouseId: line.warehouseId, batchNumber: line.batchNumber },
      });
    }

    // Check if all lines fully issued
    const updatedReq = await this.prisma.materialRequisition.findUnique({ where: { id: dto.requisitionId }, include: { lines: true } });
    const allFulfilled = updatedReq!.lines.every((l) => Number(l.pendingQty) <= 0);
    const status = allFulfilled ? 'FULLY_ISSUED' : 'PARTIALLY_ISSUED';

    const updated = await this.prisma.materialRequisition.update({
      where: { id: dto.requisitionId },
      data: { status, isFullyFulfilled: allFulfilled, fulfilledAt: allFulfilled ? new Date() : undefined, fulfilledBy: allFulfilled ? issuedBy : undefined },
    });

    this.gateway.emitRequisitionItemsReady({
      requestedBy: req.requestedBy, requisitionId: req.id, requisitionNumber: req.requisitionNumber, isFullyIssued: allFulfilled,
    });

    await this.audit.log({ zoneId: req.zoneId, action: 'REQUISITION_ISSUED', targetType: 'MaterialRequisition', targetId: dto.requisitionId, userId: issuedBy });
    return updated;
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id } });
    if (!req) throw new AppException('REQUISITION_NOT_FOUND');
    if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(req.status)) throw new AppException('REQUISITION_INVALID_STATUS');

    const updated = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
    await this.audit.log({ zoneId: req.zoneId, action: 'REQUISITION_CANCELLED', targetType: 'MaterialRequisition', targetId: id, userId: cancelledBy });
    return updated;
  }

  async findAll(filter: FilterRequisitionsDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.requestedBy) where.requestedBy = filter.requestedBy;

    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.materialRequisition.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { lines: true } }),
      this.prisma.materialRequisition.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id }, include: { lines: true } });
    if (!req) throw new AppException('REQUISITION_NOT_FOUND');
    return req;
  }

  async getPendingApprovals(approverId: string, zoneId: string): Promise<any[]> {
    return this.prisma.materialRequisition.findMany({ where: { zoneId, status: 'PENDING_APPROVAL' }, include: { lines: true }, orderBy: { createdAt: 'asc' } });
  }

  async getRequisitionStats(zoneId: string, companyId?: string): Promise<RequisitionStatsDto> {
    const baseWhere: any = { zoneId };
    if (companyId) baseWhere.companyId = companyId;

    const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_ISSUED', 'FULLY_ISSUED', 'CANCELLED'] as const;
    const counts = await Promise.all(
      statuses.map((status) => this.prisma.materialRequisition.count({ where: { ...baseWhere, status } }))
    );
    const total = counts.reduce((sum, c) => sum + c, 0);

    return {
      total,
      draft: counts[0],
      pendingApproval: counts[1],
      approved: counts[2],
      partiallyIssued: counts[3],
      fullyIssued: counts[4],
      cancelled: counts[5],
      avgFulfillmentHours: 0,
      byPriority: [],
    };
  }
}
