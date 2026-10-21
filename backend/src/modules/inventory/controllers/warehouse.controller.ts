import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto, CreateLocationDto } from '../dto/create-dtos';

@Controller('/inventory/warehouses')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @RequirePermission('inventory.warehouse.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser('sub') userId: string) { return { data: await this.warehouseService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.warehouse.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) { return { data: await this.warehouseService.findAll(zoneId, companyId) }; }

  @Get(':id')
  @RequirePermission('inventory.warehouse.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.warehouseService.findById(id) }; }

  @Patch(':id')
  @RequirePermission('inventory.warehouse.list.update')
  @Roles('COMPANY_MANAGER')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWarehouseDto>) { return { data: await this.warehouseService.update(id, dto) }; }

  @Get(':id/capacity')
  @RequirePermission('inventory.warehouse.list.view')
  @Roles('COMPANY_STAFF')
  async getCapacity(@Param('id') id: string) { return { data: await this.warehouseService.getWarehouseCapacity(id) }; }

  @Get(':id/locations')
  @RequirePermission('inventory.warehouse.list.view')
  @Roles('COMPANY_STAFF')
  async getLocations(@Param('id') id: string) { return { data: await this.warehouseService.getLocations(id) }; }

  @Post(':id/locations')
  @RequirePermission('inventory.warehouse.list.create')
  @Roles('COMPANY_MANAGER')
  async createLocation(@Param('id') id: string, @Body() dto: CreateLocationDto) { return { data: await this.warehouseService.createLocation(id, dto) }; }
}
