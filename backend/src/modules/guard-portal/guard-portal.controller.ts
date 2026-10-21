import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuardPortalService } from './guard-portal.service';
import {
  ProcessEntryDto,
  ManualOverrideDto,
  AnprEventDto,
  FilterTrafficDto,
  StartShiftDto,
  EndShiftDto,
  CreateGateIncidentDto,
  AddToBlacklistDto,
  ScanQrDto,
} from './dto/process-entry.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Guard Portal')
@Controller('guard')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class GuardPortalController {
  constructor(private readonly guardPortalService: GuardPortalService) {}

  @Post('entry')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Process vehicle entry/exit' })
  async processEntry(
    @Body() dto: ProcessEntryDto,
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.guardPortalService.processEntry(dto, guardId, zoneId);
    return successResponse(result);
  }

  @Post('anpr-event')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Receive ANPR camera event' })
  async processAnprEvent(
    @Body() dto: AnprEventDto,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.guardPortalService.processAnprEvent(dto, zoneId);
    return successResponse(result);
  }

  @Post('qr-scan')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Scan QR code' })
  async scanQr(
    @Body() dto: ScanQrDto,
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.guardPortalService.scanQrCode(dto, guardId, zoneId);
    return successResponse(result);
  }

  @Get('dashboard')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Guard terminal dashboard' })
  async getDashboard(
    @CurrentUser('sub') guardId: string,
    @Query('gateId') gateId: string,
    @ZoneId() zoneId: string,
  ) {
    const dashboard = await this.guardPortalService.getGuardDashboard(guardId, gateId, zoneId);
    return successResponse(dashboard);
  }

  @Get('live-feed')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Live traffic feed' })
  async getLiveFeed(
    @ZoneId() zoneId: string,
    @Query('gateId') gateId?: string,
    @Query('limit') limit?: string,
  ) {
    const feed = await this.guardPortalService.getLiveTrafficFeed(zoneId, gateId, limit ? parseInt(limit) : undefined);
    return successResponse(feed);
  }

  @Post('barrier/:gateId/open')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual barrier open' })
  async openBarrier(
    @Param('gateId') gateId: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') guardId: string,
  ) {
    await this.guardPortalService.openBarrier(gateId, reason, guardId);
    return successResponse({ message: 'راهبند باز شد' });
  }

  @Post('barrier/:gateId/close')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manual barrier close' })
  async closeBarrier(
    @Param('gateId') gateId: string,
    @CurrentUser('sub') guardId: string,
  ) {
    await this.guardPortalService.closeBarrier(gateId, guardId);
    return successResponse({ message: 'راهبند بسته شد' });
  }

  @Get('barrier/:gateId/status')
  @RequirePermission('guard-portal.guard.portal.view')
  @ApiOperation({ summary: 'Barrier status' })
  async getBarrierStatus(@Param('gateId') gateId: string) {
    const status = await this.guardPortalService.getBarrierStatus(gateId);
    return successResponse(status);
  }

  @Post('override')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Manual override' })
  async manualOverride(
    @Body() dto: ManualOverrideDto,
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.guardPortalService.manualOverride(dto, guardId, zoneId);
    return successResponse(result);
  }

  @Post('incidents')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Report gate incident' })
  async reportIncident(
    @Body() dto: CreateGateIncidentDto,
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
  ) {
    const incident = await this.guardPortalService.reportIncident(dto, guardId, zoneId);
    return successResponse(incident);
  }

  @Patch('incidents/:id/resolve')
  @RequirePermission('guard-portal.guard.portal.update')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Resolve incident' })
  async resolveIncident(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
    @CurrentUser('sub') resolvedBy: string,
  ) {
    const incident = await this.guardPortalService.resolveIncident(id, resolution, resolvedBy);
    return successResponse(incident);
  }

  @Get('incidents')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'List incidents' })
  async getIncidents(
    @ZoneId() zoneId: string,
    @Query() filter: FilterTrafficDto,
  ) {
    const result = await this.guardPortalService.getIncidents(zoneId, filter);
    return successResponse(result.data, result.meta);
  }

  @Post('shifts/start')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: 'Start guard shift' })
  async startShift(
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
    @Body() dto: StartShiftDto,
  ) {
    const shift = await this.guardPortalService.startShift(guardId, zoneId, dto);
    return successResponse(shift);
  }

  @Post('shifts/:id/end')
  @RequirePermission('guard-portal.guard.portal.create')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: 'End guard shift' })
  async endShift(
    @Param('id') id: string,
    @CurrentUser('sub') guardId: string,
    @Body() dto: EndShiftDto,
  ) {
    const shift = await this.guardPortalService.endShift(id, guardId, dto);
    return successResponse(shift);
  }

  @Get('shifts/active')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: 'Get active shift' })
  async getActiveShift(
    @CurrentUser('sub') guardId: string,
    @ZoneId() zoneId: string,
  ) {
    const shift = await this.guardPortalService.getActiveShift(guardId, zoneId);
    return successResponse(shift);
  }

  @Get('shifts')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Shift history' })
  async getShiftHistory(@Query('gateId') gateId: string) {
    const history = await this.guardPortalService.getShiftHistory(gateId);
    return successResponse(history);
  }

  @Get('vehicles-inside')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Vehicles currently inside' })
  async getVehiclesInside(@ZoneId() zoneId: string) {
    const vehicles = await this.guardPortalService.getVehiclesCurrentlyInside(zoneId);
    return successResponse(vehicles);
  }

  @Get('overstay-alerts')
  @RequirePermission('guard-portal.guard.portal.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Overstay alerts' })
  async getOverstayAlerts(@ZoneId() zoneId: string) {
    const alerts = await this.guardPortalService.getOverstayAlerts(zoneId);
    return successResponse(alerts);
  }
}
