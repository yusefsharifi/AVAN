import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import { UpdateSupplierProfileDto } from '../dto/create-product.dto';
import { SubmitBidReviewDto } from '../dto/evaluate-bid.dto';
import { SupplierRankingDto } from '../dto/enums';

@Injectable()
export class SupplierProfileService {
  private readonly logger = new Logger(SupplierProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPLIER PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  async createOrUpdate(
    companyId: string,
    zoneId: string,
    dto: UpdateSupplierProfileDto,
  ): Promise<any> {
    const existing = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
    });

    if (existing) {
      const updated = await this.prisma.supplierProfile.update({
        where: { companyId },
        data: {
          ...(dto.categories && { categories: dto.categories }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.certifications && { certifications: dto.certifications }),
          ...(dto.yearsInBusiness !== undefined && { yearsInBusiness: dto.yearsInBusiness }),
          ...(dto.annualRevenue !== undefined && { annualRevenue: dto.annualRevenue }),
          ...(dto.employeeCount !== undefined && { employeeCount: dto.employeeCount }),
        },
      });

      await this.audit.log({
        zoneId,
        userId: companyId,
        targetId: updated.id,
        targetType: 'SupplierProfile',
        action: 'SUPPLIER_PROFILE_UPDATED',
        metadata: { companyId },
      });

      // Invalidate cache
      await this.redis.del(REDIS_KEYS.b2bSupplierProfile(companyId));

      return updated;
    }

    // Get company name
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { nameFa: true },
    });

    const profile = await this.prisma.supplierProfile.create({
      data: {
        zoneId,
        companyId,
        companyName: company?.nameFa || '',
        categories: dto.categories || [],
        description: dto.description,
        certifications: dto.certifications || [],
        yearsInBusiness: dto.yearsInBusiness,
        annualRevenue: dto.annualRevenue,
        employeeCount: dto.employeeCount,
      },
    });

    await this.audit.log({
      zoneId,
      userId: companyId,
      targetId: profile.id,
      targetType: 'SupplierProfile',
      action: 'SUPPLIER_PROFILE_UPDATED',
      metadata: { companyId, action: 'created' },
    });

    return profile;
  }

  async getProfile(companyId: string): Promise<any> {
    const cacheKey = REDIS_KEYS.b2bSupplierProfile(companyId);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const profile = await this.prisma.supplierProfile.findUnique({
      where: { companyId },
    });

    if (!profile) {
      throw new AppException('SUPPLIER_PROFILE_NOT_FOUND');
    }

    await this.redis.setJson(cacheKey, profile, REDIS_TTL.B2B_SUPPLIER_PROFILE);
    return profile;
  }

  async findSuppliersByCategory(zoneId: string, categoryId: string): Promise<any[]> {
    return this.prisma.supplierProfile.findMany({
      where: {
        zoneId,
        isActive: true,
        categories: { has: categoryId },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async updateStats(supplierId: string, won: boolean): Promise<void> {
    const profile = await this.prisma.supplierProfile.findFirst({
      where: { companyId: supplierId },
    });

    if (!profile) return;

    const newTotalPlaced = profile.totalBidsPlaced + 1;
    const newTotalWon = profile.totalWonBids + (won ? 1 : 0);
    const newWinRate =
      newTotalPlaced > 0
        ? Math.round((newTotalWon / newTotalPlaced) * 100 * 100) / 100
        : 0;

    await this.prisma.supplierProfile.update({
      where: { id: profile.id },
      data: {
        totalBidsPlaced: newTotalPlaced,
        totalWonBids: newTotalWon,
        winRate: newTotalWon / newTotalPlaced,
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.b2bSupplierProfile(supplierId));
  }

  async submitReview(dto: SubmitBidReviewDto, reviewedBy: string): Promise<any> {
    // Check for duplicate review
    const existing = await this.prisma.bidReview.findFirst({
      where: {
        rfqId: dto.rfqId,
        bidId: dto.bidId,
        buyerCompanyId: reviewedBy,
      },
    });

    if (existing) {
      throw new AppException('SUPPLIER_REVIEW_DUPLICATE');
    }

    const bid = await this.prisma.bid.findUnique({ where: { id: dto.bidId } });
    if (!bid) {
      throw new AppException('BID_NOT_FOUND');
    }

    const review = await this.prisma.bidReview.create({
      data: {
        zoneId: bid.zoneId,
        rfqId: dto.rfqId,
        bidId: dto.bidId,
        supplierId: bid.supplierId,
        buyerCompanyId: reviewedBy,
        rating: dto.rating,
        deliveryScore: dto.deliveryScore,
        qualityScore: dto.qualityScore,
        communicationScore: dto.communicationScore,
        review: dto.review,
        createdBy: reviewedBy,
      },
    });

    // Update supplier profile aggregate stats
    await this.recalculateSupplierRating(bid.supplierId);

    await this.audit.log({
      zoneId: bid.zoneId,
      userId: reviewedBy,
      targetId: review.id,
      targetType: 'BidReview',
      action: 'SUPPLIER_REVIEWED',
      metadata: { supplierId: bid.supplierId, rating: dto.rating },
    });

    return review;
  }

  async getReviews(supplierId: string): Promise<any[]> {
    return this.prisma.bidReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRanking(
    zoneId: string,
    categoryId?: string,
  ): Promise<SupplierRankingDto[]> {
    const cacheKey = categoryId
      ? `${REDIS_KEYS.b2bSupplierRanking(zoneId)}:${categoryId}`
      : REDIS_KEYS.b2bSupplierRanking(zoneId);
    const cached = await this.redis.getJson<SupplierRankingDto[]>(cacheKey);
    if (cached) return cached;

    const where: any = { zoneId, isActive: true };
    if (categoryId) {
      where.categories = { has: categoryId };
    }

    const suppliers = await this.prisma.supplierProfile.findMany({ where });

    // Supplier ranking algorithm:
    // winRate: 40%, rating: 30%, totalWonBids normalized: 20%, deliveryScore: 10%
    const rankings: SupplierRankingDto[] = suppliers.map((s) => {
      const winRateScore = (Number(s.winRate) || 0) / 100; // 0-1
      const ratingScore = (Number(s.rating) || 0) / 5; // 0-1
      const maxWon = Math.max(...suppliers.map((x) => x.totalWonBids), 1);
      const wonScore = s.totalWonBids / maxWon; // 0-1
      const deliveryScore = (Number(s.avgDeliveryScore) || 0) / 5; // 0-1

      const compositeScore =
        Math.round(
          (winRateScore * 0.4 + ratingScore * 0.3 + wonScore * 0.2 + deliveryScore * 0.1) *
            10000,
        ) / 100;

      return {
        supplierId: s.companyId,
        companyName: s.companyName,
        rating: Number(s.rating) || 0,
        winRate: Number(s.winRate) || 0,
        totalWonBids: s.totalWonBids,
        totalBidsPlaced: s.totalBidsPlaced,
        avgDeliveryScore: Number(s.avgDeliveryScore) || 0,
        compositeScore,
      };
    });

    // Sort by composite score descending
    rankings.sort((a, b) => b.compositeScore - a.compositeScore);

    await this.redis.setJson(cacheKey, rankings, REDIS_TTL.B2B_SUPPLIER_RANKING);
    return rankings;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async recalculateSupplierRating(supplierId: string): Promise<void> {
    const reviews = await this.prisma.bidReview.findMany({
      where: { supplierId },
    });

    if (reviews.length === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const avgDelivery =
      reviews.reduce((sum, r) => sum + r.deliveryScore, 0) / reviews.length;

    const profile = await this.prisma.supplierProfile.findFirst({
      where: { companyId: supplierId },
    });

    if (profile) {
      await this.prisma.supplierProfile.update({
        where: { id: profile.id },
        data: {
          rating: Math.round(avgRating * 100) / 100,
          reviewCount: reviews.length,
          avgDeliveryScore: Math.round(avgDelivery * 100) / 100,
        },
      });

      await this.redis.del(REDIS_KEYS.b2bSupplierProfile(supplierId));
    }
  }
}
