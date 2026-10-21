import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { ProductionBomService } from '../services/production-bom.service';
import { CreateBomDto, UpdateBomDto } from '../dto/create-dtos';

@Controller('/production/boms')
@UseGuards(JwtGuard, PermissionsGuard)
export class ProductionBomController {
  constructor(private readonly bomService: ProductionBomService) {}

  @Get()
  @RequirePermission('production.bom.list.view')
  async findAll() {
    return successResponse(await this.bomService.findAll());
  }

  @Post()
  @RequirePermission('production.bom.list.create')
  async create(@Body() dto: CreateBomDto) {
    return successResponse(await this.bomService.create(dto));
  }

  @Patch(':id')
  @RequirePermission('production.bom.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateBomDto) {
    return successResponse(await this.bomService.update(id, dto));
  }
}
