import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ItemService } from '../services/item.service';
import { CreateItemDto, FilterItemsDto } from '../dto/create-dtos';

@Controller('/inventory/items')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @RequirePermission('inventory.item.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreateItemDto, @CurrentUser('sub') userId: string) { return { data: await this.itemService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterItemsDto) { return this.itemService.findAll(filter); }

  @Get('low-stock')
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async getLowStock(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) { return { data: await this.itemService.getLowStockItems(zoneId, companyId) }; }

  @Get('expiring')
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async getExpiring(@Query('zoneId') zoneId: string, @Query('withinDays') withinDays: number) { return { data: await this.itemService.getExpiringItems(zoneId, withinDays || 30) }; }

  @Get('valuation')
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async getValuation(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) { return { data: await this.itemService.getInventoryValuation(zoneId, companyId) }; }

  @Get(':id')
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.itemService.findById(id) }; }

  @Patch(':id')
  @RequirePermission('inventory.item.list.update')
  @Roles('COMPANY_MANAGER')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateItemDto>, @CurrentUser('sub') userId: string) { return { data: await this.itemService.update(id, dto, userId) }; }

  @Get(':id/stock')
  @RequirePermission('inventory.item.list.view')
  @Roles('COMPANY_STAFF')
  async getStockLevel(@Param('id') id: string, @Query('warehouseId') warehouseId?: string) { return { data: await this.itemService.getStockLevel(id, warehouseId) }; }
}
