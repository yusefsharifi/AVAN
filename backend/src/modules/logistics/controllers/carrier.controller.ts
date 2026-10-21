import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CarrierService } from '../services/carrier.service';
import { CreateCarrierDto } from '../dto/create-carrier.dto';
import { UpdateCarrierDto } from '../dto/update-carrier.dto';

@ApiTags('Carriers')
@ApiBearerAuth()
@Controller('/carriers')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @Post()
  @RequirePermission('logistics.carrier.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Register a carrier' })
  async create(
    @Query('zoneId') zoneId: string,
    @Body() dto: CreateCarrierDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.carrierService.create(zoneId, dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('logistics.carrier.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List carriers' })
  async findAll(@Query('zoneId') zoneId: string) {
    const data = await this.carrierService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('logistics.carrier.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get carrier detail' })
  async findById(@Param('id') id: string) {
    const data = await this.carrierService.findById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('logistics.carrier.list.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update carrier' })
  async update(@Param('id') id: string, @Body() dto: UpdateCarrierDto) {
    const data = await this.carrierService.update(id, dto);
    return { success: true, data };
  }

  @Post(':id/blacklist')
  @RequirePermission('logistics.carrier.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Blacklist a carrier' })
  async blacklist(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.carrierService.blacklist(id, reason, userId);
    return { success: true, data };
  }

  @Delete(':id/blacklist')
  @RequirePermission('logistics.carrier.list.delete')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Remove carrier from blacklist' })
  async unblacklist(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.carrierService.unblacklist(id, userId);
    return { success: true, data };
  }
}
