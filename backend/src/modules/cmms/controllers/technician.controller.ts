import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { TechnicianService } from '../services/technician.service';
import { CreateTechnicianDto } from '../dto/create-dtos';

@ApiTags('CMMS - Technicians')
@ApiBearerAuth()
@Controller('/cmms/technicians')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class TechnicianController {
  constructor(private readonly techService: TechnicianService) {}

  @Post()
  @RequirePermission('cmms.technician.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add technician' })
  async create(@Body() dto: CreateTechnicianDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.techService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.technician.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List technicians' })
  async findAll(@ZoneId() zoneId: string) {
    return { success: true, data: await this.techService.findAll(zoneId) };
  }

  @Get('available')
  @RequirePermission('cmms.technician.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Available technicians' })
  async findAvailable(@ZoneId() zoneId: string) {
    return { success: true, data: await this.techService.findAvailable(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.technician.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Technician profile' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.techService.findById(id) };
  }

  @Patch(':id')
  @RequirePermission('cmms.technician.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update technician' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTechnicianDto>, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.techService.update(id, dto) };
  }

  @Patch(':id/availability')
  @RequirePermission('cmms.technician.list.update')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Toggle availability' })
  async toggleAvailability(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.techService.toggleAvailability(id, userId) };
  }
}
