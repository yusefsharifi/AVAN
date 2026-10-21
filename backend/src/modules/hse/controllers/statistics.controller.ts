import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { SafetyStatisticsService } from '../services/safety-statistics.service';

@ApiTags('HSE - Statistics')
@ApiBearerAuth()
@Controller('/hse/statistics')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class StatisticsController {
  constructor(private readonly statsService: SafetyStatisticsService) {}

  @Get('dashboard')
  @RequirePermission('hse.statistics.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'HSE dashboard' })
  async getDashboard(@ZoneId() zoneId: string) {
    return { success: true, data: await this.statsService.getHseDashboard(zoneId) };
  }

  @Get('trir')
  @RequirePermission('hse.statistics.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'TRIR calculation' })
  async getTRIR(@ZoneId() zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return { success: true, data: { trir: await this.statsService.computeTRIR(zoneId, fromDate, toDate) } };
  }

  @Get('ltifr')
  @RequirePermission('hse.statistics.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'LTIFR calculation' })
  async getLTIFR(@ZoneId() zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return { success: true, data: { ltifr: await this.statsService.computeLTIFR(zoneId, fromDate, toDate) } };
  }

  @Get('days-since-incident')
  @RequirePermission('hse.statistics.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Days without incident' })
  async getDaysSince(@ZoneId() zoneId: string, @Query('severity') severity?: string) {
    return { success: true, data: { days: await this.statsService.getDaysSinceLastIncident(zoneId, severity) } };
  }

  @Get('company/:companyId')
  @RequirePermission('hse.statistics.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Company HSE profile' })
  async getCompanyProfile(@Param('companyId') companyId: string, @ZoneId() zoneId: string) {
    return { success: true, data: await this.statsService.getCompanyHseProfile(companyId, zoneId) };
  }
}
