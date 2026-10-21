import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — Scale Controller
import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ScaleProcessorService } from '../services/scale-processor.service';

@Controller('/iot/scales')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ScaleController {
  constructor(private readonly scaleService: ScaleProcessorService) {}

  @Get(':deviceId/reading')
  @RequirePermission('iot.scales.list.view')
  @Roles('COMPANY_STAFF')
  async getCurrentReading(@Param('deviceId') deviceId: string) {
    return this.scaleService.getCurrentReading(deviceId);
  }

  @Post(':deviceId/tare')
  @RequirePermission('iot.scales.list.create')
  @Roles('ZONE_OPERATOR')
  async tare(@Param('deviceId') deviceId: string, @CurrentUser('sub') userId: string) {
    return this.scaleService.tare(deviceId, userId);
  }

  @Post(':deviceId/zero')
  @RequirePermission('iot.scales.list.create')
  @Roles('ZONE_OPERATOR')
  async zero(@Param('deviceId') deviceId: string, @CurrentUser('sub') userId: string) {
    return this.scaleService.zero(deviceId, userId);
  }

  @Get(':deviceId/history')
  @RequirePermission('iot.scales.list.view')
  @Roles('COMPANY_STAFF')
  async getHistory(@Param('deviceId') deviceId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return this.scaleService.getReadingHistory(deviceId, fromDate, toDate);
  }
}
