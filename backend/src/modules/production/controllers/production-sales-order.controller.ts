import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { ProductionSalesOrderService } from '../services/production-sales-order.service';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from '../dto/create-dtos';

@Controller('/production/sales-orders')
@UseGuards(JwtGuard, PermissionsGuard)
export class ProductionSalesOrderController {
  constructor(private readonly salesOrderService: ProductionSalesOrderService) {}

  @Get()
  @RequirePermission('production.salesorder.list.view')
  async findAll() {
    return successResponse(await this.salesOrderService.findAll());
  }

  @Post()
  @RequirePermission('production.salesorder.list.create')
  async create(@Body() dto: CreateSalesOrderDto) {
    return successResponse(await this.salesOrderService.create(dto));
  }

  @Patch(':id')
  @RequirePermission('production.salesorder.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return successResponse(await this.salesOrderService.update(id, dto));
  }
}
