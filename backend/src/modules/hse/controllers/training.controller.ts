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
import { HseTrainingService } from '../services/hse-training.service';
import { CreateTrainingPlanDto, CreateTrainingRecordDto } from '../dto/create-dtos';

@ApiTags('HSE - Training')
@ApiBearerAuth()
@Controller('/hse/training')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class TrainingController {
  constructor(private readonly trainingService: HseTrainingService) {}

  @Post('plans')
  @RequirePermission('hse.training.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create training plan' })
  async createPlan(@Body() dto: CreateTrainingPlanDto) {
    return { success: true, data: await this.trainingService.createPlan(dto) };
  }

  @Get('plans')
  @RequirePermission('hse.training.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List training plans' })
  async findPlans(@ZoneId() zoneId: string) {
    return { success: true, data: await this.trainingService.findPlans(zoneId) };
  }

  @Get('records')
  @RequirePermission('hse.training.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List training records' })
  async findRecords(@ZoneId() zoneId: string, @Query('planId') planId?: string, @Query('cursor') cursor?: string) {
    return { success: true, ...(await this.trainingService.findRecords(zoneId, { planId, cursor })) };
  }

  @Get('records/expiring')
  @RequirePermission('hse.training.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Expiring certifications' })
  async getExpiring(@ZoneId() zoneId: string, @Query('withinDays') withinDays?: number) {
    return { success: true, data: await this.trainingService.getExpiringTraining(zoneId, withinDays || 30) };
  }

  @Get('compliance/:companyId')
  @RequirePermission('hse.training.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Company compliance' })
  async getCompliance(@Param('companyId') companyId: string, @ZoneId() zoneId: string) {
    return { success: true, data: await this.trainingService.getCompanyTrainingCompliance(companyId, zoneId) };
  }

  @Post('records')
  @RequirePermission('hse.training.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record training' })
  async recordTraining(@Body() dto: CreateTrainingRecordDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.trainingService.recordTraining(dto, userId) };
  }

  @Post('records/bulk')
  @RequirePermission('hse.training.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk record training' })
  async bulkRecord(@Body() records: CreateTrainingRecordDto[], @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.trainingService.bulkRecord(records, userId) };
  }

  @Get('records/:id/certificate')
  @RequirePermission('hse.training.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Download certificate' })
  async getCertificate(@Param('id') id: string) {
    return { success: true, data: await this.trainingService.generateCertificate(id) };
  }
}
