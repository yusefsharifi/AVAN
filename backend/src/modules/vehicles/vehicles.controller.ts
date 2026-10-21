import { RequirePermission } from '../../common/decorators/permissions.decorator';
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, IssuePermitDto } from './dto/create-vehicle.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermission('vehicles.vehicles.list.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register vehicle' })
  async register(
    @Body() dto: CreateVehicleDto,
    @CurrentUser('sub') registeredBy: string,
    @ZoneId() zoneId: string,
  ) {
    if (!dto.zoneId) dto.zoneId = zoneId;
    const vehicle = await this.vehiclesService.register(dto, registeredBy);
    return successResponse(vehicle);
  }

  @Get()
  @RequirePermission('vehicles.vehicles.list.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'List vehicles' })
  async findAll(
    @ZoneId() zoneId: string,
    @Query('plate') plate?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    const vehicles = await this.vehiclesService.findAll(zoneId, { plate, companyId, status });
    return successResponse(vehicles);
  }

  @Get('lookup/:plate')
  @RequirePermission('vehicles.vehicles.list.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Quick plate lookup' })
  async lookupVehicle(@Param('plate') plate: string, @ZoneId() zoneId: string) {
    const result = await this.vehiclesService.lookupVehicle(plate, zoneId);
    return successResponse(result);
  }

  @Get(':id')
  @RequirePermission('vehicles.vehicles.list.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Vehicle detail' })
  async findOne(@Param('id') id: string) {
    const vehicle = await this.vehiclesService.findById(id);
    return successResponse(vehicle);
  }

  @Patch(':id')
  @RequirePermission('vehicles.vehicles.list.update')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update vehicle' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>) {
    const vehicle = await this.vehiclesService.update(id, dto);
    return successResponse(vehicle);
  }

  @Delete(':id')
  @RequirePermission('vehicles.vehicles.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete vehicle' })
  async remove(@Param('id') id: string) {
    await this.vehiclesService.softDelete(id);
    return successResponse({ message: 'خودرو حذف شد' });
  }

  @Post(':id/permits')
  @RequirePermission('vehicles.vehicles.list.create')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Issue permit' })
  async issuePermit(
    @Param('id') id: string,
    @Body() dto: IssuePermitDto,
    @CurrentUser('sub') issuedBy: string,
  ) {
    const permit = await this.vehiclesService.issuePermit(id, dto, issuedBy);
    return successResponse(permit);
  }

  @Patch(':id/permits/:pid/revoke')
  @RequirePermission('vehicles.vehicles.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke permit' })
  async revokePermit(
    @Param('pid') pid: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') revokedBy: string,
  ) {
    await this.vehiclesService.revokePermit(pid, reason, revokedBy);
    return successResponse({ message: 'مجوز لغو شد' });
  }

  @Get(':id/permits')
  @RequirePermission('vehicles.vehicles.list.view')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'List permits' })
  async getPermits(@Param('id') id: string) {
    const permits = await this.vehiclesService.getPermits(id);
    return successResponse(permits);
  }

  @Get(':id/history')
  @RequirePermission('vehicles.vehicles.list.view')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER)
  @ApiOperation({ summary: 'Traffic history' })
  async getHistory(@Param('id') id: string) {
    const history = await this.vehiclesService.getTrafficHistory(id);
    return successResponse(history);
  }
}
