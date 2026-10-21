import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto } from '../dto/create-dtos';

@Controller('/inventory/vendors')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @RequirePermission('inventory.vendor.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreateVendorDto, @CurrentUser('sub') userId: string) { return { data: await this.vendorService.create(dto, userId) }; }

  @Get()
  @RequirePermission('inventory.vendor.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('zoneId') zoneId: string) { return { data: await this.vendorService.findAll(zoneId) }; }

  @Get(':id')
  @RequirePermission('inventory.vendor.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) { return { data: await this.vendorService.findById(id) }; }

  @Patch(':id')
  @RequirePermission('inventory.vendor.list.update')
  @Roles('COMPANY_MANAGER')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateVendorDto>) { return { data: await this.vendorService.update(id, dto) }; }

  @Post(':id/blacklist')
  @RequirePermission('inventory.vendor.list.create')
  @Roles('COMPANY_MANAGER')
  async blacklist(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser('sub') userId: string) { return { data: await this.vendorService.blacklist(id, body.reason, userId) }; }
}
