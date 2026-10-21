import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { InventoryGatewayService } from './inventory-gateway.service';

describe('StockService', () => {
  let service: StockService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      stockEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      item: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
    };

    gateway = {
      emitStockMovement: jest.fn(),
      emitLowStockAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: InventoryGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('getStock', () => {
    it('should return stock entries for a warehouse', async () => {
      prisma.stockEntry.findMany.mockResolvedValue([
        { id: 'se-1', quantity: 100, item: { itemCode: 'IT-001', nameFa: 'Widget' } },
      ]);

      const result = await service.getStock('wh-1');
      expect(result).toHaveLength(1);
    });

    it('should filter by item', async () => {
      prisma.stockEntry.findMany.mockResolvedValue([]);
      await service.getStock('wh-1', 'item-1');
      expect(prisma.stockEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ itemId: 'item-1' }),
        }),
      );
    });
  });

  describe('checkAvailability', () => {
    it('should report available stock', async () => {
      prisma.stockEntry.findMany.mockResolvedValue([
        { quantity: 100, reservedQty: 20 },
        { quantity: 50, reservedQty: 10 },
      ]);

      const result = await service.checkAvailability('item-1', 50, 'wh-1');
      expect(result.available).toBe(true);
      expect(result.totalQty).toBe(150);
      expect(result.availableQty).toBe(120);
    });

    it('should report insufficient stock', async () => {
      prisma.stockEntry.findMany.mockResolvedValue([
        { quantity: 10, reservedQty: 5 },
      ]);

      const result = await service.checkAvailability('item-1', 20);
      expect(result.available).toBe(false);
      expect(result.deficit).toBe(15);
    });
  });

  describe('recordTransaction', () => {
    it('should record an IN transaction', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', zoneId: 'z-1', code: 'WH1', companyId: 'c-1' });
      prisma.item.findUnique.mockResolvedValue({ id: 'item-1', nameFa: 'Widget', reorderPoint: 0, reorderQty: 0 });
      prisma.stockTransaction.create.mockResolvedValue({ id: 'trx-1' });
      prisma.stockEntry.findFirst.mockResolvedValue(null);
      prisma.stockEntry.create.mockResolvedValue({});
      prisma.stockEntry.findMany.mockResolvedValue([]);

      const result = await service.recordTransaction('RECEIPT', 'wh-1', 'item-1', 100, 5000n, 'user-1');
      expect(result.id).toBe('trx-1');
      expect(gateway.emitStockMovement).toHaveBeenCalled();
    });

    it('should throw WAREHOUSE_NOT_FOUND', async () => {
      prisma.warehouse.findUnique.mockResolvedValue(null);

      await expect(
        service.recordTransaction('RECEIPT', 'nonexistent', 'item-1', 10, 1000n, 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should throw ITEM_NOT_FOUND', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', zoneId: 'z-1', code: 'WH1' });
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(
        service.recordTransaction('RECEIPT', 'wh-1', 'nonexistent', 10, 1000n, 'user-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock from entries', async () => {
      prisma.stockEntry.findMany.mockResolvedValue([
        { id: 'se-1', quantity: 100, availableQty: 80, reservedQty: 20 },
      ]);
      prisma.stockEntry.update.mockResolvedValue({});

      await service.reserveStock('item-1', 'wh-1', 30, 'doc-1');

      expect(prisma.stockEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reservedQty: { increment: 30 } }),
        }),
      );
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock positively', async () => {
      prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', zoneId: 'z-1', code: 'WH1' });
      prisma.item.findUnique.mockResolvedValue({ id: 'item-1', avgCost: 5000n, nameFa: 'Widget', reorderPoint: 0, reorderQty: 0 });
      prisma.stockTransaction.create.mockResolvedValue({ id: 'trx-1' });
      prisma.stockEntry.findFirst.mockResolvedValue(null);
      prisma.stockEntry.create.mockResolvedValue({});
      prisma.stockEntry.findMany.mockResolvedValue([]);

      const result = await service.adjustStock(
        { warehouseId: 'wh-1', itemId: 'item-1', quantity: 10, reason: 'Count adjustment' } as any,
        'user-1',
      );

      expect(result.id).toBe('trx-1');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      prisma.stockTransaction.findMany.mockResolvedValue([{ id: 'trx-1' }]);
      const result = await service.getTransactionHistory('item-1');
      expect(result).toHaveLength(1);
    });
  });
});
