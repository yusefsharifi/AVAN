import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import { BullService } from '../../../bull/bull.service';
import {
  CreateRfqDto,
  UpdateRfqDto,
  PublishRfqDto,
  SubmitClarificationDto,
  AnswerClarificationDto,
  FilterRfqDto,
} from '../dto/create-rfq.dto';
import { RfqStatsDto, EvaluationCriterion } from '../dto/enums';

interface PaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    hasMore: boolean;
    cursor: string | null;
  };
}
import { B2bGatewayService } from './b2b-gateway.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: B2bGatewayService,
    private readonly bull: BullService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RFQ LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateRfqDto, createdBy: string): Promise<any> {
    // 1. Generate rfqNumber: RFQ-{zoneCode}-{year}-{seq:05d}
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.b2bRfqSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);

    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) {
      throw new AppException('ZONE_NOT_FOUND');
    }
    const zoneCode = zone.code || 'ZN';
    const rfqNumber = `RFQ-${zoneCode}-${year}-${seq.toString().padStart(5, '0')}`;

    // 2. Validate evaluation criteria weights sum to 100
    const totalWeight = dto.evaluationCriteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) {
      throw new AppException('RFQ_CRITERIA_WEIGHTS_INVALID', {
        details: { totalWeight, expected: 100 },
      });
    }

    // 3. Validate submissionDeadline > now + 24 hours
    const deadline = new Date(dto.submissionDeadline);
    const minDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (deadline <= minDeadline) {
      throw new AppException('RFQ_DEADLINE_TOO_SOON');
    }

    // 4. Validate clarificationDeadline < submissionDeadline if set
    if (dto.clarificationDeadline) {
      const clarificationDeadline = new Date(dto.clarificationDeadline);
      if (clarificationDeadline >= deadline) {
        throw new AppException('RFQ_INVALID_STATUS', {
          details: { message: 'تاریخ سؤال و جواب باید قبل از ضرب‌الاجل ارسال باشد' },
        });
      }
    }

    // 5. Create RFQ with status=DRAFT
    const rfq = await this.prisma.rFQ.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        rfqNumber,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        categoryPath: dto.categoryPath,
        quantity: new Prisma.Decimal(dto.quantity),
        unit: dto.unit,
        deliveryLocation: dto.deliveryLocation,
        deliveryDeadline: dto.deliveryDeadline ? new Date(dto.deliveryDeadline) : null,
        incoterm: dto.incoterm,
        currencyCode: dto.currencyCode || 'IRR',
        maxBudget: dto.maxBudget ? BigInt(dto.maxBudget) : null,
        budgetIsPublic: dto.budgetIsPublic || false,
        technicalSpecs: dto.technicalSpecs,
        sampleRequired: dto.sampleRequired || false,
        inspectionRequired: dto.inspectionRequired || false,
        status: 'DRAFT',
        biddingMode: dto.biddingMode as any,
        allowMultiRound: dto.allowMultiRound || false,
        currentRound: 1,
        maxRounds: dto.maxRounds || 1,
        allowPartialBid: dto.allowPartialBid || false,
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
        invitedSupplierIds: dto.invitedSupplierIds || [],
        submissionDeadline: deadline,
        clarificationDeadline: dto.clarificationDeadline
          ? new Date(dto.clarificationDeadline)
          : null,
        evaluationCriteria: dto.evaluationCriteria as any,
        autoConvertToPO: dto.autoConvertToPO || false,
        notes: dto.notes,
        createdBy,
      },
    });

    // 6. Create AuditLog
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: rfq.id,
      targetType: 'RFQ',
      action: 'RFQ_CREATED',
      metadata: { rfqNumber, title: dto.title, companyId: dto.companyId },
    });

    return rfq;
  }

  /**
   * Step-4 TASK 6(c): real implementation of PATCH /b2b/rfq/:id.
   *
   * The controller previously ignored `dto` entirely and just echoed
   * `findById(id)`, so the UI's save changed nothing while reporting success —
   * the exact silent-no-persist class this hardening pass targets.
   *
   * Only DRAFT RFQs are editable, the same rule `publish()` and
   * `bidService.update()` already apply, so an already-published tender's
   * commercial terms stay immutable. zoneId/companyId are not writable here
   * (absent from UpdateRfqDto) so a tender can never be moved between tenants.
   */
  async update(id: string, dto: UpdateRfqDto, updatedBy: string): Promise<any> {
    const rfq = await this.findByIdInternal(id);

    if (rfq.status !== 'DRAFT') {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status, requiredStatus: 'DRAFT' },
      });
    }

    const data: Prisma.RFQUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.categoryPath !== undefined) data.categoryPath = dto.categoryPath;
    if (dto.quantity !== undefined) data.quantity = new Prisma.Decimal(dto.quantity);
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.deliveryLocation !== undefined) data.deliveryLocation = dto.deliveryLocation;
    if (dto.deliveryDeadline !== undefined) data.deliveryDeadline = new Date(dto.deliveryDeadline);
    if (dto.incoterm !== undefined) data.incoterm = dto.incoterm;
    if (dto.currencyCode !== undefined) data.currencyCode = dto.currencyCode;
    if (dto.maxBudget !== undefined) data.maxBudget = BigInt(dto.maxBudget);
    if (dto.budgetIsPublic !== undefined) data.budgetIsPublic = dto.budgetIsPublic;
    if (dto.technicalSpecs !== undefined) data.technicalSpecs = dto.technicalSpecs;
    if (dto.sampleRequired !== undefined) data.sampleRequired = dto.sampleRequired;
    if (dto.inspectionRequired !== undefined) data.inspectionRequired = dto.inspectionRequired;
    if (dto.biddingMode !== undefined) data.biddingMode = dto.biddingMode;
    if (dto.allowMultiRound !== undefined) data.allowMultiRound = dto.allowMultiRound;
    if (dto.maxRounds !== undefined) data.maxRounds = dto.maxRounds;
    if (dto.allowPartialBid !== undefined) data.allowPartialBid = dto.allowPartialBid;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.invitedSupplierIds !== undefined) data.invitedSupplierIds = dto.invitedSupplierIds;
    if (dto.submissionDeadline !== undefined) {
      data.submissionDeadline = new Date(dto.submissionDeadline);
    }
    if (dto.clarificationDeadline !== undefined) {
      data.clarificationDeadline = new Date(dto.clarificationDeadline);
    }
    if (dto.evaluationCriteria !== undefined) {
      data.evaluationCriteria = dto.evaluationCriteria as unknown as Prisma.InputJsonValue;
    }
    if (dto.autoConvertToPO !== undefined) data.autoConvertToPO = dto.autoConvertToPO;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.rFQ.update({ where: { id }, data });

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: updatedBy,
      targetId: rfq.id,
      targetType: 'RFQ',
      action: 'RFQ_UPDATED',
      metadata: { rfqNumber: rfq.rfqNumber, fields: Object.keys(dto) },
    });

    return updated;
  }

  async publish(dto: PublishRfqDto, publishedBy: string): Promise<any> {
    if (!dto.rfqId) {
      throw new AppException('RFQ_NOT_FOUND', { details: { rfqId: 'missing' } });
    }
    const rfq = await this.findByIdInternal(dto.rfqId);

    // 1. Verify status=DRAFT
    if (rfq.status !== 'DRAFT') {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status, requiredStatus: 'DRAFT' },
      });
    }

    // 2. Set status=PUBLISHED, publishedAt=now()
    const updated = await this.prisma.rFQ.update({
      where: { id: dto.rfqId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // 3. If dto.notifyInvited: Send SMS/email to invitedSupplierIds
    if (dto.notifyInvited && updated.invitedSupplierIds.length > 0) {
      await this.notifyInvitedSuppliers(updated);
    }

    // 4. If dto.notifyAll: Find all active suppliers in zone with matching category
    if (dto.notifyAll) {
      await this.notifyCategoryMatchedSuppliers(updated);
    }

    // 5. Schedule BullMQ job for deadline notification (24h and 2h before)
    const deadlineMs = new Date(updated.submissionDeadline).getTime() - Date.now();
    if (deadlineMs > 0) {
      // Close RFQ at deadline
      await this.bull.addJob('b2b-exchange', 'close-rfq-on-deadline', { rfqId: updated.id }, { delay: deadlineMs });

      // 24h reminder
      const reminder24h = deadlineMs - 24 * 60 * 60 * 1000;
      if (reminder24h > 0) {
        await this.bull.addJob('b2b-exchange', 'rfq-deadline-reminder', { rfqId: updated.id, hoursRemaining: 24 }, { delay: reminder24h });
      }

      // 2h reminder
      const reminder2h = deadlineMs - 2 * 60 * 60 * 1000;
      if (reminder2h > 0) {
        await this.bull.addJob('b2b-exchange', 'rfq-deadline-reminder', { rfqId: updated.id, hoursRemaining: 2 }, { delay: reminder2h });
      }
    }

    // 6. Create AuditLog
    await this.audit.log({
      zoneId: updated.zoneId,
      userId: publishedBy,
      targetId: updated.id,
      targetType: 'RFQ',
      action: 'RFQ_PUBLISHED',
      metadata: { rfqNumber: updated.rfqNumber, title: updated.title },
    });

    // 7. Emit 'rfq:published' socket event to zone
    const zone = await this.prisma.zone.findUnique({ where: { id: updated.zoneId } });
    this.gateway.emitRfqPublished({
      zoneId: updated.zoneId,
      categoryId: updated.categoryId,
      rfqId: updated.id,
      rfqNumber: updated.rfqNumber,
      title: updated.title,
      buyerName: zone?.nameFa || '',
      quantity: Number(updated.quantity),
      unit: updated.unit,
      submissionDeadline: updated.submissionDeadline,
      categoryPath: updated.categoryPath,
    });

    return updated;
  }

  async close(rfqId: string, closedBy: string): Promise<any> {
    const rfq = await this.findByIdInternal(rfqId);

    // 1. Set status=CLOSED then UNDER_EVALUATION
    const bidCount = await this.prisma.bid.count({
      where: { rfqId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] } },
    });

    // 2. If biddingMode=SEALED: unseal all bids
    if (rfq.biddingMode === 'SEALED') {
      await this.prisma.bid.updateMany({
        where: { rfqId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
        data: { isSealed: false, unsealedAt: new Date() },
      });

      // Emit bid:unsealed event
      const bids = await this.prisma.bid.findMany({
        where: { rfqId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] } },
        select: { id: true, supplierId: true, finalPrice: true, rank: true },
      });

      this.gateway.emitBidUnsealed({
        buyerCompanyId: rfq.companyId,
        rfqId,
        bids: bids.map((b) => ({
          bidId: b.id,
          supplierId: b.supplierId,
          finalPrice: Number(b.finalPrice),
          rank: b.rank || 0,
        })),
      });
    }

    // 3. Set final status
    const newStatus = bidCount === 0 ? 'FAILED' : 'UNDER_EVALUATION';
    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: { status: newStatus as any },
    });

    // 4. Notify buyer
    if (bidCount === 0) {
      // No valid bids → FAILED
      await this.bull.addJob('b2b-exchange', 'failed-rfq-detection', { rfqId });
    } else {
      // Auto-evaluate bids
      await this.bull.addJob('b2b-exchange', 'auto-evaluate-bids', { rfqId });
    }

    // 5. Emit rfq:closed
    this.gateway.emitRfqClosed({
      zoneId: rfq.zoneId,
      rfqId,
      rfqNumber: rfq.rfqNumber,
      bidCount,
      status: newStatus,
    });

    // 6. Create AuditLog
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: closedBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: bidCount === 0 ? 'RFQ_FAILED' : 'RFQ_CLOSED',
      metadata: { rfqNumber: rfq.rfqNumber, bidCount },
    });

    return updated;
  }

  async cancel(rfqId: string, reason: string, cancelledBy: string): Promise<any> {
    const rfq = await this.findByIdInternal(rfqId);

    if (!['DRAFT', 'PUBLISHED'].includes(rfq.status)) {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status },
      });
    }

    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // Notify all bidders who submitted
    const submittedBids = await this.prisma.bid.findMany({
      where: { rfqId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      select: { supplierId: true },
    });

    for (const bid of submittedBids) {
      this.gateway.emitRfqRejected({
        supplierId: bid.supplierId,
        rfqId,
        rfqNumber: rfq.rfqNumber,
        rejectionReason: 'استعلام لغو شد',
      });
    }

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: cancelledBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'RFQ_CANCELLED',
      metadata: { rfqNumber: rfq.rfqNumber, reason },
    });

    return updated;
  }

  async reopen(rfqId: string, newDeadline: Date, reason: string): Promise<any> {
    const rfq = await this.findByIdInternal(rfqId);

    if (!['PUBLISHED', 'CLOSED'].includes(rfq.status)) {
      throw new AppException('RFQ_INVALID_STATUS');
    }

    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'PUBLISHED',
        submissionDeadline: newDeadline,
        publishedAt: new Date(),
        notes: `${rfq.notes || ''}\nبازگشایی: ${reason}`,
      },
    });

    // Notify all bidders
    const bidders = await this.prisma.bid.findMany({
      where: { rfqId },
      select: { supplierId: true },
      distinct: ['supplierId'],
    });

    for (const bidder of bidders) {
      this.gateway.emitDeadlineApproaching({
        supplierId: bidder.supplierId,
        rfqId,
        rfqNumber: rfq.rfqNumber,
        hoursRemaining: Math.round((newDeadline.getTime() - Date.now()) / (1000 * 60 * 60)),
      });
    }

    // Re-schedule BullMQ jobs
    const deadlineMs = newDeadline.getTime() - Date.now();
    if (deadlineMs > 0) {
      await this.bull.addJob('b2b-exchange', 'close-rfq-on-deadline', { rfqId }, { delay: deadlineMs });
    }

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: rfq.companyId,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'RFQ_REOPENED',
      metadata: { rfqNumber: rfq.rfqNumber, newDeadline: newDeadline.toISOString(), reason },
    });

    return updated;
  }

  async requestNextRound(
    rfqId: string,
    message: string,
    requestedBy: string,
  ): Promise<any> {
    const rfq = await this.findByIdInternal(rfqId);

    // 1. Verify allowMultiRound=true and currentRound < maxRounds
    if (!rfq.allowMultiRound) {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { message: 'چنددوره‌ای فعال نیست' },
      });
    }

    if (rfq.currentRound >= rfq.maxRounds) {
      throw new AppException('RFQ_MAX_ROUNDS_REACHED');
    }

    // 2. Increment currentRound and set status=PUBLISHED
    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        currentRound: rfq.currentRound + 1,
        status: 'PUBLISHED',
        submissionDeadline: newDeadline,
        publishedAt: new Date(),
        notes: `${rfq.notes || ''}\nدور جدید: ${message}`,
      },
    });

    // 3. Mark all current bids as not latest round
    await this.prisma.bid.updateMany({
      where: { rfqId, isLatestRound: true },
      data: { isLatestRound: false },
    });

    // 4. Notify SHORTLISTED bidders
    const shortlistedBids = await this.prisma.bid.findMany({
      where: { rfqId, status: 'SHORTLISTED' },
      select: { supplierId: true },
      distinct: ['supplierId'],
    });

    for (const bid of shortlistedBids) {
      this.gateway.emitDeadlineApproaching({
        supplierId: bid.supplierId,
        rfqId,
        rfqNumber: rfq.rfqNumber,
        hoursRemaining: Math.round((newDeadline.getTime() - Date.now()) / (1000 * 60 * 60)),
      });
    }

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: requestedBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'RFQ_NEXT_ROUND',
      metadata: { rfqNumber: rfq.rfqNumber, newRound: updated.currentRound, message },
    });

    return updated;
  }

  async findAll(filter: FilterRfqDto): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.isPublic !== undefined) where.isPublic = filter.isPublic;

    if (filter.openForBidding) {
      where.status = 'PUBLISHED';
      where.submissionDeadline = { gt: new Date() };
    }

    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }

    if (filter.search) {
      where.OR = [
        { rfqNumber: { contains: filter.search, mode: 'insensitive' } },
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';

    const data = await this.prisma.rFQ.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: {
        company: { select: { id: true, nameFa: true } },
        _count: { select: { bids: true, clarifications: true } },
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string, requesterId?: string): Promise<any> {
    const rfq = await this.findByIdInternal(id);
    return rfq;
  }

  async findForSupplier(
    supplierId: string,
    zoneId: string,
    filter: FilterRfqDto,
  ): Promise<PaginatedResult<any>> {
    const where: any = {
      deletedAt: null,
      zoneId,
      status: 'PUBLISHED',
      submissionDeadline: { gt: new Date() },
      OR: [
        { isPublic: true },
        { invitedSupplierIds: { has: supplierId } },
      ],
    };

    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.search) {
      where.AND = [
        {
          OR: [
            { rfqNumber: { contains: filter.search, mode: 'insensitive' } },
            { title: { contains: filter.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const limit = filter.limit || 20;

    // Get RFQs where supplier hasn't bid yet this round
    const data = await this.prisma.rFQ.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: {
        company: { select: { id: true, nameFa: true } },
        _count: { select: { bids: true } },
      },
    });

    // Filter out RFQs where supplier already has a bid in current round
    const filtered: any[] = [];
    for (const rfq of data) {
      const existingBid = await this.prisma.bid.findFirst({
        where: {
          rfqId: rfq.id,
          supplierId,
          round: rfq.currentRound,
        },
      });
      if (!existingBid) {
        filtered.push(rfq);
      }
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, limit) : filtered;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async submitClarification(
    dto: SubmitClarificationDto,
    submittedBy: string,
    companyId: string,
  ): Promise<any> {
    const rfq = await this.findByIdInternal(dto.rfqId);

    // 1. Verify RFQ status=PUBLISHED
    if (rfq.status !== 'PUBLISHED') {
      throw new AppException('RFQ_NOT_PUBLISHED');
    }

    // 2. Verify clarificationDeadline not passed
    if (rfq.clarificationDeadline && new Date(rfq.clarificationDeadline) < new Date()) {
      throw new AppException('RFQ_CLARIFICATION_DEADLINE_PASSED');
    }

    // 3. Create RFQClarification
    const clarification = await this.prisma.rFQClarification.create({
      data: {
        rfqId: dto.rfqId,
        questionBy: companyId,
        questionByName: submittedBy,
        question: dto.question,
        isPublic: true,
      },
    });

    // 4. Notify buyer company
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: submittedBy,
      targetId: clarification.id,
      targetType: 'RFQClarification',
      action: 'RFQ_CLARIFICATION_SUBMITTED',
      metadata: { rfqNumber: rfq.rfqNumber, rfqId: dto.rfqId },
    });

    return clarification;
  }

  async answerClarification(
    dto: AnswerClarificationDto,
    answeredBy: string,
  ): Promise<any> {
    const clarification = await this.prisma.rFQClarification.findUnique({
      where: { id: dto.clarificationId },
      include: { rfq: true },
    });

    if (!clarification) {
      throw new AppException('RFQ_CLARIFICATION_NOT_FOUND');
    }

    const updated = await this.prisma.rFQClarification.update({
      where: { id: dto.clarificationId },
      data: {
        answer: dto.answer,
        answeredBy,
        answeredAt: new Date(),
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
      },
    });

    // If public: notify all bidders
    if (updated.isPublic) {
      this.gateway.emitClarificationAnswered({
        rfqId: clarification.rfqId,
        clarificationId: clarification.id,
        question: clarification.question,
        answer: dto.answer,
        answeredAt: new Date(),
      });
    }

    await this.audit.log({
      zoneId: clarification.rfq.zoneId,
      userId: answeredBy,
      targetId: dto.clarificationId,
      targetType: 'RFQClarification',
      action: 'RFQ_CLARIFICATION_ANSWERED',
      metadata: { rfqNumber: clarification.rfq.rfqNumber },
    });

    return updated;
  }

  async getClarifications(rfqId: string, requesterCompanyId?: string): Promise<any[]> {
    return this.prisma.rFQClarification.findMany({
      where: {
        rfqId,
        OR: [
          { isPublic: true },
          ...(requesterCompanyId
            ? [{ rfq: { companyId: requesterCompanyId } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOADS
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadAttachment(
    rfqId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<{ key: string; url: string }> {
    const rfq = await this.findByIdInternal(rfqId);

    const ext = file.originalname.split('.').pop() || 'bin';
    const fileKey = `b2b-rfq/${rfqId}/spec/${crypto.randomUUID()}.${ext}`;

    // In production: upload to MinIO
    // await this.minio.putObject(BUCKET, fileKey, file.buffer, file.size, { 'Content-Type': file.mimetype });

    // Append the key to the RFQ's attachmentKeys array
    await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        attachmentKeys: { push: fileKey },
      },
    });

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: uploadedBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'RFQ_CREATED',
      metadata: { rfqNumber: rfq.rfqNumber, fileName: file.originalname, fileKey },
    });

    return {
      key: fileKey,
      url: `/files/${fileKey}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getRfqStats(zoneId: string): Promise<RfqStatsDto> {
    const cacheKey = REDIS_KEYS.b2bRfqStats(zoneId);
    const cached = await this.redis.getJson<RfqStatsDto>(cacheKey);
    if (cached) return cached;

    const allRfqs = await this.prisma.rFQ.findMany({
      where: { zoneId, deletedAt: null },
      include: { _count: { select: { bids: true } } },
    });

    const total = allRfqs.length;
    const draft = allRfqs.filter((r) => r.status === 'DRAFT').length;
    const published = allRfqs.filter((r) => r.status === 'PUBLISHED').length;
    const closed = allRfqs.filter((r) => r.status === 'CLOSED' || r.status === 'UNDER_EVALUATION').length;
    const awarded = allRfqs.filter((r) => r.status === 'AWARDED').length;
    const cancelled = allRfqs.filter((r) => r.status === 'CANCELLED' || r.status === 'FAILED').length;

    const totalBids = allRfqs.reduce((sum, r) => sum + r._count.bids, 0);
    const avgBidsPerRfq = total > 0 ? Math.round((totalBids / total) * 10) / 10 : 0;

    // Average evaluation days (from published to awarded/closed)
    const evaluatedRfqs = allRfqs.filter(
      (r) => r.publishedAt && (r.status === 'AWARDED' || r.status === 'CLOSED'),
    );
    const avgEvaluationDays =
      evaluatedRfqs.length > 0
        ? Math.round(
            evaluatedRfqs.reduce((sum, r) => {
              const end = r.awardedAt || new Date();
              return sum + (end.getTime() - new Date(r.publishedAt!).getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / evaluatedRfqs.length * 10,
          ) / 10
        : 0;

    // Top categories
    const categoryMap = new Map<string, number>();
    for (const r of allRfqs) {
      categoryMap.set(r.categoryId, (categoryMap.get(r.categoryId) || 0) + 1);
    }
    const topCategories = Array.from(categoryMap.entries())
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // By month (last 12 months)
    const byMonth = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      byMonth.set(key, 0);
    }
    for (const r of allRfqs) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (byMonth.has(key)) {
        byMonth.set(key, byMonth.get(key)! + 1);
      }
    }

    const result: RfqStatsDto = {
      total,
      draft,
      published,
      closed,
      awarded,
      cancelled,
      avgBidsPerRfq,
      avgEvaluationDays,
      topCategories,
      byMonth: Array.from(byMonth.entries()).map(([month, count]) => ({ month, count })),
    };

    await this.redis.setJson(cacheKey, result, REDIS_TTL.B2B_RFQ_STATS);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async findByIdInternal(id: string): Promise<any> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }
    return rfq;
  }

  private async notifyInvitedSuppliers(rfq: any): Promise<void> {
    for (const supplierId of rfq.invitedSupplierIds) {
      await this.bull.addJob('b2b-exchange', 'notify-invited-suppliers', {
        rfqId: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        supplierId,
        submissionDeadline: rfq.submissionDeadline,
      });
    }
  }

  private async notifyCategoryMatchedSuppliers(rfq: any): Promise<void> {
    // Find active suppliers in zone with matching category
    const suppliers = await this.prisma.supplierProfile.findMany({
      where: {
        zoneId: rfq.zoneId,
        isActive: true,
        categories: { has: rfq.categoryId },
      },
    });

    for (const supplier of suppliers) {
      if (!rfq.invitedSupplierIds.includes(supplier.companyId)) {
        await this.bull.addJob('b2b-exchange', 'notify-invited-suppliers', {
          rfqId: rfq.id,
          rfqNumber: rfq.rfqNumber,
          title: rfq.title,
          supplierId: supplier.companyId,
          submissionDeadline: rfq.submissionDeadline,
        });
      }
    }
  }
}
