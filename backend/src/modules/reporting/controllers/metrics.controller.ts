import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M18: Reporting & BI — Metrics Controller
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MetricsAggregationService } from '../services/metrics-aggregation.service';
import { SetKpiTargetDto } from '../dto/create-dtos';

@ApiTags('Metrics & KPIs')
@ApiBearerAuth()
@Controller('/metrics')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsAggregationService) {}

  @Post('snapshot/:zoneId')
  @RequirePermission('reporting.metrics.list.create')
  @ApiOperation({ summary: 'Compute daily snapshot for zone' })
  async computeSnapshot(
    @Param('zoneId') zoneId: string,
    @Query('date') date: string,
  ) {
    await this.metricsService.computeDailySnapshot(zoneId, date);
    return { data: { computed: true, date } };
  }

  @Get('history/:zoneId')
  @RequirePermission('reporting.metrics.list.view')
  @ApiOperation({ summary: 'Get metric history' })
  async getHistory(
    @Param('zoneId') zoneId: string,
    @Query('module') module: string,
    @Query('metric') metric: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.metricsService.getMetricHistory(
      zoneId, module, metric, fromDate, toDate,
    );
    return { data };
  }

  @Get('trend/:zoneId')
  @RequirePermission('reporting.metrics.list.view')
  @ApiOperation({ summary: 'Get metric trend' })
  async getTrend(
    @Param('zoneId') zoneId: string,
    @Query('module') module: string,
    @Query('metric') metric: string,
    @Query('periods') periods: string,
    @Query('periodType') periodType: 'day' | 'week' | 'month',
  ) {
    const data = await this.metricsService.getMetricTrend(
      zoneId, module, metric, parseInt(periods, 10) || 7, periodType || 'day',
    );
    return { data };
  }

  @Post('kpi-targets')
  @RequirePermission('reporting.metrics.list.create')
  @ApiOperation({ summary: 'Set KPI target' })
  async setKpiTarget(@Body() dto: SetKpiTargetDto) {
    const data = await this.metricsService.setKpiTarget(dto);
    return { data };
  }

  @Get('kpi-progress/:zoneId')
  @RequirePermission('reporting.metrics.list.view')
  @ApiOperation({ summary: 'Get KPI progress' })
  async getKpiProgress(
    @Param('zoneId') zoneId: string,
    @Query('module') module: string,
    @Query('kpiCode') kpiCode: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    const data = await this.metricsService.getKpiProgress(
      zoneId, module, kpiCode, parseInt(year, 10), month ? parseInt(month, 10) : undefined,
    );
    return { data };
  }
}
