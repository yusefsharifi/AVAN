import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { SparePartService } from '../services/spare-part.service';
import { CreateSparePartDto, StockMovementDto, LinkAssetDto, FilterSparePartsDto } from '../dto/create-dtos';

@ApiTags('CMMS - Spare Parts')
@ApiBearerAuth()
@Controller('/cmms/spare-parts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class SparePartController {
  constructor(private readonly sparePartService: SparePartService) {}

  @Post()
  @RequirePermission('cmms.spare-part.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add spare part' })
  async create(@Body() dto: CreateSparePartDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.sparePartService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List spare parts' })
  async findAll(@ZoneId() zoneId: string, @Query() filter: FilterSparePartsDto) {
    return { success: true, ...(await this.sparePartService.findAll(zoneId, filter)) };
  }

  @Get('low-stock')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Low stock alerts' })
  async getLowStock(@ZoneId() zoneId: string) {
    return { success: true, data: await this.sparePartService.getLowStockParts(zoneId) };
  }

  @Get('reorder-alerts')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reorder recommendations' })
  async getReorderAlerts(@ZoneId() zoneId: string) {
    return { success: true, data: await this.sparePartService.getReorderAlerts(zoneId) };
  }

  @Get('inventory-value')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Inventory valuation' })
  async getInventoryValue(@ZoneId() zoneId: string) {
    return { success: true, data: await this.sparePartService.getInventoryValue(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Spare part detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.sparePartService.findById(id) };
  }

  @Get(':id/movements')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Stock movement history' })
  async getMovements(@Param('id') id: string, @Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return { success: true, data: await this.sparePartService.getStockMovementHistory(id, fromDate, toDate) };
  }

  @Patch(':id')
  @RequirePermission('cmms.spare-part.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update spare part' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSparePartDto>) {
    return { success: true, data: await this.sparePartService.update(id, dto) };
  }

  @Post(':id/movement')
  @RequirePermission('cmms.spare-part.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record stock movement' })
  async recordMovement(@Param('id') id: string, @Body() dto: StockMovementDto, @CurrentUser('sub') userId: string) {
    dto.sparePartId = id;
    return { success: true, data: await this.sparePartService.recordMovement(dto, userId) };
  }

  @Post(':id/link-asset')
  @RequirePermission('cmms.spare-part.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Link to asset' })
  async linkToAsset(@Param('id') id: string, @Body() dto: LinkAssetDto) {
    dto.sparePartId = id;
    return { success: true, data: await this.sparePartService.linkToAsset(dto) };
  }

  @Get(':id/availability')
  @RequirePermission('cmms.spare-part.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check availability' })
  async checkAvailability(@Param('id') id: string, @Query('qty') qty: number) {
    return { success: true, data: await this.sparePartService.checkAvailability(id, qty) };
  }
}
