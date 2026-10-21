import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { StockService } from '../services/stock.service';
import { AdjustStockDto, TransferStockDto } from '../dto/create-dtos';

@Controller('/inventory/stock')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @RequirePermission('inventory.stock.list.view')
  @Roles('COMPANY_STAFF')
  async getStock(@Query('warehouseId') warehouseId: string, @Query('itemId') itemId?: string) { return { data: await this.stockService.getStock(warehouseId, itemId) }; }

  @Get('transactions')
  @RequirePermission('inventory.stock.list.view')
  @Roles('COMPANY_STAFF')
  async getTransactions(@Query('itemId') itemId: string, @Query('warehouseId') warehouseId?: string) { return { data: await this.stockService.getTransactionHistory(itemId, undefined, undefined, warehouseId) }; }

  @Post('adjust')
  @RequirePermission('inventory.stock.list.create')
  @Roles('COMPANY_MANAGER')
  async adjust(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: string) { return { data: await this.stockService.adjustStock(dto, userId) }; }

  @Post('transfer')
  @RequirePermission('inventory.stock.list.create')
  @Roles('COMPANY_MANAGER')
  async transfer(@Body() dto: TransferStockDto, @CurrentUser('sub') userId: string) { return { data: await this.stockService.transferStock(dto.itemId, dto.fromWarehouseId, dto.toWarehouseId, dto.quantity, userId, dto.fromLocationId, dto.toLocationId) }; }

  @Post('check-availability')
  @RequirePermission('inventory.stock.list.create')
  @Roles('COMPANY_STAFF')
  async checkAvailability(@Body() body: { itemId: string; requiredQty: number; warehouseId?: string }) { return { data: await this.stockService.checkAvailability(body.itemId, body.requiredQty, body.warehouseId) }; }
}
