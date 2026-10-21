import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { BullService } from '../../../bull/bull.service';
import { AwardRfqDto } from '../dto/evaluate-bid.dto';
import { B2bGatewayService } from './b2b-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AwardService {
  private readonly logger = new Logger(AwardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: B2bGatewayService,
    private readonly bull: BullService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // AWARD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async award(dto: AwardRfqDto, awardedBy: string): Promise<any> {
    // 1. Find RFQ, verify status=UNDER_EVALUATION
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: dto.rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }
    if (rfq.status !== 'UNDER_EVALUATION') {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status, requiredStatus: 'UNDER_EVALUATION' },
      });
    }

    // 2. Find winning bid, verify belongs to RFQ
    const winningBid = await this.prisma.bid.findUnique({ where: { id: dto.winningBidId } });
    if (!winningBid || winningBid.rfqId !== dto.rfqId) {
      throw new AppException('AWARD_NOT_FOUND');
    }

    // 3. Set rfq.winnerId, awardedAt, awardedBy, awardNote, status=AWARDED
    await this.prisma.rFQ.update({
      where: { id: dto.rfqId },
      data: {
        winnerId: dto.winningBidId,
        awardedAt: new Date(),
        awardedBy,
        awardNote: dto.awardNote,
        status: 'AWARDED',
      },
    });

    // 4. Set winning bid: status=WINNER, isWinner=true
    await this.prisma.bid.update({
      where: { id: dto.winningBidId },
      data: { status: 'WINNER', isWinner: true },
    });

    // 5. Set all other bids: status=REJECTED
    await this.prisma.bid.updateMany({
      where: {
        rfqId: dto.rfqId,
        id: { not: dto.winningBidId },
        status: { notIn: ['WITHDRAWN', 'DISQUALIFIED'] },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReasonTemplate || 'پیشنهاد شما انتخاب نشد',
      },
    });

    // 6. Update SupplierProfile stats
    const allBidders = await this.prisma.bid.findMany({
      where: { rfqId: dto.rfqId, isLatestRound: true },
      select: { supplierId: true },
      distinct: ['supplierId'],
    });

    for (const bidder of allBidders) {
      const isWinner = bidder.supplierId === winningBid.supplierId;
      await this.updateSupplierStats(bidder.supplierId, isWinner);
    }

    // 7. Create B2BTransaction record
    const transaction = await this.prisma.b2BTransaction.create({
      data: {
        zoneId: rfq.zoneId,
        rfqId: dto.rfqId,
        buyerCompanyId: rfq.companyId,
        supplierCompanyId: winningBid.supplierId,
        bidId: dto.winningBidId,
        amount: winningBid.finalPrice,
        currency: winningBid.currency,
        status: 'AWARDED',
        awardedAt: new Date(),
      },
    });

    // 8. Notify winner via SMS + in-app + email
    this.gateway.emitRfqAwarded({
      supplierId: winningBid.supplierId,
      rfqId: dto.rfqId,
      rfqNumber: rfq.rfqNumber,
      bidId: dto.winningBidId,
      awardNote: dto.awardNote,
      autoConvertedToPO: false,
    });

    // 9. If dto.notifyAllBidders: Notify losers
    if (dto.notifyAllBidders) {
      const losingBidders = allBidders.filter((b) => b.supplierId !== winningBid.supplierId);
      for (const loser of losingBidders) {
        this.gateway.emitRfqRejected({
          supplierId: loser.supplierId,
          rfqId: dto.rfqId,
          rfqNumber: rfq.rfqNumber,
          rejectionReason: dto.rejectionReasonTemplate || 'پیشنهاد شما انتخاب نشد',
        });
      }
    }

    // 10. Generate award letter via M7 (Correspondence) - fire and forget
    this.bull.addJob('b2b-exchange', 'generate-award-letter', {
      rfqId: dto.rfqId,
      winningBidId: dto.winningBidId,
      rfqNumber: rfq.rfqNumber,
    });

    // 11. If autoConvertToPO: create proforma in commercial module
    if (dto.autoConvertToPO || rfq.autoConvertToPO) {
      await this.bull.addJob('b2b-exchange', 'create-proforma-from-award', {
        rfqId: dto.rfqId,
        winningBidId: dto.winningBidId,
        transactionId: transaction.id,
        rfqNumber: rfq.rfqNumber,
      });
    }

    // 12. Create AuditLog
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: awardedBy,
      targetId: dto.rfqId,
      targetType: 'RFQ',
      action: 'RFQ_AWARDED',
      metadata: {
        rfqNumber: rfq.rfqNumber,
        winningBidId: dto.winningBidId,
        winningSupplierId: winningBid.supplierId,
        amount: Number(winningBid.finalPrice),
      },
    });

    return this.prisma.rFQ.findUnique({ where: { id: dto.rfqId } });
  }

  async rescindAward(
    rfqId: string,
    reason: string,
    rescindedBy: string,
  ): Promise<any> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }
    if (rfq.status !== 'AWARDED') {
      throw new AppException('AWARD_CANNOT_RESCIND');
    }

    // 1. Verify no confirmed proforma/order exists
    if (rfq.poId) {
      throw new AppException('AWARD_PROFORMA_EXISTS');
    }

    // Save winnerId before resetting RFQ (rfq object is mutated by update)
    const previousWinnerId = rfq.winnerId;

    // 2. Reset: rfq.winnerId=null, status=UNDER_EVALUATION
    await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        winnerId: null,
        awardedAt: null,
        awardedBy: null,
        awardNote: null,
        status: 'UNDER_EVALUATION',
      },
    });

    // 3. Reset winning bid
    if (previousWinnerId) {
      await this.prisma.bid.update({
        where: { id: previousWinnerId },
        data: { status: 'SHORTLISTED', isWinner: false },
      });
    }

    // 4. Reset rejected bids back to SHORTLISTED
    await this.prisma.bid.updateMany({
      where: { rfqId, status: 'REJECTED' },
      data: { status: 'SHORTLISTED', rejectionReason: null },
    });

    // 5. Notify all parties
    const allBidders = await this.prisma.bid.findMany({
      where: { rfqId, isLatestRound: true },
      select: { supplierId: true },
      distinct: ['supplierId'],
    });

    for (const bidder of allBidders) {
      this.gateway.emitRfqRejected({
        supplierId: bidder.supplierId,
        rfqId,
        rfqNumber: rfq.rfqNumber,
        rejectionReason: 'انتخاب برنده باطل شد',
      });
    }

    // 6. Delete B2BTransaction
    await this.prisma.b2BTransaction.deleteMany({ where: { rfqId } });

    // 7. Create AuditLog
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: rescindedBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'AWARD_RESCINDED',
      metadata: { rfqNumber: rfq.rfqNumber, reason },
    });

    return this.prisma.rFQ.findUnique({ where: { id: rfqId } });
  }

  async handleDispute(
    rfqId: string,
    disputeNote: string,
    disputedBy: string,
    disputedBidId: string,
  ): Promise<any> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    // 1. Record dispute in notes
    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        notes: `${rfq.notes || ''}\nاعتراض: ${disputeNote}`,
        status: 'UNDER_EVALUATION',
      },
    });

    // 2. Notify buyer company for review
    this.gateway.emitRfqRejected({
      supplierId: rfq.companyId,
      rfqId,
      rfqNumber: rfq.rfqNumber,
      rejectionReason: `اعتراض تأمین‌کننده: ${disputeNote}`,
    });

    // 3. Create AuditLog
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: disputedBy,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'AWARD_DISPUTED',
      metadata: { rfqNumber: rfq.rfqNumber, disputedBidId, disputeNote },
    });

    return updated;
  }

  async generateRejectionLetters(rfqId: string): Promise<void> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    const losingBids = await this.prisma.bid.findMany({
      where: {
        rfqId,
        status: 'REJECTED',
        isLatestRound: true,
      },
      select: { supplierId: true, supplierCompanyName: true },
      distinct: ['supplierId'],
    });

    for (const bid of losingBids) {
      // Generate individual rejection letter via M7 (Correspondence)
      await this.bull.addJob('b2b-exchange', 'generate-rejection-letter', {
        rfqId,
        rfqNumber: rfq.rfqNumber,
        supplierId: bid.supplierId,
        supplierName: bid.supplierCompanyName,
      });
    }

    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: rfq.companyId,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'RFQ_CLARIFICATION_ANSWERED',
      metadata: { rfqNumber: rfq.rfqNumber, losingBidCount: losingBids.length },
    });
  }

  async getAwardHistory(
    zoneId: string,
    companyId?: string,
  ): Promise<any[]> {
    const where: any = { zoneId };
    if (companyId) {
      where.OR = [{ buyerCompanyId: companyId }, { supplierCompanyId: companyId }];
    }

    return this.prisma.b2BTransaction.findMany({
      where,
      orderBy: { awardedAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async updateSupplierStats(supplierId: string, won: boolean): Promise<void> {
    const profile = await this.prisma.supplierProfile.findFirst({
      where: { companyId: supplierId },
    });

    if (!profile) {
      // Create profile if doesn't exist
      await this.prisma.supplierProfile.create({
        data: {
          zoneId: '',
          companyId: supplierId,
          companyName: '',
          totalBidsPlaced: 1,
          totalWonBids: won ? 1 : 0,
          winRate: won ? 100 : 0,
        },
      });
      return;
    }

    const newTotalPlaced = profile.totalBidsPlaced + 1;
    const newTotalWon = profile.totalWonBids + (won ? 1 : 0);
    const newWinRate = newTotalPlaced > 0 ? Math.round((newTotalWon / newTotalPlaced) * 100 * 100) / 100 : 0;

    await this.prisma.supplierProfile.update({
      where: { id: profile.id },
      data: {
        totalBidsPlaced: newTotalPlaced,
        totalWonBids: newTotalWon,
        winRate: new Prisma.Decimal(newWinRate),
      },
    });
  }
}
