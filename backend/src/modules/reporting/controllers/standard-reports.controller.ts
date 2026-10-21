import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M18: Reporting & BI — Standard Reports Controller
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { StandardReportsService } from '../services/standard-reports.service';

@ApiTags('Standard Reports')
@ApiBearerAuth()
@Controller('/reports/standard')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class StandardReportsController {
  constructor(private readonly standardReports: StandardReportsService) {}

  @Get('traffic/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get traffic report for zone' })
  async getTrafficReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getTrafficReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('gate/:zoneId/:gateId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get gate detail report' })
  async getGateReport(
    @Param('zoneId') zoneId: string,
    @Param('gateId') gateId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getGateReport(zoneId, gateId, fromDate, toDate);
    return { data };
  }

  @Get('waybill/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get waybill report' })
  async getWaybillReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getWaybillReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('weighscale/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get weigh scale report' })
  async getWeighScaleReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getWeighScaleReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('permit/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get permit report' })
  async getPermitReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getPermitReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('correspondence/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get correspondence report' })
  async getCorrespondenceReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getCorrespondenceReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('revenue/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get revenue report' })
  async getRevenueReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getRevenueReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('ar-aging/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get AR aging report' })
  async getArAgingReport(@Param('zoneId') zoneId: string) {
    const data = await this.standardReports.getArAgingReport(zoneId);
    return { data };
  }

  @Get('hse/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get HSE report' })
  async getHseReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('companyId') companyId?: string,
  ) {
    const data = await this.standardReports.getHseReport(zoneId, fromDate, toDate, companyId);
    return { data };
  }

  @Get('attendance/:zoneId/:companyId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get attendance report' })
  async getAttendanceReport(
    @Param('zoneId') zoneId: string,
    @Param('companyId') companyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getAttendanceReport(zoneId, companyId, fromDate, toDate);
    return { data };
  }

  @Get('inventory/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get inventory report' })
  async getInventoryReport(
    @Param('zoneId') zoneId: string,
    @Query('companyId') companyId?: string,
  ) {
    const data = await this.standardReports.getInventoryReport(zoneId, companyId);
    return { data };
  }

  @Get('maintenance/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get maintenance report' })
  async getMaintenanceReport(
    @Param('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.standardReports.getMaintenanceReport(zoneId, fromDate, toDate);
    return { data };
  }

  @Get('executive/:zoneId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get executive summary' })
  async getExecutiveSummary(
    @Param('zoneId') zoneId: string,
    @Query('period') period: string,
  ) {
    const data = await this.standardReports.getExecutiveSummary(zoneId, period);
    return { data };
  }

  @Get('compare-zones')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Compare zones by metric' })
  async compareZones(
    @Query('zoneIds') zoneIds: string,
    @Query('metric') metric: string,
    @Query('period') period: string,
  ) {
    const ids = zoneIds.split(',').filter(Boolean);
    const data = await this.standardReports.compareZones(ids, metric, period);
    return { data };
  }

  @Get('scorecard/:zoneId/:companyId')
  @RequirePermission('reporting.standard-reports.list.view')
  @ApiOperation({ summary: 'Get company scorecard' })
  async getCompanyScorecard(
    @Param('zoneId') zoneId: string,
    @Param('companyId') companyId: string,
    @Query('period') period: string,
  ) {
    const data = await this.standardReports.getCompanyScorecard(companyId, zoneId, period);
    return { data };
  }
}
