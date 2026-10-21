import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { FinancialReportsService } from '../services/financial-reports.service';
import { FinancialReportExcelService } from '../services/financial-report-excel.service';

@ApiTags('Finance - Reports')
@ApiBearerAuth()
@Controller('/finance/reports')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class ReportsController {
  constructor(
    private readonly reportsService: FinancialReportsService,
    private readonly excelService: FinancialReportExcelService,
  ) {}

  @Get('kpi')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Financial KPI dashboard' })
  async getKpi(@ZoneId() zoneId: string) {
    const data = await this.reportsService.getKpiDashboard(zoneId);
    return { success: true, data };
  }

  @Get('income-statement')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Income statement' })
  async getIncomeStatement(
    @ZoneId() zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportsService.getIncomeStatement(
      zoneId,
      fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      toDate || new Date().toISOString().split('T')[0],
    );
    return { success: true, data };
  }

  @Get('balance-sheet')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Balance sheet' })
  async getBalanceSheet(
    @ZoneId() zoneId: string,
    @Query('asOfDate') asOfDate: string,
  ) {
    const data = await this.reportsService.getBalanceSheet(
      zoneId,
      asOfDate || new Date().toISOString().split('T')[0],
    );
    return { success: true, data };
  }

  @Get('cash-flow')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Cash flow statement' })
  async getCashFlow(
    @ZoneId() zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportsService.getCashFlowStatement(
      zoneId,
      fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      toDate || new Date().toISOString().split('T')[0],
    );
    return { success: true, data };
  }

  @Get('aging')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'AR aging report (via invoice service)' })
  async getAging(@ZoneId() zoneId: string) {
    // Aging report is served via invoice controller: GET /api/v1/finance/invoices/aging-report
    return { success: true, data: null, message: 'Use /api/v1/finance/invoices/aging-report instead' };
  }

  @Get('revenue-breakdown')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Revenue by source' })
  async getRevenueBreakdown(
    @ZoneId() zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.reportsService.getRevenueBySource(
      zoneId,
      fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      toDate || new Date().toISOString().split('T')[0],
    );
    return { success: true, data };
  }

  @Get('budget-variance')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Budget variance report' })
  async getBudgetVariance(
    @ZoneId() zoneId: string,
    @Query('fiscalYear') fiscalYear: number,
  ) {
    const data = await this.reportsService.getBudgetVarianceReport(zoneId, fiscalYear || new Date().getFullYear());
    return { success: true, data };
  }

  // ═══ Excel Export Endpoints ═══════════════════════════════════════════════

  @Get('income-statement/excel')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Export income statement as Excel' })
  async exportIncomeStatementExcel(
    @ZoneId() zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Res() res: Response,
  ) {
    const from = fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const to = toDate || new Date().toISOString().split('T')[0];

    const buffer = await this.excelService.generateIncomeStatement(zoneId, from, to);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="income-statement-${from}-${to}.xlsx"`,
    });
    res.end(buffer);
  }

  @Get('balance-sheet/excel')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Export balance sheet as Excel' })
  async exportBalanceSheetExcel(
    @ZoneId() zoneId: string,
    @Query('asOfDate') asOfDate: string,
    @Res() res: Response,
  ) {
    const asOf = asOfDate || new Date().toISOString().split('T')[0];

    const buffer = await this.excelService.generateBalanceSheet(zoneId, asOf);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="balance-sheet-${asOf}.xlsx"`,
    });
    res.end(buffer);
  }

  @Get('aging/excel')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Export AR aging report as Excel' })
  async exportAgingExcel(
    @ZoneId() zoneId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.excelService.generateAgingReport(zoneId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="aging-report-${new Date().toISOString().split('T')[0]}.xlsx"`,
    });
    res.end(buffer);
  }

  @Get('budget-variance/excel')
  @RequirePermission('finance.reports.kpi.view')
  @ApiOperation({ summary: 'Export budget variance report as Excel' })
  async exportBudgetVarianceExcel(
    @ZoneId() zoneId: string,
    @Query('fiscalYear') fiscalYear: number,
    @Res() res: Response,
  ) {
    const year = fiscalYear || new Date().getFullYear();

    const buffer = await this.excelService.generateBudgetVariance(zoneId, year);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="budget-variance-${year}.xlsx"`,
    });
    res.end(buffer);
  }
}
