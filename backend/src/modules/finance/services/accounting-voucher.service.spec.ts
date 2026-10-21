import { Test, TestingModule } from '@nestjs/testing';
import { AccountingVoucherService } from './accounting-voucher.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { FinanceGatewayService } from './finance-gateway.service';

// Fix BigInt serialization for jest-worker communication
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('AccountingVoucherService', () => {
  let service: AccountingVoucherService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn().mockResolvedValue({ id: 'zone1', code: 'KVH' }) },
      accountingVoucher: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      accountCode: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      financialPeriod: {
        findFirst: jest.fn().mockResolvedValue({ id: 'period1', status: 'OPEN' }),
      },
      budget: {
        findFirst: jest.fn(),
      },
      budgetLine: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingVoucherService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: FinanceGatewayService, useValue: {
          emitVoucherPosted: jest.fn(),
          emitVoucherReviewed: jest.fn(),
          emitVoucherApproved: jest.fn(),
          emitVoucherVoided: jest.fn(),
        } },
      ],
    }).compile();

    service = module.get<AccountingVoucherService>(AccountingVoucherService);
  });

  describe('create', () => {
    it('should reject if total debit != total credit', async () => {
      await expect(
        service.create(
          {
            zoneId: 'zone1',
            type: 'JOURNAL' as any,
            date: '1403-10-15',
            description: 'Test voucher',
            lines: [
              { lineNumber: 1, description: 'Debit line', debitAccountId: 'acc1', debitAmount: 1000 },
              { lineNumber: 2, description: 'Credit line', creditAccountId: 'acc2', creditAmount: 500 },
            ],
          },
          'user1',
          'Test User',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should accept valid double-entry voucher', async () => {
      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'acc1', code: '1201', isActive: true, type: 'ASSET' },
        { id: 'acc2', code: '4101', isActive: true, type: 'REVENUE' },
      ]);

      prisma.accountingVoucher.create.mockResolvedValue({
        id: 'v1',
        voucherNumber: 'ACC-KVH-1403-0000001',
        status: 'DRAFT',
        lines: [],
      });

      const result = await service.create(
        {
          zoneId: 'zone1',
          type: 'JOURNAL' as any,
          date: '1403-10-15',
          description: 'Test voucher',
          lines: [
            { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000, creditAccountId: undefined, creditAmount: 0 },
            { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1000, debitAccountId: undefined, debitAmount: 0 },
          ],
        },
        'user1',
        'Test User',
      );

      expect(result.id).toBe('v1');
      expect(result.voucherNumber).toContain('ACC-KVH-');
    });

    it('should reject if closed financial period', async () => {
      prisma.financialPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            zoneId: 'zone1',
            type: 'JOURNAL' as any,
            date: '1403-10-15',
            description: 'Test',
            lines: [
              { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
              { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1000 },
            ],
          },
          'user1',
          'Test User',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should generate sequential voucher number', async () => {
      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'acc1', code: '1201', isActive: true, type: 'ASSET' },
        { id: 'acc2', code: '4101', isActive: true, type: 'REVENUE' },
      ]);

      prisma.accountingVoucher.create.mockResolvedValue({
        id: 'v1',
        voucherNumber: 'ACC-KVH-1403-0000001',
        status: 'DRAFT',
        lines: [],
      });

      await service.create(
        {
          zoneId: 'zone1',
          type: 'JOURNAL' as any,
          date: '1403-10-15',
          description: 'Test',
          lines: [
            { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
            { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1000 },
          ],
        },
        'user1',
        'Test User',
      );

      expect(redis.incr).toHaveBeenCalled();
    });

    it('should validate all account codes exist', async () => {
      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'acc1', code: '1201', isActive: true, type: 'ASSET' },
        // Missing acc2
      ]);

      await expect(
        service.create(
          {
            zoneId: 'zone1',
            type: 'JOURNAL' as any,
            date: '1403-10-15',
            description: 'Test',
            lines: [
              { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
              { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1000 },
            ],
          },
          'user1',
          'Test User',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('post', () => {
    it('should make voucher immutable after posting', async () => {
      prisma.accountingVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'APPROVED',
        zoneId: 'zone1',
        gregorianDate: new Date('2024-12-15'),
        totalDebit: 1000,
        totalCredit: 1000,
        lines: [],
      });

      prisma.accountingVoucher.update.mockResolvedValue({
        id: 'v1',
        status: 'POSTED',
        lines: [],
      });

      const result = await service.post('v1', 'user1');
      expect(result.status).toBe('POSTED');
    });

    it('should reject posting to closed period', async () => {
      prisma.accountingVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'APPROVED',
        zoneId: 'zone1',
        gregorianDate: new Date('2024-12-15'),
        totalDebit: 1000,
        totalCredit: 1000,
        lines: [],
      });

      prisma.financialPeriod.findFirst.mockResolvedValue(null);

      await expect(service.post('v1', 'user1')).rejects.toThrow(AppException);
    });
  });

  describe('createFromWeighRecord', () => {
    it('should create correct debit/credit entries', async () => {
      prisma.accountCode.findFirst
        .mockResolvedValueOnce({ id: 'ar-acc', code: '1201', isActive: true })
        .mockResolvedValueOnce({ id: 'rev-acc', code: '4101', isActive: true })
        .mockResolvedValueOnce({ id: 'tax-acc', code: '2202', isActive: true });

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'ar-acc', isActive: true, type: 'ASSET' },
        { id: 'rev-acc', isActive: true, type: 'REVENUE' },
        { id: 'tax-acc', isActive: true, type: 'LIABILITY' },
      ]);

      prisma.accountingVoucher.create.mockResolvedValue({
        id: 'v1',
        voucherNumber: 'ACC-KVH-2024-0000001',
        status: 'DRAFT',
        lines: [],
      });

      const result = await service.createFromWeighRecord({
        id: 'wr1',
        zoneId: 'zone1',
        vehiclePlate: '12الف345',
        netWeight: 10,
        chargeAmount: 500000,
        operatorId: 'user1',
        operatorName: 'Operator',
      });

      expect(result).toBeDefined();
      expect(prisma.accountingVoucher.create).toHaveBeenCalled();
    });

    it('should calculate 9% VAT correctly', async () => {
      prisma.accountCode.findFirst
        .mockResolvedValueOnce({ id: 'ar-acc', code: '1201', isActive: true })
        .mockResolvedValueOnce({ id: 'rev-acc', code: '4101', isActive: true })
        .mockResolvedValueOnce({ id: 'tax-acc', code: '2202', isActive: true });

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'ar-acc', isActive: true, type: 'ASSET' },
        { id: 'rev-acc', isActive: true, type: 'REVENUE' },
        { id: 'tax-acc', isActive: true, type: 'LIABILITY' },
      ]);

      prisma.accountingVoucher.create.mockResolvedValue({
        id: 'v1',
        voucherNumber: 'ACC-KVH-2024-0000001',
        status: 'DRAFT',
        lines: [],
      });

      await service.createFromWeighRecord({
        id: 'wr1',
        zoneId: 'zone1',
        vehiclePlate: '12الف345',
        netWeight: 10,
        chargeAmount: 1000000,
        operatorId: 'user1',
        operatorName: 'Operator',
      });

      const createCall = prisma.accountingVoucher.create.mock.calls[0][0];
      const lines = createCall.data.lines.create;

      // Line 1: Debit 1,000,000 (full charge)
      expect(Number(lines[0].debitAmount)).toBe(1000000);

      // Line 2: Credit revenue = 1,000,000 * 0.91 = 910,000
      expect(Number(lines[1].creditAmount)).toBe(910000);

      // Line 3: Credit tax = 1,000,000 * 0.09 = 90,000
      expect(Number(lines[2].creditAmount)).toBe(90000);
    });
  });
});
