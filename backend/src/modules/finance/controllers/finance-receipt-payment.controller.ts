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
import { FinanceReceiptPaymentService } from '../services/finance-receipt-payment.service';
import {
  CreateReceiptPaymentDocDto,
  UpdateReceiptPaymentDocDto,
} from '../dto/receipt-payment.dto';

/**
 * Receipt / payment documents (Step 7 / TASK A).
 *
 * ONE controller serves all six `docType` variants and all three `type` values,
 * exactly as the frontend posts them to this single path.
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Receipts and Payments')
@ApiBearerAuth()
@Controller('/finance/receipt-payment-docs')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class FinanceReceiptPaymentController {
  constructor(private readonly documentService: FinanceReceiptPaymentService) {}

  @Post()
  @RequirePermission('finance.treasury.receipt-payment-docs.create')
  @ApiOperation({ summary: 'Register a receipt / payment document' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateReceiptPaymentDocDto) {
    const data = await this.documentService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.treasury.receipt-payment-docs.view')
  @ApiOperation({ summary: 'List receipt / payment documents' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.documentService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.treasury.receipt-payment-docs.view')
  @ApiOperation({ summary: 'Get one receipt / payment document with its lines' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.documentService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.treasury.receipt-payment-docs.update')
  @ApiOperation({ summary: 'Update a document (lines replace, totalAmount re-derives)' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptPaymentDocDto,
  ) {
    const data = await this.documentService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.treasury.receipt-payment-docs.delete')
  @ApiOperation({ summary: 'Delete a document and its lines' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.documentService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
