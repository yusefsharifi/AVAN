import { Test, TestingModule } from '@nestjs/testing';
import { CommercialOrderService } from './commercial-order.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CommercialGatewayService } from './commercial-gateway.service';

describe('CommercialOrderService', () => {
  let service: CommercialOrderService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      commercialOrder: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderMilestone: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      getJson: jest.fn(),
      setJson: jest.fn(),
    };

    gateway = {
      emitOrderStatusChanged: jest.fn(),
      emitOrderMilestoneCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialOrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: CommercialGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<CommercialOrderService>(CommercialOrderService);
  });

  describe('create', () => {
    it('should create an order with calculated totals', async () => {
      prisma.commercialOrder.create.mockResolvedValue({
        id: 'o-1', orderNumber: 'SO-2026-0001', grandTotal: 10900000n,
        lines: [], milestoneRecords: [],
      });

      const result = await service.create(
        {
          zoneId: 'z-1', companyId: 'c-1', direction: 'SALES',
          partyId: 'p-1', partyName: 'Test Party',
          lines: [{ lineNumber: 1, itemCode: 'IT-001', itemName: 'Widget', quantity: 10, unitPrice: 1000000, taxRate: 9 }],
        } as any,
        'user-1',
      );

      expect(result.orderNumber).toContain('SO-');
      expect(prisma.commercialOrder.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return order with lines', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', lines: [], milestoneRecords: [],
      });

      const result = await service.findById('o-1');
      expect(result.id).toBe('o-1');
    });

    it('should throw ORDER_NOT_FOUND', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', status: 'DRAFT', orderNumber: 'SO-001', companyId: 'c-1', zoneId: 'z-1',
        lines: [], milestoneRecords: [],
      });
      prisma.commercialOrder.update.mockResolvedValue({
        id: 'o-1', status: 'CONFIRMED', lines: [], milestoneRecords: [],
      });

      const result = await service.updateStatus('o-1', { status: 'CONFIRMED' } as any, 'user-1');
      expect(result.status).toBe('CONFIRMED');
      expect(gateway.emitOrderStatusChanged).toHaveBeenCalled();
    });

    it('should throw on invalid transition', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', status: 'CLOSED', orderNumber: 'SO-001',
        lines: [], milestoneRecords: [],
      });

      await expect(
        service.updateStatus('o-1', { status: 'CONFIRMED' } as any, 'user-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('completeMilestone', () => {
    it('should complete a milestone', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', orderNumber: 'SO-001', companyId: 'c-1', zoneId: 'z-1',
        lines: [], milestoneRecords: [],
      });
      prisma.orderMilestone.findUnique.mockResolvedValue({
        id: 'm-1', orderId: 'o-1', status: 'PENDING', label: 'Production', type: 'PRODUCTION', notes: '',
      });
      prisma.orderMilestone.update.mockResolvedValue({ id: 'm-1', status: 'COMPLETED' });

      const result = await service.completeMilestone('o-1', 'm-1', 'user-1', 'Done');
      expect(result.status).toBe('COMPLETED');
      expect(gateway.emitOrderMilestoneCompleted).toHaveBeenCalled();
    });

    it('should throw if milestone not found', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', orderNumber: 'SO-001', companyId: 'c-1', zoneId: 'z-1',
        lines: [], milestoneRecords: [],
      });
      prisma.orderMilestone.findUnique.mockResolvedValue(null);

      await expect(
        service.completeMilestone('o-1', 'm-999', 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should throw if milestone already completed', async () => {
      prisma.commercialOrder.findUnique.mockResolvedValue({
        id: 'o-1', orderNumber: 'SO-001', companyId: 'c-1', zoneId: 'z-1',
        lines: [], milestoneRecords: [],
      });
      prisma.orderMilestone.findUnique.mockResolvedValue({
        id: 'm-1', orderId: 'o-1', status: 'COMPLETED', label: 'test', type: 'PRODUCTION', notes: '',
      });

      await expect(
        service.completeMilestone('o-1', 'm-1', 'user-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('getOrderStats', () => {
    it('should compute order statistics', async () => {
      prisma.commercialOrder.findMany.mockResolvedValue([
        { direction: 'SALES', status: 'CONFIRMED', grandTotal: 1000000n },
        { direction: 'PURCHASE', status: 'SHIPPED', grandTotal: 500000n },
        { direction: 'SALES', status: 'CANCELLED', grandTotal: 200000n },
      ]);

      const stats = await service.getOrderStats('z-1');
      expect(stats.total).toBe(3);
      expect(stats.byDirection.sales).toBe(2);
      expect(stats.totalSalesValue).toBe(1000000);
      expect(stats.totalPurchaseValue).toBe(500000);
    });
  });
});
