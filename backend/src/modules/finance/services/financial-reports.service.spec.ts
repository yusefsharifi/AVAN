import { Test, TestingModule } from '@nestjs/testing';
import { FinancialReportsService } from './financial-reports.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';

describe('FinancialReportsService', () => {
  let service: FinancialReportsService;
  let prisma: { [key: string]: any };
  let redis: { [key: string]: jest.Mock };

  beforeEach(async () => {
    prisma = {
      accountingVoucher: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      accountCode: {
        findMany: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      bankTransaction: {
        findMany: jest.fn(),
      },
      bankAccount: {
        findMany: jest.fn(),
      },
      budget: {
        findFirst: jest.fn(),
      },
      budgetLine: {
        findMany: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<FinancialReportsService>(FinancialReportsService);
  });

  describe('getIncomeStatement', () => {
    it('should aggregate 4xxx accounts as revenue', async () => {
      prisma.accountingVoucher.findMany.mockResolvedValue([
        {
          lines: [
            { creditAccountId: 'rev1', creditAmount: BigInt(500000) },
            { creditAccountId: 'rev2', creditAmount: BigInt(300000) },
          ],
        },
      ]);

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'rev1', code: '4101', nameFa: 'درآمد باسکول', type: 'REVENUE' },
        { id: 'rev2', code: '4102', nameFa: 'درآمد مجوز', type: 'REVENUE' },
        { id: 'exp1', code: '5101', nameFa: 'حقوق', type: 'EXPENSE' },
      ]);

      const result = await service.getIncomeStatement('zone1', '2024-01-01', '2024-12-31');

      expect(result.totalRevenue).toBe(800000);
      expect(result.revenues).toHaveLength(2);
    });

    it('should aggregate 5xxx accounts as expenses', async () => {
      prisma.accountingVoucher.findMany.mockResolvedValue([
        {
          lines: [
            { debitAccountId: 'exp1', debitAmount: BigInt(200000) },
            { debitAccountId: 'exp2', debitAmount: BigInt(100000) },
          ],
        },
      ]);

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'exp1', code: '5101', nameFa: 'حقوق', type: 'EXPENSE' },
        { id: 'exp2', code: '5201', nameFa: 'تعمیرات', type: 'EXPENSE' },
      ]);

      const result = await service.getIncomeStatement('zone1', '2024-01-01', '2024-12-31');

      expect(result.totalExpenses).toBe(300000);
      expect(result.expenses).toHaveLength(2);
    });

    it('should compute correct net income', async () => {
      prisma.accountingVoucher.findMany.mockResolvedValue([
        {
          lines: [
            { creditAccountId: 'rev1', creditAmount: BigInt(1000000) },
            { debitAccountId: 'exp1', debitAmount: BigInt(600000) },
          ],
        },
      ]);

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'rev1', code: '4101', type: 'REVENUE' },
        { id: 'exp1', code: '5101', type: 'EXPENSE' },
      ]);

      const result = await service.getIncomeStatement('zone1', '2024-01-01', '2024-12-31');

      expect(result.netIncome).toBe(400000);
    });
  });

  describe('getBalanceSheet', () => {
    it('should verify assets == liabilities + equity', async () => {
      prisma.accountingVoucher.findMany.mockResolvedValue([
        {
          lines: [
            { debitAccountId: 'asset1', debitAmount: BigInt(1000000) },
            { creditAccountId: 'liab1', creditAmount: BigInt(500000) },
            { creditAccountId: 'eq1', creditAmount: BigInt(500000) },
          ],
        },
      ]);

      prisma.accountCode.findMany.mockResolvedValue([
        { id: 'asset1', code: '1101', type: 'ASSET', normalBalance: 'DEBIT', parentId: null },
        { id: 'liab1', code: '2101', type: 'LIABILITY', normalBalance: 'CREDIT', parentId: null },
        { id: 'eq1', code: '3100', type: 'EQUITY', normalBalance: 'CREDIT', parentId: null },
      ]);

      const result = await service.getBalanceSheet('zone1', '2024-12-31');

      expect(result.totalAssets).toBe(1000000);
      expect(result.totalLiabilities + result.totalEquity).toBe(1000000);
      expect(result.isBalanced).toBe(true);
    });

    it('should only include posted vouchers', async () => {
      prisma.accountingVoucher.findMany.mockResolvedValue([]);
      prisma.accountCode.findMany.mockResolvedValue([]);

      const result = await service.getBalanceSheet('zone1', '2024-12-31');

      expect(prisma.accountingVoucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'POSTED' }),
        }),
      );
    });
  });

  // Note: getAgingReport tests are in invoice.service.spec.ts
});
