import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — GPS Controller
import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GpsTrackingService } from '../services/gps-tracking.service';
import { CreateGeofenceDto } from '../dto/create-dtos';

@Controller('/iot/gps')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class GpsController {
  constructor(private readonly gpsService: GpsTrackingService) {}

  @Get('live')
  @RequirePermission('iot.gps.live.view')
  @Roles('COMPANY_STAFF')
  async getLivePositions(@Query('zoneId') zoneId: string) {
    return this.gpsService.getCurrentPositions(zoneId);
  }

  @Get('vehicle/:deviceId/trail')
  @RequirePermission('iot.gps.live.view')
  @Roles('COMPANY_STAFF')
  async getVehicleTrail(@Param('deviceId') deviceId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return this.gpsService.getVehicleTrail(deviceId, new Date(fromDate), new Date(toDate));
  }

  @Get('violations/speed')
  @RequirePermission('iot.gps.live.view')
  @Roles('COMPANY_STAFF')
  async getSpeedViolations(@Query('zoneId') zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return this.gpsService.getSpeedViolations(zoneId, fromDate, toDate);
  }

  @Get('violations/idle')
  @RequirePermission('iot.gps.live.view')
  @Roles('COMPANY_STAFF')
  async getIdleReport(@Query('zoneId') zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return this.gpsService.getIdleReport(zoneId, fromDate, toDate);
  }

  @Get('geofences')
  @RequirePermission('iot.gps.live.view')
  @Roles('COMPANY_STAFF')
  async getGeofences(@Query('zoneId') zoneId: string) {
    return this.gpsService.getGeofences(zoneId);
  }

  @Post('geofences')
  @RequirePermission('iot.gps.live.create')
  @Roles('ZONE_MANAGER')
  async createGeofence(@Body() dto: CreateGeofenceDto) {
    return this.gpsService.createGeofence(dto);
  }

  @Delete('geofences/:id')
  @RequirePermission('iot.gps.live.delete')
  @Roles('ZONE_MANAGER')
  async deleteGeofence(@Param('id') id: string) {
    return this.gpsService.deleteGeofence(id);
  }
}
