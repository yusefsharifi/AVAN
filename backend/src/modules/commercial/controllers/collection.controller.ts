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
import { CollectionService } from '../services/collection.service';
import {
  OpenCollectionCaseDto,
  AddCollectionActionDto,
  SetInstallmentPlanDto,
  FilterCollectionCasesDto,
} from '../dto/create-dtos';

@ApiTags('Commercial - Collection')
@ApiBearerAuth()
@Controller('/commercial/collection')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post('cases')
  @RequirePermission('commercial.collection.list.create')
  @ApiOperation({ summary: 'Open collection case' })
  async openCase(@Body() dto: OpenCollectionCaseDto, @CurrentUser('sub') userId: string) {
    const data = await this.collectionService.openCase(dto, userId);
    return { success: true, data };
  }

  @Get('cases')
  @RequirePermission('commercial.collection.list.view')
  @ApiOperation({ summary: 'List collection cases' })
  async findAll(@Query() filter: FilterCollectionCasesDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    const result = await this.collectionService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('cases/aging-snapshot')
  @RequirePermission('commercial.collection.list.view')
  @ApiOperation({ summary: 'Aging analysis' })
  async getAgingSnapshot(@ZoneId() zoneId: string) {
    const data = await this.collectionService.getAgingSnapshot(zoneId);
    return { success: true, data };
  }

  @Get('cases/stats')
  @RequirePermission('commercial.collection.list.view')
  @ApiOperation({ summary: 'Collection statistics' })
  async getStats(@ZoneId() zoneId: string) {
    const data = await this.collectionService.getCaseStats(zoneId);
    return { success: true, data };
  }

  @Post('cases/escalate')
  @RequirePermission('commercial.collection.list.create')
  @ApiOperation({ summary: 'Run escalation rules' })
  async escalate(@ZoneId() zoneId: string) {
    const data = await this.collectionService.escalateCases(zoneId);
    return { success: true, data };
  }

  @Get('cases/:id')
  @RequirePermission('commercial.collection.list.view')
  @ApiOperation({ summary: 'Case detail' })
  async findById(@Param('id') id: string) {
    const data = await this.collectionService.findById(id);
    return { success: true, data };
  }

  @Post('cases/:id/action')
  @RequirePermission('commercial.collection.list.create')
  @ApiOperation({ summary: 'Add collection action' })
  async addAction(
    @Param('id') caseId: string,
    @Body() dto: AddCollectionActionDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.caseId = caseId;
    const data = await this.collectionService.addAction(dto, userId);
    return { success: true, data };
  }

  @Post('cases/:id/installments')
  @RequirePermission('commercial.collection.list.create')
  @ApiOperation({ summary: 'Set installment plan' })
  async setInstallments(
    @Param('id') caseId: string,
    @Body() dto: SetInstallmentPlanDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.caseId = caseId;
    const data = await this.collectionService.setInstallmentPlan(dto, userId);
    return { success: true, data };
  }

  @Patch('cases/:id/installments/:iid/pay')
  @RequirePermission('commercial.collection.list.update')
  @ApiOperation({ summary: 'Record installment payment' })
  async recordPayment(
    @Param('iid') installmentId: string,
    @Body('amount') amount: number,
    @Body('checkNumber') checkNumber?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const data = await this.collectionService.recordInstallmentPayment(
      installmentId,
      amount,
      checkNumber,
      userId,
    );
    return { success: true, data };
  }
}
