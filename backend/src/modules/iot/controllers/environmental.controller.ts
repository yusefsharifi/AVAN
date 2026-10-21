import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — Environmental Controller
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EnvironmentalSensorService } from '../services/environmental-sensor.service';

@Controller('/iot/environmental')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class EnvironmentalController {
  constructor(private readonly envService: EnvironmentalSensorService) {}

  @Get('current')
  @RequirePermission('iot.environmental.list.view')
  @Roles('COMPANY_STAFF')
  async getCurrentReadings(@Query('zoneId') zoneId: string) {
    return this.envService.getCurrentReadings(zoneId);
  }

  @Get('aqi')
  @RequirePermission('iot.environmental.list.view')
  @Roles('COMPANY_STAFF')
  async getAirQuality(@Query('zoneId') zoneId: string) {
    return this.envService.getAirQualityIndex(zoneId);
  }

  @Get(':deviceId/history')
  @RequirePermission('iot.environmental.list.view')
  @Roles('COMPANY_STAFF')
  async getHistory(@Param('deviceId') deviceId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string, @Query('interval') interval: string) {
    return this.envService.getReadingHistory(deviceId, fromDate, toDate, interval);
  }
}
