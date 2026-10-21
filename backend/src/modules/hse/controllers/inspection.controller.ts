import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { HseInspectionService } from '../services/hse-inspection.service';
import {
  CreateInspectionDto, SubmitInspectionResultsDto, AddFindingDto, CreateChecklistDto,
} from '../dto/create-dtos';

@ApiTags('HSE - Inspections')
@ApiBearerAuth()
@Controller('/hse/inspections')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class InspectionController {
  constructor(private readonly inspectionService: HseInspectionService) {}

  @Post()
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Schedule inspection' })
  async schedule(@Body() dto: CreateInspectionDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.inspectionService.schedule(dto, userId) };
  }

  @Get()
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List inspections' })
  async findAll(@ZoneId() zoneId: string, @Query('status') status?: string, @Query('cursor') cursor?: string) {
    return { success: true, ...(await this.inspectionService.findAll(zoneId, { status, cursor })) };
  }

  @Get('upcoming')
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Upcoming inspections' })
  async getUpcoming(@ZoneId() zoneId: string, @Query('withinDays') withinDays?: number) {
    return { success: true, data: await this.inspectionService.getUpcomingInspections(zoneId, withinDays || 30) };
  }

  @Get('compliance-trend')
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Compliance trend' })
  async getComplianceTrend(@ZoneId() zoneId: string, @Query('months') months?: number) {
    return { success: true, data: await this.inspectionService.getComplianceTrend(zoneId, months || 12) };
  }

  @Get('checklists')
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List checklists' })
  async getChecklists(@Query('type') type?: string) {
    return { success: true, data: await this.inspectionService.getChecklists(undefined, type) };
  }

  @Get('checklists/:code')
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get checklist by code' })
  async getChecklist(@Param('code') code: string) {
    return { success: true, data: await this.inspectionService.getChecklist(code) };
  }

  @Post('checklists')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create custom checklist' })
  async createChecklist(@Body() dto: CreateChecklistDto) {
    return { success: true, data: await this.inspectionService.createChecklist(dto) };
  }

  @Get(':id')
  @RequirePermission('hse.inspection.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Inspection detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.inspectionService.findById(id) };
  }

  @Post(':id/start')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Start inspection' })
  async start(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.inspectionService.start(id, userId) };
  }

  @Post(':id/results')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Submit results' })
  async submitResults(@Param('id') id: string, @Body() dto: SubmitInspectionResultsDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.inspectionService.submitResults(id, dto, userId) };
  }

  @Post(':id/reschedule')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reschedule' })
  async reschedule(@Param('id') id: string, @Body('newDate') newDate: string) {
    return { success: true, data: await this.inspectionService.reschedule(id, new Date(newDate)) };
  }

  @Post(':id/cancel')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cancel inspection' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return { success: true, data: await this.inspectionService.cancel(id, reason) };
  }

  @Post(':id/findings')
  @RequirePermission('hse.inspection.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add finding' })
  async addFinding(@Param('id') id: string, @Body() dto: AddFindingDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.inspectionService.addFinding(id, dto, userId) };
  }

  @Patch(':id/findings/:fid/resolve')
  @RequirePermission('hse.inspection.list.update')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve finding' })
  async resolveFinding(@Param('fid') fid: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.inspectionService.resolveFinding(fid, userId) };
  }
}
