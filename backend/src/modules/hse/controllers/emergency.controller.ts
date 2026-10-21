import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { EmergencyResponseService } from '../services/emergency-response.service';
import { CreateEmergencyContactDto, ScheduleDrillDto, RecordDrillDto } from '../dto/create-dtos';

@ApiTags('HSE - Emergency')
@ApiBearerAuth()
@Controller('/hse/emergency')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyResponseService) {}

  @Get('contacts')
  @RequirePermission('hse.emergency.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Emergency contacts' })
  async getContacts(@ZoneId() zoneId: string) {
    return { success: true, data: await this.emergencyService.getContacts(zoneId) };
  }

  @Post('contacts')
  @RequirePermission('hse.emergency.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add contact' })
  async addContact(@ZoneId() zoneId: string, @Body() dto: CreateEmergencyContactDto) {
    dto.zoneId = zoneId;
    return { success: true, data: await this.emergencyService.addContact(zoneId, dto) };
  }

  @Patch('contacts/:id')
  @RequirePermission('hse.emergency.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update contact' })
  async updateContact(@Param('id') id: string, @Body() dto: Partial<CreateEmergencyContactDto>) {
    return { success: true, data: await this.emergencyService.updateContact(id, dto) };
  }

  @Delete('contacts/:id')
  @RequirePermission('hse.emergency.list.delete')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove contact' })
  async deleteContact(@Param('id') id: string) {
    await this.emergencyService.deleteContact(id);
    return { success: true };
  }

  @Post('alert')
  @RequirePermission('hse.emergency.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Trigger emergency alert' })
  async triggerAlert(@ZoneId() zoneId: string, @Body('type') type: string, @Body('location') location: string, @Body('details') details: string, @CurrentUser('sub') userId: string) {
    await this.emergencyService.triggerEmergencyAlert(zoneId, type, location, details, userId);
    return { success: true };
  }

  @Get('drills')
  @RequirePermission('hse.emergency.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Drill history' })
  async getDrills(@ZoneId() zoneId: string) {
    return { success: true, data: await this.emergencyService.getDrills(zoneId) };
  }

  @Post('drills')
  @RequirePermission('hse.emergency.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Schedule drill' })
  async scheduleDrill(@Body() dto: ScheduleDrillDto) {
    return { success: true, data: await this.emergencyService.scheduleDrill(dto) };
  }

  @Patch('drills/:id/results')
  @RequirePermission('hse.emergency.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record drill results' })
  async recordDrillResults(@Param('id') id: string, @Body() dto: RecordDrillDto) {
    return { success: true, data: await this.emergencyService.recordDrillResults(id, dto) };
  }
}
