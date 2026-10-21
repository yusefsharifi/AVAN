import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LeaveService } from '../services/leave.service';
import { RequestLeaveDto, ApproveLeaveDto, FilterLeavesDto } from '../dto/create-dtos';

@Controller('/hr/leaves')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @RequirePermission('hr.leave.list.create')
  @Roles('COMPANY_STAFF')
  async requestLeave(@Body() dto: RequestLeaveDto, @CurrentUser('sub') userId: string) {
    const data = await this.leaveService.request(dto, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.leave.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterLeavesDto) {
    const data = await this.leaveService.findAll(filter);
    return data;
  }

  @Get('pending')
  @RequirePermission('hr.leave.list.view')
  @Roles('COMPANY_MANAGER')
  async getPendingApprovals(@Query('managerId') managerId: string, @Query('zoneId') zoneId: string) {
    const data = await this.leaveService.getPendingApprovals(managerId, zoneId);
    return { data };
  }

  @Get('calendar')
  @RequirePermission('hr.leave.list.view')
  @Roles('COMPANY_STAFF')
  async getCalendar(
    @Query('companyId') companyId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    const data = await this.leaveService.getLeaveCalendar(companyId, year, month);
    return { data };
  }

  @Get('stats')
  @RequirePermission('hr.leave.list.view')
  @Roles('COMPANY_STAFF')
  async getStats(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    const data = await this.leaveService.getLeaveStats(zoneId, companyId);
    return { data };
  }

  @Get(':id')
  @RequirePermission('hr.leave.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    const data = await this.leaveService.findById(id);
    return { data };
  }

  @Patch(':id/approve')
  @RequirePermission('hr.leave.list.update')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @Body() dto: ApproveLeaveDto, @CurrentUser('sub') userId: string) {
    const data = await this.leaveService.approve(id, dto, userId);
    return { data };
  }

  @Post(':id/cancel')
  @RequirePermission('hr.leave.list.create')
  @Roles('COMPANY_STAFF')
  async cancel(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.leaveService.cancel(id, userId);
    return { data };
  }
}
