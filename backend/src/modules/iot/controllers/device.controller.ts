import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M20: IoT & Device Integration — Device Controller
import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DeviceManagementService } from '../services/device-management.service';
import { CreateIoTDeviceDto, SendDeviceCommandDto, FilterDevicesDto } from '../dto/create-dtos';
import { successResponse } from '../../../common/dto/response.dto';

// Task 4: GET /map returned a bare array — one of only three routes (with
// /physical-archive/*) that forced client.ts to fall back to the raw body.
@Controller('/iot/devices')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceManagementService) {}

  @Post()
  @RequirePermission('iot.devices.list.create')
  @Roles('ZONE_MANAGER')
  async register(@Body() dto: CreateIoTDeviceDto, @CurrentUser('sub') userId: string) {
    return this.deviceService.register(dto, userId);
  }

  @Get()
  @RequirePermission('iot.devices.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterDevicesDto) {
    return this.deviceService.findAll(filter);
  }

  @Get('dashboard')
  @RequirePermission('iot.devices.list.view')
  @Roles('COMPANY_STAFF')
  async getDashboard(@Query('zoneId') zoneId: string) {
    return this.deviceService.getDashboard(zoneId);
  }

  @Get('map')
  @RequirePermission('iot.devices.list.view')
  @Roles('COMPANY_STAFF')
  async getDeviceMap(@Query('zoneId') zoneId: string) {
    return successResponse(await this.deviceService.getZoneDeviceMap(zoneId));
  }

  @Get('topology')
  @RequirePermission('iot.devices.list.view')
  @Roles('ZONE_MANAGER')
  async getTopology(@Query('zoneId') zoneId: string) {
    return this.deviceService.getNetworkTopology(zoneId);
  }

  @Get(':id')
  @RequirePermission('iot.devices.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    return this.deviceService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('iot.devices.list.update')
  @Roles('ZONE_MANAGER')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateIoTDeviceDto>, @CurrentUser('sub') userId: string) {
    return this.deviceService.update(id, dto, userId);
  }

  @Patch(':id/config')
  @RequirePermission('iot.devices.list.update')
  @Roles('ZONE_MANAGER')
  async updateConfig(@Param('id') id: string, @Body('config') config: object, @CurrentUser('sub') userId: string) {
    return this.deviceService.updateConfig(id, config, userId);
  }

  @Post(':id/command')
  @RequirePermission('iot.devices.list.create')
  @Roles('ZONE_MANAGER')
  async sendCommand(@Param('id') id: string, @Body() dto: SendDeviceCommandDto, @CurrentUser('sub') userId: string) {
    return this.deviceService.sendCommand({ ...dto, deviceId: id }, userId);
  }

  @Post(':id/restart')
  @RequirePermission('iot.devices.list.create')
  @Roles('ZONE_MANAGER')
  async restart(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.deviceService.restartDevice(id, userId);
  }

  @Post(':id/decommission')
  @RequirePermission('iot.devices.list.create')
  @Roles('ZONE_MANAGER')
  async decommission(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return this.deviceService.decommission(id, reason, userId);
  }

  @Post(':id/rotate-credentials')
  @RequirePermission('iot.devices.list.create')
  @Roles('ZONE_MANAGER')
  async rotateCredentials(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.deviceService.rotateMqttCredentials(id, userId);
  }

  @Get(':id/health')
  @RequirePermission('iot.devices.list.view')
  @Roles('COMPANY_STAFF')
  async getHealth(@Param('id') id: string) {
    return this.deviceService.getDeviceHealth(id);
  }
}
