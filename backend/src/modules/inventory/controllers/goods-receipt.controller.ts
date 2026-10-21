import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GoodsReceiptService } from '../services/goods-receipt.service';
import { CreateGoodsReceiptDto } from '../dto/create-dtos';

@Controller('/inventory/goods-receipt')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class GoodsReceiptController {
  constructor(private readonly grnService: GoodsReceiptService) {}

  @Post()
  @RequirePermission('inventory.goods-receipt.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreateGoodsReceiptDto, @CurrentUser('sub') userId: string) { return { data: await this.grnService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.goods-receipt.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('zoneId') zoneId: string, @Query() filter: any) { return this.grnService.findAll(zoneId, filter); }

  @Get(':id')
  @RequirePermission('inventory.goods-receipt.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.grnService.findById(id) }; }

  @Post(':id/confirm')
  @RequirePermission('inventory.goods-receipt.list.create')
  @Roles('COMPANY_MANAGER')
  async confirm(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.grnService.confirm(id, userId) }; }
}
