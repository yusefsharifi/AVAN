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
import { MaintenancePlanService } from '../services/maintenance-plan.service';
import { CreateMaintenancePlanDto } from '../dto/create-dtos';

@ApiTags('CMMS - Maintenance Plans')
@ApiBearerAuth()
@Controller('/cmms/maintenance-plans')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class MaintenancePlanController {
  constructor(private readonly planService: MaintenancePlanService) {}

  @Post()
  @RequirePermission('cmms.maintenance-plan.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create maintenance plan' })
  async create(@Body() dto: CreateMaintenancePlanDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.planService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.maintenance-plan.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List maintenance plans' })
  async findAll(@ZoneId() zoneId: string, @Query('limit') limit?: number, @Query('cursor') cursor?: string) {
    return { success: true, ...(await this.planService.findAll(zoneId, limit, cursor)) };
  }

  @Get('upcoming')
  @RequirePermission('cmms.maintenance-plan.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Upcoming maintenance' })
  async getUpcoming(@ZoneId() zoneId: string, @Query('withinDays') withinDays?: number) {
    return { success: true, data: await this.planService.getUpcomingMaintenance(zoneId, withinDays || 30) };
  }

  @Get('calendar')
  @RequirePermission('cmms.maintenance-plan.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Maintenance calendar' })
  async getCalendar(@ZoneId() zoneId: string, @Query('month') month?: number, @Query('year') year?: number) {
    const now = new Date();
    return { success: true, data: await this.planService.getMaintenanceCalendar(zoneId, month || now.getMonth() + 1, year || now.getFullYear()) };
  }

  @Get('stats')
  @RequirePermission('cmms.maintenance-plan.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Maintenance statistics' })
  async getStats(@ZoneId() zoneId: string) {
    return { success: true, data: await this.planService.getMaintenanceStats(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.maintenance-plan.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Plan detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.planService.findById(id) };
  }

  @Patch(':id')
  @RequirePermission('cmms.maintenance-plan.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update plan' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateMaintenancePlanDto>) {
    return { success: true, data: await this.planService.update(id, dto) };
  }

  @Post(':id/activate')
  @RequirePermission('cmms.maintenance-plan.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Activate plan' })
  async activate(@Param('id') id: string) {
    return { success: true, data: await this.planService.activate(id) };
  }

  @Post(':id/deactivate')
  @RequirePermission('cmms.maintenance-plan.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate plan' })
  async deactivate(@Param('id') id: string) {
    return { success: true, data: await this.planService.deactivate(id) };
  }

  @Post(':id/generate-work-order')
  @RequirePermission('cmms.maintenance-plan.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate work order from plan' })
  async generateWorkOrder(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.planService.generateWorkOrder(id, userId) };
  }
}
