import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto, RecordPaymentDto } from '../dto/create-invoice.dto';
import { FilterInvoicesDto } from '../dto/filter.dto';

@ApiTags('Finance - Invoices')
@ApiBearerAuth()
@Controller('/finance/invoices')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.invoices.create')
  @ApiOperation({ summary: 'Create invoice' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.invoiceService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @RequirePermissions('finance.invoices.view')
  @ApiOperation({ summary: 'List invoices' })
  async findAll(@Query() filter: FilterInvoicesDto, @ZoneId() zoneId: string) {
    const result = await this.invoiceService.findAll({ ...filter, zoneId });
    return { success: true, ...result };
  }

  @Get('overdue')
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.invoices.view')
  @ApiOperation({ summary: 'Get overdue invoices' })
  async getOverdue(
    @ZoneId() zoneId: string,
    @Query('companyId') companyId?: string,
  ) {
    const data = await this.invoiceService.getOverdueInvoices(zoneId, companyId);
    return { success: true, data };
  }

  @Get('aging-report')
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.invoices.view')
  @ApiOperation({ summary: 'Get AR aging report' })
  async getAgingReport(@ZoneId() zoneId: string) {
    const data = await this.invoiceService.getAgingReport(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @RequirePermissions('finance.invoices.view')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.invoiceService.findById(id);
    return { success: true, data };
  }

  @Get(':id/pdf')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @RequirePermissions('finance.invoices.view')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.invoiceService.generatePdf(id);
    const invoice = await this.invoiceService.findById(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post(':id/issue')
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.invoices.update')
  @ApiOperation({ summary: 'Issue invoice' })
  async issue(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.invoiceService.issue(id, userId);
    return { success: true, data };
  }

  @Post(':id/payment')
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.payments.create')
  @ApiOperation({ summary: 'Record payment against invoice' })
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.invoiceService.recordPayment(dto, userId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @Roles('ZONE_MANAGER')
  @RequirePermissions('finance.invoices.update')
  @ApiOperation({ summary: 'Cancel invoice' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.invoiceService.cancel(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/dispute')
  @Roles('COMPANY_ADMIN', 'COMPANY_MANAGER')
  @RequirePermissions('finance.invoices.update')
  @ApiOperation({ summary: 'Dispute invoice' })
  async dispute(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.invoiceService.dispute(id, reason, userId);
    return { success: true, data };
  }
}
