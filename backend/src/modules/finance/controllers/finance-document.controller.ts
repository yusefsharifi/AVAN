import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { ResolveZoneId } from '../../../common/decorators/resolve-zone.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { FinanceDocumentService } from '../services/finance-document.service';
import { CreateFinanceDocumentDto, UpdateFinanceDocumentDto } from '../dto/finance-document.dto';

/**
 * Purchase/sales document register (Step 6 / TASK C — R5).
 *
 * ONE controller serves both kinds. The frontend posts `createPurchase` and
 * `createSales` to the same path (`POST /finance/documents`) and distinguishes
 * them with the shared `type` union, so the kind is inferred server-side and
 * stored in `kind`, splitting the union into `purchaseType` / `salesType`.
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Documents')
@ApiBearerAuth()
@Controller('/finance/documents')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FinanceDocumentController {
  constructor(private readonly documentService: FinanceDocumentService) {}

  @Post()
  @RequirePermission('finance.documents.documents.create')
  @ApiOperation({ summary: 'Register a purchase or sales document' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateFinanceDocumentDto) {
    const data = await this.documentService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.documents.documents.view')
  @ApiOperation({ summary: 'List documents (optionally filtered by kind)' })
  @ApiQuery({ name: 'kind', required: false, enum: ['purchase', 'sales'] })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string, @Query('kind') kind?: string) {
    const data = await this.documentService.findAll(zoneId, kind);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.documents.documents.view')
  @ApiOperation({ summary: 'Get one document with its lines' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.documentService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.documents.documents.update')
  @ApiOperation({ summary: 'Update a document (lines replace and totals re-derive)' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceDocumentDto,
  ) {
    const data = await this.documentService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.documents.documents.delete')
  @ApiOperation({ summary: 'Delete a document and its lines' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.documentService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
