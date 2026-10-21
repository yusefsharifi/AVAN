import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { EvaluateBidDto } from '../dto/evaluate-bid.dto';
import { BidComparisonDto, EvaluationCriterion } from '../dto/enums';
import { generateEvaluationReportPdf } from '../utils/evaluation-report.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class BidEvaluationService {
  private readonly logger = new Logger(BidEvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // BID EVALUATION
  // ═══════════════════════════════════════════════════════════════════════════

  async evaluateBid(dto: EvaluateBidDto, evaluatedBy: string): Promise<any> {
    const bid = await this.prisma.bid.findUnique({ where: { id: dto.bidId } });
    if (!bid) {
      throw new AppException('BID_NOT_FOUND');
    }

    const rfq = await this.prisma.rFQ.findUnique({ where: { id: bid.rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    // 1. Verify RFQ status=UNDER_EVALUATION
    if (rfq.status !== 'UNDER_EVALUATION') {
      throw new AppException('RFQ_INVALID_STATUS', {
        details: { currentStatus: rfq.status, requiredStatus: 'UNDER_EVALUATION' },
      });
    }

    // 2. Validate scores match evaluationCriteria keys
    const criteria = (rfq.evaluationCriteria as unknown as EvaluationCriterion[]) || [];
    const criteriaKeys = criteria.map((c) => c.criterion);
    const scoreKeys = Object.keys(dto.scores);

    const missingKeys = criteriaKeys.filter((k) => !scoreKeys.includes(k));
    const extraKeys = scoreKeys.filter((k) => !criteriaKeys.includes(k));

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      throw new AppException('EVALUATION_CRITERIA_MISMATCH', {
        details: { missingKeys, extraKeys, expectedKeys: criteriaKeys },
      });
    }

    // 3. Calculate totalScore: sum(criterion.weight/100 * scores[criterion.criterion])
    let totalScore = 0;
    const evaluationScores: Record<string, number> = {};

    for (const criterion of criteria) {
      const score = dto.scores[criterion.criterion] || 0;
      const weightedScore = (criterion.weight / 100) * score;
      totalScore += weightedScore;
      evaluationScores[criterion.criterion] = score;
    }

    totalScore = Math.round(totalScore * 100) / 100;

    // 4. Update bid
    const updated = await this.prisma.bid.update({
      where: { id: dto.bidId },
      data: {
        evaluationScores: evaluationScores as any,
        totalScore: new Prisma.Decimal(totalScore),
        status: totalScore >= 50 ? 'SHORTLISTED' : 'UNDER_REVIEW',
      },
    });

    // 5. Audit log
    await this.audit.log({
      zoneId: bid.zoneId,
      userId: evaluatedBy,
      targetId: dto.bidId,
      targetType: 'Bid',
      action: 'BID_EVALUATED',
      metadata: { rfqId: bid.rfqId, totalScore, scores: evaluationScores },
    });

    return updated;
  }

  async autoEvaluate(rfqId: string): Promise<any[]> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    // 1. Get all SUBMITTED bids for RFQ
    const bids = await this.prisma.bid.findMany({
      where: { rfqId, status: { in: ['SUBMITTED'] }, isLatestRound: true },
    });

    if (bids.length === 0) {
      return [];
    }

    const criteria = (rfq.evaluationCriteria as unknown as EvaluationCriterion[]) || [];
    const priceCriterion = criteria.find((c) => c.criterion === 'price');

    // 2. Compute price scores
    let priceScores = new Map<string, number>();
    if (priceCriterion) {
      priceScores = await this.computePriceScore(bids, priceCriterion.weight);
    }

    // 3. For non-price criteria: use default relative scoring
    const nonPriceCriteria = criteria.filter((c) => c.criterion !== 'price');

    // 4. Calculate totalScore for each bid
    const updatedBids: any[] = [];

    for (const bid of bids) {
      const evaluationScores: Record<string, number> = {};
      let totalScore = 0;

      // Price score
      if (priceCriterion) {
        const priceScore = priceScores.get(bid.id) || 0;
        evaluationScores['price'] = priceScore;
        totalScore += (priceCriterion.weight / 100) * priceScore;
      }

      // Non-price criteria: assign default scores based on delivery and technical
      for (const criterion of nonPriceCriteria) {
        let score = 50; // Default neutral score

        if (criterion.criterion === 'delivery') {
          // Lower deliveryDays = higher score (max 100 for 1 day, min 20 for 90+ days)
          const days = bid.deliveryDays;
          score = Math.max(20, Math.min(100, Math.round(100 - (days - 1) * (80 / 89))));
        } else if (criterion.criterion === 'quality') {
          // Based on technical compliance
          score = bid.technicalCompliance ? 80 : 30;
          if (bid.sampleAttached) score += 10;
        } else if (criterion.criterion === 'warranty') {
          // Higher warranty months = higher score
          const months = bid.warrantyMonths || 12;
          score = Math.min(100, Math.round(40 + (months / 36) * 60));
        }

        evaluationScores[criterion.criterion] = score;
        totalScore += (criterion.weight / 100) * score;
      }

      totalScore = Math.round(totalScore * 100) / 100;

      // Update bid
      const updated = await this.prisma.bid.update({
        where: { id: bid.id },
        data: {
          evaluationScores: evaluationScores as any,
          totalScore: new Prisma.Decimal(totalScore),
          status: 'SHORTLISTED',
        },
      });

      updatedBids.push({ ...updated, _totalScoreNum: totalScore });
    }

    // 5. Sort by totalScore DESC
    updatedBids.sort((a: any, b: any) => b._totalScoreNum - a._totalScoreNum);

    // 6. Assign ranks
    for (let i = 0; i < updatedBids.length; i++) {
      await this.prisma.bid.update({
        where: { id: updatedBids[i].id },
        data: { rank: i + 1 },
      });
      updatedBids[i].rank = i + 1;
    }

    // Audit log
    await this.audit.log({
      zoneId: rfq.zoneId,
      userId: rfq.companyId,
      targetId: rfqId,
      targetType: 'RFQ',
      action: 'BID_EVALUATED',
      metadata: { rfqNumber: rfq.rfqNumber, bidCount: bids.length, method: 'auto' },
    });

    return updatedBids;
  }

  async computePriceScore(
    bids: any[],
    priceWeight: number,
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    if (bids.length === 0) return scores;

    // Find lowest price
    let lowestPrice = Number.MAX_SAFE_INTEGER;
    for (const bid of bids) {
      const price = Number(bid.finalPrice);
      if (price < lowestPrice) {
        lowestPrice = price;
      }
    }

    if (bids.length === 1) {
      // Single bid gets full price score
      scores.set(bids[0].id, priceWeight);
      return scores;
    }

    // For each bid: priceScore = (lowestPrice / bidPrice) * priceWeight
    for (const bid of bids) {
      const price = Number(bid.finalPrice);
      if (price <= 0) {
        scores.set(bid.id, 0);
        continue;
      }
      const score = Math.round((lowestPrice / price) * priceWeight * 100) / 100;
      scores.set(bid.id, Math.min(priceWeight, score));
    }

    return scores;
  }

  async rankBids(rfqId: string): Promise<any[]> {
    const bids = await this.prisma.bid.findMany({
      where: {
        rfqId,
        totalScore: { not: null },
      },
      orderBy: { totalScore: 'desc' },
    });

    for (let i = 0; i < bids.length; i++) {
      await this.prisma.bid.update({
        where: { id: bids[i].id },
        data: { rank: i + 1 },
      });
      bids[i].rank = i + 1;
    }

    return bids;
  }

  async shortlistBids(
    rfqId: string,
    bidIds: string[],
    shortlistedBy: string,
  ): Promise<any[]> {
    // Mark selected bids as SHORTLISTED
    const updatedBids: any[] = [];

    for (const bidId of bidIds) {
      const updated = await this.prisma.bid.update({
        where: { id: bidId },
        data: { status: 'SHORTLISTED' },
      });

      await this.audit.log({
        zoneId: updated.zoneId,
        userId: shortlistedBy,
        targetId: bidId,
        targetType: 'Bid',
        action: 'BID_SHORTLISTED',
        metadata: { rfqId },
      });

      updatedBids.push(updated);
    }

    return updatedBids;
  }

  async getComparisonTable(rfqId: string): Promise<BidComparisonDto> {
    const rfq = await this.prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) {
      throw new AppException('RFQ_NOT_FOUND');
    }

    const criteria = (rfq.evaluationCriteria as unknown as EvaluationCriterion[]) || [];

    const bids = await this.prisma.bid.findMany({
      where: {
        rfqId,
        totalScore: { not: null },
        isLatestRound: true,
      },
      orderBy: { totalScore: 'desc' },
    });

    const bidComparisons = bids.map((bid) => {
      const evalScores = (bid.evaluationScores as unknown as Record<string, number>) || {};

      const scores = criteria.map((c) => ({
        criterion: c.criterion,
        weight: c.weight,
        score: evalScores[c.criterion] || 0,
        weightedScore: Math.round((c.weight / 100) * (evalScores[c.criterion] || 0) * 100) / 100,
      }));

      return {
        bid,
        supplier: { companyName: bid.supplierCompanyName },
        scores,
        totalScore: Number(bid.totalScore) || 0,
        rank: bid.rank || 0,
        financials: {
          unitPrice: Number(bid.unitPrice),
          finalPrice: Number(bid.finalPrice),
          taxIncluded: bid.taxIncluded,
          taxRate: Number(bid.taxRate || 0),
        },
        delivery: {
          days: bid.deliveryDays,
          location: bid.deliveryLocation || '',
          paymentTerms: bid.paymentTerms,
        },
        technical: {
          compliance: bid.technicalCompliance,
          deviations: bid.technicalDeviations || '',
          warranty: bid.warrantyMonths || 0,
        },
      };
    });

    const winner = bidComparisons.length > 0 ? bidComparisons[0] : null;

    return {
      rfq,
      bids: bidComparisons,
      winner: winner?.bid || null,
    };
  }

  async getEvaluationReport(rfqId: string): Promise<{ reportKey: string }> {
    const comparison = await this.getComparisonTable(rfqId);

    const pdfBuffer = await generateEvaluationReportPdf(comparison);

    // Upload to MinIO-like storage (using local file for now)
    const reportKey = `b2b-reports/${rfqId}/evaluation.pdf`;

    this.logger.log(
      `Generated evaluation report for RFQ ${rfqId}: ${pdfBuffer.length} bytes, key: ${reportKey}`,
    );

    return { reportKey };
  }
}
