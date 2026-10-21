import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M18: Reporting & BI — Dashboard Controller
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DashboardService } from '../services/dashboard.service';
import { CreateDashboardDto, UpdateWidgetLayoutDto } from '../dto/create-dtos';
import { FilterDashboardsDto } from '../dto/create-dtos';

@ApiTags('Dashboards')
@ApiBearerAuth()
@Controller('/dashboards')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('zone-manager/:zoneId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get Zone Manager dashboard' })
  async getZoneManagerDashboard(
    @Param('zoneId') zoneId: string,
    @Req() req: any,
  ) {
    const data = await this.dashboardService.getZoneManagerDashboard(zoneId, req.user.id);
    return { data };
  }

  @Get('company/:companyId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get Company dashboard' })
  async getCompanyDashboard(
    @Param('companyId') companyId: string,
    @Query('zoneId') zoneId: string,
  ) {
    const data = await this.dashboardService.getCompanyDashboard(companyId, zoneId);
    return { data };
  }

  @Get('super-admin')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get Super Admin dashboard' })
  async getSuperAdminDashboard(@Req() req: any) {
    const data = await this.dashboardService.getSuperAdminDashboard(req.user.id);
    return { data };
  }

  @Get('financial/:zoneId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get Financial dashboard' })
  async getFinancialDashboard(
    @Param('zoneId') zoneId: string,
    @Query('period') period: string,
  ) {
    const data = await this.dashboardService.getFinancialDashboard(zoneId, period);
    return { data };
  }

  @Get('hse/:zoneId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get HSE dashboard' })
  async getHseDashboard(@Param('zoneId') zoneId: string) {
    const data = await this.dashboardService.getHseDashboard(zoneId);
    return { data };
  }

  @Get('operational/:zoneId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get Operational dashboard' })
  async getOperationalDashboard(@Param('zoneId') zoneId: string) {
    const data = await this.dashboardService.getOperationalDashboard(zoneId);
    return { data };
  }

  @Post()
  @RequirePermission('reporting.dashboard.list.create')
  @ApiOperation({ summary: 'Create custom dashboard' })
  async create(@Body() dto: CreateDashboardDto, @Req() req: any) {
    const data = await this.dashboardService.createCustomDashboard(dto, req.user.id);
    return { data };
  }

  @Get('code/:code')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get dashboard by code' })
  async getByCode(@Param('code') code: string) {
    const data = await this.dashboardService.getDashboard(code);
    return { data };
  }

  @Get('user/:userId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get user dashboards' })
  async getUserDashboards(
    @Param('userId') userId: string,
    @Query('zoneId') zoneId?: string,
  ) {
    const data = await this.dashboardService.getUserDashboards(userId, zoneId);
    return { data };
  }

  @Get('widgets/:widgetId')
  @RequirePermission('reporting.dashboard.list.view')
  @ApiOperation({ summary: 'Get widget data' })
  async getWidgetData(
    @Param('widgetId') widgetId: string,
    @Query('zoneId') zoneId: string,
  ) {
    const data = await this.dashboardService.getWidgetData(widgetId, zoneId);
    return { data };
  }

  @Put(':dashboardId/layout')
  @RequirePermission('reporting.dashboard.list.update')
  @ApiOperation({ summary: 'Update widget layout' })
  async updateLayout(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: UpdateWidgetLayoutDto,
  ) {
    await this.dashboardService.updateWidgetLayout(dashboardId, dto.widgets);
    return { data: { updated: true } };
  }
}
