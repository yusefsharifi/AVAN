import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { EnvironmentalService } from '../services/environmental.service';
import { RecordEnvironmentalMeasurementDto } from '../dto/create-dtos';

@ApiTags('HSE - Environmental')
@ApiBearerAuth()
@Controller('/hse/environmental')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class EnvironmentalController {
  constructor(private readonly envService: EnvironmentalService) {}

  @Post('measurements')
  @RequirePermission('hse.environmental.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record measurement' })
  async recordMeasurement(@Body() dto: RecordEnvironmentalMeasurementDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.envService.recordMeasurement(dto, userId) };
  }

  @Get('measurements')
  @RequirePermission('hse.environmental.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List measurements' })
  async getMeasurements(@ZoneId() zoneId: string, @Query('type') type: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return { success: true, data: await this.envService.getEnvironmentalReport(zoneId, type, fromDate, toDate) };
  }

  @Get('compliance')
  @RequirePermission('hse.environmental.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Compliance summary' })
  async getCompliance(@ZoneId() zoneId: string, @Query('companyId') companyId?: string) {
    return { success: true, data: await this.envService.getComplianceSummary(zoneId, companyId) };
  }
}
