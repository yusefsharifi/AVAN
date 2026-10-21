import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { ResolveZoneId } from '../../../common/decorators/resolve-zone.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { FixedAssetService } from '../services/fixed-asset.service';
import { CreateFixedAssetDto, UpdateFixedAssetDto } from '../dto/fixed-asset.dto';

/**
 * Fixed-asset register (Step 6 / TASK C — R5).
 *
 * Zone scoping follows the platform's two-mode contract:
 *   - WRITES use `@ResolveZoneId()`, so a ZONE_MANAGER is locked to its own
 *     zone from the session while a SUPER_ADMIN has to name one in the body.
 *     A write can therefore never reach storage with an undefined zone.
 *   - READS use `@ZoneId()`: zone-scoped users see only their zone; a
 *     SUPER_ADMIN carries no session zone, so the filter is absent and the
 *     platform admin sees every zone (the same convention as bank accounts).
 */
@ApiTags('Finance - Fixed Assets')
@ApiBearerAuth()
@Controller('/finance/fixed-assets')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FixedAssetController {
  constructor(private readonly fixedAssetService: FixedAssetService) {}

  @Post()
  @RequirePermission('finance.assets.fixed-assets.create')
  @ApiOperation({ summary: 'Create fixed asset' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateFixedAssetDto) {
    const data = await this.fixedAssetService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.assets.fixed-assets.view')
  @ApiOperation({ summary: 'List fixed assets' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.fixedAssetService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.assets.fixed-assets.view')
  @ApiOperation({ summary: 'Get one fixed asset' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.fixedAssetService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.assets.fixed-assets.update')
  @ApiOperation({ summary: 'Update fixed asset' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFixedAssetDto,
  ) {
    const data = await this.fixedAssetService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.assets.fixed-assets.delete')
  @ApiOperation({ summary: 'Delete fixed asset' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.fixedAssetService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
