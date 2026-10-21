import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { RiskAssessmentService } from '../services/risk-assessment.service';
import { CreateRiskAssessmentDto } from '../dto/create-dtos';

@ApiTags('HSE - Risk Assessment')
@ApiBearerAuth()
@Controller('/hse/risks')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class RiskController {
  constructor(private readonly riskService: RiskAssessmentService) {}

  @Post()
  @RequirePermission('hse.risk.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create risk assessment' })
  async create(@Body() dto: CreateRiskAssessmentDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.riskService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('hse.risk.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List assessments' })
  async findAll(@ZoneId() zoneId: string, @Query('status') status?: string) {
    return { success: true, ...(await this.riskService.findAll(zoneId, { status })) };
  }

  @Get('high-risks')
  @RequirePermission('hse.risk.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'High risk hazards' })
  async getHighRisks(@ZoneId() zoneId: string) {
    return { success: true, data: await this.riskService.getHighRisks(zoneId) };
  }

  @Get('matrix')
  @RequirePermission('hse.risk.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Risk matrix' })
  async getRiskMatrix(@ZoneId() zoneId: string) {
    return { success: true, data: await this.riskService.getRiskMatrix(zoneId) };
  }

  @Get(':id')
  @RequirePermission('hse.risk.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assessment detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.riskService.findById(id) };
  }

  @Patch(':id/review')
  @RequirePermission('hse.risk.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Review assessment' })
  async review(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.riskService.review(id, userId) };
  }

  @Post(':id/approve')
  @RequirePermission('hse.risk.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve assessment' })
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.riskService.approve(id, userId) };
  }

  @Patch(':id/hazards/:hid/controls')
  @RequirePermission('hse.risk.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update hazard controls' })
  async updateControls(
    @Param('hid') hid: string,
    @Body('residualLikelihood') likelihood: number,
    @Body('residualSeverity') severity: number,
    @Body('controls') controls: string[],
  ) {
    return { success: true, data: await this.riskService.updateHazardControls(hid, likelihood, severity, controls) };
  }
}
