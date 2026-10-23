/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B2B Exchange — E2E HTTP Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests the full HTTP request → validation → controller → mock service → response flow.
 * Uses NestJS INestApplication with mocked guards and services.
 * No supertest dependency — uses Node http module directly.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as http from 'http';
import { RfqController } from './controllers/rfq.controller';
import { BidController } from './controllers/bid.controller';
import { EvaluationController } from './controllers/evaluation.controller';
import { AwardController } from './controllers/award.controller';
import { CatalogController } from './controllers/catalog.controller';
import { SupplierController } from './controllers/supplier.controller';
import { RfqService } from './services/rfq.service';
import { BidService } from './services/bid.service';
import { BidEvaluationService } from './services/bid-evaluation.service';
import { AwardService } from './services/award.service';
import { ProductCatalogService } from './services/product-catalog.service';
import { SupplierProfileService } from './services/supplier-profile.service';
import { B2bGatewayService } from './services/b2b-gateway.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

// ═══════════════════════════════════════════════════════════════════════════════
// Valid UUIDs for test data (pass @IsUUID validation)
// ═══════════════════════════════════════════════════════════════════════════════
const UUID = {
  zone1:     '550e8400-e29b-41d4-a716-446655440001',
  company1:  '550e8400-e29b-41d4-a716-446655440002',
  company2:  '550e8400-e29b-41d4-a716-446655440003',
  cat1:      '550e8400-e29b-41d4-a716-446655440004',
  rfq1:      '550e8400-e29b-41d4-a716-446655440005',
  bid1:      '550e8400-e29b-41d4-a716-446655440006',
  bid2:      '550e8400-e29b-41d4-a716-446655440007',
  prod1:     '550e8400-e29b-41d4-a716-446655440008',
  user1:     '550e8400-e29b-41d4-a716-446655440009',
  user2:     '550e8400-e29b-41d4-a716-446655440010',
  clar1:     '550e8400-e29b-41d4-a716-446655440011',
  supplier1: '550e8400-e29b-41d4-a716-446655440012',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Mock services
// ═══════════════════════════════════════════════════════════════════════════════
const mockRfqService = {
  create: jest.fn().mockResolvedValue({
    id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001', status: 'DRAFT',
    title: 'خرید بلبرینگ', zoneId: UUID.zone1, companyId: UUID.company1,
  }),
  publish: jest.fn().mockResolvedValue({
    id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001', status: 'PUBLISHED',
    publishedAt: new Date(),
  }),
  close: jest.fn().mockResolvedValue({ id: UUID.rfq1, status: 'UNDER_EVALUATION' }),
  cancel: jest.fn().mockResolvedValue({
    id: UUID.rfq1, status: 'CANCELLED', cancelReason: 'تغییر نیاز',
  }),
  reopen: jest.fn().mockResolvedValue({
    id: UUID.rfq1, status: 'PUBLISHED', submissionDeadline: new Date(Date.now() + 7 * 86400000),
  }),
  requestNextRound: jest.fn().mockResolvedValue({
    id: UUID.rfq1, currentRound: 2, status: 'PUBLISHED',
  }),
  findAll: jest.fn().mockResolvedValue({
    data: [{ id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001', status: 'PUBLISHED' }],
    meta: { limit: 20, hasMore: false, cursor: null },
  }),
  findById: jest.fn().mockResolvedValue({
    id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001', status: 'PUBLISHED',
    title: 'خرید بلبرینگ', zoneId: UUID.zone1,
  }),
  findForSupplier: jest.fn().mockResolvedValue({
    data: [{ id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001' }],
    meta: { limit: 20, hasMore: false, cursor: null },
  }),
  submitClarification: jest.fn().mockResolvedValue({
    id: UUID.clar1, question: 'آیا امکان ارسال نمونه وجود دارد؟',
  }),
  answerClarification: jest.fn().mockResolvedValue({
    id: UUID.clar1, answer: 'بله', answeredAt: new Date(),
  }),
  getClarifications: jest.fn().mockResolvedValue([
    { id: UUID.clar1, question: 'سؤال', answer: 'جواب' },
  ]),
  getRfqStats: jest.fn().mockResolvedValue({
    total: 10, draft: 2, published: 3, closed: 2, awarded: 2, cancelled: 1,
    avgBidsPerRfq: 5, avgEvaluationDays: 3, topCategories: [], byMonth: [],
  }),
};

const mockBidService = {
  create: jest.fn().mockResolvedValue({
    id: UUID.bid1, status: 'DRAFT', rfqId: UUID.rfq1, supplierId: UUID.supplier1,
  }),
  update: jest.fn().mockResolvedValue({ id: UUID.bid1, status: 'DRAFT' }),
  submit: jest.fn().mockResolvedValue({
    id: UUID.bid1, status: 'SUBMITTED', submittedAt: new Date(),
  }),
  withdraw: jest.fn().mockResolvedValue({
    id: UUID.bid1, status: 'WITHDRAWN', withdrawReason: 'تغییر در برنامه‌ریزی',
  }),
  findAll: jest.fn().mockResolvedValue({
    data: [{ id: UUID.bid1, status: 'SUBMITTED' }],
    meta: { limit: 20, hasMore: false, cursor: null },
  }),
  findById: jest.fn().mockResolvedValue({ id: UUID.bid1, status: 'SUBMITTED', rfqId: UUID.rfq1 }),
  getBidsForRfq: jest.fn().mockResolvedValue([{ id: UUID.bid1, status: 'SUBMITTED' }]),
  getMyBids: jest.fn().mockResolvedValue({
    data: [{ id: UUID.bid1, status: 'SUBMITTED' }],
    meta: { limit: 20, hasMore: false, cursor: null },
  }),
  getBidCount: jest.fn().mockResolvedValue(5),
};

const mockEvaluationService = {
  evaluateBid: jest.fn().mockResolvedValue({
    id: UUID.bid1, totalScore: 85, status: 'SHORTLISTED',
  }),
  autoEvaluate: jest.fn().mockResolvedValue([
    { id: UUID.bid1, totalScore: 85, rank: 1 },
  ]),
  shortlistBids: jest.fn().mockResolvedValue([
    { id: UUID.bid1, status: 'SHORTLISTED' },
  ]),
  getComparisonTable: jest.fn().mockResolvedValue({
    rfq: { id: UUID.rfq1, rfqNumber: 'RFQ-KVH-2026-00001' },
    bids: [{ bid: { id: UUID.bid1 }, totalScore: 85, scores: [] }],
    winner: { id: UUID.bid1 },
  }),
  getEvaluationReport: jest.fn().mockResolvedValue({ reportKey: 'b2b-reports/rfq-1/evaluation.pdf' }),
};

const mockAwardService = {
  award: jest.fn().mockResolvedValue({
    id: UUID.rfq1, status: 'AWARDED', winnerId: UUID.bid1,
  }),
  rescindAward: jest.fn().mockResolvedValue({
    id: UUID.rfq1, status: 'UNDER_EVALUATION', winnerId: null,
  }),
  handleDispute: jest.fn().mockResolvedValue({
    id: UUID.rfq1, notes: 'اعتراض ثبت شد',
  }),
  generateRejectionLetters: jest.fn().mockResolvedValue(undefined),
  getAwardHistory: jest.fn().mockResolvedValue([
    { id: 'tx-1', status: 'AWARDED', amount: BigInt(80000000) },
  ]),
};

const mockCatalogService = {
  create: jest.fn().mockResolvedValue({
    id: UUID.prod1, nameFa: 'بلبرینگ 6205', companyId: UUID.company1,
  }),
  update: jest.fn().mockResolvedValue({
    id: UUID.prod1, nameFa: 'بلبرینگ 6205 بروزرسانی شده',
  }),
  delete: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue([
    { id: UUID.prod1, nameFa: 'بلبرینگ 6205' },
  ]),
  findById: jest.fn().mockResolvedValue({
    id: UUID.prod1, nameFa: 'بلبرینگ 6205', companyId: UUID.company1,
  }),
  getByCompany: jest.fn().mockResolvedValue([
    { id: UUID.prod1, nameFa: 'بلبرینگ 6205' },
  ]),
  getCategoryTree: jest.fn().mockResolvedValue([
    { id: UUID.cat1, nameFa: 'صنعت', children: [] },
  ]),
  getMarketplaceStats: jest.fn().mockResolvedValue({
    totalProducts: 100, totalSuppliers: 20, totalCategories: 10,
    activeRfqs: 5, completedTransactions: 50, totalTransactionVolume: 5000000000,
  }),
};

const mockSupplierService = {
  createOrUpdate: jest.fn().mockResolvedValue({
    id: 'sp-1', companyId: UUID.company1, companyName: 'شرکت الف',
  }),
  getProfile: jest.fn().mockResolvedValue({
    id: 'sp-1', companyId: UUID.company1, companyName: 'شرکت الف', rating: 4.5,
  }),
  findSuppliersByCategory: jest.fn().mockResolvedValue([
    { id: 'sp-1', companyName: 'شرکت الف' },
  ]),
  submitReview: jest.fn().mockResolvedValue({ id: 'review-1', rating: 5 }),
  getReviews: jest.fn().mockResolvedValue([
    { id: 'review-1', rating: 5, review: 'عالی' },
  ]),
  getRanking: jest.fn().mockResolvedValue([
    { supplierId: UUID.company1, companyName: 'شرکت الف', compositeScore: 85 },
  ]),
};

const mockGatewayService = {
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

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP helper
// ═══════════════════════════════════════════════════════════════════════════════
function httpRequest(
  app: INestApplication,
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.getHttpServer() as any;
    const address = server.address();
    if (!address) {
      return reject(new Error('Server not listening'));
    }

    const bodyStr = body ? JSON.stringify(body) : '';

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer mock-token',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr, 'utf-8') } : {}),
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf-8');
          const parsed = raw ? JSON.parse(raw) : {};
          resolve({ status: res.statusCode!, body: parsed });
        } catch {
          resolve({ status: res.statusCode!, body: '' });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr, 'utf-8');
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════════
describe('B2B Exchange — E2E HTTP Tests', () => {
  let app: INestApplication;
  let server: http.Server;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        RfqController,
        BidController,
        EvaluationController,
        AwardController,
        CatalogController,
        SupplierController,
      ],
      providers: [
        { provide: RfqService, useValue: mockRfqService },
        { provide: BidService, useValue: mockBidService },
        { provide: BidEvaluationService, useValue: mockEvaluationService },
        { provide: AwardService, useValue: mockAwardService },
        { provide: ProductCatalogService, useValue: mockCatalogService },
        { provide: SupplierProfileService, useValue: mockSupplierService },
        { provide: B2bGatewayService, useValue: mockGatewayService },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          sub: UUID.user1,
          role: 'COMPANY_MANAGER',
          zoneId: UUID.zone1,
          companyId: UUID.company1,
        };
        return true;
      }})
      .overrideGuard(ZoneGuard)
      .useValue({ canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        request.zoneId = request.user?.zoneId || UUID.zone1;
        return true;
      }})
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    await app.init();
    server = app.getHttpServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });



  // ═══════════════════════════════════════════════════════════════════════════
  // RFQ ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('RFQ Endpoints', () => {
    it('POST /api/v1/b2b/rfq — should create RFQ', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/rfq', {
        zoneId: UUID.zone1,
        companyId: UUID.company1,
        title: 'Purchase industrial bearings',
        description: 'Need high quality industrial bearings for factory production line use',
        categoryId: UUID.cat1,
        categoryPath: ['Industrial', 'Parts'],
        quantity: 100,
        unit: 'pieces',
        biddingMode: 'SEALED',
        submissionDeadline: new Date(Date.now() + 48 * 3600000).toISOString(),
        evaluationCriteria: [
          { criterion: 'price', weight: 50, description: 'Price scoring' },
          { criterion: 'quality', weight: 50, description: 'Quality scoring' },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.rfqNumber).toContain('RFQ-KVH-');
      expect(mockRfqService.create).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/rfq — should reject invalid body (missing required)', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/rfq', {
        zoneId: UUID.zone1,
        // Missing title, description, categoryId, etc.
      });

      expect(res.status).toBe(400);
    });

    it('GET /api/v1/b2b/rfq — should list RFQs', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/rfq');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(mockRfqService.findAll).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/rfq/marketplace — should get marketplace RFQs', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/rfq/marketplace');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRfqService.findForSupplier).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/rfq/stats — should get RFQ statistics', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/rfq/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(10);
      expect(mockRfqService.getRfqStats).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/rfq/:id — should get RFQ by ID', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/rfq/${UUID.rfq1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rfqNumber).toContain('RFQ-KVH-');
      // SEC-024: findById now also receives the server-derived access scope
      expect(mockRfqService.findById).toHaveBeenCalledWith(
        UUID.rfq1,
        expect.any(String),
        expect.objectContaining({ role: expect.any(String) }),
      );
    });

    it('POST /api/v1/b2b/rfq/:id/publish — should publish RFQ', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/rfq/${UUID.rfq1}/publish`, {});
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(mockRfqService.publish).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/rfq/:id/close — should close RFQ', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/rfq/${UUID.rfq1}/close`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockRfqService.close).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/rfq/:id/cancel — should cancel RFQ', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/rfq/${UUID.rfq1}/cancel`, {
        reason: 'Change in company requirements and budget',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockRfqService.cancel).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/rfq/:id/clarifications — should submit clarification', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/rfq/${UUID.rfq1}/clarifications`, {
        rfqId: UUID.rfq1,
        question: 'Can you provide a sample before submitting a bid proposal to assess quality standards?',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockRfqService.submitClarification).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/rfq/:id/clarifications — should list clarifications', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/rfq/${UUID.rfq1}/clarifications`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BID ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bid Endpoints', () => {
    it('POST /api/v1/b2b/bids — should create bid', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/bids', {
        rfqId: UUID.rfq1,
        supplierId: UUID.supplier1,
        unitPrice: 800000,
        totalPrice: 80000000,
        deliveryDays: 7,
        paymentTerms: 'پرداخت نقدی',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(mockBidService.create).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/bids/my-bids — should get my bids', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/bids/my-bids');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBidService.getMyBids).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/bids/rfq/:rfqId — should get bids for RFQ', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/bids/rfq/${UUID.rfq1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBidService.getBidsForRfq).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/bids/:id — should get bid detail', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/bids/${UUID.bid1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBidService.findById).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/bids/:id/submit — should submit bid', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/bids/${UUID.bid1}/submit`, {
        bidId: UUID.bid1,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(mockBidService.submit).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/bids/:id/withdraw — should withdraw bid', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/bids/${UUID.bid1}/withdraw`, {
        reason: 'تغییر در برنامه‌ریزی',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('WITHDRAWN');
      expect(mockBidService.withdraw).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVALUATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Evaluation Endpoints', () => {
    it('POST /api/v1/b2b/evaluation/evaluate — should evaluate bid', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/evaluation/evaluate', {
        bidId: UUID.bid1,
        scores: { price: 80, quality: 90 },
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockEvaluationService.evaluateBid).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/evaluation/auto-evaluate/:rfqId — should auto-evaluate', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/evaluation/auto-evaluate/${UUID.rfq1}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockEvaluationService.autoEvaluate).toHaveBeenCalledWith(UUID.rfq1);
    });

    it('GET /api/v1/b2b/evaluation/comparison/:rfqId — should get comparison', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/evaluation/comparison/${UUID.rfq1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rfq).toBeDefined();
      expect(res.body.data.bids).toBeDefined();
      expect(res.body.data.winner).toBeDefined();
    });

    it('GET /api/v1/b2b/evaluation/report/:rfqId — should generate report', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/evaluation/report/${UUID.rfq1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportKey).toContain('evaluation.pdf');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AWARD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Award Endpoints', () => {
    it('POST /api/v1/b2b/award — should award RFQ', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/award', {
        rfqId: UUID.rfq1,
        winningBidId: UUID.bid1,
        awardNote: 'The winning bid has been selected based on the best price and quality offer.',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('AWARDED');
      expect(mockAwardService.award).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/award/rescind — should rescind award', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/award/rescind', {
        rfqId: UUID.rfq1,
        reason: 'تغییر نیاز',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAwardService.rescindAward).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/award/dispute — should dispute award', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/award/dispute', {
        rfqId: UUID.rfq1,
        disputeNote: 'قیمت برنده غیرواقعی است',
        disputedBidId: UUID.bid2,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAwardService.handleDispute).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/award/history — should get award history', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/award/history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/b2b/award/rejection-letters/:rfqId — should send rejection letters', async () => {
      const res = await httpRequest(app, 'POST', `/api/v1/b2b/award/rejection-letters/${UUID.rfq1}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockAwardService.generateRejectionLetters).toHaveBeenCalledWith(UUID.rfq1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATALOG ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Catalog Endpoints', () => {
    it('POST /api/v1/b2b/catalog — should create product', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/catalog', {
        zoneId: UUID.zone1,
        companyId: UUID.company1,
        nameFa: 'بلبرینگ 6205',
        categoryId: UUID.cat1,
        categoryPath: ['صنعت', 'قطعات'],
        unit: 'عدد',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameFa).toBe('بلبرینگ 6205');
      expect(mockCatalogService.create).toHaveBeenCalled();
    });

    it('POST /api/v1/b2b/catalog — should reject invalid product', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/catalog', {
        zoneId: UUID.zone1,
        // Missing required: nameFa, categoryId, categoryPath, unit
      });
      expect(res.status).toBe(400);
    });

    it('GET /api/v1/b2b/catalog — should browse catalog', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/catalog');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockCatalogService.search).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/catalog/search?q=bearing — should search products', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/catalog/search?q=bearing');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCatalogService.search).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/catalog/categories — should get category tree', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/catalog/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/b2b/catalog/stats — should get marketplace stats', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/catalog/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalProducts).toBe(100);
      expect(mockCatalogService.getMarketplaceStats).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/catalog/company/:companyId — should get company catalog', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/catalog/company/${UUID.company1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCatalogService.getByCompany).toHaveBeenCalledWith(UUID.company1);
    });

    it('GET /api/v1/b2b/catalog/:id — should get product detail', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/catalog/${UUID.prod1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCatalogService.findById).toHaveBeenCalledWith(UUID.prod1);
    });

    it('PATCH /api/v1/b2b/catalog/:id — should update product', async () => {
      const res = await httpRequest(app, 'PATCH', `/api/v1/b2b/catalog/${UUID.prod1}`, {
        nameFa: 'بلبرینگ 6205 بروزرسانی شده',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCatalogService.update).toHaveBeenCalled();
    });

    it('DELETE /api/v1/b2b/catalog/:id — should delete product', async () => {
      const res = await httpRequest(app, 'DELETE', `/api/v1/b2b/catalog/${UUID.prod1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCatalogService.delete).toHaveBeenCalledWith(UUID.prod1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPLIER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Supplier Endpoints', () => {
    it('GET /api/v1/b2b/suppliers — should list suppliers', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/suppliers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/b2b/suppliers/ranking — should get supplier ranking', async () => {
      const res = await httpRequest(app, 'GET', '/api/v1/b2b/suppliers/ranking');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockSupplierService.getRanking).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/suppliers/by-category/:categoryId — should get by category', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/suppliers/by-category/${UUID.cat1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSupplierService.findSuppliersByCategory).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/suppliers/:companyId — should get supplier profile', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/suppliers/${UUID.company1}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('شرکت الف');
      expect(mockSupplierService.getProfile).toHaveBeenCalledWith(UUID.company1);
    });

    it('PATCH /api/v1/b2b/suppliers/profile — should update own profile', async () => {
      const res = await httpRequest(app, 'PATCH', '/api/v1/b2b/suppliers/profile', {
        categories: ['cat1', 'cat2'],
        description: 'تأمین‌کننده قطعات صنعتی',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSupplierService.createOrUpdate).toHaveBeenCalled();
    });

    it('GET /api/v1/b2b/suppliers/:companyId/reviews — should get reviews', async () => {
      const res = await httpRequest(app, 'GET', `/api/v1/b2b/suppliers/${UUID.company1}/reviews`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockSupplierService.getReviews).toHaveBeenCalledWith(UUID.company1);
    });

    it('POST /api/v1/b2b/suppliers/reviews — should submit review', async () => {
      const res = await httpRequest(app, 'POST', '/api/v1/b2b/suppliers/reviews', {
        rfqId: UUID.rfq1,
        bidId: UUID.bid1,
        rating: 5,
        deliveryScore: 5,
        qualityScore: 4,
        communicationScore: 5,
        review: 'عالی بود',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockSupplierService.submitReview).toHaveBeenCalled();
    });
  });
});
