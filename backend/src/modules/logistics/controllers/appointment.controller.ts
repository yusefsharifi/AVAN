import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AppointmentService } from '../services/appointment.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { FilterAppointmentsDto } from '../dto/filter-appointments.dto';
import { ShipmentDirection } from '@prisma/client';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('/appointments')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @RequirePermission('logistics.appointment.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Book a truck appointment' })
  async create(@Body() dto: CreateAppointmentDto, @CurrentUser('sub') userId: string) {
    const data = await this.appointmentService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('logistics.appointment.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List appointments' })
  async findAll(@Query('zoneId') zoneId: string, @Query() filter: FilterAppointmentsDto) {
    const result = await this.appointmentService.findAll(zoneId, filter);
    return { success: true, ...result };
  }

  @Get('available-slots')
  @RequirePermission('logistics.appointment.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get available time slots' })
  async getAvailableSlots(
    @Query('zoneId') zoneId: string,
    @Query('gateId') gateId: string,
    @Query('date') date: string,
    @Query('direction') direction: ShipmentDirection,
  ) {
    const data = await this.appointmentService.getAvailableSlots(zoneId, gateId, date, direction);
    return { success: true, data };
  }

  @Get('daily-schedule')
  @RequirePermission('logistics.appointment.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get daily appointment schedule' })
  async getDailySchedule(
    @Query('zoneId') zoneId: string,
    @Query('date') date: string,
  ) {
    const data = await this.appointmentService.getDailySchedule(zoneId, date);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('logistics.appointment.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get appointment statistics' })
  async getStats(
    @Query('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.appointmentService.getAppointmentStats(zoneId, fromDate, toDate);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('logistics.appointment.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get appointment detail' })
  async findById(@Param('id') id: string) {
    const data = await this.appointmentService.findById(id);
    return { success: true, data };
  }

  @Patch(':id/reschedule')
  @RequirePermission('logistics.appointment.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.appointmentService.reschedule(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission('logistics.appointment.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.appointmentService.cancel(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/mark-arrived')
  @RequirePermission('logistics.appointment.list.create')
  @Roles('GUARD')
  @ApiOperation({ summary: 'Mark truck arrived (gate hook)' })
  async markArrived(
    @Param('id') id: string,
    @Body('trafficLogId') trafficLogId: string,
  ) {
    const data = await this.appointmentService.markArrived(id, trafficLogId);
    return { success: true, data };
  }

  @Post(':id/mark-completed')
  @RequirePermission('logistics.appointment.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Mark appointment completed' })
  async markCompleted(@Param('id') id: string) {
    const data = await this.appointmentService.markCompleted(id);
    return { success: true, data };
  }
}
