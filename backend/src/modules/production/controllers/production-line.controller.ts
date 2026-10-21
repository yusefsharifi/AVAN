import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { ProductionLineService } from '../services/production-line.service';
import { CreateProductionLineDto, UpdateProductionLineDto } from '../dto/create-dtos';

@Controller('/production/lines')
@UseGuards(JwtGuard, PermissionsGuard)
export class ProductionLineController {
  constructor(private readonly lineService: ProductionLineService) {}

  @Get()
  @RequirePermission('production.line.list.view')
  async findAll(@Query('zoneId') zoneId?: string) {
    return successResponse(await this.lineService.findAll(zoneId));
  }

  @Post()
  @RequirePermission('production.line.list.create')
  async create(@Body() dto: CreateProductionLineDto) {
    return successResponse(await this.lineService.create(dto));
  }

  // Step-4 TASK 6(b): this route did not exist — the UI had no way to change a
  // line's status, name or OEE after creation.
  @Patch(':id')
  @RequirePermission('production.line.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateProductionLineDto) {
    return successResponse(await this.lineService.update(id, dto));
  }
}
