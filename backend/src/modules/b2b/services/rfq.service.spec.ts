import { Test, TestingModule } from '@nestjs/testing';
import { RfqService } from './rfq.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { BullService } from '../../../bull/bull.service';
import { B2bGatewayService } from './b2b-gateway.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('RfqService', () => {
  let service: RfqService;
  let prisma: { [key: string]: any };
  let redis: { [key: string]: jest.Mock };
  let bull: { [key: string]: jest.Mock };
  let gateway: { [key: string]: jest.Mock };

  beforeEach(async () => {
    prisma = {
      zone: {
        findUnique: jest.fn().mockResolvedValue({ id: 'zone1', code: 'KVH', nameFa: 'شهرک صنعتی' }),
      },
      rFQ: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      rFQClarification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      bid: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(3),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      supplierProfile: {
        findMany: jest.fn().mockResolvedValue([]),
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

    bull = {
      addJob: jest.fn(),
    };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: BullService, useValue: bull },
        { provide: B2bGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<RfqService>(RfqService);
  });

  describe('create', () => {
    it('should generate unique RFQ number', async () => {
      prisma.rFQ.create.mockResolvedValue({
        id: 'rfq1',
        rfqNumber: 'RFQ-KVH-2024-00001',
        status: 'DRAFT',
      });

      const result = await service.create(
        {
          zoneId: 'zone1',
          companyId: 'company1',
          title: 'Test RFQ for bearings',
          description: 'We need high quality bearings for industrial use in the factory',
          categoryId: 'cat1',
          categoryPath: ['صنعت', 'قطعات'],
          quantity: 100,
          unit: 'عدد',
          biddingMode: 'SEALED' as any,
          submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          evaluationCriteria: [
            { criterion: 'price', weight: 50, description: 'قیمت' },
            { criterion: 'quality', weight: 25, description: 'کیفیت' },
            { criterion: 'delivery', weight: 15, description: 'زمان تحویل' },
            { criterion: 'warranty', weight: 10, description: 'گارانتی' },
          ],
        },
        'user1',
      );

      expect(result).toBeDefined();
      expect(result.rfqNumber).toContain('RFQ-KVH-');
      expect(prisma.rFQ.create).toHaveBeenCalled();
    });

    it('should reject if evaluation criteria weights != 100', async () => {
      await expect(
        service.create(
          {
            zoneId: 'zone1',
            companyId: 'company1',
            title: 'Test RFQ',
            description: 'Test description for the RFQ requirement',
            categoryId: 'cat1',
            categoryPath: ['صنعت'],
            quantity: 10,
            unit: 'عدد',
            biddingMode: 'SEALED' as any,
            submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            evaluationCriteria: [
              { criterion: 'price', weight: 30, description: 'قیمت' },
              { criterion: 'quality', weight: 20, description: 'کیفیت' },
            ],
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject submission deadline < 24h from now', async () => {
      await expect(
        service.create(
          {
            zoneId: 'zone1',
            companyId: 'company1',
            title: 'Test RFQ',
            description: 'Test description for the RFQ requirement',
            categoryId: 'cat1',
            categoryPath: ['صنعت'],
            quantity: 10,
            unit: 'عدد',
            biddingMode: 'SEALED' as any,
            submissionDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
            evaluationCriteria: [
              { criterion: 'price', weight: 100, description: 'قیمت' },
            ],
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject if clarification deadline >= submission deadline', async () => {
      const submissionDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const clarificationDeadline = new Date(submissionDeadline.getTime() + 1000);

      await expect(
        service.create(
          {
            zoneId: 'zone1',
            companyId: 'company1',
            title: 'Test RFQ',
            description: 'Test description for the RFQ requirement',
            categoryId: 'cat1',
            categoryPath: ['صنعت'],
            quantity: 10,
            unit: 'عدد',
            biddingMode: 'SEALED' as any,
            submissionDeadline: submissionDeadline.toISOString(),
            clarificationDeadline: clarificationDeadline.toISOString(),
            evaluationCriteria: [
              { criterion: 'price', weight: 100, description: 'قیمت' },
            ],
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('publish', () => {
    it('should notify invited suppliers via SMS', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'DRAFT',
        rfqNumber: 'RFQ-KVH-2024-00001',
        title: 'Test RFQ',
        zoneId: 'zone1',
        companyId: 'company1',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        invitedSupplierIds: ['supplier1', 'supplier2'],
        isPublic: true,
        categoryId: 'cat1',
        categoryPath: ['صنعت'],
        quantity: 100,
        unit: 'عدد',
      });

      prisma.rFQ.update.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        invitedSupplierIds: ['supplier1', 'supplier2'],
      });

      await service.publish({ rfqId: 'rfq1', notifyInvited: true }, 'user1');

      expect(bull.addJob).toHaveBeenCalled();
    });

    it('should schedule BullMQ job for deadline', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'DRAFT',
        rfqNumber: 'RFQ-KVH-2024-00001',
        title: 'Test RFQ',
        zoneId: 'zone1',
        companyId: 'company1',
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        invitedSupplierIds: [],
        isPublic: true,
        categoryId: 'cat1',
        categoryPath: ['صنعت'],
        quantity: 100,
        unit: 'عدد',
      });

      prisma.rFQ.update.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        invitedSupplierIds: [],
        submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        publishedAt: new Date(),
      });

      await service.publish({ rfqId: 'rfq1' }, 'user1');

      expect(bull.addJob).toHaveBeenCalledWith(
        'b2b-exchange',
        'close-rfq-on-deadline',
        expect.objectContaining({ rfqId: 'rfq1' }),
        expect.any(Object),
      );
    });

    it('should reject publishing if missing required fields', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED', // Not DRAFT
        rfqNumber: 'RFQ-KVH-2024-00001',
      });

      await expect(
        service.publish({ rfqId: 'rfq1' }, 'user1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('close', () => {
    it('should set status UNDER_EVALUATION', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        biddingMode: 'OPEN',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'company1',
      });

      prisma.bid.count.mockResolvedValue(5);

      prisma.rFQ.update.mockResolvedValue({
        id: 'rfq1',
        status: 'UNDER_EVALUATION',
      });

      prisma.bid.findMany.mockResolvedValue([]);

      const result = await service.close('rfq1', 'user1');

      expect(prisma.rFQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rfq1' },
          data: expect.objectContaining({ status: 'UNDER_EVALUATION' }),
        }),
      );
    });

    it('should handle RFQ with 0 bids → FAILED', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'PUBLISHED',
        biddingMode: 'OPEN',
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        companyId: 'company1',
      });

      prisma.bid.count.mockResolvedValue(0);

      prisma.rFQ.update.mockResolvedValue({
        id: 'rfq1',
        status: 'FAILED',
      });

      prisma.bid.findMany.mockResolvedValue([]);

      await service.close('rfq1', 'user1');

      expect(prisma.rFQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });
  });

  describe('requestNextRound', () => {
    it('should reject if allowMultiRound=false', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        allowMultiRound: false,
        currentRound: 1,
        maxRounds: 3,
      });

      await expect(
        service.requestNextRound('rfq1', 'Please submit again', 'user1'),
      ).rejects.toThrow(AppException);
    });

    it('should reject if currentRound >= maxRounds', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        allowMultiRound: true,
        currentRound: 3,
        maxRounds: 3,
      });

      await expect(
        service.requestNextRound('rfq1', 'Next round', 'user1'),
      ).rejects.toThrow(AppException);
    });

    it('should increment currentRound', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        allowMultiRound: true,
        currentRound: 1,
        maxRounds: 3,
        rfqNumber: 'RFQ-KVH-2024-00001',
        zoneId: 'zone1',
        notes: '',
      });

      prisma.rFQ.update.mockResolvedValue({
        id: 'rfq1',
        currentRound: 2,
      });

      prisma.bid.findMany.mockResolvedValue([]);

      const result = await service.requestNextRound('rfq1', 'Please submit again', 'user1');

      expect(prisma.rFQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentRound: 2 }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should reject cancellation of AWARDED RFQ', async () => {
      prisma.rFQ.findUnique.mockResolvedValue({
        id: 'rfq1',
        status: 'AWARDED',
      });

      await expect(
        service.cancel('rfq1', 'No reason', 'user1'),
      ).rejects.toThrow(AppException);
    });
  });
});
