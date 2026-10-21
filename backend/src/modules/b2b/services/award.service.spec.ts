import { Test, TestingModule } from '@nestjs/testing';
import { AwardService } from './award.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { BullService } from '../../../bull/bull.service';
import { B2bGatewayService } from './b2b-gateway.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('AwardService', () => {
  let service: AwardService;
  let prisma: { [key: string]: any };
  let bull: { [key: string]: jest.Mock };
  let gateway: { [key: string]: jest.Mock };

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
      b2BTransaction: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      supplierProfile: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      bidReview: {
        findMany: jest.fn(),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    bull = { addJob: jest.fn() };

    gateway = {
      emitRfqAwarded: jest.fn(),
      emitRfqRejected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwardService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { getJson: jest.fn(), setJson: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: BullService, useValue: bull },
        { provide: B2bGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<AwardService>(AwardService);
  });

  describe('award', () => {
    it('should mark winning bid as WINNER', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: false,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([
        { supplierId: 'supplier1' },
        { supplierId: 'supplier2' },
      ]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue({
        id: 'sp1',
        totalBidsPlaced: 10,
        totalWonBids: 3,
        winRate: 30,
      });
      prisma.supplierProfile.update.mockResolvedValue({});

      const result = await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده با بهترین قیمت و کیفیت انتخاب شد',
          notifyAllBidders: true,
        },
        'user1',
      );

      expect(prisma.bid.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bid1' },
          data: expect.objectContaining({ status: 'WINNER', isWinner: true }),
        }),
      );

      expect(gateway.emitRfqAwarded).toHaveBeenCalled();
      expect(gateway.emitRfqRejected).toHaveBeenCalled();
      expect(prisma.b2BTransaction.create).toHaveBeenCalled();
    });

    it('should reject all other bids', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: false,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue(null);

      await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده انتخاب شد',
        },
        'user1',
      );

      expect(prisma.bid.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
    });

    it('should update supplier win rates', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: false,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue({
        id: 'sp1',
        totalBidsPlaced: 10,
        totalWonBids: 3,
        winRate: 30,
      });
      prisma.supplierProfile.update.mockResolvedValue({});

      await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده انتخاب شد',
        },
        'user1',
      );

      expect(prisma.supplierProfile.update).toHaveBeenCalled();
    });

    it('should create B2BTransaction record', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: false,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue(null);

      await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده انتخاب شد',
        },
        'user1',
      );

      expect(prisma.b2BTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            zoneId: 'zone1',
            rfqId: 'rfq1',
            buyerCompanyId: 'buyer1',
            supplierCompanyId: 'supplier1',
            bidId: 'bid1',
            amount: BigInt(8000000),
            status: 'AWARDED',
          }),
        }),
      );
    });

    it('should notify winner via SMS + email + in-app', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: false,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue(null);

      await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده انتخاب شد',
        },
        'user1',
      );

      expect(gateway.emitRfqAwarded).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'supplier1',
          rfqId: 'rfq1',
          bidId: 'bid1',
        }),
      );
    });

    it('should reject award on non-UNDER_EVALUATION RFQ', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
      });

      await expect(
        service.award(
          {
            rfqId: 'rfq1',
            winningBidId: 'bid1',
            awardNote: 'برنده انتخاب شد',
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should create proforma when autoConvertToPO=true', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'buyer1',
        autoConvertToPO: true,
      });

      prisma.bid.findUnique.mockResolvedValue({
        id: 'bid1',
        rfqId: 'rfq1',
        supplierId: 'supplier1',
        finalPrice: BigInt(8000000),
        currency: 'IRR',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.create.mockResolvedValue({ id: 'tx1' });
      prisma.supplierProfile.findFirst.mockResolvedValue(null);

      await service.award(
        {
          rfqId: 'rfq1',
          winningBidId: 'bid1',
          awardNote: 'برنده انتخاب شد',
          autoConvertToPO: true,
        },
        'user1',
      );

      expect(bull.addJob).toHaveBeenCalledWith(
        'b2b-exchange',
        'create-proforma-from-award',
        expect.any(Object),
      );
    });
  });

  describe('rescindAward', () => {
    it('should reject if proforma already confirmed', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'AWARDED',
        poId: 'proforma1',
        winnerId: 'bid1',
        rfqNumber: 'RFQ-KVH-2024-00001',
      });

      await expect(
        service.rescindAward('rfq1', 'Changed mind', 'user1'),
      ).rejects.toThrow(AppException);
    });

    it('should reset RFQ to UNDER_EVALUATION', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'AWARDED',
        poId: null,
        winnerId: 'bid1',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([
        { supplierId: 'supplier1' },
        { supplierId: 'supplier2' },
      ]);
      prisma.b2BTransaction.deleteMany.mockResolvedValue({});

      await service.rescindAward('rfq1', 'Changed mind', 'user1');

      expect(prisma.rFQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            winnerId: null,
            status: 'UNDER_EVALUATION',
          }),
        }),
      );
    });

    it('should reset winning bid status', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'AWARDED',
        poId: null,
        winnerId: 'bid1',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
      });

      prisma.rFQ.update.mockResolvedValue({});
      prisma.bid.update.mockResolvedValue({});
      prisma.bid.updateMany.mockResolvedValue({});
      prisma.bid.findMany.mockResolvedValue([{ supplierId: 'supplier1' }]);
      prisma.b2BTransaction.deleteMany.mockResolvedValue({});

      await service.rescindAward('rfq1', 'Changed mind', 'user1');

      expect(prisma.bid.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bid1' },
          data: expect.objectContaining({ status: 'SHORTLISTED', isWinner: false }),
        }),
      );
    });
  });
});
