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
import { FinanceVisitorService } from '../services/finance-visitor.service';
import { CreateFinanceVisitorDto, UpdateFinanceVisitorDto } from '../dto/visitor.dto';

/**
 * Finance sales-agent visitors (Step 7 / TASK A) — the commission-earning field
 * agents that `BuyerSeller.visitorId` points at, NOT the guard-portal
 * `VisitorRequest`. See schema.prisma for why the two were kept apart.
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Visitors')
@ApiBearerAuth()
@Controller('/finance/visitors')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FinanceVisitorController {
  constructor(private readonly visitorService: FinanceVisitorService) {}

  @Post()
  @RequirePermission('finance.parties.visitors.create')
  @ApiOperation({ summary: 'Create a sales-agent visitor' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateFinanceVisitorDto) {
    const data = await this.visitorService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.parties.visitors.view')
  @ApiOperation({ summary: 'List visitors' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.visitorService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.parties.visitors.view')
  @ApiOperation({ summary: 'Get one visitor' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.visitorService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.parties.visitors.update')
  @ApiOperation({ summary: 'Update a visitor' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceVisitorDto,
  ) {
    const data = await this.visitorService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.parties.visitors.delete')
  @ApiOperation({ summary: 'Delete a visitor' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.visitorService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
