import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import { BullService } from '../../../bull/bull.service';
import { CreateBidDto, SubmitBidDto, FilterBidsDto } from '../dto/create-bid.dto';
import { PaginatedResult } from '../dto/enums';
import { B2bGatewayService } from './b2b-gateway.service';
import { encryptBidFinancials, decryptBidFinancials } from '../utils/bid-encryption.util';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: B2bGatewayService,
    private readonly bull: BullService,
    private readonly config: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // BID LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateBidDto, createdBy: string): Promise<any> {
    // 1. Verify RFQ exists and status=PUBLISHED
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: dto.rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }
    if (rfq.status !== 'PUBLISHED') {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status, requiredStatus: 'PUBLISHED' },
      });
    }

    // 2. Verify submissionDeadline not passed
    if (new Date(rfq.submissionDeadline) < new Date()) {
      throw new AppException('BID_DEADLINE_PASSED');
    }

    // 3. Verify supplierId not already submitted a bid this round
    const existingBid = await this.prisma.bid.findFirst({
      where: {
        rfqId: dto.rfqId,
        supplierId: dto.supplierId,
        round: rfq.currentRound,
      },
    });
    if (existingBid) {
      throw new AppException('BID_DUPLICATE_ROUND');
    }

    // 4. Verify supplier is allowed (isPublic or in invitedSupplierIds)
    if (!rfq.isPublic && !rfq.invitedSupplierIds.includes(dto.supplierId)) {
      throw new AppException('BID_SUPPLIER_NOT_INVITED');
    }

    // 5. Calculate finalPrice
    const discountPercent = dto.discountPercent || 0;
    const finalPrice = Math.round(dto.totalPrice * (1 - discountPercent / 100));

    // 6. Get supplier company name
    const supplierCompany = await this.prisma.company.findUnique({
      where: { id: dto.supplierId },
      select: { nameFa: true },
    });

    // 7. Create Bid with status=DRAFT
    const isSealed = rfq.biddingMode === 'SEALED';

    // 8. Encrypt financial data for sealed bids
    let encryptedFinancialData: string | null = null;
    if (isSealed) {
      const zoneSecret = this.getZoneSecretKey(rfq.zoneId);
      encryptedFinancialData = encryptBidFinancials(
        {
          unitPrice: dto.unitPrice,
          totalPrice: dto.totalPrice,
          finalPrice,
          discountPercent,
          taxRate: dto.taxRate || 0,
        },
        zoneSecret,
        rfq.zoneId,
      );
    }

    const bid = await this.prisma.bid.create({
      data: {
        rfqId: dto.rfqId,
        zoneId: rfq.zoneId,
        supplierId: dto.supplierId,
        supplierCompanyName: supplierCompany?.nameFa || '',
        round: rfq.currentRound,
        isLatestRound: true,
        unitPrice: BigInt(dto.unitPrice),
        totalPrice: BigInt(dto.totalPrice),
        currency: 'IRR',
        discountPercent: discountPercent ? new Prisma.Decimal(discountPercent) : null,
        finalPrice: BigInt(finalPrice),
        priceBreakdown: (dto.priceBreakdown as any) || Prisma.JsonNull,
        taxIncluded: dto.taxIncluded || false,
        taxRate: dto.taxRate ? new Prisma.Decimal(dto.taxRate) : null,
        deliveryDays: dto.deliveryDays,
        deliveryLocation: dto.deliveryLocation,
        paymentTerms: dto.paymentTerms,
        validityDays: dto.validityDays || 30,
        technicalResponse: dto.technicalResponse,
        technicalCompliance: dto.technicalCompliance !== undefined ? dto.technicalCompliance : true,
        technicalDeviations: dto.technicalDeviations,
        sampleAttached: dto.sampleAttached || false,
        warrantyMonths: dto.warrantyMonths,
        afterSaleService: dto.afterSaleService,
        status: 'DRAFT',
        isSealed,
        sealedAt: isSealed ? new Date() : null,
        encryptedFinancialData,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: createdBy,
      targetId: bid.id,
      targetType: 'Bid',
      action: 'BID_CREATED',
      metadata: { rfqId: dto.rfqId, rfqNumber: rfq.rfqNumber, supplierId: dto.supplierId },
    });

    return bid;
  }

  async update(id: string, dto: Partial<CreateBidDto>, updatedBy: string): Promise<any> {
    const bid = await this.findByIdInternal(id);

    if (bid.status !== 'DRAFT') {
      throw new AppException('BID_INVALID_STATUS', {
        details: { currentStatus: bid.status, requiredStatus: 'DRAFT' },
      });
    }

    // Only the supplier who created it can update
    if (bid.supplierId !== updatedBy) {
      throw new AppException('USER_PERMISSION_DENIED');
    }

    const updateData: any = {};
    if (dto.unitPrice !== undefined) updateData.unitPrice = BigInt(dto.unitPrice);
    if (dto.totalPrice !== undefined) updateData.totalPrice = BigInt(dto.totalPrice);
    if (dto.discountPercent !== undefined) {
      updateData.discountPercent = new Prisma.Decimal(dto.discountPercent);
      const totalPrice = dto.totalPrice !== undefined ? dto.totalPrice : Number(bid.totalPrice);
      updateData.finalPrice = BigInt(Math.round(totalPrice * (1 - dto.discountPercent / 100)));
    }
    if (dto.deliveryDays !== undefined) updateData.deliveryDays = dto.deliveryDays;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.validityDays !== undefined) updateData.validityDays = dto.validityDays;
    if (dto.technicalResponse !== undefined) updateData.technicalResponse = dto.technicalResponse;
    if (dto.technicalCompliance !== undefined) updateData.technicalCompliance = dto.technicalCompliance;
    if (dto.warrantyMonths !== undefined) updateData.warrantyMonths = dto.warrantyMonths;

    return this.prisma.bid.update({ where: { id }, data: updateData });
  }

  async submit(dto: SubmitBidDto, submittedBy: string): Promise<any> {
    const bid = await this.findByIdInternal(dto.bidId);

    if (bid.status !== 'DRAFT') {
      throw new AppException('BID_INVALID_STATUS', {
        details: { currentStatus: bid.status, requiredStatus: 'DRAFT' },
      });
    }

    // Verify RFQ submission deadline not passed
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: bid.rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }
    if (new Date(rfq.submissionDeadline) < new Date()) {
      throw new AppException('BID_DEADLINE_PASSED');
    }

    // Validate required fields
    if (!bid.unitPrice || !bid.totalPrice || !bid.deliveryDays || !bid.paymentTerms) {
      throw new AppException('BID_INVALID_STATUS', {
        details: { message: 'فیلدهای الزامی کامل نیست' },
      });
    }

    // Update bid
    const updated = await this.prisma.bid.update({
      where: { id: dto.bidId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        attachmentKeys: dto.attachmentKeys || bid.attachmentKeys,
      },
    });

    // Increment RFQ bid count in Redis
    const bidCountKey = REDIS_KEYS.b2bRfqBidCount(bid.rfqId);
    const bidCount = await this.redis.incrWithExpiry(bidCountKey, REDIS_TTL.B2B_RFQ_BID_COUNT);

    // Notify buyer (do NOT reveal supplier identity if SEALED)
    this.gateway.emitNewBidToBuyer({
      buyerCompanyId: rfq.companyId,
      rfqId: bid.rfqId,
      rfqNumber: rfq.rfqNumber,
      bidCount,
    });

    // Notify supplier
    this.gateway.emitBidSubmittedToSupplier({
      supplierId: bid.supplierId,
      rfqId: bid.rfqId,
      rfqNumber: rfq.rfqNumber,
      bidId: bid.id,
      submittedAt: new Date(),
    });

    await this.audit.log({
      zoneId: bid.zoneId,
      userId: submittedBy,
      targetId: bid.id,
      targetType: 'Bid',
      action: 'BID_SUBMITTED',
      metadata: { rfqId: bid.rfqId, rfqNumber: rfq.rfqNumber },
    });

    return updated;
  }

  async withdraw(id: string, reason: string, withdrawnBy: string): Promise<any> {
    const bid = await this.findByIdInternal(id);

    if (bid.status !== 'SUBMITTED') {
      throw new AppException('BID_INVALID_STATUS', {
        details: { currentStatus: bid.status, requiredStatus: 'SUBMITTED' },
      });
    }

    // Only before submissionDeadline
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: bid.rfqId } });
    if (rfq && new Date(rfq.submissionDeadline) < new Date()) {
      throw new AppException('BID_DEADLINE_PASSED');
    }

    const updated = await this.prisma.bid.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        withdrawReason: reason,
      },
    });

    // Decrement bid count
    const bidCountKey = REDIS_KEYS.b2bRfqBidCount(bid.rfqId);
    await this.redis.del(bidCountKey);

    // Notify buyer
    if (rfq) {
      const remainingCount = await this.prisma.bid.count({
        where: { rfqId: bid.rfqId, status: 'SUBMITTED' },
      });

      this.gateway.emitBidWithdrawn({
        buyerCompanyId: rfq.companyId,
        rfqId: bid.rfqId,
        rfqNumber: rfq.rfqNumber,
        bidId: bid.id,
        remainingCount,
      });
    }

    await this.audit.log({
      zoneId: bid.zoneId,
      userId: withdrawnBy,
      targetId: id,
      targetType: 'Bid',
      action: 'BID_WITHDRAWN',
      metadata: { rfqId: bid.rfqId, reason },
    });

    return updated;
  }

  async findAll(filter: FilterBidsDto): Promise<PaginatedResult<any>> {
    const where: any = {};

    if (filter.rfqId) where.rfqId = filter.rfqId;
    if (filter.supplierId) where.supplierId = filter.supplierId;
    if (filter.status) where.status = filter.status;
    if (filter.round) where.round = filter.round;

    const limit = filter.limit || 20;

    const data = await this.prisma.bid.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string, requesterId?: string): Promise<any> {
    const bid = await this.findByIdInternal(id);
    return bid;
  }

  async getBidsForRfq(rfqId: string, requesterId: string): Promise<any[]> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    const bids = await this.prisma.bid.findMany({
      where: {
        rfqId,
        isLatestRound: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Apply sealed visibility rules
    return bids.map((bid) => {
      const isBuyer = rfq.companyId === requesterId;
      const isSupplier = bid.supplierId === requesterId;

      // Buyer sees all bids for their RFQ
      if (isBuyer) return bid;

      // Supplier sees only their own bid
      if (isSupplier) return bid;

      // For SEALED bids before CLOSED: hide financial data
      if (rfq.biddingMode === 'SEALED' && !['CLOSED', 'UNDER_EVALUATION', 'AWARDED'].includes(rfq.status)) {
        return {
          ...bid,
          unitPrice: null,
          totalPrice: null,
          finalPrice: null,
          discountPercent: null,
        };
      }

      return bid;
    });
  }

  async getMyBids(
    supplierId: string,
    zoneId: string,
    filter: FilterBidsDto,
  ): Promise<PaginatedResult<any>> {
    const where: any = {
      supplierId,
      zoneId,
      isLatestRound: true,
    };

    if (filter.rfqId) where.rfqId = filter.rfqId;
    if (filter.status) where.status = filter.status;

    const limit = filter.limit || 20;

    const data = await this.prisma.bid.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true, status: true } },
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async uploadBidAttachment(
    bidId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<{ key: string }> {
    const bid = await this.findByIdInternal(bidId);

    if (bid.status !== 'DRAFT') {
      throw new AppException('BID_INVALID_STATUS', {
        details: { currentStatus: bid.status, requiredStatus: 'DRAFT', message: 'فقط پیشنهاد پیش‌نویس قابل بارگذاری فایل است' },
      });
    }

    if (bid.supplierId !== uploadedBy) {
      throw new AppException('USER_PERMISSION_DENIED');
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const fileKey = `b2b-bids/${bidId}/${crypto.randomUUID()}.${ext}`;

    // In production: upload to MinIO
    // await this.minio.putObject(BUCKET, fileKey, file.buffer, file.size, { 'Content-Type': file.mimetype });

    // Append the key to the bid's attachmentKeys array
    await this.prisma.bid.update({
      where: { id: bidId },
      data: {
        attachmentKeys: { push: fileKey },
      },
    });

    await this.audit.log({
      zoneId: bid.zoneId,
      userId: uploadedBy,
      targetId: bidId,
      targetType: 'Bid',
      action: 'BID_CREATED',
      metadata: { rfqId: bid.rfqId, fileName: file.originalname, fileKey },
    });

    return { key: fileKey };
  }

  async getBidCount(rfqId: string): Promise<number> {
    const bidCountKey = REDIS_KEYS.b2bRfqBidCount(rfqId);
    const cached = await this.redis.get(bidCountKey);
    if (cached) return parseInt(cached, 10);

    const count = await this.prisma.bid.count({
      where: { rfqId, status: 'SUBMITTED' },
    });

    await this.redis.set(bidCountKey, count.toString(), REDIS_TTL.B2B_RFQ_BID_COUNT);
    return count;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async findByIdInternal(id: string): Promise<any> {
    const bid = await this.prisma.bid.findUnique({ where: { id } });
    if (!bid) {
      throw new AppException('BID_NOT_FOUND');
    }
    return bid;
  }

  private getZoneSecretKey(zoneId: string): string {
    // BUG-007: Use ConfigService instead of hardcoded fallback
    const globalSecret = this.config.get<string>('BID_ENCRYPTION_SECRET');
    if (!globalSecret) {
      this.logger.error('BID_ENCRYPTION_SECRET environment variable is not configured');
      throw new Error('BID_ENCRYPTION_SECRET not configured — set this environment variable for B2B bid encryption');
    }
    return crypto.createHash('sha256').update(`${zoneId}:${globalSecret}`).digest('hex');
  }
}
