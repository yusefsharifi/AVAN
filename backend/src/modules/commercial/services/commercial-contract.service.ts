import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateCommercialContractDto, AddAddendumDto } from '../dto/create-dtos';
import { CommercialGatewayService } from './commercial-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommercialContractService {
  private readonly logger = new Logger(CommercialContractService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CommercialGatewayService,
  ) {}

  async create(dto: CreateCommercialContractDto, createdBy: string): Promise<any> {
    // Generate contract number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.commercialContractSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);
    const contractNumber = `CT-${year}-${seq.toString().padStart(4, '0')}`;

    // Validate dates
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new AppException('CONTRACT_DATE_INVALID');
    }

    // Create contract with nested records
    const contract = await this.prisma.commercialContract.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        contractNumber,
        title: dto.title,
        direction: dto.direction as any,
        partyId: dto.partyId,
        partyName: dto.partyName,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        autoRenew: dto.autoRenew || false,
        renewalNoticeDays: dto.renewalNoticeDays || 60,
        value: BigInt(dto.value),
        currencyCode: dto.currencyCode || 'IRR',
        status: 'DRAFT',
        tags: dto.tags || [],
        createdBy,
        paymentSchedule: dto.paymentSchedule
          ? {
              create: dto.paymentSchedule.map((ps) => ({
                dueDate: ps.dueDate,
                amount: BigInt(ps.amount),
                description: ps.description,
                status: 'PENDING',
              })),
            }
          : undefined,
        deliverables: dto.deliverables
          ? {
              create: dto.deliverables.map((d) => ({
                title: d.title,
                dueDate: d.dueDate,
                status: 'PENDING',
              })),
            }
          : undefined,
        signatories: dto.signatories
          ? {
              create: dto.signatories.map((s) => ({
                name: s.name,
                role: s.role,
              })),
            }
          : undefined,
      },
      include: {
        paymentSchedule: true,
        deliverables: true,
        signatories: true,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: contract.id,
      targetType: 'CommercialContract',
      action: 'CONTRACT_CREATED',
      metadata: { contractNumber, title: dto.title, partyName: dto.partyName },
    });

    return contract;
  }

  async update(id: string, dto: Partial<CreateCommercialContractDto>, updatedBy: string): Promise<any> {
    await this.findById(id);

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.partyName) updateData.partyName = dto.partyName;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.value !== undefined) updateData.value = BigInt(dto.value);
    if (dto.autoRenew !== undefined) updateData.autoRenew = dto.autoRenew;
    if (dto.tags) updateData.tags = dto.tags;

    const updated = await this.prisma.commercialContract.update({
      where: { id },
      data: updateData,
      include: { paymentSchedule: true, deliverables: true, signatories: true },
    });

    return updated;
  }

  async activate(id: string, activatedBy: string): Promise<any> {
    const contract = await this.findById(id);

    if (!['DRAFT', 'UNDER_REVIEW'].includes(contract.status)) {
      throw new AppException('CONTRACT_INVALID_STATUS');
    }

    const updated = await this.prisma.commercialContract.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { paymentSchedule: true, deliverables: true, signatories: true },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: activatedBy,
      targetId: id,
      targetType: 'CommercialContract',
      action: 'CONTRACT_ACTIVATED',
      metadata: { contractNumber: contract.contractNumber },
    });

    return updated;
  }

  async suspend(id: string, reason: string): Promise<any> {
    const contract = await this.findById(id);

    const updated = await this.prisma.commercialContract.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      include: { paymentSchedule: true, deliverables: true, signatories: true },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      targetId: id,
      targetType: 'CommercialContract',
      action: 'CONTRACT_SUSPENDED',
      metadata: { contractNumber: contract.contractNumber, reason },
    });

    return updated;
  }

  async terminate(id: string, reason: string, terminatedBy: string): Promise<any> {
    const contract = await this.findById(id);

    const updated = await this.prisma.commercialContract.update({
      where: { id },
      data: { status: 'TERMINATED' },
      include: { paymentSchedule: true, deliverables: true, signatories: true },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: terminatedBy,
      targetId: id,
      targetType: 'CommercialContract',
      action: 'CONTRACT_TERMINATED',
      metadata: { contractNumber: contract.contractNumber, reason },
    });

    return updated;
  }

  async renew(id: string, newEndDate: string, renewedBy: string): Promise<any> {
    const contract = await this.findById(id);

    const updated = await this.prisma.commercialContract.update({
      where: { id },
      data: {
        endDate: new Date(newEndDate),
        status: 'ACTIVE',
      },
      include: { paymentSchedule: true, deliverables: true, signatories: true },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: renewedBy,
      targetId: id,
      targetType: 'CommercialContract',
      action: 'CONTRACT_RENEWED',
      metadata: { contractNumber: contract.contractNumber, newEndDate },
    });

    return updated;
  }

  async addAddendum(dto: AddAddendumDto, addedBy: string): Promise<any> {
    const contract = await this.findById(dto.contractId);

    // Get next addendum number
    const lastAddendum = await this.prisma.contractAddendum.findFirst({
      where: { contractId: dto.contractId },
      orderBy: { number: 'desc' },
    });

    const addendum = await this.prisma.contractAddendum.create({
      data: {
        contractId: dto.contractId,
        number: (lastAddendum?.number || 0) + 1,
        title: dto.title,
        effectiveDate: dto.effectiveDate,
        changes: dto.changes,
      },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: addedBy,
      targetId: dto.contractId,
      targetType: 'ContractAddendum',
      action: 'CONTRACT_ADDENDUM_ADDED',
      metadata: { contractNumber: contract.contractNumber, addendumTitle: dto.title },
    });

    return addendum;
  }

  async recordPaymentSchedulePayment(scheduleId: string, paidAt: Date, paidBy: string): Promise<any> {
    const schedule = await this.prisma.contractPaymentSchedule.findUnique({
      where: { id: scheduleId },
      include: { contract: true },
    });

    if (!schedule) {
      throw new AppException('CONTRACT_NOT_FOUND');
    }

    const updated = await this.prisma.contractPaymentSchedule.update({
      where: { id: scheduleId },
      data: { status: 'PAID', paidAt },
    });

    return updated;
  }

  async updateDeliverableStatus(deliverableId: string, status: string, updatedBy: string): Promise<any> {
    const deliverable = await this.prisma.contractDeliverable.findUnique({
      where: { id: deliverableId },
    });

    if (!deliverable) {
      throw new AppException('CONTRACT_NOT_FOUND');
    }

    const updated = await this.prisma.contractDeliverable.update({
      where: { id: deliverableId },
      data: { status },
    });

    return updated;
  }

  async getExpiringContracts(zoneId: string, withinDays: number): Promise<any[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + withinDays);

    return this.prisma.commercialContract.findMany({
      where: {
        zoneId,
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { lte: targetDate },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  async findAll(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId };

    if (filter?.status) where.status = filter.status;
    if (filter?.companyId) where.companyId = filter.companyId;

    const limit = filter?.limit || 20;

    const data = await this.prisma.commercialContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { paymentSchedule: true, deliverables: true, addenda: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const contract = await this.prisma.commercialContract.findUnique({
      where: { id },
      include: {
        paymentSchedule: true,
        deliverables: true,
        signatories: true,
        addenda: true,
      },
    });

    if (!contract) {
      throw new AppException('CONTRACT_NOT_FOUND');
    }

    return contract;
  }

  async getMilestoneCalendar(zoneId: string, month: number, year: number): Promise<any[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const contracts = await this.prisma.commercialContract.findMany({
      where: {
        zoneId,
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
      include: { paymentSchedule: true, deliverables: true },
    });

    const events: any[] = [];

    for (const contract of contracts) {
      // Payment schedules in range
      for (const ps of contract.paymentSchedule) {
        if (ps.dueDate >= startStr && ps.dueDate <= endStr) {
          events.push({
            date: ps.dueDate,
            type: 'PAYMENT',
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            partyName: contract.partyName,
            amount: Number(ps.amount),
            title: ps.description,
          });
        }
      }

      // Deliverables in range
      for (const d of contract.deliverables) {
        if (d.dueDate >= startStr && d.dueDate <= endStr) {
          events.push({
            date: d.dueDate,
            type: 'DELIVERABLE',
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            partyName: contract.partyName,
            title: d.title,
          });
        }
      }

      // Contract expiry
      const endDateStr = contract.endDate.toISOString().split('T')[0];
      if (endDateStr >= startStr && endDateStr <= endStr) {
        events.push({
          date: endDateStr,
          type: 'CONTRACT_EXPIRY',
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          partyName: contract.partyName,
          title: `قرارداد ${contract.contractNumber} منقضی می‌شود`,
        });
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}
