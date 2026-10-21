import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductionWorkOrderStatus } from '@prisma/client';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { ProductionWorkOrderService } from '../services/production-work-order.service';
import { CreateWorkOrderDto, UpdateWorkOrderDto, UpdateWorkOrderStatusDto } from '../dto/create-dtos';

@Controller('/production/work-orders')
@UseGuards(JwtGuard, PermissionsGuard)
export class ProductionWorkOrderController {
  constructor(private readonly workOrderService: ProductionWorkOrderService) {}

  @Get()
  @RequirePermission('production.workorder.list.view')
  async findAll(@Query('status') status?: string, @Query('lineId') lineId?: string) {
    return successResponse(
      await this.workOrderService.findAll({
        status: status as ProductionWorkOrderStatus | undefined,
        lineId,
      }),
    );
  }

  @Post()
  @RequirePermission('production.workorder.list.create')
  async create(@Body() dto: CreateWorkOrderDto) {
    return successResponse(await this.workOrderService.create(dto));
  }

  @Patch(':id')
  @RequirePermission('production.workorder.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto) {
    return successResponse(await this.workOrderService.update(id, dto));
  }

  @Patch(':id/status')
  @RequirePermission('production.workorder.list.update')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateWorkOrderStatusDto) {
    return successResponse(await this.workOrderService.updateStatus(id, dto));
  }
}
