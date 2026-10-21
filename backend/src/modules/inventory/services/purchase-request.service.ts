import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreatePurchaseRequestDto } from '../dto/create-dtos';
import type { PaginatedResult } from '../dto/enums';

@Injectable()
export class PurchaseRequestService {
  private readonly logger = new Logger(PurchaseRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePurchaseRequestDto, createdBy: string): Promise<any> {
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    const companyCode = company?.nameEn?.substring(0, 3).toUpperCase() || 'PR';
    const year = new Date().getFullYear();
    const seqKey = `inv:pr:seq:${dto.companyId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const requestNumber = `PR-${companyCode}-${year}-${String(seq).padStart(5, '0')}`;

    const totalEstimated = dto.lines.reduce((sum, l) => sum + (l.unitPrice ? l.unitPrice * Number(l.requestedQty) : 0), 0);

    const pr = await this.prisma.purchaseRequest.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, requestNumber,
        requestedBy: createdBy, requestedByName: '',
        departmentId: dto.departmentId, purpose: dto.purpose,
        requiredDate: dto.requiredDate, status: 'DRAFT',
        priority: dto.priority, totalEstimated: BigInt(totalEstimated),
        notes: dto.notes,
        lines: { create: dto.lines.map((l) => ({ itemId: l.itemId, itemName: l.itemName, itemCode: l.itemCode, unit: l.unit, requestedQty: l.requestedQty, unitPrice: l.unitPrice ? BigInt(l.unitPrice) : undefined, vendorSuggested: l.vendorSuggested, specifications: l.specifications })) },
      },
      include: { lines: true },
    });

    await this.audit.log({ zoneId: dto.zoneId, action: 'PR_CREATED', targetType: 'PurchaseRequest', targetId: pr.id, userId: createdBy, metadata: { requestNumber } });
    return pr;
  }

  async approve(id: string, approverId: string): Promise<any> {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new AppException('PR_NOT_FOUND');
    if (pr.status !== 'DRAFT' && pr.status !== 'PENDING_APPROVAL') throw new AppException('PR_INVALID_STATUS');
    const updated = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'APPROVED', approverId, approvedAt: new Date() } });
    await this.audit.log({ zoneId: pr.zoneId, action: 'PR_APPROVED', targetType: 'PurchaseRequest', targetId: id, userId: approverId });
    return updated;
  }

  async reject(id: string, reason: string, rejectedBy: string): Promise<any> {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new AppException('PR_NOT_FOUND');
    const updated = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
    await this.audit.log({ zoneId: pr.zoneId, action: 'PR_REJECTED', targetType: 'PurchaseRequest', targetId: id, userId: rejectedBy });
    return updated;
  }

  async findAll(filter: any): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    const limit = filter.limit || 20;
    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({ where, take: limit, orderBy: { createdAt: 'desc' }, include: { lines: true } }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id }, include: { lines: true } });
    if (!pr) throw new AppException('PR_NOT_FOUND');
    return pr;
  }

  async getPendingApprovals(approverId: string, zoneId: string): Promise<any[]> {
    return this.prisma.purchaseRequest.findMany({ where: { zoneId, status: 'PENDING_APPROVAL' }, include: { lines: true } });
  }
}
