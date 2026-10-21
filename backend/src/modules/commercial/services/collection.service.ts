import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  OpenCollectionCaseDto,
  AddCollectionActionDto,
  SetInstallmentPlanDto,
  FilterCollectionCasesDto,
} from '../dto/create-dtos';
import { computeAgingBucket, computeDaysOverdue, generateInstallmentSchedule } from '../utils/commercial.utils';
import { CommercialGatewayService } from './commercial-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CommercialGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // OPEN CASE
  // ═══════════════════════════════════════════════════════════════════════════

  async openCase(dto: OpenCollectionCaseDto, openedBy: string): Promise<any> {
    // Check no active case for same invoice
    const existing = await this.prisma.collectionCase.findFirst({
      where: { invoiceId: dto.invoiceId, collectionStatus: { notIn: ['WRITTEN_OFF'] } },
    });

    if (existing) {
      throw new AppException('COLLECTION_CASE_DUPLICATE');
    }

    const today = new Date().toISOString().split('T')[0];

    const collectionCase = await this.prisma.collectionCase.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        invoiceId: dto.invoiceId,
        partyId: dto.partyId,
        partyName: dto.partyName,
        originalAmount: BigInt(dto.originalAmount),
        remainingAmount: BigInt(dto.originalAmount),
        daysOverdue: 0,
        agingBucket: 'CURRENT',
        collectionStatus: 'NORMAL',
        assignedTo: dto.assignedTo,
        notes: dto.notes || '',
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: openedBy,
      targetId: collectionCase.id,
      targetType: 'CollectionCase',
      action: 'COLLECTION_CASE_OPENED',
      metadata: { partyName: dto.partyName, originalAmount: dto.originalAmount },
    });

    return collectionCase;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD ACTION
  // ═══════════════════════════════════════════════════════════════════════════

  async addAction(dto: AddCollectionActionDto, performedBy: string): Promise<any> {
    const caseRecord = await this.findById(dto.caseId);

    const action = await this.prisma.collectionAction.create({
      data: {
        caseId: dto.caseId,
        type: dto.type as any,
        performedAt: new Date(),
        performedBy,
        performedByName: performedBy,
        notes: dto.notes,
        outcome: dto.outcome as any,
      },
    });

    // Update collection status based on action type
    const statusMap: Record<string, string> = {
      REMINDER_LETTER: 'REMINDER_SENT',
      DEMAND_LETTER: 'DEMAND_LETTER',
      LEGAL_NOTICE: 'LEGAL',
      INSTALLMENT_AGREEMENT: 'INSTALLMENT_AGREED',
      WRITE_OFF: 'WRITTEN_OFF',
    };

    const newStatus = statusMap[dto.type];
    if (newStatus) {
      await this.prisma.collectionCase.update({
        where: { id: dto.caseId },
        data: { collectionStatus: newStatus as any },
      });
    }

    await this.audit.log({
      zoneId: caseRecord.zoneId,
      userId: performedBy,
      targetId: dto.caseId,
      targetType: 'CollectionAction',
      action: 'COLLECTION_ACTION_ADDED',
      metadata: { type: dto.type, outcome: dto.outcome },
    });

    return action;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SET INSTALLMENT PLAN
  // ═══════════════════════════════════════════════════════════════════════════

  async setInstallmentPlan(dto: SetInstallmentPlanDto, setBy: string): Promise<any> {
    const caseRecord = await this.findById(dto.caseId);

    // Check no existing plan
    const existingPlan = await this.prisma.installmentPlan.findUnique({
      where: { caseId: dto.caseId },
    });

    if (existingPlan) {
      throw new AppException('COLLECTION_INSTALLMENT_EXISTS');
    }

    const today = new Date().toISOString().split('T')[0];
    const remaining = Number(caseRecord.remainingAmount);

    // Generate installments
    const schedule = generateInstallmentSchedule(
      remaining,
      dto.installmentCount,
      dto.frequency as 'monthly' | 'biweekly',
      today,
    );

    // Create plan + installments
    const plan = await this.prisma.installmentPlan.create({
      data: {
        caseId: dto.caseId,
        agreedAt: new Date(),
        totalAmount: BigInt(remaining),
        notes: dto.notes,
        installments: {
          create: schedule.map((s) => ({
            dueDate: s.dueDate,
            amount: BigInt(s.amount),
            status: 'PENDING',
          })),
        },
      },
      include: { installments: true },
    });

    // Update case status
    await this.prisma.collectionCase.update({
      where: { id: dto.caseId },
      data: { collectionStatus: 'INSTALLMENT_AGREED' },
    });

    await this.audit.log({
      zoneId: caseRecord.zoneId,
      userId: setBy,
      targetId: dto.caseId,
      targetType: 'InstallmentPlan',
      action: 'COLLECTION_INSTALLMENT_SET',
      metadata: { installmentCount: dto.installmentCount, frequency: dto.frequency, totalAmount: remaining },
    });

    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORD INSTALLMENT PAYMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async recordInstallmentPayment(
    installmentId: string,
    paidAmount: number,
    checkNumber?: string,
    recordedBy?: string,
  ): Promise<any> {
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: { plan: { include: { case: true } } },
    });

    if (!installment) {
      throw new AppException('COLLECTION_INSTALLMENT_NOT_FOUND');
    }

    if (installment.status === 'PAID') {
      throw new AppException('COLLECTION_INSTALLMENT_ALREADY_PAID');
    }

    // Update installment
    const updated = await this.prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        checkNumber,
      },
    });

    // Update case
    const caseRecord = installment.plan.case;
    const newPaidAmount = Number(caseRecord.paidAmount) + paidAmount;
    const newRemaining = Number(caseRecord.originalAmount) - newPaidAmount;

    await this.prisma.collectionCase.update({
      where: { id: caseRecord.id },
      data: {
        paidAmount: BigInt(newPaidAmount),
        remainingAmount: BigInt(Math.max(0, newRemaining)),
      },
    });

    // Emit event
    this.gateway.emitCollectionInstallmentPaid({
      companyId: caseRecord.companyId,
      caseId: caseRecord.id,
      installmentId,
      amount: paidAmount,
    });

    await this.audit.log({
      zoneId: caseRecord.zoneId,
      userId: recordedBy || 'SYSTEM',
      targetId: installmentId,
      targetType: 'Installment',
      action: 'COLLECTION_INSTALLMENT_PAID',
      metadata: { paidAmount, checkNumber },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESCALATE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  async escalateCases(zoneId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];

    const openCases = await this.prisma.collectionCase.findMany({
      where: {
        zoneId,
        collectionStatus: { notIn: ['WRITTEN_OFF', 'LEGAL', 'INSTALLMENT_AGREED'] },
      },
    });

    let escalated = 0;
    let letters = 0;

    for (const caseRecord of openCases) {
      const daysOverdue = caseRecord.daysOverdue;

      let newStatus: string | null = null;

      if (daysOverdue >= 1 && daysOverdue <= 30 && caseRecord.collectionStatus === 'NORMAL') {
        newStatus = 'REMINDER_SENT';
      } else if (daysOverdue >= 31 && daysOverdue <= 60 && caseRecord.collectionStatus === 'REMINDER_SENT') {
        newStatus = 'DEMAND_LETTER';
      } else if (daysOverdue >= 61 && daysOverdue <= 90 && caseRecord.collectionStatus === 'DEMAND_LETTER') {
        newStatus = 'LEGAL';
      }

      if (newStatus) {
        await this.prisma.collectionCase.update({
          where: { id: caseRecord.id },
          data: { collectionStatus: newStatus as any },
        });

        escalated++;

        this.gateway.emitCollectionCaseEscalated({
          zoneId,
          caseId: caseRecord.id,
          partyName: caseRecord.partyName,
          newStatus,
          daysOverdue,
        });
      }
    }

    return { escalated, letters };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE AGING BUCKETS
  // ═══════════════════════════════════════════════════════════════════════════

  async updateAgingBuckets(zoneId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const cases = await this.prisma.collectionCase.findMany({
      where: { zoneId, collectionStatus: { notIn: ['WRITTEN_OFF'] } },
      include: { actions: false },
    });

    for (const caseRecord of cases) {
      // Recompute from invoice due date
      const newDaysOverdue = caseRecord.daysOverdue; // Would recompute from invoice
      const newBucket = computeAgingBucket(
        new Date(Date.now() - caseRecord.daysOverdue * 86400000).toISOString().split('T')[0],
        today,
      );

      if (newBucket !== caseRecord.agingBucket || newDaysOverdue !== caseRecord.daysOverdue) {
        await this.prisma.collectionCase.update({
          where: { id: caseRecord.id },
          data: {
            daysOverdue: newDaysOverdue,
            agingBucket: newBucket as any,
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getAgingSnapshot(zoneId: string): Promise<any> {
    const cases = await this.prisma.collectionCase.findMany({
      where: { zoneId, collectionStatus: { notIn: ['WRITTEN_OFF'] } },
    });

    const buckets: Record<string, { count: number; totalAmount: number }> = {
      CURRENT: { count: 0, totalAmount: 0 },
      DAYS_1_30: { count: 0, totalAmount: 0 },
      DAYS_31_60: { count: 0, totalAmount: 0 },
      DAYS_61_90: { count: 0, totalAmount: 0 },
      OVER_90: { count: 0, totalAmount: 0 },
    };

    const byParty = new Map<string, { partyId: string; partyName: string; buckets: Record<string, number> }>();

    let totalReceivable = 0;

    for (const c of cases) {
      const remaining = Number(c.remainingAmount);
      if (remaining <= 0) continue;

      totalReceivable += remaining;
      buckets[c.agingBucket].count++;
      buckets[c.agingBucket].totalAmount += remaining;

      const partyKey = c.partyId || c.partyName;
      if (!byParty.has(partyKey)) {
        byParty.set(partyKey, {
          partyId: c.partyId || '',
          partyName: c.partyName,
          buckets: { CURRENT: 0, DAYS_1_30: 0, DAYS_31_60: 0, DAYS_61_90: 0, OVER_90: 0 },
        });
      }
      byParty.get(partyKey)!.buckets[c.agingBucket] += remaining;
    }

    return {
      byBucket: buckets,
      byParty: Array.from(byParty.values()),
      totalReceivable,
      collectionRate: 0,
    };
  }

  async findAll(filter: FilterCollectionCasesDto): Promise<any> {
    const where: any = {};

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.agingBucket) where.agingBucket = filter.agingBucket;
    if (filter.collectionStatus) where.collectionStatus = filter.collectionStatus;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;

    const limit = filter.limit || 20;

    const data = await this.prisma.collectionCase.findMany({
      where,
      orderBy: { daysOverdue: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { actions: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const caseRecord = await this.prisma.collectionCase.findUnique({
      where: { id },
      include: { actions: true, installmentPlan: { include: { installments: true } } },
    });

    if (!caseRecord) {
      throw new AppException('COLLECTION_CASE_NOT_FOUND');
    }

    return caseRecord;
  }

  async getCaseStats(zoneId: string): Promise<any> {
    const cases = await this.prisma.collectionCase.findMany({ where: { zoneId } });

    const totalCases = cases.length;
    const openCases = cases.filter((c) => !['WRITTEN_OFF'].includes(c.collectionStatus)).length;
    const resolvedCases = totalCases - openCases;

    const overdueCases = cases.filter((c) => c.daysOverdue > 0);
    const totalOverdue = overdueCases.reduce((sum, c) => sum + Number(c.remainingAmount), 0);
    const avgDaysOverdue =
      overdueCases.length > 0
        ? Math.round(overdueCases.reduce((sum, c) => sum + c.daysOverdue, 0) / overdueCases.length)
        : 0;

    const byStatus: Record<string, number> = {};
    for (const c of cases) {
      byStatus[c.collectionStatus] = (byStatus[c.collectionStatus] || 0) + 1;
    }

    return {
      totalCases,
      openCases,
      resolvedCases,
      totalOverdue,
      avgDaysOverdue,
      byStatus,
      collectionRateLast30Days: 0,
    };
  }
}
