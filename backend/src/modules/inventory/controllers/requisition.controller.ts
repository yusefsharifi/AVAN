import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MaterialRequisitionService } from '../services/material-requisition.service';
import { CreateRequisitionDto, ApproveRequisitionDto, IssueItemsDto, FilterRequisitionsDto } from '../dto/create-dtos';

@Controller('/inventory/requisitions')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class RequisitionController {
  constructor(private readonly reqService: MaterialRequisitionService) {}

  @Post()
  @RequirePermission('inventory.requisition.list.create')
  @Roles('COMPANY_STAFF')
  async create(@Body() dto: CreateRequisitionDto, @CurrentUser('sub') userId: string, @CurrentUser() user: any) { return { data: await this.reqService.create(dto, userId, `${user.firstNameFa || ''} ${user.lastNameFa || ''}`.trim() || userId) }; }

  @Get()
  @RequirePermission('inventory.requisition.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterRequisitionsDto) { return this.reqService.findAll(filter); }

  @Get('pending-approval')
  @RequirePermission('inventory.requisition.list.view')
  @Roles('COMPANY_MANAGER')
  async getPending(@Query('approverId') approverId: string, @Query('zoneId') zoneId: string) { return { data: await this.reqService.getPendingApprovals(approverId, zoneId) }; }

  @Get('stats')
  @RequirePermission('inventory.requisition.list.view')
  @Roles('COMPANY_STAFF')
  async getStats(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) { return { data: await this.reqService.getRequisitionStats(zoneId, companyId) }; }

  @Get(':id')
  @RequirePermission('inventory.requisition.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.reqService.findById(id) }; }

  @Post(':id/submit')
  @RequirePermission('inventory.requisition.list.create')
  @Roles('COMPANY_STAFF')
  async submit(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.reqService.submit(id, userId) }; }

  @Patch(':id/approve')
  @RequirePermission('inventory.requisition.list.update')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @Body() dto: ApproveRequisitionDto, @CurrentUser('sub') userId: string, @CurrentUser() user: any) { return { data: await this.reqService.approve(id, dto, userId, `${user.firstNameFa || ''} ${user.lastNameFa || ''}`.trim() || userId) }; }

  @Post(':id/issue')
  @RequirePermission('inventory.requisition.list.create')
  @Roles('COMPANY_MANAGER')
  async issue(@Param('id') id: string, @Body() dto: IssueItemsDto, @CurrentUser('sub') userId: string) { return { data: await this.reqService.issue(dto, userId) }; }

  @Post(':id/cancel')
  @RequirePermission('inventory.requisition.list.create')
  @Roles('COMPANY_STAFF')
  async cancel(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('sub') userId: string) { return { data: await this.reqService.cancel(id, body.reason, userId) }; }
}
