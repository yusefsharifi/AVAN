import { Test, TestingModule } from '@nestjs/testing';
import { BidService } from './bid.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { BullService } from '../../../bull/bull.service';
import { B2bGatewayService } from './b2b-gateway.service';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';

describe('BidService', () => {
  let service: BidService;
  let prisma: { [key: string]: any };
  let redis: { [key: string]: jest.Mock };
  let bull: { [key: string]: jest.Mock };
  let gateway: { [key: string]: jest.Mock };

  beforeEach(async () => {
    prisma = {
      rFQ: {
        findUnique: jest.fn(),
      },
      bid: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'supplier1', nameFa: 'شرکت تأمین' }),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      incrWithExpiry: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      getJson: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    bull = { addJob: jest.fn() };

    gateway = {
      emitNewBidToBuyer: jest.fn(),
      emitBidSubmittedToSupplier: jest.fn(),
      emitBidWithdrawn: jest.fn(),
      emitBidUnsealed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: BullService, useValue: bull },
        { provide: B2bGatewayService, useValue: gateway },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => (key === 'BID_ENCRYPTION_SECRET' ? 'test-bid-encryption-secret-for-jest' : undefined)) } },
      ],
    }).compile();

    service = module.get<BidService>(BidService);
  });

  describe('create', () => {
    it('should reject bid after submission deadline', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() - 1000),
        currentRound: 1,
        isPublic: true,
        biddingMode: 'OPEN',
        zoneId: 'zone1',
        invitedSupplierIds: [],
      });

      prisma.bid.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            rfqId: 'rfq1',
            supplierId: 'supplier1',
            unitPrice: 100000,
            totalPrice: 10000000,
            deliveryDays: 14,
            paymentTerms: 'نقد',
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject duplicate bid same round same supplier', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        currentRound: 1,
        isPublic: true,
        biddingMode: 'OPEN',
        zoneId: 'zone1',
        invitedSupplierIds: [],
      });

      prisma.bid.findFirst.mockResolvedValue({
        id: 'existingBid',
        supplierId: 'supplier1',
        round: 1,
      });

      await expect(
        service.create(
          {
            rfqId: 'rfq1',
            supplierId: 'supplier1',
            unitPrice: 100000,
            totalPrice: 10000000,
            deliveryDays: 14,
            paymentTerms: 'نقد',
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject supplier not invited to private RFQ', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        currentRound: 1,
        isPublic: false,
        biddingMode: 'SEALED',
        zoneId: 'zone1',
        invitedSupplierIds: ['otherSupplier'],
      });

      prisma.bid.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            rfqId: 'rfq1',
            supplierId: 'supplier1',
            unitPrice: 100000,
            totalPrice: 10000000,
            deliveryDays: 14,
            paymentTerms: 'نقد',
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should calculate finalPrice with discount correctly', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        currentRound: 1,
        isPublic: true,
        biddingMode: 'OPEN',
        zoneId: 'zone1',
        invitedSupplierIds: [],
      });

      prisma.bid.findFirst.mockResolvedValue(null);
      prisma.bid.create.mockResolvedValue({
        id: 'bid1',
        finalPrice: BigInt(9000000),
        unitPrice: BigInt(100000),
        totalPrice: BigInt(10000000),
        status: 'DRAFT',
      });

      const result = await service.create(
        {
          rfqId: 'rfq1',
          supplierId: 'supplier1',
          unitPrice: 100000,
          totalPrice: 10000000,
          discountPercent: 10,
          deliveryDays: 14,
          paymentTerms: 'نقد',
        },
        'user1',
      );

      expect(result).toBeDefined();
      // finalPrice = 10000000 * (1 - 10/100) = 9000000
      const createCall = prisma.bid.create.mock.calls[0][0];
      expect(createCall.data.finalPrice.toString()).toBe('9000000');
    });

    it('should mark as sealed for SEALED RFQs', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        currentRound: 1,
        isPublic: true,
        biddingMode: 'SEALED',
        zoneId: 'zone1',
        invitedSupplierIds: [],
      });

      prisma.bid.findFirst.mockResolvedValue(null);
      prisma.bid.create.mockResolvedValue({ id: 'bid1', isSealed: true });

      const result = await service.create(
        {
          rfqId: 'rfq1',
          supplierId: 'supplier1',
          unitPrice: 100000,
          totalPrice: 10000000,
          deliveryDays: 14,
          paymentTerms: 'نقد',
        },
        'user1',
      );

      const createCall = prisma.bid.create.mock.calls[0][0];
      expect(createCall.data.isSealed).toBe(true);
      expect(createCall.data.encryptedFinancialData).toBeTruthy();
    });
  });

  describe('submit', () => {
    it('should validate required fields before submit', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        status: 'DRAFT',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        unitPrice: BigInt(0),
        totalPrice: BigInt(0),
        deliveryDays: 0,
        paymentTerms: null,
        attachmentKeys: [],
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      await expect(
        service.submit({ bidId: 'bid1' }, 'user1'),
      ).rejects.toThrow(AppException);
    });

    it('should reject submit if deadline passed', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        status: 'DRAFT',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        unitPrice: BigInt(100000),
        totalPrice: BigInt(10000000),
        deliveryDays: 14,
        paymentTerms: 'نقد',
        attachmentKeys: [],
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        submissionDeadline: new Date(Date.now() - 1000),
      });

      await expect(
        service.submit({ bidId: 'bid1' }, 'user1'),
      ).rejects.toThrow(AppException);
    });

    it('should increment bid count in Redis', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        status: 'DRAFT',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        unitPrice: BigInt(100000),
        totalPrice: BigInt(10000000),
        deliveryDays: 14,
        paymentTerms: 'نقد',
        attachmentKeys: [],
      });

      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        companyId: 'buyer1',
        rfqNumber: 'RFQ-KVH-2024-00001',
      });

      prisma.bid.update.mockResolvedValue({ id: 'bid1', status: 'SUBMITTED' });

      await service.submit({ bidId: 'bid1' }, 'user1');

      expect(redis.incrWithExpiry).toHaveBeenCalled();
      expect(gateway.emitNewBidToBuyer).toHaveBeenCalled();
      expect(gateway.emitBidSubmittedToSupplier).toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('should reject withdraw of non-SUBMITTED bid', async () => {
      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        status: 'DRAFT',
        rfqId: 'rfq1',
      });

      await expect(
        service.withdraw('bid1', 'Changed mind', 'user1'),
      ).rejects.toThrow(AppException);
    });
  });
});
