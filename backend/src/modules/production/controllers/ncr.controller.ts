import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NcrStatus } from '@prisma/client';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { NcrService } from '../services/ncr.service';
import { CreateNcrDto, UpdateNcrDto } from '../dto/create-dtos';

@Controller('/production/ncrs')
@UseGuards(JwtGuard, PermissionsGuard)
export class NcrController {
  constructor(private readonly ncrService: NcrService) {}

  @Get()
  @RequirePermission('production.ncr.list.view')
  async findAll(@Query('status') status?: string, @Query('workOrderId') workOrderId?: string) {
    return successResponse(
      await this.ncrService.findAll({
        status: status as NcrStatus | undefined,
        workOrderId,
      }),
    );
  }

  @Post()
  @RequirePermission('production.ncr.list.create')
  async create(@Body() dto: CreateNcrDto) {
    return successResponse(await this.ncrService.create(dto));
  }

  @Patch(':id')
  @RequirePermission('production.ncr.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateNcrDto) {
    return successResponse(await this.ncrService.update(id, dto));
  }
}
