import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PhysicalCountService } from '../services/physical-count.service';
import { CreatePhysicalCountDto, SubmitCountResultsDto } from '../dto/create-dtos';

@Controller('/inventory/counts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PhysicalCountController {
  constructor(private readonly countService: PhysicalCountService) {}

  @Post()
  @RequirePermission('inventory.physical-count.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreatePhysicalCountDto, @CurrentUser('sub') userId: string) { return { data: await this.countService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.physical-count.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('zoneId') zoneId: string, @Query() filter: any) { return this.countService.findAll(zoneId, filter); }

  @Get(':id')
  @RequirePermission('inventory.physical-count.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.countService.findById(id) }; }

  @Post(':id/start')
  @RequirePermission('inventory.physical-count.list.create')
  @Roles('COMPANY_MANAGER')
  async start(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.countService.start(id, userId) }; }

  @Post(':id/results')
  @RequirePermission('inventory.physical-count.list.create')
  @Roles('COMPANY_STAFF')
  async submitResults(@Param('id') id: string, @Body() dto: SubmitCountResultsDto, @CurrentUser('sub') userId: string) { return { data: await this.countService.submitResults(id, dto, userId) }; }

  @Get(':id/variances')
  @RequirePermission('inventory.physical-count.list.view')
  @Roles('COMPANY_STAFF')
  async getVariances(@Param('id') id: string) { return { data: await this.countService.reviewVariances(id) }; }

  @Post(':id/approve')
  @RequirePermission('inventory.physical-count.list.create')
  @Roles('COMPANY_MANAGER')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) { return { data: await this.countService.approve(id, userId) }; }
}
