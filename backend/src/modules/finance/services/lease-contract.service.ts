import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateLeaseContractDto } from '../dto/create-lease.dto';
import { FilterLeasesDto } from '../dto/filter.dto';
import { InvoiceService } from './invoice.service';
import { FinanceGatewayService } from './finance-gateway.service';
import { daysBetween } from '../utils/double-entry.util';

@Injectable()
export class LeaseContractService {
  private readonly logger = new Logger(LeaseContractService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly invoiceService: InvoiceService,
    private readonly gateway: FinanceGatewayService,
  ) {}

  async create(dto: CreateLeaseContractDto, createdBy: string): Promise<any> {
    // 1. Generate contract number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.financeLeaseSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);

    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = zone?.code || 'ZN';
    const contractNumber = `LC-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

    // 2. Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new AppException('LEASE_INVALID_DATES');
    }

    // 3. Check no overlapping lease for same plot
    if (dto.plotId) {
      const overlapping = await this.prisma.leaseContract.findFirst({
        where: {
          zoneId: dto.zoneId,
          plotId: dto.plotId,
          status: { in: ['ACTIVE', 'DRAFT'] },
          OR: [
            { startDate: { lte: endDate }, endDate: { gte: startDate } },
          ],
        },
      });

      if (overlapping) {
        throw new AppException('LEASE_OVERLAP_CONFLICT');
      }
    }

    // 4. Create contract
    const contract = await this.prisma.leaseContract.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        contractNumber,
        plotId: dto.plotId,
        block: dto.block,
        unit: dto.unit,
        areaSqM: dto.areaSqM,
        startDate,
        endDate,
        autoRenew: dto.autoRenew ?? false,
        renewalNoticeDays: dto.renewalNoticeDays ?? 60,
        monthlyRent: BigInt(dto.monthlyRent),
        securityDeposit: BigInt(dto.securityDeposit || 0),
        rentEscalation: dto.rentEscalation,
        billingDay: dto.billingDay ?? 1,
        notes: dto.notes,
        createdBy,
        nextBillingDate: new Date(startDate.getFullYear(), startDate.getMonth(), dto.billingDay ?? 1),
      },
    });

    // 5. Generate payment schedule
    await this.generatePaymentSchedule(contract);

    // 6. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: contract.id,
      targetType: 'LeaseContract',
      action: 'LEASE_CREATED',
      metadata: {
        contractNumber,
        companyId: dto.companyId,
        monthlyRent: dto.monthlyRent,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });

    return this.findById(contract.id);
  }

  async generatePaymentSchedule(contract: any): Promise<any[]> {
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    const billingDay = contract.billingDay || 1;

    const payments: any[] = [];
    let currentDate = new Date(startDate);
    let currentRent = Number(contract.monthlyRent);
    const escalationRate = contract.rentEscalation ? Number(contract.rentEscalation) : 0;
    const escalationMonth = contract.escalationDate ? parseInt(contract.escalationDate.split('-')[0], 10) : null;

    while (currentDate < endDate) {
      const dueDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        billingDay,
      );

      // Apply escalation if applicable
      if (escalationMonth && escalationRate > 0 && dueDate.getMonth() + 1 === escalationMonth) {
        currentRent = Math.round(currentRent * (1 + escalationRate / 100));
      }

      const payment = await this.prisma.leasePayment.create({
        data: {
          contractId: contract.id,
          dueDate,
          amount: BigInt(currentRent),
          status: 'PENDING',
        },
      });

      payments.push(payment);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return payments;
  }

  async suspend(id: string, reason: string, suspendedBy: string): Promise<any> {
    const contract = await this.findById(id);

    if (contract.status !== 'ACTIVE') {
      throw new AppException('LEASE_ALREADY_TERMINATED', {
        details: { message: `وضعیت قرارداد: ${contract.status}` },
      });
    }

    const updated = await this.prisma.leaseContract.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: suspendedBy,
      targetId: id,
      targetType: 'LeaseContract',
      action: 'LEASE_SUSPENDED',
      metadata: { contractNumber: contract.contractNumber, reason },
    });

    return this.findById(id);
  }

  async terminate(
    id: string,
    reason: string,
    terminatedBy: string,
    terminationDate?: Date,
  ): Promise<any> {
    const contract = await this.findById(id);

    if (contract.status === 'TERMINATED') {
      throw new AppException('LEASE_ALREADY_TERMINATED');
    }

    const termDate = terminationDate || new Date();

    // Cancel future LeasePayments
    await this.prisma.leasePayment.updateMany({
      where: {
        contractId: id,
        dueDate: { gt: termDate },
        status: 'PENDING',
      },
      data: { status: 'WAIVED' },
    });

    // Update contract
    const updated = await this.prisma.leaseContract.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminatedAt: termDate,
        terminationReason: reason,
        terminatedBy,
      },
    });

    // Release plot if assigned
    if (contract.plotId) {
      await this.prisma.company.updateMany({
        where: { plotId: contract.plotId },
        data: { plotId: null },
      });
    }

    await this.audit.log({
      zoneId: contract.zoneId,
      userId: terminatedBy,
      targetId: id,
      targetType: 'LeaseContract',
      action: 'LEASE_TERMINATED',
      metadata: { contractNumber: contract.contractNumber, reason, terminationDate: termDate },
    });

    this.gateway.emitLeaseTerminated({
      zoneId: contract.zoneId,
      companyId: contract.companyId || undefined,
      contractId: id,
      contractNumber: contract.contractNumber,
      reason,
    });

    return this.findById(id);
  }

  async renew(
    id: string,
    newEndDate: Date,
    newMonthlyRent?: number,
    renewedBy?: string,
  ): Promise<any> {
    const oldContract = await this.findById(id);

    const renewedContract = await this.create(
      {
        zoneId: oldContract.zoneId,
        companyId: oldContract.companyId,
        plotId: oldContract.plotId,
        block: oldContract.block,
        unit: oldContract.unit,
        areaSqM: oldContract.areaSqM ? Number(oldContract.areaSqM) : undefined,
        startDate: oldContract.endDate.toISOString(),
        endDate: newEndDate.toISOString(),
        autoRenew: oldContract.autoRenew,
        renewalNoticeDays: oldContract.renewalNoticeDays,
        monthlyRent: newMonthlyRent || Number(oldContract.monthlyRent),
        securityDeposit: Number(oldContract.securityDeposit),
        rentEscalation: oldContract.rentEscalation ? Number(oldContract.rentEscalation) : undefined,
        billingDay: oldContract.billingDay,
        notes: `تمدید از قرارداد ${oldContract.contractNumber}`,
      },
      renewedBy || oldContract.createdBy,
    );

    // Update old contract
    await this.prisma.leaseContract.update({
      where: { id },
      data: { status: 'RENEWED' },
    });

    await this.audit.log({
      zoneId: oldContract.zoneId,
      userId: renewedBy || oldContract.createdBy,
      targetId: id,
      targetType: 'LeaseContract',
      action: 'LEASE_RENEWED',
      metadata: {
        oldContractNumber: oldContract.contractNumber,
        newContractNumber: renewedContract.contractNumber,
      },
    });

    return renewedContract;
  }

  async getExpiringContracts(zoneId: string, withinDays: number): Promise<any[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + withinDays);

    return this.prisma.leaseContract.findMany({
      where: {
        zoneId,
        status: 'ACTIVE',
        endDate: { lte: targetDate, gte: new Date() },
      },
      orderBy: { endDate: 'asc' },
      include: { company: { select: { nameFa: true } }, paymentSchedule: true },
    });
  }

  async getContractStats(zoneId: string): Promise<any> {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [
      total,
      active,
      expiring30Days,
      overduePayments,
    ] = await Promise.all([
      this.prisma.leaseContract.count({ where: { zoneId } }),
      this.prisma.leaseContract.count({ where: { zoneId, status: 'ACTIVE' } }),
      this.prisma.leaseContract.count({
        where: {
          zoneId,
          status: 'ACTIVE',
          endDate: { lte: thirtyDays, gte: new Date() },
        },
      }),
      this.prisma.leasePayment.findMany({
        where: {
          contract: { zoneId, status: 'ACTIVE' },
          status: 'OVERDUE',
        },
      }),
    ]);

    const activeContracts = await this.prisma.leaseContract.findMany({
      where: { zoneId, status: 'ACTIVE' },
    });

    const totalMonthlyRevenue = activeContracts.reduce(
      (sum, c) => sum + Number(c.monthlyRent),
      0,
    );

    const overdueAmount = overduePayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    return {
      total,
      active,
      expiring30Days,
      totalMonthlyRevenue,
      totalAnnualRevenue: totalMonthlyRevenue * 12,
      occupancyRate: 0, // Would need total plots to calculate
      overduePayments: overduePayments.length,
      overdueAmount,
    };
  }

  async processMonthlyBilling(zoneId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contracts = await this.prisma.leaseContract.findMany({
      where: {
        zoneId,
        status: 'ACTIVE',
        nextBillingDate: { lte: today },
      },
      include: { company: true },
    });

    for (const contract of contracts) {
      try {
        const invoice = await this.invoiceService.createMonthlyLeaseInvoice(contract);
        this.logger.log(`Created lease invoice ${invoice.invoiceNumber} for contract ${contract.contractNumber}`);
      } catch (error) {
        this.logger.error(`Failed to create lease invoice for contract ${contract.contractNumber}: ${error.message}`);
      }
    }
  }

  async recordLeasePayment(
    contractId: string,
    leasePaymentId: string,
    amount: number,
    method: string,
    reference?: string,
  ): Promise<any> {
    const payment = await this.prisma.leasePayment.findUnique({
      where: { id: leasePaymentId },
    });

    if (!payment) {
      throw new AppException('LEASE_NOT_FOUND', { details: { message: 'رکورد پرداخت اجاره یافت نشد' } });
    }

    const updated = await this.prisma.leasePayment.update({
      where: { id: leasePaymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: BigInt(amount),
        notes: reference,
      },
    });

    await this.audit.log({
      targetId: leasePaymentId,
      targetType: 'LeasePayment',
      action: 'LEASE_PAYMENT_RECORDED',
      metadata: { contractId, amount, method, reference },
    });

    return updated;
  }

  async calculateLatePenalty(payment: any, penaltyRatePerDay: number): Promise<number> {
    if (!payment.dueDate) return 0;
    const dueDate = new Date(payment.dueDate);
    const today = new Date();

    if (today <= dueDate) return 0;

    const overdueDays = daysBetween(dueDate, today);
    const originalAmount = Number(payment.amount);

    return Math.round(overdueDays * penaltyRatePerDay * originalAmount / 100);
  }

  async findAll(filter: FilterLeasesDto): Promise<{ data: any[]; meta: any }> {
    const where: any = {};

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;

    if (filter.search) {
      where.OR = [
        { contractNumber: { contains: filter.search, mode: 'insensitive' } },
        { block: { contains: filter.search, mode: 'insensitive' } },
        { unit: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;

    const data = await this.prisma.leaseContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { company: { select: { nameFa: true } }, paymentSchedule: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const contract = await this.prisma.leaseContract.findUnique({
      where: { id },
      include: {
        company: { select: { nameFa: true, id: true } },
        paymentSchedule: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!contract) {
      throw new AppException('LEASE_NOT_FOUND');
    }

    return contract;
  }
}


