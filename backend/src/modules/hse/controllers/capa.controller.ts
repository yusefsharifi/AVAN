import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { CapaService } from '../services/capa.service';
import { CreateCapaDto, CompleteCapaDto, VerifyCapaDto, FilterCapaDto } from '../dto/create-dtos';

@ApiTags('HSE - CAPA')
@ApiBearerAuth()
@Controller('/hse/capa')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class CapaController {
  constructor(private readonly capaService: CapaService) {}

  @Post()
  @RequirePermission('hse.capa.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create CAPA' })
  async create(@Body() dto: CreateCapaDto, @CurrentUser('sub') userId: string, @CurrentUser('name') userName: string) {
    return { success: true, data: await this.capaService.create(dto, userId, userName) };
  }

  @Get()
  @RequirePermission('hse.capa.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List CAPAs' })
  async findAll(@Query() filter: FilterCapaDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    return { success: true, ...(await this.capaService.findAll(filter)) };
  }

  @Get('my-actions')
  @RequirePermission('hse.capa.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'My assigned CAPAs' })
  async getMyActions(@CurrentUser('sub') userId: string, @ZoneId() zoneId: string) {
    return { success: true, data: await this.capaService.getMyActions(userId, zoneId) };
  }

  @Get('overdue')
  @RequirePermission('hse.capa.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Overdue CAPAs' })
  async getOverdue(@ZoneId() zoneId: string) {
    return { success: true, data: await this.capaService.getOverdueCAPAs(zoneId) };
  }

  @Get('stats')
  @RequirePermission('hse.capa.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'CAPA statistics' })
  async getStats(@ZoneId() zoneId: string) {
    return { success: true, data: await this.capaService.getCapaStats(zoneId) };
  }

  @Get(':id')
  @RequirePermission('hse.capa.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'CAPA detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.capaService.findById(id) };
  }

  @Post(':id/start')
  @RequirePermission('hse.capa.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Start work' })
  async startWork(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.capaService.startWork(id, userId) };
  }

  @Post(':id/complete')
  @RequirePermission('hse.capa.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Submit completion' })
  async complete(@Param('id') id: string, @Body() dto: CompleteCapaDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.capaService.complete(id, dto, userId) };
  }

  @Post(':id/verify')
  @RequirePermission('hse.capa.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Verify effectiveness' })
  async verify(@Param('id') id: string, @Body() dto: VerifyCapaDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.capaService.verify(id, dto, userId) };
  }

  @Post(':id/cancel')
  @RequirePermission('hse.capa.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cancel CAPA' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.capaService.cancel(id, reason, userId) };
  }
}
