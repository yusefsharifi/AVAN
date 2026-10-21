import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M18: Reporting & BI — Report Schedule Controller
import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ReportSchedulerService } from '../services/report-scheduler.service';
import { CreateReportScheduleDto } from '../dto/create-dtos';

@ApiTags('Report Schedules')
@ApiBearerAuth()
@Controller('/reports/schedules')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ScheduleController {
  constructor(private readonly schedulerService: ReportSchedulerService) {}

  @Post()
  @RequirePermission('reporting.schedule.list.create')
  @ApiOperation({ summary: 'Create a report schedule' })
  async create(@Body() dto: CreateReportScheduleDto, @Req() req: any) {
    const data = await this.schedulerService.createSchedule(dto, req.user.id);
    return { data };
  }

  @Get()
  @RequirePermission('reporting.schedule.list.view')
  @ApiOperation({ summary: 'List report schedules' })
  async findAll(@Query('reportCode') reportCode?: string) {
    const data = await this.schedulerService.getSchedules(reportCode);
    return { data };
  }

  @Post(':scheduleId/pause')
  @RequirePermission('reporting.schedule.list.create')
  @ApiOperation({ summary: 'Pause a schedule' })
  async pause(@Param('scheduleId') scheduleId: string) {
    const data = await this.schedulerService.pauseSchedule(scheduleId);
    return { data };
  }

  @Post(':scheduleId/resume')
  @RequirePermission('reporting.schedule.list.create')
  @ApiOperation({ summary: 'Resume a schedule' })
  async resume(@Param('scheduleId') scheduleId: string) {
    const data = await this.schedulerService.resumeSchedule(scheduleId);
    return { data };
  }

  @Post(':scheduleId/execute')
  @RequirePermission('reporting.schedule.list.create')
  @ApiOperation({ summary: 'Manually execute a schedule' })
  async execute(@Param('scheduleId') scheduleId: string) {
    await this.schedulerService.executeSchedule(scheduleId);
    return { data: { executed: true } };
  }

  @Delete(':scheduleId')
  @RequirePermission('reporting.schedule.list.delete')
  @ApiOperation({ summary: 'Delete a schedule' })
  async delete(@Param('scheduleId') scheduleId: string) {
    await this.schedulerService.deleteSchedule(scheduleId);
    return { data: { deleted: true } };
  }
}
