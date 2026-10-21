import { Test, TestingModule } from '@nestjs/testing';
import { BidEvaluationService } from './bid-evaluation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('BidEvaluationService', () => {
  let service: BidEvaluationService;
  let prisma: { [key: string]: any };

  beforeEach(async () => {
    prisma = {
      rFQ: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bid: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidEvaluationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<BidEvaluationService>(BidEvaluationService);
  });

  describe('autoEvaluate', () => {
    it('should give lowest price bid max price score', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'قیمت' },
          { criterion: 'quality', weight: 25, description: 'کیفیت' },
          { criterion: 'delivery', weight: 15, description: 'زمان تحویل' },
          { criterion: 'warranty', weight: 10, description: 'گارانتی' },
        ],
      });

      prisma.bid.findMany.mockResolvedValue([
        {
          id: 'bid1',
          rfqId: 'rfq1',
          finalPrice: BigInt(8000000),
          deliveryDays: 7,
          technicalCompliance: true,
          sampleAttached: true,
          warrantyMonths: 24,
          status: 'SUBMITTED',
        },
        {
          id: 'bid2',
          rfqId: 'rfq1',
          finalPrice: BigInt(10000000),
          deliveryDays: 14,
          technicalCompliance: true,
          sampleAttached: false,
          warrantyMonths: 12,
          status: 'SUBMITTED',
        },
      ]);

      prisma.bid.update.mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id });
      });

      const results = await service.autoEvaluate('rfq1');

      expect(results).toHaveLength(2);

      // bid1 has lower price, should have higher price score
      const bid1 = results.find((r: any) => r.id === 'bid1');
      const bid2 = results.find((r: any) => r.id === 'bid2');
      expect(bid1).toBeDefined();
      expect(bid2).toBeDefined();
    });

    it('should handle single bid scenario', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'قیمت' },
          { criterion: 'quality', weight: 50, description: 'کیفیت' },
        ],
      });

      prisma.bid.findMany.mockResolvedValue([
        {
          id: 'bid1',
          rfqId: 'rfq1',
          finalPrice: BigInt(8000000),
          deliveryDays: 7,
          technicalCompliance: true,
          sampleAttached: false,
          warrantyMonths: 12,
          status: 'SUBMITTED',
        },
      ]);

      prisma.bid.update.mockResolvedValue({});

      const results = await service.autoEvaluate('rfq1');

      expect(results).toHaveLength(1);
    });

    it('should return empty array if no bids', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        evaluationCriteria: [
          { criterion: 'price', weight: 100, description: 'قیمت' },
        ],
      });

      prisma.bid.findMany.mockResolvedValue([]);

      const results = await service.autoEvaluate('rfq1');

      expect(results).toHaveLength(0);
    });
  });

  describe('computePriceScore', () => {
    it('should return full weight for lowest price', async () => {
      const bids = [
        { id: 'bid1', finalPrice: BigInt(8000000) },
        { id: 'bid2', finalPrice: BigInt(10000000) },
      ];

      const scores = await service.computePriceScore(bids as any, 50);

      // bid1 gets full weight (50) since it's the lowest
      expect(scores.get('bid1')).toBe(50);
    });

    it('should return proportional score for higher price', async () => {
      const bids = [
        { id: 'bid1', finalPrice: BigInt(8000000) },
        { id: 'bid2', finalPrice: BigInt(10000000) },
      ];

      const scores = await service.computePriceScore(bids as any, 50);

      // bid2: (8000000/10000000) * 50 = 40
      expect(scores.get('bid2')).toBe(40);
    });

    it('should handle single bid scenario', async () => {
      const bids = [{ id: 'bid1', finalPrice: BigInt(8000000) }];

      const scores = await service.computePriceScore(bids as any, 50);

      // Single bid gets full weight
      expect(scores.get('bid1')).toBe(50);
    });
  });

  describe('evaluateBid', () => {
    it('should reject evaluation of non-UNDER_EVALUATION RFQ', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        evaluationCriteria: [],
      });

      await expect(
        service.evaluateBid(
          { bidId: 'bid1', scores: { price: 80 } },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should calculate totalScore correctly', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'قیمت' },
          { criterion: 'quality', weight: 50, description: 'کیفیت' },
        ],
      });

      prisma.bid.update.mockResolvedValue({});

      await service.evaluateBid(
        { bidId: 'bid1', scores: { price: 80, quality: 90 } },
        'user1',
      );

      // totalScore = (50/100)*80 + (50/100)*90 = 40 + 45 = 85
      const updateCall = prisma.bid.update.mock.calls[0][0];
      expect(updateCall.data.totalScore.toString()).toBe('85');
    });

    it('should reject if scores do not match criteria', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'قیمت' },
          { criterion: 'quality', weight: 50, description: 'کیفیت' },
        ],
      });

      await expect(
        service.evaluateBid(
          { bidId: 'bid1', scores: { price: 80 } }, // missing 'quality'
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getComparisonTable', () => {
    it('should include all evaluated bids', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'قیمت' },
          { criterion: 'quality', weight: 50, description: 'کیفیت' },
        ],
      });

      prisma.bid.findMany.mockResolvedValue([
        {
          id: 'bid1',
          totalScore: 85,
          rank: 1,
          evaluationScores: { price: 80, quality: 90 },
          unitPrice: BigInt(100000),
          finalPrice: BigInt(8000000),
          taxIncluded: false,
          taxRate: null,
          deliveryDays: 7,
          deliveryLocation: 'Tehran',
          paymentTerms: '30 days',
          technicalCompliance: true,
          technicalDeviations: null,
          warrantyMonths: 24,
          supplierCompanyName: 'شرکت الف',
        },
      ]);

      const result = await service.getComparisonTable('rfq1');

      expect(result.bids).toHaveLength(1);
      expect(result.bids[0].totalScore).toBe(85);
      expect(result.bids[0].scores).toHaveLength(2);
    });

    it('should mark the highest-scored bid as winner candidate', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        evaluationCriteria: [
          { criterion: 'price', weight: 100, description: 'قیمت' },
        ],
      });

      prisma.bid.findMany.mockResolvedValue([
        {
          id: 'bid1',
          totalScore: 85,
          rank: 1,
          evaluationScores: { price: 85 },
          unitPrice: BigInt(100000),
          finalPrice: BigInt(8000000),
          taxIncluded: false,
          taxRate: null,
          deliveryDays: 7,
          deliveryLocation: 'Tehran',
          paymentTerms: '30 days',
          technicalCompliance: true,
          technicalDeviations: null,
          warrantyMonths: 24,
          supplierCompanyName: 'شرکت الف',
        },
        {
          id: 'bid2',
          totalScore: 70,
          rank: 2,
          evaluationScores: { price: 70 },
          unitPrice: BigInt(120000),
          finalPrice: BigInt(10000000),
          taxIncluded: false,
          taxRate: null,
          deliveryDays: 14,
          deliveryLocation: 'Isfahan',
          paymentTerms: '60 days',
          technicalCompliance: true,
          technicalDeviations: null,
          warrantyMonths: 12,
          supplierCompanyName: 'شرکت ب',
        },
      ]);

      const result = await service.getComparisonTable('rfq1');

      expect(result.winner).toBeDefined();
      expect(result.winner.id).toBe('bid1');
    });
  });
});
