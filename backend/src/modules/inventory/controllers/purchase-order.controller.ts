import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { CreatePurchaseOrderDto } from '../dto/create-dtos';

@Controller('/inventory/purchase-orders')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @RequirePermission('inventory.purchase-order.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser('sub') userId: string) { return { data: await this.poService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.purchase-order.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('zoneId') zoneId: string, @Query() filter: any) { return this.poService.findAll(zoneId, filter); }

  @Get('stats')
  @RequirePermission('inventory.purchase-order.list.view')
  @Roles('COMPANY_STAFF')
  async getStats(@Query('zoneId') zoneId: string) { return { data: await this.poService.getPOStats(zoneId) }; }

  @Get(':id')
  @RequirePermission('inventory.purchase-order.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.poService.findById(id) }; }

  @Post(':id/approve')
  @RequirePermission('inventory.purchase-order.list.create')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.poService.approve(id, userId) }; }

  @Post(':id/send-to-vendor')
  @RequirePermission('inventory.purchase-order.list.create')
  @Roles('COMPANY_MANAGER')
  async sendToVendor(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.poService.sendToVendor(id, userId) }; }

  @Post(':id/cancel')
  @RequirePermission('inventory.purchase-order.list.create')
  @Roles('COMPANY_MANAGER')
  async cancel(@Param('id') id: string, @Body() body: { reason: string }) { return { data: await this.poService.cancel(id, body.reason) }; }
}
