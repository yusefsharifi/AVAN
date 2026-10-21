import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { ScrapRecordService } from '../services/scrap-record.service';
import { CreateScrapRecordDto } from '../dto/create-dtos';

@Controller('/production/scrap')
@UseGuards(JwtGuard, PermissionsGuard)
export class ScrapRecordController {
  constructor(private readonly scrapService: ScrapRecordService) {}

  @Get()
  @RequirePermission('production.scrap.list.view')
  async findAll(@Query('workOrderId') workOrderId?: string) {
    return successResponse(await this.scrapService.findAll({ workOrderId }));
  }

  @Post()
  @RequirePermission('production.scrap.list.create')
  async create(@Body() dto: CreateScrapRecordDto) {
    return successResponse(await this.scrapService.create(dto));
  }
}
