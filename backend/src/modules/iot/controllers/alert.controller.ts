import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — Alert Controller
import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DeviceHealthMonitorService } from '../services/device-health-monitor.service';
import { FilterAlertsDto } from '../dto/create-dtos';

@Controller('/iot/alerts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AlertController {
  constructor(private readonly healthService: DeviceHealthMonitorService) {}

  @Get()
  @RequirePermission('iot.alerts.list.view')
  @Roles('COMPANY_STAFF')
  async getAlerts(@Query() filter: FilterAlertsDto, @Query('zoneId') zoneId: string) {
    return this.healthService.getAlerts(zoneId, filter);
  }

  @Get('active')
  @RequirePermission('iot.alerts.list.view')
  @Roles('COMPANY_STAFF')
  async getActiveAlerts(@Query('zoneId') zoneId: string) {
    return this.healthService.getAlerts(zoneId, { isResolved: false });
  }

  @Post(':id/resolve')
  @RequirePermission('iot.alerts.list.create')
  @Roles('ZONE_OPERATOR')
  async resolve(@Param('id') id: string, @Body('resolution') resolution: string, @CurrentUser('sub') userId: string) {
    return this.healthService.resolveAlert(id, userId, resolution);
  }
}
