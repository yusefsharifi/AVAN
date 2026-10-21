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
import { FinanceCheckbookService } from '../services/finance-checkbook.service';
import { CreateFinanceCheckbookDto, UpdateFinanceCheckbookDto } from '../dto/checkbook.dto';

/**
 * Checkbooks (Step 7 / TASK A).
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Checkbooks')
@ApiBearerAuth()
@Controller('/finance/checkbooks')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FinanceCheckbookController {
  constructor(private readonly checkbookService: FinanceCheckbookService) {}

  @Post()
  @RequirePermission('finance.treasury.checkbooks.create')
  @ApiOperation({ summary: 'Create a checkbook' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateFinanceCheckbookDto) {
    const data = await this.checkbookService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.treasury.checkbooks.view')
  @ApiOperation({ summary: 'List checkbooks' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.checkbookService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.treasury.checkbooks.view')
  @ApiOperation({ summary: 'Get one checkbook' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.checkbookService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.treasury.checkbooks.update')
  @ApiOperation({ summary: 'Update a checkbook (leaf counts are re-derived)' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCheckbookDto,
  ) {
    const data = await this.checkbookService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.treasury.checkbooks.delete')
  @ApiOperation({ summary: 'Delete a checkbook' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.checkbookService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
