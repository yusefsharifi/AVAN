import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ProductionCheckResult } from '@prisma/client';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { successResponse } from '../../../common/dto/response.dto';
import { QualityCheckService } from '../services/quality-check.service';
import { CreateQualityCheckDto } from '../dto/create-dtos';

@Controller('/production/quality-checks')
@UseGuards(JwtGuard, PermissionsGuard)
export class QualityCheckController {
  constructor(private readonly qualityCheckService: QualityCheckService) {}

  @Get()
  @RequirePermission('production.qualitycheck.list.view')
  async findAll(@Query('workOrderId') workOrderId?: string, @Query('result') result?: string) {
    return successResponse(
      await this.qualityCheckService.findAll({
        workOrderId,
        result: result as ProductionCheckResult | undefined,
      }),
    );
  }

  @Post()
  @RequirePermission('production.qualitycheck.list.create')
  async create(@Body() dto: CreateQualityCheckDto) {
    return successResponse(await this.qualityCheckService.create(dto));
  }
}
