import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PurchaseRequestService } from '../services/purchase-request.service';
import { CreatePurchaseRequestDto } from '../dto/create-dtos';

@Controller('/inventory/purchase-requests')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PurchaseRequestController {
  constructor(private readonly prService: PurchaseRequestService) {}

  @Post()
  @RequirePermission('inventory.purchase-request.list.create')
  @Roles('COMPANY_STAFF')
  async create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser('sub') userId: string) { return { data: await this.prService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.purchase-request.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: any) { return this.prService.findAll(filter); }

  @Get('pending-approval')
  @RequirePermission('inventory.purchase-request.list.view')
  @Roles('COMPANY_MANAGER')
  async getPending(@Query('approverId') approverId: string, @Query('zoneId') zoneId: string) { return { data: await this.prService.getPendingApprovals(approverId, zoneId) }; }

  @Get(':id')
  @RequirePermission('inventory.purchase-request.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.prService.findById(id) }; }

  @Post(':id/approve')
  @RequirePermission('inventory.purchase-request.list.create')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.prService.approve(id, userId) }; }

  @Post(':id/reject')
  @RequirePermission('inventory.purchase-request.list.create')
  @Roles('COMPANY_MANAGER')
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('sub') userId: string) { return { data: await this.prService.reject(id, body.reason, userId) }; }
}
