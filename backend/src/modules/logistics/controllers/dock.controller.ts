import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DockService } from '../services/dock.service';
import { CreateDockDto } from '../dto/create-dock.dto';
import { UpdateDockDto } from '../dto/update-dock.dto';
import { VehicleType } from '@prisma/client';

@ApiTags('Docks')
@ApiBearerAuth()
@Controller('/docks')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class DockController {
  constructor(private readonly dockService: DockService) {}

  @Post()
  @RequirePermission('logistics.dock.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create a dock' })
  async create(@Query('zoneId') zoneId: string, @Body() dto: CreateDockDto) {
    const data = await this.dockService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('logistics.dock.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List docks' })
  async findAll(
    @Query('zoneId') zoneId: string,
    @Query('companyId') companyId?: string,
  ) {
    const data = await this.dockService.findAll(zoneId, companyId);
    return { success: true, data };
  }

  @Get('available')
  @RequirePermission('logistics.dock.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Find available docks by vehicle type' })
  async findAvailable(
    @Query('zoneId') zoneId: string,
    @Query('vehicleType') vehicleType: VehicleType,
  ) {
    const data = await this.dockService.findAvailable(zoneId, vehicleType);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('logistics.dock.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get dock detail' })
  async findById(@Param('id') id: string) {
    const data = await this.dockService['prisma'].dock.findUnique({ where: { id } });
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('logistics.dock.list.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update dock' })
  async update(@Param('id') id: string, @Body() dto: UpdateDockDto) {
    const data = await this.dockService.update(id, dto);
    return { success: true, data };
  }

  @Patch(':id/availability')
  @RequirePermission('logistics.dock.list.update')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Toggle dock availability' })
  async setAvailability(
    @Param('id') id: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    const data = await this.dockService.setAvailability(id, isAvailable);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('logistics.dock.list.delete')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Delete dock' })
  async delete(@Param('id') id: string) {
    await this.dockService.delete(id);
    return { success: true };
  }
}
