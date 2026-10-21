import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — Barrier Controller
import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BarrierControllerService } from '../services/barrier-controller.service';

@Controller('/iot/barriers')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class BarrierController {
  constructor(private readonly barrierService: BarrierControllerService) {}

  @Get(':deviceId/state')
  @RequirePermission('iot.barriers.control.view')
  @Roles('COMPANY_STAFF')
  async getState(@Param('deviceId') deviceId: string) {
    return this.barrierService.getBarrierState(deviceId);
  }

  @Post(':deviceId/open')
  @RequirePermission('iot.barriers.control.create')
  @Roles('ZONE_OPERATOR')
  async open(@Param('deviceId') deviceId: string, @Body('reason') reason: string, @Body('durationSeconds') duration: number, @CurrentUser('sub') userId: string) {
    return this.barrierService.openBarrier(deviceId, reason || 'manual', userId, duration);
  }

  @Post(':deviceId/close')
  @RequirePermission('iot.barriers.control.create')
  @Roles('ZONE_OPERATOR')
  async close(@Param('deviceId') deviceId: string, @CurrentUser('sub') userId: string) {
    return this.barrierService.closeBarrier(deviceId, userId);
  }

  @Post(':deviceId/emergency-stop')
  @RequirePermission('iot.barriers.control.create')
  @Roles('ZONE_MANAGER')
  async emergencyStop(@Param('deviceId') deviceId: string, @CurrentUser('sub') userId: string) {
    return this.barrierService.emergencyStop(deviceId, userId);
  }

  @Post(':deviceId/test')
  @RequirePermission('iot.barriers.control.create')
  @Roles('ZONE_MANAGER')
  async test(@Param('deviceId') deviceId: string) {
    return this.barrierService.testBarrier(deviceId);
  }
}
