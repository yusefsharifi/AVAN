import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { FailureAnalysisService } from '../services/failure-analysis.service';
import { ReportFailureDto } from '../dto/create-dtos';

@ApiTags('CMMS - Failure Analysis')
@ApiBearerAuth()
@Controller('/cmms/failures')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class FailureController {
  constructor(private readonly failureService: FailureAnalysisService) {}

  @Post('report')
  @RequirePermission('cmms.failure.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Report failure' })
  async reportFailure(@Body() dto: ReportFailureDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.failureService.reportFailure(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List failure logs for asset' })
  async findAll(@Query('assetId') assetId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: number) {
    return { success: true, ...(await this.failureService.getFailureLogs(assetId, { cursor, limit })) };
  }

  @Get('report')
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Failure analysis report' })
  async getReport(@ZoneId() zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return { success: true, data: await this.failureService.getFailureReport(zoneId, fromDate, toDate) };
  }

  @Get('pareto')
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Pareto analysis' })
  async getPareto(@ZoneId() zoneId: string) {
    return { success: true, data: await this.failureService.getParetoAnalysis(zoneId) };
  }

  @Get('asset/:assetId/mtbf')
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'MTBF for asset' })
  async getMTBF(@Param('assetId') assetId: string) {
    return { success: true, data: { mtbf: await this.failureService.computeMTBF(assetId) } };
  }

  @Get('asset/:assetId/mttr')
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'MTTR for asset' })
  async getMTTR(@Param('assetId') assetId: string) {
    return { success: true, data: { mttr: await this.failureService.computeMTTR(assetId) } };
  }

  @Get(':id')
  @RequirePermission('cmms.failure.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Failure log detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.failureService.getFailureLogs(id) };
  }

  @Post(':id/resolve')
  @RequirePermission('cmms.failure.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve failure' })
  async resolveFailure(@Param('id') id: string, @Body('workOrderId') workOrderId: string) {
    return { success: true, data: await this.failureService.resolveFailure(id, workOrderId, new Date()) };
  }
}
