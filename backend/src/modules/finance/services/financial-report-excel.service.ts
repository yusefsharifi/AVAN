import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isFinancialEqual } from '../utils/financial-compare';

/**
 * Excel report generation service for financial reports.
 * Uses exceljs to create .xlsx files with proper RTL formatting,
 * styled headers, and summary rows.
 */
@Injectable()
export class FinancialReportExcelService {
  private readonly logger = new Logger(FinancialReportExcelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate Income Statement (صورت سود و زیان) as Excel
   */
  async generateIncomeStatement(zoneId: string, fromDate: string, toDate: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'AVAN Finance';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('صورت سود و زیان', {
      views: [{ rightToLeft: true }],
    });

    // Column widths
    ws.columns = [
      { header: '', key: 'blank', width: 3 },
      { header: 'کد حساب', key: 'code', width: 12 },
      { header: 'شرح', key: 'name', width: 35 },
      { header: 'مبلغ (ریال)', key: 'amount', width: 20 },
    ];

    // Header styling
    this.styleHeaderRow(ws, 1, 4);

    // Title
    ws.mergeCells('A2:D2');
    const titleCell = ws.getCell('A2');
    titleCell.value = `صورت سود و زیان — از ${fromDate} تا ${toDate}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    // Fetch data
    const accounts = await this.getAccountBalances(zoneId, fromDate, toDate, ['REVENUE', 'EXPENSE']);

    let row = 4;

    // ─── Revenues Section ───
    ws.mergeCells(`A${row}:D${row}`);
    const revHeader = ws.getCell(`A${row}`);
    revHeader.value = 'درآمدها (Revenue)';
    revHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    revHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
    row++;

    let totalRevenue = 0;
    const revenueAccounts = accounts.filter((a) => a.type === 'REVENUE');
    for (const acc of revenueAccounts) {
      ws.getCell(row, 2).value = acc.code;
      ws.getCell(row, 3).value = acc.nameFa;
      ws.getCell(row, 4).value = acc.balance;
      ws.getCell(row, 4).numFmt = '#,##0';
      ws.getCell(row, 4).alignment = { horizontal: 'right' };
      totalRevenue += acc.balance;
      this.styleDataRow(ws, row, 4);
      row++;
    }

    // Revenue total
    ws.getCell(row, 3).value = 'جمع درآمدها';
    ws.getCell(row, 3).font = { bold: true };
    ws.getCell(row, 4).value = totalRevenue;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true };
    this.styleTotalRow(ws, row, 4);
    row += 2;

    // ─── Expenses Section ───
    ws.mergeCells(`A${row}:D${row}`);
    const expHeader = ws.getCell(`A${row}`);
    expHeader.value = 'هزینه‌ها (Expenses)';
    expHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    expHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC3545' } };
    row++;

    let totalExpenses = 0;
    const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE');
    for (const acc of expenseAccounts) {
      ws.getCell(row, 2).value = acc.code;
      ws.getCell(row, 3).value = acc.nameFa;
      ws.getCell(row, 4).value = acc.balance;
      ws.getCell(row, 4).numFmt = '#,##0';
      ws.getCell(row, 4).alignment = { horizontal: 'right' };
      totalExpenses += acc.balance;
      this.styleDataRow(ws, row, 4);
      row++;
    }

    // Expenses total
    ws.getCell(row, 3).value = 'جمع هزینه‌ها';
    ws.getCell(row, 3).font = { bold: true };
    ws.getCell(row, 4).value = totalExpenses;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true };
    this.styleTotalRow(ws, row, 4);
    row += 2;

    // ─── Net Income ───
    const netIncome = totalRevenue - totalExpenses;
    ws.mergeCells(`A${row}:C${row}`);
    ws.getCell(row, 1).value = 'سود خالص (Net Income)';
    ws.getCell(row, 1).font = { bold: true, size: 12 };
    ws.getCell(row, 1).alignment = { horizontal: 'right' };
    ws.getCell(row, 4).value = netIncome;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true, size: 12, color: { argb: netIncome >= 0 ? 'FF28A745' : 'FFDC3545' } };
    this.styleGrandTotalRow(ws, row, 4);

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  /**
   * Generate Balance Sheet (ترازنامه) as Excel
   */
  async generateBalanceSheet(zoneId: string, asOfDate: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'AVAN Finance';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('ترازنامه', {
      views: [{ rightToLeft: true }],
    });

    ws.columns = [
      { header: '', key: 'blank', width: 3 },
      { header: 'کد حساب', key: 'code', width: 12 },
      { header: 'شرح', key: 'name', width: 35 },
      { header: 'بدهکار (ریال)', key: 'debit', width: 20 },
      { header: 'بستانکار (ریال)', key: 'credit', width: 20 },
    ];

    this.styleHeaderRow(ws, 1, 5);

    // Title
    ws.mergeCells('A2:E2');
    const titleCell = ws.getCell('A2');
    titleCell.value = `ترازنامه — تا تاریخ ${asOfDate}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    const accounts = await this.getBalanceSheetAccounts(zoneId, asOfDate);

    let row = 4;

    // ─── Assets ───
    row = this.writeAccountSection(ws, row, 'دارایی‌ها (Assets)', accounts.assets, 5, 'FF0066CC');
    const totalAssets = accounts.assets.reduce((s: number, a: any) => s + a.balance, 0);

    // ─── Liabilities ───
    row = this.writeAccountSection(ws, row, 'بدهی‌ها (Liabilities)', accounts.liabilities, 5, 'FFDC3545');
    const totalLiabilities = accounts.liabilities.reduce((s: number, a: any) => s + a.balance, 0);

    // ─── Equity ───
    row = this.writeAccountSection(ws, row, 'حقوق صاحبان سهام (Equity)', accounts.equity, 5, 'FF6F42C1');
    const totalEquity = accounts.equity.reduce((s: number, a: any) => s + a.balance, 0);

    // ─── Balance Check ───
    row++;
    ws.mergeCells(`A${row}:C${row}`);
    ws.getCell(row, 1).value = 'جمع دارایی‌ها';
    ws.getCell(row, 1).font = { bold: true, size: 11 };
    ws.getCell(row, 4).value = totalAssets;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true };
    this.styleTotalRow(ws, row, 5);
    row++;

    ws.mergeCells(`A${row}:C${row}`);
    ws.getCell(row, 1).value = 'جمع بدهی‌ها + حقوق صاحبان سهام';
    ws.getCell(row, 1).font = { bold: true, size: 11 };
    ws.getCell(row, 4).value = totalLiabilities + totalEquity;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true };
    this.styleTotalRow(ws, row, 5);
    row++;

    const isBalanced = isFinancialEqual(totalAssets, totalLiabilities + totalEquity);
    ws.getCell(row, 1).value = isBalanced ? '✅ ترازنامه متعادل است' : '⚠️ ترازنامه متعادل نیست';
    ws.getCell(row, 1).font = {
      bold: true,
      size: 11,
      color: { argb: isBalanced ? 'FF28A745' : 'FFDC3545' },
    };

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  /**
   * Generate AR Aging Report (تحلیل سنی مطالبات) as Excel
   */
  async generateAgingReport(zoneId: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'AVAN Finance';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('تحلیل سنی مطالبات', {
      views: [{ rightToLeft: true }],
    });

    ws.columns = [
      { header: '', key: 'blank', width: 3 },
      { header: 'کد شرکت', key: 'companyId', width: 12 },
      { header: 'نام شرکت', key: 'companyName', width: 30 },
      { header: 'جاری', key: 'current', width: 18 },
      { header: '۱-۳۰ روز', key: 'd1_30', width: 18 },
      { header: '۳۱-۶۰ روز', key: 'd31_60', width: 18 },
      { header: '۶۱-۹۰ روز', key: 'd61_90', width: 18 },
      { header: 'بیش از ۹۰ روز', key: 'over90', width: 18 },
      { header: 'جمع', key: 'total', width: 20 },
    ];

    this.styleHeaderRow(ws, 1, 9);

    // Title
    ws.mergeCells('A2:I2');
    const titleCell = ws.getCell('A2');
    titleCell.value = `تحلیل سنی مطالبات — ${new Date().toISOString().split('T')[0]}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    // Fetch aging data
    const agingData = await this.getAgingData(zoneId);

    let row = 4;
    let grandCurrent = 0;
    let grandD1_30 = 0;
    let grandD31_60 = 0;
    let grandD61_90 = 0;
    let grandOver90 = 0;
    let grandTotal = 0;

    for (const company of agingData) {
      const total = company.current + company.d1_30 + company.d31_60 + company.d61_90 + company.over90;

      ws.getCell(row, 2).value = company.companyId;
      ws.getCell(row, 3).value = company.companyName;
      ws.getCell(row, 4).value = company.current;
      ws.getCell(row, 5).value = company.d1_30;
      ws.getCell(row, 6).value = company.d31_60;
      ws.getCell(row, 7).value = company.d61_90;
      ws.getCell(row, 8).value = company.over90;
      ws.getCell(row, 9).value = total;

      for (let col = 4; col <= 9; col++) {
        ws.getCell(row, col).numFmt = '#,##0';
        ws.getCell(row, col).alignment = { horizontal: 'right' };
      }

      // Highlight overdue amounts
      if (company.over90 > 0) {
        ws.getCell(row, 8).font = { color: { argb: 'FFDC3545' }, bold: true };
      }
      if (company.d61_90 > 0) {
        ws.getCell(row, 7).font = { color: { argb: 'FFFFC107' } };
      }

      grandCurrent += company.current;
      grandD1_30 += company.d1_30;
      grandD31_60 += company.d31_60;
      grandD61_90 += company.d61_90;
      grandOver90 += company.over90;
      grandTotal += total;

      this.styleDataRow(ws, row, 9);
      row++;
    }

    // Grand total row
    ws.getCell(row, 3).value = 'جمع کل';
    ws.getCell(row, 3).font = { bold: true };
    ws.getCell(row, 4).value = grandCurrent;
    ws.getCell(row, 5).value = grandD1_30;
    ws.getCell(row, 6).value = grandD31_60;
    ws.getCell(row, 7).value = grandD61_90;
    ws.getCell(row, 8).value = grandOver90;
    ws.getCell(row, 9).value = grandTotal;

    for (let col = 4; col <= 9; col++) {
      ws.getCell(row, col).numFmt = '#,##0';
      ws.getCell(row, col).font = { bold: true };
    }
    this.styleGrandTotalRow(ws, row, 9);

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  /**
   * Generate Budget Variance Report (گزارش انحراف بودجه) as Excel
   */
  async generateBudgetVariance(zoneId: string, fiscalYear: number): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    workbook.creator = 'AVAN Finance';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('گزارش انحراف بودجه', {
      views: [{ rightToLeft: true }],
    });

    ws.columns = [
      { header: '', key: 'blank', width: 3 },
      { header: 'کد حساب', key: 'code', width: 12 },
      { header: 'شرح', key: 'name', width: 30 },
      { header: 'بودجه (ریال)', key: 'budgeted', width: 20 },
      { header: 'واقعی (ریال)', key: 'actual', width: 20 },
      { header: 'انحراف (ریال)', key: 'variance', width: 20 },
      { header: 'انحراف (%)', key: 'variancePct', width: 12 },
    ];

    this.styleHeaderRow(ws, 1, 7);

    // Title
    ws.mergeCells('A2:G2');
    const titleCell = ws.getCell('A2');
    titleCell.value = `گزارش انحراف بودجه — سال مالی ${fiscalYear}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    const budget = await this.prisma.budget.findFirst({
      where: { zoneId, fiscalYear },
      include: { lines: { include: { account: true } } },
    });

    if (!budget) {
      ws.mergeCells('A4:G4');
      ws.getCell('A4').value = 'بودجه‌ای برای این سال یافت نشد';
      ws.getCell('A4').font = { italic: true, color: { argb: 'FF999999' } };
      return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }

    let row = 4;
    let totalBudgeted = 0;
    let totalActual = 0;

    for (const line of budget.lines) {
      const budgeted = Number(line.amount);
      const actual = Number(line.actualAmount);
      const variance = budgeted - actual;
      const variancePct = budgeted > 0 ? Math.round((variance / budgeted) * 100) : 0;

      ws.getCell(row, 2).value = line.account.code;
      ws.getCell(row, 3).value = line.account.nameFa;
      ws.getCell(row, 4).value = budgeted;
      ws.getCell(row, 5).value = actual;
      ws.getCell(row, 6).value = variance;
      ws.getCell(row, 7).value = `${variancePct}%`;

      for (let col = 4; col <= 7; col++) {
        ws.getCell(row, col).alignment = { horizontal: 'right' };
        if (col <= 6) ws.getCell(row, col).numFmt = '#,##0';
      }

      // Color variance: red if over budget, green if under
      if (variance < 0) {
        ws.getCell(row, 6).font = { color: { argb: 'FFDC3545' }, bold: true };
        ws.getCell(row, 7).font = { color: { argb: 'FFDC3545' } };
      } else if (variance > 0) {
        ws.getCell(row, 6).font = { color: { argb: 'FF28A745' } };
      }

      totalBudgeted += budgeted;
      totalActual += actual;

      this.styleDataRow(ws, row, 7);
      row++;
    }

    // Total row
    const totalVariance = totalBudgeted - totalActual;
    const totalVariancePct = totalBudgeted > 0 ? Math.round((totalVariance / totalBudgeted) * 100) : 0;

    ws.getCell(row, 3).value = 'جمع کل';
    ws.getCell(row, 3).font = { bold: true };
    ws.getCell(row, 4).value = totalBudgeted;
    ws.getCell(row, 5).value = totalActual;
    ws.getCell(row, 6).value = totalVariance;
    ws.getCell(row, 7).value = `${totalVariancePct}%`;

    for (let col = 4; col <= 7; col++) {
      ws.getCell(row, col).font = { ...(ws.getCell(row, col).font || {}), bold: true };
      if (col <= 6) ws.getCell(row, col).numFmt = '#,##0';
    }
    this.styleGrandTotalRow(ws, row, 7);

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private async getAccountBalances(
    zoneId: string,
    fromDate: string,
    toDate: string,
    types: string[],
  ): Promise<{ code: string; nameFa: string; type: string; balance: number }[]> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const vouchers = await this.prisma.accountingVoucher.findMany({
      where: {
        zoneId,
        status: 'POSTED',
        gregorianDate: { gte: from, lte: to },
        deletedAt: null,
      },
      include: { lines: true },
    });

    const accounts = await this.prisma.accountCode.findMany({
      where: {
        OR: [{ zoneId }, { zoneId: null }],
        type: { in: types as any },
        isActive: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const totals = new Map<string, number>();

    for (const v of vouchers) {
      for (const line of v.lines) {
        if (line.creditAccountId) {
          const acc = accountMap.get(line.creditAccountId);
          if (acc && types.includes(acc.type)) {
            totals.set(line.creditAccountId, (totals.get(line.creditAccountId) || 0) + Number(line.creditAmount));
          }
        }
        if (line.debitAccountId) {
          const acc = accountMap.get(line.debitAccountId);
          if (acc && types.includes(acc.type)) {
            totals.set(line.debitAccountId, (totals.get(line.debitAccountId) || 0) + Number(line.debitAmount));
          }
        }
      }
    }

    return Array.from(totals.entries())
      .map(([id, amount]) => {
        const acc = accountMap.get(id)!;
        return { code: acc.code, nameFa: acc.nameFa, type: acc.type, balance: amount };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  private async getBalanceSheetAccounts(zoneId: string, asOfDate: string) {
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
    const accountTotals = new Map<string, { debit: number; credit: number }>();

    for (const v of vouchers) {
      for (const line of v.lines) {
        if (line.debitAccountId && accountMap.has(line.debitAccountId)) {
          const cur = accountTotals.get(line.debitAccountId) || { debit: 0, credit: 0 };
          cur.debit += Number(line.debitAmount);
          accountTotals.set(line.debitAccountId, cur);
        }
        if (line.creditAccountId && accountMap.has(line.creditAccountId)) {
          const cur = accountTotals.get(line.creditAccountId) || { debit: 0, credit: 0 };
          cur.credit += Number(line.creditAmount);
          accountTotals.set(line.creditAccountId, cur);
        }
      }
    }

    const calcBalance = (id: string): number => {
      const bal = accountTotals.get(id) || { debit: 0, credit: 0 };
      const acc = accountMap.get(id);
      if (!acc) return 0;
      return acc.normalBalance === 'DEBIT' ? bal.debit - bal.credit : bal.credit - bal.debit;
    };

    const assets = accounts.filter((a) => a.type === 'ASSET').map((a) => ({ ...a, balance: calcBalance(a.id) }));
    const liabilities = accounts.filter((a) => a.type === 'LIABILITY').map((a) => ({ ...a, balance: calcBalance(a.id) }));
    const equity = accounts.filter((a) => a.type === 'EQUITY').map((a) => ({ ...a, balance: calcBalance(a.id) }));

    return { assets, liabilities, equity };
  }

  private async getAgingData(zoneId: string) {
    const today = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        zoneId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        deletedAt: null,
      },
      include: { company: { select: { id: true, nameFa: true } } },
    });

    const companyMap = new Map<string, {
      companyId: string;
      companyName: string;
      current: number;
      d1_30: number;
      d31_60: number;
      d61_90: number;
      over90: number;
    }>();

    for (const inv of invoices) {
      const remaining = Number(inv.remainingAmount);
      if (remaining <= 0) continue;

      const companyId = inv.companyId || 'UNKNOWN';
      const companyName = (inv as any).company?.nameFa || inv.partyName;

      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, { companyId, companyName, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 });
      }

      const entry = companyMap.get(companyId)!;
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.issueDate);
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) entry.current += remaining;
      else if (daysOverdue <= 30) entry.d1_30 += remaining;
      else if (daysOverdue <= 60) entry.d31_60 += remaining;
      else if (daysOverdue <= 90) entry.d61_90 += remaining;
      else entry.over90 += remaining;
    }

    return Array.from(companyMap.values()).sort((a, b) => {
      const aTotal = a.current + a.d1_30 + a.d31_60 + a.d61_90 + a.over90;
      const bTotal = b.current + b.d1_30 + b.d31_60 + b.d61_90 + b.over90;
      return bTotal - aTotal;
    });
  }

  private writeAccountSection(ws: any, startRow: number, title: string, accounts: any[], cols: number, color: string): number {
    let row = startRow;

    ws.mergeCells(`A${row}:${String.fromCharCode(64 + cols)}${row}`);
    const header = ws.getCell(`A${row}`);
    header.value = title;
    header.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    row++;

    for (const acc of accounts) {
      ws.getCell(row, 2).value = acc.code;
      ws.getCell(row, 3).value = acc.nameFa;
      ws.getCell(row, 4).value = acc.balance;
      ws.getCell(row, 4).numFmt = '#,##0';
      ws.getCell(row, 4).alignment = { horizontal: 'right' };
      this.styleDataRow(ws, row, cols);
      row++;
    }

    // Section total
    const total = accounts.reduce((s, a) => s + a.balance, 0);
    ws.getCell(row, 3).value = `جمع ${title.split(' ')[0]}`;
    ws.getCell(row, 3).font = { bold: true };
    ws.getCell(row, 4).value = total;
    ws.getCell(row, 4).numFmt = '#,##0';
    ws.getCell(row, 4).font = { bold: true };
    this.styleTotalRow(ws, row, cols);
    row += 2;

    return row;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Styling Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private styleHeaderRow(ws: any, rowNum: number, cols: number) {
    const row = ws.getRow(rowNum);
    for (let i = 1; i <= cols; i++) {
      const cell = row.getCell(i);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF343A40' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  }

  private styleDataRow(ws: any, rowNum: number, cols: number) {
    const row = ws.getRow(rowNum);
    for (let i = 1; i <= cols; i++) {
      const cell = row.getCell(i);
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
      };
      if (rowNum % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    }
  }

  private styleTotalRow(ws: any, rowNum: number, cols: number) {
    const row = ws.getRow(rowNum);
    for (let i = 1; i <= cols; i++) {
      const cell = row.getCell(i);
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
    }
  }

  private styleGrandTotalRow(ws: any, rowNum: number, cols: number) {
    const row = ws.getRow(rowNum);
    for (let i = 1; i <= cols; i++) {
      const cell = row.getCell(i);
      cell.font = { bold: true, size: 12 };
      cell.border = {
        top: { style: 'thick', color: { argb: 'FF0066CC' } },
        bottom: { style: 'double', color: { argb: 'FF0066CC' } },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    }
  }
}
