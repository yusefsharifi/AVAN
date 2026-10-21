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
import { FinanceCheckService } from '../services/finance-check.service';
import { CreateFinanceCheckDto, UpdateFinanceCheckDto } from '../dto/check.dto';

/**
 * Cheques (Step 7 / TASK A).
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Checks')
@ApiBearerAuth()
@Controller('/finance/checks')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FinanceCheckController {
  constructor(private readonly checkService: FinanceCheckService) {}

  @Post()
  @RequirePermission('finance.treasury.checks.create')
  @ApiOperation({ summary: 'Register a cheque' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateFinanceCheckDto) {
    const data = await this.checkService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.treasury.checks.view')
  @ApiOperation({ summary: 'List cheques' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.checkService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.treasury.checks.view')
  @ApiOperation({ summary: 'Get one cheque' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.checkService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.treasury.checks.update')
  @ApiOperation({ summary: 'Update a cheque (clearance / bounce)' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCheckDto,
  ) {
    const data = await this.checkService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.treasury.checks.delete')
  @ApiOperation({ summary: 'Delete a cheque' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.checkService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
