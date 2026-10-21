import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AttendanceService } from '../services/attendance.service';
import { ClockInDto, ManualAttendanceDto, FilterAttendanceDto } from '../dto/create-dtos';

@Controller('/hr/attendance')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @RequirePermission('hr.attendance.list.create')
  @Roles('COMPANY_STAFF')
  async clockIn(@Body() dto: ClockInDto, @Query('zoneId') zoneId: string) {
    const data = await this.attendanceService.clockIn(dto, zoneId);
    return { data };
  }

  @Post('clock-out')
  @RequirePermission('hr.attendance.list.create')
  @Roles('COMPANY_STAFF')
  async clockOut(@Body() dto: ClockInDto, @Query('zoneId') zoneId: string) {
    const data = await this.attendanceService.clockOut(dto, zoneId);
    return { data };
  }

  @Post('manual')
  @RequirePermission('hr.attendance.list.create')
  @Roles('COMPANY_MANAGER')
  async recordManual(@Body() dto: ManualAttendanceDto, @CurrentUser('sub') userId: string) {
    const data = await this.attendanceService.recordManual(dto, userId);
    return { data };
  }

  @Post(':id/approve')
  @RequirePermission('hr.attendance.list.create')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.attendanceService.approve(id, userId);
    return { data };
  }

  @Get('team')
  @RequirePermission('hr.attendance.list.view')
  @Roles('COMPANY_MANAGER')
  async getTeamAttendance(@Query('companyId') companyId: string, @Query('workDate') workDate: string) {
    const data = await this.attendanceService.getTeamAttendance(companyId, workDate);
    return { data };
  }

  @Get('employee/:eid')
  @RequirePermission('hr.attendance.list.view')
  @Roles('COMPANY_STAFF')
  async getMonthlyAttendance(
    @Param('eid') employeeId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    const data = await this.attendanceService.getMonthlyAttendance(employeeId, year, month);
    return { data };
  }

  @Get('employee/:eid/summary')
  @RequirePermission('hr.attendance.list.view')
  @Roles('COMPANY_STAFF')
  async getAttendanceSummary(
    @Param('eid') employeeId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.attendanceService.getAttendanceSummary(employeeId, fromDate, toDate);
    return { data };
  }

  @Get()
  @RequirePermission('hr.attendance.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterAttendanceDto) {
    const data = await this.attendanceService.findAll(filter);
    return data;
  }
}
