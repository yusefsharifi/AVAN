import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { calculateDSO, calculateDPO } from '../utils/double-entry.util';
import { isFinancialEqual } from '../utils/financial-compare';

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async getIncomeStatement(zoneId: string, fromDate: string, toDate: string): Promise<any> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Get all posted vouchers in the period
    const vouchers = await this.prisma.accountingVoucher.findMany({
      where: {
        zoneId,
        status: 'POSTED',
        gregorianDate: { gte: from, lte: to },
        deletedAt: null,
      },
      include: { lines: true },
    });

    // Get all accounts for this zone
    const accounts = await this.prisma.accountCode.findMany({
      where: {
        OR: [{ zoneId }, { zoneId: null }],
        type: { in: ['REVENUE', 'EXPENSE'] },
        isActive: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const revenueTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();

    for (const voucher of vouchers) {
      for (const line of voucher.lines) {
        // Revenue accounts: credit increases revenue
        if (line.creditAccountId) {
          const account = accountMap.get(line.creditAccountId);
          if (account && account.type === 'REVENUE') {
            const current = revenueTotals.get(line.creditAccountId) || 0;
            revenueTotals.set(line.creditAccountId, current + Number(line.creditAmount));
          }
        }
        // Expense accounts: debit increases expense
        if (line.debitAccountId) {
          const account = accountMap.get(line.debitAccountId);
          if (account && account.type === 'EXPENSE') {
            const current = expenseTotals.get(line.debitAccountId) || 0;
            expenseTotals.set(line.debitAccountId, current + Number(line.debitAmount));
          }
        }
      }
    }

    const revenues = Array.from(revenueTotals.entries()).map(([id, amount]) => ({
      account: accountMap.get(id),
      amount,
    }));

    const expenses = Array.from(expenseTotals.entries()).map(([id, amount]) => ({
      account: accountMap.get(id),
      amount,
    }));

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      revenues,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      period: { fromDate, toDate },
    };
  }

  async getBalanceSheet(zoneId: string, asOfDate: string): Promise<any> {
    const asOf = new Date(asOfDate);

    const vouchers = await this.prisma.accountingVoucher.findMany({
      where: {
        zoneId,
        status: 'POSTED',
        gregorianDate: { lte: asOf },
        deletedAt: null,
      },
      include: { lines: true },
    });

    const accounts = await this.prisma.accountCode.findMany({
      where: {
        OR: [{ zoneId }, { zoneId: null }],
        type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
        isActive: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const accountBalances = new Map<string, { debit: number; credit: number }>();

    for (const voucher of vouchers) {
      for (const line of voucher.lines) {
        if (line.debitAccountId) {
          const current = accountBalances.get(line.debitAccountId) || { debit: 0, credit: 0 };
          current.debit += Number(line.debitAmount);
          accountBalances.set(line.debitAccountId, current);
        }
        if (line.creditAccountId) {
          const current = accountBalances.get(line.creditAccountId) || { debit: 0, credit: 0 };
          current.credit += Number(line.creditAmount);
          accountBalances.set(line.creditAccountId, current);
        }
      }
    }

    const calculateBalance = (id: string): number => {
      const bal = accountBalances.get(id) || { debit: 0, credit: 0 };
      const account = accountMap.get(id);
      if (!account) return 0;

      // Assets: debit normal → balance = debit - credit
      // Liabilities/Equity: credit normal → balance = credit - debit
      if (account.normalBalance === 'DEBIT') {
        return bal.debit - bal.credit;
      } else {
        return bal.credit - bal.debit;
      }
    };

    const assets = accounts
      .filter((a) => a.type === 'ASSET' && !a.parentId)
      .map((a) => ({
        account: a,
        balance: calculateBalance(a.id),
        children: accounts
          .filter((c) => c.parentId === a.id)
          .map((c) => ({ account: c, balance: calculateBalance(c.id) })),
      }));

    const liabilities = accounts
      .filter((a) => a.type === 'LIABILITY' && !a.parentId)
      .map((a) => ({
        account: a,
        balance: calculateBalance(a.id),
        children: accounts
          .filter((c) => c.parentId === a.id)
          .map((c) => ({ account: c, balance: calculateBalance(c.id) })),
      }));

    const equity = accounts
      .filter((a) => a.type === 'EQUITY' && !a.parentId)
      .map((a) => ({
        account: a,
        balance: calculateBalance(a.id),
      }));

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      isBalanced: isFinancialEqual(totalAssets, totalLiabilities + totalEquity),
      asOfDate,
    };
  }

  async getCashFlowStatement(zoneId: string, fromDate: string, toDate: string): Promise<any> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        zoneId,
        transactionDate: { gte: from, lte: to },
      },
      include: { bankAccount: true },
      orderBy: { transactionDate: 'asc' },
    });

    const operatingInflows = transactions
      .filter((t) => t.type === 'CREDIT' && t.description.includes('فروش'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const operatingOutflows = transactions
      .filter((t) => t.type === 'DEBIT' && !t.description.includes('购置'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const investingOutflows = transactions
      .filter((t) => t.type === 'DEBIT' && t.description.includes('购置'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const financingInflows = transactions
      .filter((t) => t.type === 'CREDIT' && t.description.includes('تسهیلات'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const financingOutflows = transactions
      .filter((t) => t.type === 'DEBIT' && t.description.includes('بازپرداخت'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashFromOperating = operatingInflows - operatingOutflows;
    const netCashFromInvesting = -investingOutflows;
    const netCashFromFinancing = financingInflows - financingOutflows;

    return {
      operating: {
        inflows: operatingInflows,
        outflows: operatingOutflows,
        net: netCashFromOperating,
      },
      investing: {
        inflows: 0,
        outflows: investingOutflows,
        net: netCashFromInvesting,
      },
      financing: {
        inflows: financingInflows,
        outflows: financingOutflows,
        net: netCashFromFinancing,
      },
      netCashChange: netCashFromOperating + netCashFromInvesting + netCashFromFinancing,
      period: { fromDate, toDate },
    };
  }

  async getRevenueBySource(zoneId: string, fromDate: string, toDate: string): Promise<any> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        zoneId,
        direction: 'SALES',
        status: { notIn: ['CANCELLED'] },
        issueDate: { gte: fromDate, lte: toDate },
        deletedAt: null,
      },
      include: { company: { select: { id: true, nameFa: true } } },
    });

    const byType = new Map<string, { count: number; amount: number }>();
    const byCompany = new Map<string, { companyId: string; companyName: string; amount: number }>();
    const byMonth = new Map<string, { month: string; amount: number }>();

    let total = 0;

    for (const invoice of invoices) {
      const amount = Number(invoice.grandTotal);
      total += amount;

      // By type
      const typeEntry = byType.get(invoice.type) || { count: 0, amount: 0 };
      typeEntry.count++;
      typeEntry.amount += amount;
      byType.set(invoice.type, typeEntry);

      // By company
      const companyId = invoice.companyId || 'UNKNOWN';
      const companyName = (invoice as any).company?.nameFa || invoice.partyName;
      const companyEntry = byCompany.get(companyId) || { companyId, companyName, amount: 0 };
      companyEntry.amount += amount;
      byCompany.set(companyId, companyEntry);

      // By month
      const month = invoice.issueDate.substring(0, 7);
      const monthEntry = byMonth.get(month) || { month, amount: 0 };
      monthEntry.amount += amount;
      byMonth.set(month, monthEntry);
    }

    return {
      byType: Array.from(byType.entries()).map(([type, data]) => ({ type, ...data })),
      byCompany: Array.from(byCompany.values()),
      byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
      total,
    };
  }

  async getBudgetVarianceReport(zoneId: string, fiscalYear: number): Promise<any> {
    const budget = await this.prisma.budget.findFirst({
      where: { zoneId, fiscalYear },
      include: { lines: { include: { account: true } } },
    });

    if (!budget) {
      return { lines: [], totalBudgeted: 0, totalActual: 0, totalVariance: 0 };
    }

    const lines = budget.lines.map((line) => {
      const budgeted = Number(line.amount);
      const actual = Number(line.actualAmount);
      const variance = budgeted - actual;
      const variancePct = budgeted > 0 ? Math.round((variance / budgeted) * 100) : 0;

      return {
        accountCode: line.account.code,
        accountNameFa: line.account.nameFa,
        budgeted,
        actual,
        variance,
        variancePct,
      };
    });

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      fiscalYear,
      lines,
      totalBudgeted: lines.reduce((sum, l) => sum + l.budgeted, 0),
      totalActual: lines.reduce((sum, l) => sum + l.actual, 0),
      totalVariance: lines.reduce((sum, l) => sum + l.variance, 0),
    };
  }

  async getKpiDashboard(zoneId: string): Promise<any> {
    const cacheKey = REDIS_KEYS.financeKpi(zoneId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get posted vouchers for calculations
    const [ytdVouchers, mtdVouchers, lastMonthVouchers] = await Promise.all([
      this.prisma.accountingVoucher.findMany({
        where: { zoneId, status: 'POSTED', gregorianDate: { gte: yearStart, lte: now }, deletedAt: null },
        include: { lines: true },
      }),
      this.prisma.accountingVoucher.findMany({
        where: { zoneId, status: 'POSTED', gregorianDate: { gte: monthStart, lte: now }, deletedAt: null },
        include: { lines: true },
      }),
      this.prisma.accountingVoucher.findMany({
        where: { zoneId, status: 'POSTED', gregorianDate: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
        include: { lines: true },
      }),
    ]);

    // Get account codes
    const revenueAccounts = await this.prisma.accountCode.findMany({
      where: { OR: [{ zoneId }, { zoneId: null }], type: 'REVENUE', isActive: true },
    });
    const expenseAccounts = await this.prisma.accountCode.findMany({
      where: { OR: [{ zoneId }, { zoneId: null }], type: 'EXPENSE', isActive: true },
    });

    const revenueIds = new Set(revenueAccounts.map((a) => a.id));
    const expenseIds = new Set(expenseAccounts.map((a) => a.id));

    const aggregateVouchers = (vouchers: any[]) => {
      let revenue = 0;
      let expenses = 0;
      for (const v of vouchers) {
        for (const line of v.lines) {
          if (line.creditAccountId && revenueIds.has(line.creditAccountId)) {
            revenue += Number(line.creditAmount);
          }
          if (line.debitAccountId && expenseIds.has(line.debitAccountId)) {
            expenses += Number(line.debitAmount);
          }
        }
      }
      return { revenue, expenses, netIncome: revenue - expenses };
    };

    const ytd = aggregateVouchers(ytdVouchers);
    const mtd = aggregateVouchers(mtdVouchers);
    const lastMonth = aggregateVouchers(lastMonthVouchers);

    // AR and AP balances
    const [arBalance, apBalance, overdueAR] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { zoneId, direction: 'SALES', status: { notIn: ['PAID', 'CANCELLED'] }, deletedAt: null },
        _sum: { remainingAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { zoneId, direction: 'PURCHASE', status: { notIn: ['PAID', 'CANCELLED'] }, deletedAt: null },
        _sum: { remainingAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          zoneId,
          direction: 'SALES',
          status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
          dueDate: { lt: now.toISOString().split('T')[0] },
          deletedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
    ]);

    const ar = Number(arBalance._sum.remainingAmount || 0);
    const ap = Number(apBalance._sum.remainingAmount || 0);
    const overdueAr = Number(overdueAR._sum.remainingAmount || 0);

    // Cash balance
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { zoneId, isActive: true },
    });
    const cashBalance = bankAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

    // Calculate DSO and DPO (using annualized rates)
    const annualRevenue = ytd.revenue * (12 / Math.max(1, now.getMonth() + 1));
    const annualCOGS = ytd.expenses * (12 / Math.max(1, now.getMonth() + 1));

    const dso = calculateDSO(ar, annualRevenue);
    const dpo = calculateDPO(ap, annualCOGS);

    const grossMargin = mtd.revenue > 0 ? Math.round(((mtd.revenue - mtd.expenses) / mtd.revenue) * 100) : 0;
    const collectionRate = ar > 0 ? Math.round(((ar - overdueAr) / ar) * 100) : 100;

    const result = {
      totalRevenue: {
        mtd: mtd.revenue,
        ytd: ytd.revenue,
        vsLastMonth: lastMonth.revenue > 0 ? Math.round(((mtd.revenue - lastMonth.revenue) / lastMonth.revenue) * 100) : 0,
      },
      totalExpenses: { mtd: mtd.expenses, ytd: ytd.expenses },
      netIncome: { mtd: mtd.netIncome, ytd: ytd.netIncome },
      grossMargin,
      cashBalance,
      arBalance: ar,
      apBalance: ap,
      overdueAR: overdueAr,
      dso,
      dpo,
      collectionRate,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }
}
