import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { HseIncidentService } from '../services/hse-incident.service';
import { ReportIncidentDto, InvestigateIncidentDto, FilterIncidentsDto } from '../dto/create-dtos';

@ApiTags('HSE - Incidents')
@ApiBearerAuth()
@Controller('/hse/incidents')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class IncidentController {
  constructor(private readonly incidentService: HseIncidentService) {}

  @Post()
  @RequirePermission('hse.incident.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Report incident' })
  async report(@Body() dto: ReportIncidentDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.incidentService.report(dto, userId) };
  }

  @Get()
  @RequirePermission('hse.incident.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List incidents' })
  async findAll(@Query() filter: FilterIncidentsDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    return { success: true, ...(await this.incidentService.findAll(filter)) };
  }

  @Get('stats')
  @RequirePermission('hse.incident.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Incident statistics' })
  async getStats(@ZoneId() zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return { success: true, data: await this.incidentService.getIncidentStats(zoneId, fromDate, toDate) };
  }

  @Get(':id')
  @RequirePermission('hse.incident.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Incident detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.incidentService.findById(id) };
  }

  @Post(':id/assign-investigator')
  @RequirePermission('hse.incident.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign investigator' })
  async assignInvestigator(@Param('id') id: string, @Body('investigatorId') investigatorId: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.incidentService.assignInvestigator(id, investigatorId, userId) };
  }

  @Post(':id/investigation')
  @RequirePermission('hse.incident.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Submit investigation' })
  async submitInvestigation(@Param('id') id: string, @Body() dto: InvestigateIncidentDto, @CurrentUser('sub') userId: string) {
    dto.incidentId = id;
    return { success: true, data: await this.incidentService.submitInvestigation(dto, userId) };
  }

  @Post(':id/close')
  @RequirePermission('hse.incident.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Close incident' })
  async close(@Param('id') id: string, @Body('closureNotes') closureNotes: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.incidentService.close(id, userId, closureNotes) };
  }

  @Post(':id/images')
  @RequirePermission('hse.incident.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image' })
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return { success: true, data: { key: await this.incidentService.uploadImage(id, file) } };
  }

  @Post(':id/report-authority')
  @RequirePermission('hse.incident.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Report to authority' })
  async reportToAuthority(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body('refNumber') refNumber?: string) {
    return { success: true, data: await this.incidentService.reportToAuthority(id, userId, refNumber) };
  }
}
