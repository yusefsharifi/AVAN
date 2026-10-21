import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { ContractorService } from '../services/contractor.service';
import { CreateContractorDto, UpdateContractorDto } from '../dto/create-dtos';

@ApiTags('CMMS - Contractors')
@ApiBearerAuth()
@Controller('/cmms/contractors')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ContractorController {
  constructor(private readonly contractorService: ContractorService) {}

  @Post()
  @RequirePermission('cmms.contractor.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add contractor' })
  async create(@Body() dto: CreateContractorDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.contractorService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.contractor.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List contractors' })
  async findAll(@ZoneId() zoneId: string) {
    return { success: true, data: await this.contractorService.findAll(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.contractor.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Contractor detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.contractorService.findById(id) };
  }

  @Patch(':id')
  @RequirePermission('cmms.contractor.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update contractor' })
  async update(@Param('id') id: string, @Body() dto: UpdateContractorDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.contractorService.update(id, dto, userId) };
  }

  @Post(':id/blacklist')
  @RequirePermission('cmms.contractor.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Blacklist contractor' })
  async blacklist(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.contractorService.blacklist(id, reason, userId) };
  }
}
