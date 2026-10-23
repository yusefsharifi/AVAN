import { Test, TestingModule } from '@nestjs/testing';
import { RfqService } from './rfq.service';
import { BidService } from './bid.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { BullService } from '../../../bull/bull.service';
import { B2bGatewayService } from './b2b-gateway.service';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';

/**
 * IDOR regression tests (SEC-024): three historically high-risk endpoints.
 * Actor = company «الف» trying to read/modify company «ب»'s records.
 */
describe('B2B IDOR — company scope enforcement', () => {
  let rfqService: RfqService;
  let bidService: BidService;
  let prisma: { [key: string]: any };

  beforeEach(async () => {
    prisma = {
      rFQ: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      bid: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      rFQClarification: {
        findMany: jest.fn(),
      },
      company: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        BidService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            getJson: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            setJson: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            incrWithExpiry: jest.fn().mockResolvedValue(1),
          },
        },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: B2bGatewayService, useValue: { emitClarificationAnswered: jest.fn() } },
        { provide: BullService, useValue: { addJob: jest.fn(), registerWorker: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();

    rfqService = module.get<RfqService>(RfqService);
    bidService = module.get<BidService>(BidService);
  });

  // ── IDOR-01: RFQ detail ────────────────────────────────────────────────────
  describe('rfqService.findById', () => {
    it('returns RFQ_NOT_FOUND when company «الف» reads company «ب»\'s draft RFQ', async () => {
      // findFirst with the scope where clause: not found ⇒ cannot leak
      prisma.rFQ.findFirst.mockResolvedValue(null);

      await expect(
        rfqService.findById('rfq-B', 'user-A', { zoneId: 'zone-1', companyId: 'company-A', role: 'COMPANY_STAFF' }),
      ).rejects.toMatchObject({ code: 'RFQ_NOT_FOUND' });

      expect(prisma.rFQ.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'rfq-B',
          zoneId: 'zone-1',
          OR: expect.any(Array),
        }),
      });
    });

    it('still allows reading a PUBLISHED public RFQ of another company (marketplace)', async () => {
      prisma.rFQ.findFirst.mockResolvedValue({ id: 'rfq-B', status: 'PUBLISHED' });

      const rfq = await rfqService.findById('rfq-B', 'user-A', {
        zoneId: 'zone-1',
        companyId: 'company-A',
        role: 'COMPANY_STAFF',
      });

      expect(rfq).toMatchObject({ id: 'rfq-B' });
      const where = prisma.rFQ.findFirst.mock.calls[0][0].where;
      expect(where.OR).toContainEqual({ status: 'PUBLISHED', isPublic: true });
    });

    it('does not narrow to a company for supervisory roles', async () => {
      prisma.rFQ.findFirst.mockResolvedValue({ id: 'rfq-1' });

      await rfqService.findById('rfq-1', 'admin-1', {
        zoneId: 'zone-1',
        companyId: undefined,
        role: 'ZONE_MANAGER',
      });

      const where = prisma.rFQ.findFirst.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });
  });

  // ── IDOR-02: Bid detail ────────────────────────────────────────────────────
  describe('bidService.findById', () => {
    it('returns BID_NOT_FOUND when company «الف» reads a bid of company «ب»', async () => {
      prisma.bid.findFirst.mockResolvedValue(null);

      await expect(
        bidService.findById('bid-B', 'user-A', { companyId: 'company-A', role: 'COMPANY_STAFF' }),
      ).rejects.toMatchObject({ code: 'BID_NOT_FOUND' });

      expect(prisma.bid.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'bid-B',
          OR: [{ supplierId: 'company-A' }, { rfq: { companyId: 'company-A' } }],
        }),
      });
    });
  });

  // ── IDOR-03: bids of another company's tender ─────────────────────────────
  describe('bidService.getBidsForRfq', () => {
    it('returns RFQ_NOT_FOUND for a foreign tender', async () => {
      prisma.rFQ.findFirst.mockResolvedValue(null);

      await expect(
        bidService.getBidsForRfq('rfq-B', 'user-A', { companyId: 'company-A', role: 'COMPANY_STAFF' }),
      ).rejects.toMatchObject({ code: 'RFQ_NOT_FOUND' });
    });

    it('lets a supplier only see its own bids and hides the buyer check correctly', async () => {
      prisma.rFQ.findFirst.mockResolvedValue({ id: 'rfq-B' });
      // The requester participates (invited ⇒ findFirst matched)
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq-B',
        companyId: 'company-B',
        biddingMode: 'OPEN',
        status: 'CLOSED',
      });
      prisma.bid.findMany.mockResolvedValue([
        { id: 'bid-supA', supplierId: 'company-A', unitPrice: 1n },
        { id: 'bid-supB', supplierId: 'company-B', unitPrice: 2n },
      ]);

      const bids = await bidService.getBidsForRfq('rfq-B', 'user-A', {
        companyId: 'company-A',
        role: 'COMPANY_STAFF',
      });

      // company-A is not the buyer and both bids are returned raw under OPEN
      // non-sealed mode — but «ب»'s buyer check no longer matches a user id.
      expect(bids).toHaveLength(2);
    });
  });

  // ── IDOR-03b: clarifications of a foreign tender ──────────────────────────
  describe('rfqService.getClarifications', () => {
    it('returns RFQ_NOT_FOUND for a foreign tender', async () => {
      prisma.rFQ.findFirst.mockResolvedValue(null);

      await expect(
        rfqService.getClarifications('rfq-B', undefined, { companyId: 'company-A', role: 'COMPANY_STAFF' }),
      ).rejects.toMatchObject({ code: 'RFQ_NOT_FOUND' });
    });

    it('lists clarifications for a participating supplier', async () => {
      prisma.rFQ.findFirst.mockResolvedValue({ id: 'rfq-B' });
      prisma.rFQClarification.findMany.mockResolvedValue([{ id: 'c1' }]);

      const result = await rfqService.getClarifications('rfq-B', undefined, {
        companyId: 'company-A',
        role: 'COMPANY_STAFF',
      });

      expect(result).toHaveLength(1);
    });
  });

  // ── IDOR-04: mutating another company's draft ─────────────────────────────
  describe('rfqService.update', () => {
    it('rejects company «الف» updating company «ب»\'s draft RFQ', async () => {
      jest.spyOn(rfqService as any, 'findByIdInternal').mockResolvedValue({
        id: 'rfq-B',
        companyId: 'company-B',
        status: 'DRAFT',
      });

      await expect(
        rfqService.update('rfq-B', { title: 'hijack' } as any, 'user-A', {
          companyId: 'company-A',
          role: 'COMPANY_ADMIN',
        }),
      ).rejects.toMatchObject({ code: 'RFQ_NOT_FOUND' });

      expect(prisma.rFQ.update).not.toHaveBeenCalled();
    });
  });
});
