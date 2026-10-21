/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B2B Exchange — Full RFQ-to-Award Flow Integration Test
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Flow tested:
 *   1. Buyer creates RFQ (DRAFT)
 *   2. Buyer publishes RFQ → PUBLISHED
 *   3. Supplier A creates & submits bid (lower price)
 *   4. Supplier B creates & submits bid (higher price)
 *   5. Buyer closes RFQ → UNDER_EVALUATION (bids unsealed)
 *   6. Auto-evaluate all bids → scores assigned, ranks computed
 *   7. Buyer awards RFQ to Supplier A → AWARDED
 *   8. Verify: winning bid marked WINNER, others REJECTED
 *   9. Verify: B2BTransaction created
 *  10. Verify: supplier stats updated
 *  11. Verify: all gateway notifications emitted
 *  12. Verify: BullMQ jobs scheduled
 *  13. Verify: audit logs created
 *  14. Supplier submits clarification question
 *  15. Buyer answers clarification
 *  16. Bid withdrawal flow
 *  17. Award rescind flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RfqService } from './rfq.service';
import { BidService } from './bid.service';
import { BidEvaluationService } from './bid-evaluation.service';
import { AwardService } from './award.service';
import { B2bGatewayService } from './b2b-gateway.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { BullService } from '../../../bull/bull.service';
import { AppException } from '../../../common/exceptions/app.exception';

// ═══════════════════════════════════════════════════════════════════════════════
// In-memory database simulation — tracks state across all service calls
// ═══════════════════════════════════════════════════════════════════════════════
function createInMemoryDb() {
  let seqCounter = 0;
  const rfqs: Map<string, any> = new Map();
  const bids: Map<string, any> = new Map();
  const clarifications: Map<string, any> = new Map();
  const transactions: Map<string, any> = new Map();
  const supplierProfiles: Map<string, any> = new Map();
  const bidReviews: Map<string, any> = new Map();
  const auditLogs: any[] = [];

  const zone = { id: 'zone1', code: 'KVH', nameFa: 'شهرک صنعتی کهنوج' };
  const buyerCompany = { id: 'buyer1', nameFa: 'شرکت خریدار الف' };
  const supplierCompanyA = { id: 'supplierA', nameFa: 'شرکت تأمین الف' };
  const supplierCompanyB = { id: 'supplierB', nameFa: 'شرکت تأمین ب' };

  return {
    zone, buyerCompany, supplierCompanyA, supplierCompanyB,
    rfqs, bids, clarifications, transactions, supplierProfiles, bidReviews, auditLogs,
    nextId: () => `id-${Date.now()}-${++seqCounter}`,
    nextSeq: () => ++seqCounter,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Build Prisma mock that operates on the in-memory DB
// ═══════════════════════════════════════════════════════════════════════════════
function buildPrismaMock(db: ReturnType<typeof createInMemoryDb>) {
  return {
    zone: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === db.zone.id) return Promise.resolve(db.zone);
        return Promise.resolve(null);
      }),
    },
    company: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === db.buyerCompany.id) return Promise.resolve(db.buyerCompany);
        if (where.id === db.supplierCompanyA.id) return Promise.resolve(db.supplierCompanyA);
        if (where.id === db.supplierCompanyB.id) return Promise.resolve(db.supplierCompanyB);
        return Promise.resolve(null);
      }),
    },
    rFQ: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = db.nextId();
        const rfqNumber = `RFQ-KVH-${new Date().getFullYear()}-${db.nextSeq().toString().padStart(5, '0')}`;
        const rfq = { ...data, id, rfqNumber, createdAt: new Date(), updatedAt: new Date() };
        db.rfqs.set(id, rfq);
        return Promise.resolve(rfq);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(db.rfqs.get(where.id) || null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const results = Array.from(db.rfqs.values()).filter((r) => {
          if (where?.zoneId && r.zoneId !== where.zoneId) return false;
          if (where?.status && r.status !== where.status) return false;
          return true;
        });
        return Promise.resolve(results);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const rfq = db.rfqs.get(where.id);
        if (!rfq) return Promise.resolve(null);
        Object.assign(rfq, data, { updatedAt: new Date() });
        return Promise.resolve(rfq);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        let count = 0;
        for (const [, rfq] of db.rfqs) {
          if (where?.rfqId && rfq.id !== where.rfqId) continue;
          Object.assign(rfq, data);
          count++;
        }
        return Promise.resolve({ count });
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const [, bid] of db.bids) {
          if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
          if (where?.status?.in && !where.status.in.includes(bid.status)) continue;
          count++;
        }
        return Promise.resolve(count);
      }),
    },
    rFQClarification: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = db.nextId();
        const clarification = { ...data, id, createdAt: new Date() };
        db.clarifications.set(id, clarification);
        return Promise.resolve(clarification);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(db.clarifications.get(where.id) || null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const c = db.clarifications.get(where.id);
        if (!c) return Promise.resolve(null);
        Object.assign(c, data);
        return Promise.resolve(c);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(Array.from(db.clarifications.values()).filter((c) => c.rfqId === where.rfqId));
      }),
    },
    bid: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = db.nextId();
        const bid = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        db.bids.set(id, bid);
        return Promise.resolve(bid);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(db.bids.get(where.id) || null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        for (const [, bid] of db.bids) {
          if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
          if (where?.supplierId && bid.supplierId !== where.supplierId) continue;
          if (where?.round && bid.round !== where.round) continue;
          if (where?.status && bid.status !== where.status) continue;
          return Promise.resolve(bid);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const results = Array.from(db.bids.values()).filter((b) => {
          if (where?.rfqId && b.rfqId !== where.rfqId) return false;
          if (where?.status?.in && !where.status.in.includes(b.status)) return false;
          if (where?.totalScore?.not !== undefined && b.totalScore === null) return false;
          if (where?.isLatestRound !== undefined && b.isLatestRound !== where.isLatestRound) return false;
          return true;
        });
        return Promise.resolve(results);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const bid = db.bids.get(where.id);
        if (!bid) return Promise.resolve(null);
        Object.assign(bid, data, { updatedAt: new Date() });
        return Promise.resolve(bid);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        let count = 0;
        for (const [, bid] of db.bids) {
          if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
          if (where?.status?.in && !where.status.in.includes(bid.status)) continue;
          if (where?.id?.not && bid.id === where.id.not) continue;
          Object.assign(bid, data);
          count++;
        }
        return Promise.resolve({ count });
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const [, bid] of db.bids) {
          if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
          if (where?.supplierId && bid.supplierId !== where.supplierId) continue;
          if (where?.isWinner !== undefined && bid.isWinner !== where.isWinner) continue;
          if (where?.status && bid.status !== where.status) continue;
          count++;
        }
        return Promise.resolve(count);
      }),
    },
    b2BTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = db.nextId();
        const tx = { ...data, id, createdAt: new Date() };
        db.transactions.set(id, tx);
        return Promise.resolve(tx);
      }),
      deleteMany: jest.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const [id, tx] of db.transactions) {
          if (where?.rfqId && tx.rfqId !== where.rfqId) continue;
          db.transactions.delete(id);
          count++;
        }
        return Promise.resolve({ count });
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(Array.from(db.transactions.values()).filter((tx) => {
          if (where?.zoneId && tx.zoneId !== where.zoneId) return false;
          return true;
        }));
      }),
    },
    supplierProfile: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        for (const [, sp] of db.supplierProfiles) {
          if (where?.companyId && sp.companyId !== where.companyId) continue;
          return Promise.resolve(sp);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        for (const [, sp] of db.supplierProfiles) {
          if (sp.id === where.id) {
            Object.assign(sp, data);
            return Promise.resolve(sp);
          }
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const id = db.nextId();
        const sp = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        db.supplierProfiles.set(id, sp);
        return Promise.resolve(sp);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(Array.from(db.supplierProfiles.values()).filter((sp) => {
          if (where?.zoneId && sp.zoneId !== where.zoneId) return false;
          if (where?.isActive !== undefined && sp.isActive !== where.isActive) return false;
          return true;
        }));
      }),
      count: jest.fn().mockResolvedValue(0),
    },
    bidReview: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(Array.from(db.bidReviews.values()).filter((r) => {
          if (where?.supplierId && r.supplierId !== where.supplierId) return false;
          return true;
        }));
      }),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Re-wire mock implementations after module compilation to ensure
// closures reference the live db state
// ═══════════════════════════════════════════════════════════════════════════════
function wirePrismaMocks(prisma: any, db: ReturnType<typeof createInMemoryDb>) {
  prisma.rFQ.findUnique.mockImplementation(({ where }: any) => Promise.resolve(db.rfqs.get(where.id) || null));
  prisma.rFQ.update.mockImplementation(({ where, data }: any) => {
    const rfq = db.rfqs.get(where.id);
    if (!rfq) return Promise.resolve(null);
    Object.assign(rfq, data, { updatedAt: new Date() });
    return Promise.resolve(rfq);
  });
  prisma.rFQClarification.findUnique.mockImplementation(({ where }: any) => {
    const c = db.clarifications.get(where.id);
    if (!c) return Promise.resolve(null);
    // Handle include: { rfq: true }
    const rfq = db.rfqs.get(c.rfqId);
    return Promise.resolve({ ...c, rfq: rfq || null });
  });
  prisma.rFQClarification.update.mockImplementation(({ where, data }: any) => {
    const c = db.clarifications.get(where.id);
    if (!c) return Promise.resolve(null);
    Object.assign(c, data);
    return Promise.resolve(c);
  });
  prisma.bid.findUnique.mockImplementation(({ where }: any) => Promise.resolve(db.bids.get(where.id) || null));
  prisma.bid.findFirst.mockImplementation(({ where }: any) => {
    for (const [, bid] of db.bids) {
      if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
      if (where?.supplierId && bid.supplierId !== where.supplierId) continue;
      if (where?.round && bid.round !== where.round) continue;
      return Promise.resolve(bid);
    }
    return Promise.resolve(null);
  });
  prisma.bid.findMany.mockImplementation(({ where }: any) => {
    return Promise.resolve(Array.from(db.bids.values()).filter((b: any) => {
      if (where?.rfqId && b.rfqId !== where.rfqId) return false;
      if (where?.status?.in && !where.status.in.includes(b.status)) return false;
      if (where?.totalScore?.not !== undefined && b.totalScore === null) return false;
      if (where?.isLatestRound !== undefined && b.isLatestRound !== where.isLatestRound) return false;
      return true;
    }));
  });
  prisma.bid.update.mockImplementation(({ where, data }: any) => {
    const bid = db.bids.get(where.id);
    if (!bid) return Promise.resolve(null);
    Object.assign(bid, data, { updatedAt: new Date() });
    return Promise.resolve(bid);
  });
  prisma.bid.updateMany.mockImplementation(({ where, data }: any) => {
    let count = 0;
    for (const [, bid] of db.bids) {
      if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
      if (where?.status?.in && !where.status.in.includes(bid.status)) continue;
      if (where?.id?.not && bid.id === where.id.not) continue;
      if (where?.status?.notIn && where.status.notIn.includes(bid.status)) continue;
      Object.assign(bid, data);
      count++;
    }
    return Promise.resolve({ count });
  });
  prisma.bid.count.mockImplementation(({ where }: any) => {
    let count = 0;
    for (const [, bid] of db.bids) {
      if (where?.rfqId && bid.rfqId !== where.rfqId) continue;
      if (where?.status?.in && !where.status.in.includes(bid.status)) continue;
      if (where?.isWinner !== undefined && bid.isWinner !== where.isWinner) continue;
      count++;
    }
    return Promise.resolve(count);
  });
  prisma.b2BTransaction.create.mockImplementation(({ data }: any) => {
    const id = db.nextId();
    const tx = { ...data, id, createdAt: new Date() };
    db.transactions.set(id, tx);
    return Promise.resolve(tx);
  });
  prisma.b2BTransaction.deleteMany.mockImplementation(({ where }: any) => {
    let count = 0;
    for (const [id, tx] of db.transactions) {
      if (where?.rfqId && tx.rfqId !== where.rfqId) continue;
      db.transactions.delete(id);
      count++;
    }
    return Promise.resolve({ count });
  });
  prisma.supplierProfile.findFirst.mockImplementation(({ where }: any) => {
    for (const [, sp] of db.supplierProfiles) {
      if (where?.companyId && sp.companyId !== where.companyId) continue;
      return Promise.resolve(sp);
    }
    return Promise.resolve(null);
  });
  prisma.supplierProfile.update.mockImplementation(({ where, data }: any) => {
    for (const [, sp] of db.supplierProfiles) {
      if (sp.id === where.id) {
        Object.assign(sp, data);
        return Promise.resolve(sp);
      }
    }
    return Promise.resolve(null);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Integration Test Suite
// ═══════════════════════════════════════════════════════════════════════════════
describe('B2B Exchange — Full RFQ-to-Award Integration Flow', () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let redis: { [key: string]: jest.Mock };
  let bull: { [key: string]: jest.Mock };
  let gateway: { [key: string]: jest.Mock };
  let auditService: { log: jest.Mock };

  let rfqService: RfqService;
  let bidService: BidService;
  let evaluationService: BidEvaluationService;
  let awardService: AwardService;

  beforeEach(async () => {
    db = createInMemoryDb();
    prisma = buildPrismaMock(db);

    redis = {
      incr: jest.fn().mockImplementation(() => Promise.resolve(db.nextSeq())),
      incrWithExpiry: jest.fn().mockImplementation(() => Promise.resolve(1)),
      get: jest.fn().mockResolvedValue(null),
      getJson: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    bull = { addJob: jest.fn() };

    gateway = {
      emitRfqPublished: jest.fn(),
      emitNewBidToBuyer: jest.fn(),
      emitBidSubmittedToSupplier: jest.fn(),
      emitDeadlineApproaching: jest.fn(),
      emitRfqClosed: jest.fn(),
      emitRfqAwarded: jest.fn(),
      emitRfqRejected: jest.fn(),
      emitClarificationAnswered: jest.fn(),
      emitBidUnsealed: jest.fn(),
      emitBidWithdrawn: jest.fn(),
    };

    auditService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        BidService,
        BidEvaluationService,
        AwardService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: auditService },
        { provide: BullService, useValue: bull },
        { provide: B2bGatewayService, useValue: gateway },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => (key === 'BID_ENCRYPTION_SECRET' ? 'test-bid-encryption-secret-for-jest' : undefined)) } },
      ],
    }).compile();

    rfqService = module.get<RfqService>(RfqService);
    bidService = module.get<BidService>(BidService);
    evaluationService = module.get<BidEvaluationService>(BidEvaluationService);
    awardService = module.get<AwardService>(AwardService);

    // Re-wire prisma mocks to use live db state (fixes closure reference issues)
    wirePrismaMocks(prisma, db);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE FLOW: Create → Publish → Bid → Close → Evaluate → Award
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Complete RFQ-to-Award Flow', () => {
    const evaluationCriteria = [
      { criterion: 'price', weight: 50, description: 'قیمت' },
      { criterion: 'quality', weight: 25, description: 'کیفیت' },
      { criterion: 'delivery', weight: 15, description: 'زمان تحویل' },
      { criterion: 'warranty', weight: 10, description: 'گارانتی' },
    ];

    it('should complete the full flow: create → publish → bid → close → evaluate → award', async () => {
      // ─── STEP 1: Create RFQ ──────────────────────────────────────────────
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'خرید بلبرینگ صنعتی',
          description: 'نیاز به بلبرینگ‌های صنعتی با کیفیت بالا برای خط تولید کارخانه داریم',
          categoryId: 'cat-bearings',
          categoryPath: ['صنعت', 'قطعات', 'بلبرینگ'],
          quantity: 100,
          unit: 'عدد',
          biddingMode: 'SEALED' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria,
        },
        'user-buyer',
      );

      expect(rfq).toBeDefined();
      expect(rfq.status).toBe('DRAFT');
      expect(rfq.rfqNumber).toContain('RFQ-KVH-');
      expect(rfq.zoneId).toBe(db.zone.id);
      expect(rfq.companyId).toBe(db.buyerCompany.id);

      // ─── STEP 2: Publish RFQ ─────────────────────────────────────────────
      const published = await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).toBeDefined();

      // Verify BullMQ jobs scheduled
      expect(bull.addJob).toHaveBeenCalledWith(
        'b2b-exchange',
        'close-rfq-on-deadline',
        expect.objectContaining({ rfqId: rfq.id }),
        expect.any(Object),
      );

      // Verify socket event emitted
      expect(gateway.emitRfqPublished).toHaveBeenCalledWith(
        expect.objectContaining({ rfqId: rfq.id, rfqNumber: rfq.rfqNumber }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RFQ_PUBLISHED' }),
      );

      // ─── STEP 3: Supplier A creates & submits bid (lower price) ──────────
      const bidA = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 800000,
          totalPrice: 80000000,
          deliveryDays: 7,
          paymentTerms: 'پرداخت نقدی',
          warrantyMonths: 24,
          technicalCompliance: true,
          sampleAttached: true,
        },
        'user-supplierA',
      );

      expect(bidA).toBeDefined();
      expect(bidA.status).toBe('DRAFT');
      expect(bidA.isSealed).toBe(true); // SEALED mode
      expect(bidA.encryptedFinancialData).toBeTruthy(); // Financial data encrypted
      expect(bidA.finalPrice.toString()).toBe('80000000'); // No discount

      const submittedA = await bidService.submit({ bidId: bidA.id }, 'user-supplierA');

      expect(submittedA.status).toBe('SUBMITTED');
      expect(submittedA.submittedAt).toBeDefined();

      // Verify bid count incremented in Redis
      expect(redis.incrWithExpiry).toHaveBeenCalled();

      // Verify notifications
      expect(gateway.emitNewBidToBuyer).toHaveBeenCalled();
      expect(gateway.emitBidSubmittedToSupplier).toHaveBeenCalled();

      // ─── STEP 4: Supplier B creates & submits bid (higher price) ──────────
      const bidB = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyB.id,
          unitPrice: 950000,
          totalPrice: 95000000,
          discountPercent: 5,
          deliveryDays: 14,
          paymentTerms: 'پرداخت ۳۰ روزه',
          warrantyMonths: 12,
          technicalCompliance: true,
          sampleAttached: false,
        },
        'user-supplierB',
      );

      expect(bidB).toBeDefined();
      // finalPrice = 95000000 * (1 - 5/100) = 90250000
      expect(bidB.finalPrice.toString()).toBe('90250000');

      const submittedB = await bidService.submit({ bidId: bidB.id }, 'user-supplierB');

      expect(submittedB.status).toBe('SUBMITTED');

      // ─── STEP 5: Close RFQ ───────────────────────────────────────────────
      const closed = await rfqService.close(rfq.id, 'user-buyer');

      expect(closed.status).toBe('UNDER_EVALUATION');

      // Verify bids were unsealed (SEALED mode)
      const bidAUpdated = db.bids.get(bidA.id);
      expect(bidAUpdated.isSealed).toBe(false);
      expect(bidAUpdated.unsealedAt).toBeDefined();

      const bidBUpdated = db.bids.get(bidB.id);
      expect(bidBUpdated.isSealed).toBe(false);

      // Verify bid:unsealed event emitted
      expect(gateway.emitBidUnsealed).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerCompanyId: db.buyerCompany.id,
          rfqId: rfq.id,
        }),
      );

      // Verify rfq:closed event emitted
      expect(gateway.emitRfqClosed).toHaveBeenCalledWith(
        expect.objectContaining({ rfqId: rfq.id }),
      );

      // Verify auto-evaluate job scheduled
      expect(bull.addJob).toHaveBeenCalledWith(
        'b2b-exchange',
        'auto-evaluate-bids',
        expect.objectContaining({ rfqId: rfq.id }),
      );

      // ─── STEP 6: Auto-evaluate bids ──────────────────────────────────────
      const evaluated = await evaluationService.autoEvaluate(rfq.id);

      expect(evaluated).toHaveLength(2);

      // Verify both bids scored
      for (const bid of evaluated) {
        expect(bid.totalScore).toBeDefined();
        expect(bid.rank).toBeDefined();
      }

      // Verify Supplier A (lower price) ranks higher
      const evalBidA = evaluated.find((b: any) => b.id === bidA.id);
      const evalBidB = evaluated.find((b: any) => b.id === bidB.id);
      expect(evalBidA).toBeDefined();
      expect(evalBidB).toBeDefined();
      expect(Number(evalBidA.totalScore)).toBeGreaterThan(Number(evalBidB.totalScore));
      expect(evalBidA.rank).toBe(1);
      expect(evalBidB.rank).toBe(2);

      // ─── STEP 7: Buyer awards RFQ to Supplier A ──────────────────────────
      const awarded = await awardService.award(
        {
          rfqId: rfq.id,
          winningBidId: bidA.id,
          awardNote: 'برنده با بهترین قیمت و کیفیت انتخاب شد',
          notifyAllBidders: true,
        },
        'user-buyer',
      );

      expect(awarded.status).toBe('AWARDED');
      expect(awarded.winnerId).toBe(bidA.id);
      expect(awarded.awardedAt).toBeDefined();
      expect(awarded.awardNote).toBe('برنده با بهترین قیمت و کیفیت انتخاب شد');

      // Verify winning bid status
      const winnerBid = db.bids.get(bidA.id);
      expect(winnerBid.status).toBe('WINNER');
      expect(winnerBid.isWinner).toBe(true);

      // Verify losing bid status
      const loserBid = db.bids.get(bidB.id);
      expect(loserBid.status).toBe('REJECTED');
      expect(loserBid.rejectionReason).toBe('پیشنهاد شما انتخاب نشد');

      // Verify B2BTransaction created
      expect(db.transactions.size).toBe(1);
      const tx = Array.from(db.transactions.values())[0];
      expect(tx.rfqId).toBe(rfq.id);
      expect(tx.buyerCompanyId).toBe(db.buyerCompany.id);
      expect(tx.supplierCompanyId).toBe(db.supplierCompanyA.id);
      expect(tx.bidId).toBe(bidA.id);
      expect(tx.amount.toString()).toBe('80000000');
      expect(tx.status).toBe('AWARDED');

      // Verify winner notification
      expect(gateway.emitRfqAwarded).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: db.supplierCompanyA.id,
          rfqId: rfq.id,
          bidId: bidA.id,
          awardNote: 'برنده با بهترین قیمت و کیفیت انتخاب شد',
        }),
      );

      // Verify loser notifications
      expect(gateway.emitRfqRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: db.supplierCompanyB.id,
          rfqId: rfq.id,
          rejectionReason: 'پیشنهاد شما انتخاب نشد',
        }),
      );

      // Verify audit log for award
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RFQ_AWARDED' }),
      );

      // Verify award letter job scheduled
      expect(bull.addJob).toHaveBeenCalledWith(
        'b2b-exchange',
        'generate-award-letter',
        expect.any(Object),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLARIFICATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Clarification Flow', () => {
    it('should allow supplier to ask question and buyer to answer', async () => {
      // Create and publish RFQ
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'خرید مواد اولیه',
          description: 'نیاز به مواد اولیه با کیفیت بالا برای خط تولید',
          categoryId: 'cat-raw',
          categoryPath: ['صنعت', 'مواد'],
          quantity: 50,
          unit: 'کیلوگرم',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          clarificationDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      // Supplier submits question
      const clarification = await rfqService.submitClarification(
        { rfqId: rfq.id, question: 'آیا امکان ارسال نمونه قبل از ارسال پیشنهاد وجود دارد؟' },
        'user-supplierA',
        db.supplierCompanyA.id,
      );

      expect(clarification).toBeDefined();
      expect(clarification.question).toContain('نمونه');
      expect(clarification.questionBy).toBe(db.supplierCompanyA.id);
      expect(clarification.isPublic).toBe(true);

      // Buyer answers
      const answered = await rfqService.answerClarification(
        {
          clarificationId: clarification.id,
          answer: 'بله، امکان ارسال نمونه وجود دارد. لطفاً با واحد فروش تماس بگیرید',
          isPublic: true,
        },
        'user-buyer',
      );

      expect(answered.answer).toContain('امکان ارسال نمونه');
      expect(answered.answeredBy).toBe('user-buyer');
      expect(answered.answeredAt).toBeDefined();

      // Verify clarification notification emitted
      expect(gateway.emitClarificationAnswered).toHaveBeenCalledWith(
        expect.objectContaining({
          rfqId: rfq.id,
          clarificationId: clarification.id,
        }),
      );

      // Get clarifications
      const clarifications = await rfqService.getClarifications(rfq.id);
      expect(clarifications).toHaveLength(1);
      expect(clarifications[0].answer).toContain('امکان ارسال نمونه');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BID WITHDRAWAL FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bid Withdrawal Flow', () => {
    it('should allow supplier to withdraw bid before deadline', async () => {
      // Create, publish, create bid
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه خدمات فنی',
          description: 'نیاز به خدمات فنی و مهندسی برای پروژه جدید شرکت',
          categoryId: 'cat-services',
          categoryPath: ['خدمات', 'فنی'],
          quantity: 1,
          unit: 'پروژه',
          biddingMode: 'SEALED' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 50000000,
          totalPrice: 50000000,
          deliveryDays: 30,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );

      await bidService.submit({ bidId: bid.id }, 'user-supplierA');

      // Withdraw bid
      const withdrawn = await bidService.withdraw(bid.id, 'تغییر در برنامه‌ریزی', 'user-supplierA');

      expect(withdrawn.status).toBe('WITHDRAWN');
      expect(withdrawn.withdrawnAt).toBeDefined();
      expect(withdrawn.withdrawReason).toBe('تغییر در برنامه‌ریزی');

      // Verify bid:withdrawn event emitted
      expect(gateway.emitBidWithdrawn).toHaveBeenCalledWith(
        expect.objectContaining({
          rfqId: rfq.id,
          bidId: bid.id,
        }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BID_WITHDRAWN' }),
      );
    });

    it('should reject withdrawal after deadline', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه خدمات فنی ۲',
          description: 'نیاز به خدمات فنی و مهندسی برای پروژه جدید شرکت',
          categoryId: 'cat-services',
          categoryPath: ['خدمات', 'فنی'],
          quantity: 1,
          unit: 'پروژه',
          biddingMode: 'SEALED' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 50000000,
          totalPrice: 50000000,
          deliveryDays: 30,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );

      await bidService.submit({ bidId: bid.id }, 'user-supplierA');

      // Manually set deadline to past
      const rfqRecord = db.rfqs.get(rfq.id);
      rfqRecord.submissionDeadline = new Date(Date.now() - 1000);

      await expect(
        bidService.withdraw(bid.id, 'Changed mind', 'user-supplierA'),
      ).rejects.toThrow(AppException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AWARD RESCIND FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Award Rescind Flow', () => {
    it('should allow buyer to rescind award before proforma confirmation', async () => {
      // Create, publish, bid, close, evaluate, award
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'خرید تجهیزات',
          description: 'نیاز به تجهیزات صنعتی با کیفیت بالا برای کارخانه',
          categoryId: 'cat-equip',
          categoryPath: ['صنعت', 'تجهیزات'],
          quantity: 5,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 10000000,
          totalPrice: 50000000,
          deliveryDays: 14,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );

      await bidService.submit({ bidId: bid.id }, 'user-supplierA');
      await rfqService.close(rfq.id, 'user-buyer');
      await evaluationService.autoEvaluate(rfq.id);

      // Award
      await awardService.award(
        {
          rfqId: rfq.id,
          winningBidId: bid.id,
          awardNote: 'برنده انتخاب شد',
        },
        'user-buyer',
      );

      // Verify awarded
      const awardedRfq = db.rfqs.get(rfq.id);
      expect(awardedRfq.status).toBe('AWARDED');

      // Rescind
      const rescinded = await awardService.rescindAward(rfq.id, 'تغییر نیاز', 'user-buyer');

      expect(rescinded.status).toBe('UNDER_EVALUATION');
      expect(rescinded.winnerId).toBeNull();

      // Verify winning bid reset
      const resetBid = db.bids.get(bid.id);
      expect(resetBid.status).toBe('SHORTLISTED');
      expect(resetBid.isWinner).toBe(false);

      // Verify transaction deleted
      expect(db.transactions.size).toBe(0);

      // Verify notification
      expect(gateway.emitRfqRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: db.supplierCompanyA.id,
        }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AWARD_RESCINDED' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEALED BID VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Sealed Bid Visibility', () => {
    it('should hide bid financial data for SEALED mode before close', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه محرمانه',
          description: 'مناقصه محرمانه برای خرید تجهیزات حساس با قیمت رقابتی',
          categoryId: 'cat-sensitive',
          categoryPath: ['صنعت', 'محرمانه'],
          quantity: 10,
          unit: 'عدد',
          biddingMode: 'SEALED' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 10000000,
          totalPrice: 100000000,
          deliveryDays: 10,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );

      await bidService.submit({ bidId: bid.id }, 'user-supplierA');

      // Before close: bid should be sealed
      const sealedBid = db.bids.get(bid.id);
      expect(sealedBid.isSealed).toBe(true);
      expect(sealedBid.encryptedFinancialData).toBeTruthy();

      // After close: bid should be unsealed
      await rfqService.close(rfq.id, 'user-buyer');
      const unsealedBid = db.bids.get(bid.id);
      expect(unsealedBid.isSealed).toBe(false);
      expect(unsealedBid.unsealedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-ROUND BIDDING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Multi-Round Bidding', () => {
    it('should allow next round with shortlisted bidders', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه چنددوره‌ای',
          description: 'مناقصه چنددوره‌ای برای بهترین قیمت و شرایط',
          categoryId: 'cat-multi',
          categoryPath: ['صنعت', 'چنددوره'],
          quantity: 100,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          allowMultiRound: true,
          maxRounds: 3,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 10000000,
          totalPrice: 100000000,
          deliveryDays: 10,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );

      await bidService.submit({ bidId: bid.id }, 'user-supplierA');

      // Close and evaluate round 1
      await rfqService.close(rfq.id, 'user-buyer');
      await evaluationService.autoEvaluate(rfq.id);

      // Shortlist the bid
      await evaluationService.shortlistBids(rfq.id, [bid.id], 'user-buyer');

      // Start next round
      const nextRound = await rfqService.requestNextRound(
        rfq.id,
        'لطفاً قیمت بهتری ارائه دهید',
        'user-buyer',
      );

      expect(nextRound.currentRound).toBe(2);
      expect(nextRound.status).toBe('PUBLISHED');

      // Verify SHORTLISTED bidder notified
      expect(gateway.emitDeadlineApproaching).toHaveBeenCalled();

      // Previous bid should not be latest round anymore
      const oldBid = db.bids.get(bid.id);
      expect(oldBid.isLatestRound).toBe(false);

      // Audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RFQ_NEXT_ROUND' }),
      );
    });

    it('should reject next round when max rounds reached', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه محدود',
          description: 'مناقصه با حداکثر یک دور مجاز',
          categoryId: 'cat-limited',
          categoryPath: ['صنعت', 'محدود'],
          quantity: 10,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          allowMultiRound: true,
          maxRounds: 1,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      await expect(
        rfqService.requestNextRound(rfq.id, 'Next round', 'user-buyer'),
      ).rejects.toThrow(AppException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RFQ CANCELLATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('RFQ Cancellation', () => {
    it('should cancel RFQ and notify bidders', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه قابل لغو',
          description: 'مناقصه‌ای که ممکن است لغو شود',
          categoryId: 'cat-cancel',
          categoryPath: ['صنعت', 'لغو'],
          quantity: 10,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      // Submit a bid
      const bid = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 10000000,
          totalPrice: 100000000,
          deliveryDays: 10,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );
      await bidService.submit({ bidId: bid.id }, 'user-supplierA');

      // Cancel RFQ
      const cancelled = await rfqService.cancel(rfq.id, 'تغییر نیاز شرکت', 'user-buyer');

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelReason).toBe('تغییر نیاز شرکت');
      expect(cancelled.cancelledAt).toBeDefined();

      // Verify bidder notified
      expect(gateway.emitRfqRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: db.supplierCompanyA.id,
          rejectionReason: 'استعلام لغو شد',
        }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RFQ_CANCELLED' }),
      );
    });

    it('should reject cancellation of AWARDED RFQ', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه انتخاب شده',
          description: 'مناقصه‌ای که قبلاً برنده دارد',
          categoryId: 'cat-awarded',
          categoryPath: ['صنعت', 'انتخاب'],
          quantity: 10,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      // Manually set status to AWARDED
      const rfqRecord = db.rfqs.get(rfq.id);
      rfqRecord.status = 'AWARDED';

      await expect(
        rfqService.cancel(rfq.id, 'reason', 'user-buyer'),
      ).rejects.toThrow(AppException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISON TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Comparison Table', () => {
    it('should generate side-by-side comparison with winner candidate', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه مقایسه‌ای',
          description: 'مناقصه برای مقایسه پیشنهادات مختلف',
          categoryId: 'cat-compare',
          categoryPath: ['صنعت', 'مقایسه'],
          quantity: 50,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [
            { criterion: 'price', weight: 50, description: 'قیمت' },
            { criterion: 'quality', weight: 50, description: 'کیفیت' },
          ],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      // Create two bids
      const bidA = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 1000000,
          totalPrice: 50000000,
          deliveryDays: 7,
          paymentTerms: 'نقد',
          warrantyMonths: 24,
        },
        'user-supplierA',
      );
      await bidService.submit({ bidId: bidA.id }, 'user-supplierA');

      const bidB = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyB.id,
          unitPrice: 1200000,
          totalPrice: 60000000,
          deliveryDays: 14,
          paymentTerms: 'نقد',
          warrantyMonths: 12,
        },
        'user-supplierB',
      );
      await bidService.submit({ bidId: bidB.id }, 'user-supplierB');

      // Close and evaluate
      await rfqService.close(rfq.id, 'user-buyer');
      await evaluationService.autoEvaluate(rfq.id);

      // Get comparison table
      const comparison = await evaluationService.getComparisonTable(rfq.id);

      expect(comparison.rfq).toBeDefined();
      expect(comparison.rfq.id).toBe(rfq.id);
      expect(comparison.bids).toHaveLength(2);
      expect(comparison.bids[0].scores).toHaveLength(2); // price + quality

      // Verify scoring
      for (const bidComparison of comparison.bids) {
        expect(bidComparison.totalScore).toBeGreaterThanOrEqual(0);
        expect(bidComparison.totalScore).toBeLessThanOrEqual(100);
        expect(bidComparison.financials).toBeDefined();
        expect(bidComparison.delivery).toBeDefined();
        expect(bidComparison.technical).toBeDefined();
      }

      // Verify winner candidate (highest score)
      expect(comparison.winner).toBeDefined();
      // Supplier A has lower price, should be winner
      expect(comparison.winner.supplierCompanyName).toBe(db.supplierCompanyA.nameFa);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPUTE FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Dispute Flow', () => {
    it('should allow losing bidder to dispute award', async () => {
      const rfq = await rfqService.create(
        {
          zoneId: db.zone.id,
          companyId: db.buyerCompany.id,
          title: 'مناقصه قابل اعتراض',
          description: 'مناقصه‌ای که ممکن است اعتراض داشته باشد',
          categoryId: 'cat-dispute',
          categoryPath: ['صنعت', 'اعتراض'],
          quantity: 10,
          unit: 'عدد',
          biddingMode: 'OPEN' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [{ criterion: 'price', weight: 100, description: 'قیمت' }],
        },
        'user-buyer',
      );

      await rfqService.publish({ rfqId: rfq.id }, 'user-buyer');

      // Create bids
      const bidA = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyA.id,
          unitPrice: 10000000,
          totalPrice: 100000000,
          deliveryDays: 10,
          paymentTerms: 'نقد',
        },
        'user-supplierA',
      );
      await bidService.submit({ bidId: bidA.id }, 'user-supplierA');

      const bidB = await bidService.create(
        {
          rfqId: rfq.id,
          supplierId: db.supplierCompanyB.id,
          unitPrice: 12000000,
          totalPrice: 120000000,
          deliveryDays: 10,
          paymentTerms: 'نقد',
        },
        'user-supplierB',
      );
      await bidService.submit({ bidId: bidB.id }, 'user-supplierB');

      await rfqService.close(rfq.id, 'user-buyer');
      await evaluationService.autoEvaluate(rfq.id);

      // Award to Supplier A
      await awardService.award(
        {
          rfqId: rfq.id,
          winningBidId: bidA.id,
          awardNote: 'برنده انتخاب شد',
        },
        'user-buyer',
      );

      // Supplier B disputes
      const disputed = await awardService.handleDispute(
        rfq.id,
        'قیمت برنده غیرواقعی است',
        'user-supplierB',
        bidB.id,
      );

      expect(disputed.notes).toContain('اعتراض');

      // Verify notification to buyer
      expect(gateway.emitRfqRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: db.buyerCompany.id,
          rejectionReason: expect.stringContaining('اعتراض'),
        }),
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AWARD_DISPUTED' }),
      );
    });
  });
});
