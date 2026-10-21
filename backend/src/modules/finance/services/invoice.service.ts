import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateInvoiceDto, RecordPaymentDto } from '../dto/create-invoice.dto';
import { FilterInvoicesDto } from '../dto/filter.dto';
import { calculateInvoiceLine, daysBetween } from '../utils/double-entry.util';
import { InvoicePdfService } from './invoice-pdf.service';
import { FinanceGatewayService } from './finance-gateway.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: FinanceGatewayService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  async create(dto: CreateInvoiceDto, createdBy: string): Promise<any> {
    // 1. Generate invoice number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.financeInvoiceSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);

    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = zone?.code || 'ZN';
    const invoiceNumber = `INV-${zoneCode}-${year}-${seq.toString().padStart(6, '0')}`;

    // 2. Calculate line totals
    const lineResults = dto.lines.map((line) => {
      const result = calculateInvoiceLine({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxRate: line.taxRate,
      });
      return { ...line, ...result };
    });

    // 3. Calculate invoice totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    for (const line of lineResults) {
      subtotal += line.lineSubtotal;
      totalDiscount += line.lineDiscount;
      totalTax += line.lineTax;
      grandTotal += line.lineTotal;
    }

    // 4. Create invoice with lines
    const invoice = await this.prisma.invoice.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        invoiceNumber,
        type: dto.type as any,
        direction: dto.direction as any,
        partyId: dto.partyId,
        partyName: dto.partyName,
        partyCode: dto.partyCode,
        partyNationalId: dto.partyNationalId,
        partyAddress: dto.partyAddress,
        partyPhone: dto.partyPhone,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        sourceModule: dto.sourceModule,
        sourceEntityId: dto.sourceEntityId,
        subtotal: BigInt(subtotal),
        totalDiscount: BigInt(totalDiscount),
        totalTax: BigInt(totalTax),
        grandTotal: BigInt(grandTotal),
        paidAmount: BigInt(0),
        remainingAmount: BigInt(grandTotal),
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        createdBy,
        lines: {
          create: lineResults.map((line) => ({
            lineNumber: line.lineNumber,
            itemCode: line.itemCode,
            description: line.description,
            quantity: line.quantity,
            unitPrice: BigInt(line.unitPrice),
            discount: line.discount || 0,
            taxRate: line.taxRate || 9,
            lineSubtotal: BigInt(line.lineSubtotal),
            lineDiscount: BigInt(line.lineDiscount),
            lineTax: BigInt(line.lineTax),
            lineTotal: BigInt(line.lineTotal),
            unit: line.unit,
            accountCodeId: line.accountCodeId,
            costCenterId: line.costCenterId,
          })),
        },
      },
      include: { lines: true },
    });

    // 5. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: invoice.id,
      targetType: 'Invoice',
      action: 'INVOICE_CREATED',
      metadata: {
        invoiceNumber,
        type: dto.type,
        direction: dto.direction,
        grandTotal,
        partyName: dto.partyName,
      },
    });

    return invoice;
  }

  async issue(id: string, issuedBy: string): Promise<any> {
    const invoice = await this.findById(id);

    if (invoice.status !== 'DRAFT') {
      throw new AppException('INVOICE_INVALID_STATUS', {
        details: { currentStatus: invoice.status, requiredStatus: 'DRAFT' },
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: { lines: true, payments: true },
    });

    await this.audit.log({
      zoneId: invoice.zoneId,
      userId: issuedBy,
      targetId: id,
      targetType: 'Invoice',
      action: 'INVOICE_ISSUED',
      metadata: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
    });

    this.gateway.emitInvoiceIssued({
      zoneId: invoice.zoneId,
      companyId: invoice.companyId || undefined,
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      grandTotal: Number(invoice.grandTotal),
      dueDate: invoice.dueDate || undefined,
    });

    return updated;
  }

  async recordPayment(dto: RecordPaymentDto, recordedBy: string): Promise<any> {
    const invoice = await this.findById(dto.invoiceId);

    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      throw new AppException('INVOICE_INVALID_STATUS', {
        details: { currentStatus: invoice.status },
      });
    }

    const remaining = Number(invoice.remainingAmount);
    if (dto.amount > remaining) {
      throw new AppException('INVOICE_OVERPAYMENT', {
        details: { requested: dto.amount, remaining },
      });
    }

    // Create payment record
    const payment = await this.prisma.invoicePayment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: BigInt(dto.amount),
        method: dto.method as any,
        referenceNumber: dto.referenceNumber,
        bankAccountId: dto.bankAccountId,
        paidAt: new Date(dto.paidAt),
        notes: dto.notes,
        recordedBy,
      },
    });

    // Update invoice totals
    const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
    const newRemaining = Number(invoice.grandTotal) - newPaidAmount;

    let newStatus = invoice.status;
    if (newRemaining <= 0) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updated = await this.prisma.invoice.update({
      where: { id: dto.invoiceId },
      data: {
        paidAmount: BigInt(newPaidAmount),
        remainingAmount: BigInt(Math.max(0, newRemaining)),
        status: newStatus as any,
        paidDate: newStatus === 'PAID' ? new Date().toISOString() : undefined,
      },
      include: { lines: true, payments: true },
    });

    // Audit log
    await this.audit.log({
      zoneId: invoice.zoneId,
      userId: recordedBy,
      targetId: dto.invoiceId,
      targetType: 'InvoicePayment',
      action: newStatus === 'PAID' ? 'INVOICE_PAID' : 'INVOICE_PARTIALLY_PAID',
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount: dto.amount,
        newPaidAmount,
        newRemaining,
        method: dto.method,
      },
    });

    this.gateway.emitPaymentRecorded({
      zoneId: invoice.zoneId,
      companyId: invoice.companyId || undefined,
      invoiceId: dto.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: dto.amount,
      remainingAmount: Math.max(0, newRemaining),
      method: dto.method,
    });

    return updated;
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const invoice = await this.findById(id);

    if (!['DRAFT', 'ISSUED'].includes(invoice.status)) {
      throw new AppException('INVOICE_INVALID_STATUS');
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new AppException('INVOICE_INVALID_STATUS', {
        details: { message: 'فاکتور دارای پرداخت است' },
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: `${invoice.notes || ''}\nلغو شده: ${reason}`,
      },
      include: { lines: true, payments: true },
    });    await this.audit.log({
      zoneId: invoice.zoneId,
      userId: cancelledBy,
      targetId: id,
      targetType: 'Invoice',
      action: 'INVOICE_CANCELLED',
      metadata: { invoiceNumber: invoice.invoiceNumber, reason },
    });

    this.gateway.emitInvoiceCancelled({
      zoneId: invoice.zoneId,
      companyId: invoice.companyId || undefined,
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
    });

    return updated;
  }


  async dispute(id: string, reason: string, disputedBy: string): Promise<any> {
    const invoice = await this.findById(id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'DISPUTED',
        notes: `${invoice.notes || ""}\nمناقشه: ${reason}`,
      },
      include: { lines: true, payments: true },
    });

    await this.audit.log({
      zoneId: invoice.zoneId,
      userId: disputedBy,
      targetId: id,
      targetType: 'Invoice',
      action: 'INVOICE_DISPUTED',
      metadata: { invoiceNumber: invoice.invoiceNumber, reason },
    });

    return updated;
  }

  async findAll(filter: FilterInvoicesDto): Promise<{ data: any[]; meta: any }> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.direction) where.direction = filter.direction;
    if (filter.partyId) where.partyId = filter.partyId;

    if (filter.overdue) {
      where.status = { in: ['ISSUED', 'PARTIALLY_PAID'] };
      where.dueDate = { lt: new Date().toISOString().split('T')[0] };
    }

    if (filter.fromDate || filter.toDate) {
      where.issueDate = {};
      if (filter.fromDate) where.issueDate.gte = filter.fromDate;
      if (filter.toDate) where.issueDate.lte = filter.toDate;
    }

    if (filter.search) {
      where.OR = [
        { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
        { partyName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;

    const data = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { lines: true, payments: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true, payments: true },
    });

    if (!invoice) {
      throw new AppException('INVOICE_NOT_FOUND');
    }

    return invoice;
  }

  async getOverdueInvoices(zoneId: string, companyId?: string): Promise<any[]> {
    const where: any = {
      zoneId,
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      dueDate: { lt: new Date().toISOString().split('T')[0] },
      deletedAt: null,
    };

    if (companyId) where.companyId = companyId;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { lines: true, payments: true },
    });
  }

  async getAgingReport(zoneId: string): Promise<any> {
    const cacheKey = REDIS_KEYS.financeAging(zoneId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all unpaid invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        zoneId,
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        deletedAt: null,
      },
      include: { company: { select: { id: true, nameFa: true } } },
    });

    const buckets = {
      current: { count: 0, totalAmount: BigInt(0) },
      days1to30: { count: 0, totalAmount: BigInt(0) },
      days31to60: { count: 0, totalAmount: BigInt(0) },
      days61to90: { count: 0, totalAmount: BigInt(0) },
      over90: { count: 0, totalAmount: BigInt(0) },
    };

    const byCompany = new Map<string, {
      companyId: string;
      companyName: string;
      buckets: Record<string, { count: number; amount: number }>;
    }>();

    let totalOutstanding = BigInt(0);

    for (const invoice of invoices) {
      const remaining = Number(invoice.remainingAmount);
      if (remaining <= 0) continue;

      totalOutstanding += BigInt(remaining);
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.issueDate);
      const daysOverdue = daysBetween(dueDate, today);

      let bucket: string;
      if (daysOverdue <= 0) {
        bucket = 'current';
      } else if (daysOverdue <= 30) {
        bucket = 'days1to30';
      } else if (daysOverdue <= 60) {
        bucket = 'days31to60';
      } else if (daysOverdue <= 90) {
        bucket = 'days61to90';
      } else {
        bucket = 'over90';
      }

      buckets[bucket].count++;
      buckets[bucket].totalAmount += BigInt(remaining);

      // Aggregate by company
      const companyId = invoice.companyId || 'UNKNOWN';
      const companyName = (invoice as any).company?.nameFa || invoice.partyName;
      if (!byCompany.has(companyId)) {
        byCompany.set(companyId, {
          companyId,
          companyName,
          buckets: {
            current: { count: 0, amount: 0 },
            days1to30: { count: 0, amount: 0 },
            days31to60: { count: 0, amount: 0 },
            days61to90: { count: 0, amount: 0 },
            over90: { count: 0, amount: 0 },
          },
        });
      }

      const companyData = byCompany.get(companyId)!;
      companyData.buckets[bucket].count++;
      companyData.buckets[bucket].amount += remaining;
    }

    const result = {
      current: { count: buckets.current.count, totalAmount: Number(buckets.current.totalAmount) },
      days1to30: { count: buckets.days1to30.count, totalAmount: Number(buckets.days1to30.totalAmount) },
      days31to60: { count: buckets.days31to60.count, totalAmount: Number(buckets.days31to60.totalAmount) },
      days61to90: { count: buckets.days61to90.count, totalAmount: Number(buckets.days61to90.totalAmount) },
      over90: { count: buckets.over90.count, totalAmount: Number(buckets.over90.totalAmount) },
      totalOutstanding: Number(totalOutstanding),
      byCompany: Array.from(byCompany.values()),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 1800);

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-invoice creation methods
  // ═══════════════════════════════════════════════════════════════════════════

  async createWeighInvoice(weighRecord: any, zoneId: string): Promise<any> {
    const netWeight = Number(weighRecord.netWeight || 0);
    const pricePerTon = Number((await this.getZoneSetting(zoneId, 'weighScaleFeePerTon')) || 0);
    const subtotal = Math.round(netWeight * pricePerTon);
    const taxRate = 9;
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    return this.create(
      {
        zoneId,
        companyId: weighRecord.companyId,
        type: 'WEIGH_SCALE' as any,
        direction: 'SALES' as any,
        partyName: weighRecord.companyName || 'ناشناس',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sourceModule: 'WEIGH',
        sourceEntityId: weighRecord.id,
        lines: [
          {
            lineNumber: 1,
            description: `خدمات وزن‌کشی ${netWeight} تن`,
            quantity: netWeight,
            unitPrice: pricePerTon,
            taxRate,
            unit: 'ton',
          },
        ],
      },
      weighRecord.operatorId || zoneId,
    );
  }

  async createPermitFeeInvoice(permit: any): Promise<any> {
    const feeAmount = Number((await this.getZoneSetting(permit.zoneId, 'permitFee')) || 0);

    return this.create(
      {
        zoneId: permit.zoneId,
        companyId: permit.companyId,
        type: 'PERMIT_FEE' as any,
        direction: 'SALES' as any,
        partyName: permit.company?.nameFa || permit.holderName || 'ناشناس',
        issueDate: new Date().toISOString().split('T')[0],
        sourceModule: 'PERMIT',
        sourceEntityId: permit.id,
        lines: [
          {
            lineNumber: 1,
            description: `فیس مجوز ${permit.type} - ${permit.permitNumber}`,
            quantity: 1,
            unitPrice: feeAmount,
            taxRate: 9,
          },
        ],
      },
      permit.issuedBy || permit.zoneId,
    );
  }

  async createMonthlyLeaseInvoice(contract: any): Promise<any> {
    let monthlyRent = Number(contract.monthlyRent);

    // Apply rent escalation if applicable
    if (contract.rentEscalation && contract.escalationDate) {
      const today = new Date();
      const escMonth = parseInt(contract.escalationDate.split('-')[0], 10);
      if (today.getMonth() + 1 === escMonth) {
        const escalationRate = Number(contract.rentEscalation);
        monthlyRent = Math.round(monthlyRent * (1 + escalationRate / 100));
      }
    }

    const taxRate = 9;
    const taxAmount = Math.round(monthlyRent * taxRate / 100);
    const grandTotal = monthlyRent + taxAmount;

    const invoice = await this.create(
      {
        zoneId: contract.zoneId,
        companyId: contract.companyId,
        type: 'LEASE_RENT' as any,
        direction: 'SALES' as any,
        partyName: contract.company?.nameFa || 'ناشناس',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sourceModule: 'LEASE',
        sourceEntityId: contract.id,
        lines: [
          {
            lineNumber: 1,
            description: `اجاره ماهانه واحد ${contract.unit || ''} - قرارداد ${contract.contractNumber}`,
            quantity: 1,
            unitPrice: monthlyRent,
            taxRate,
          },
        ],
      },
      contract.createdBy || contract.zoneId,
    );

    // Update next billing date
    const nextBilling = new Date(contract.nextBillingDate || new Date());
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await this.prisma.leaseContract.update({
      where: { id: contract.id },
      data: {
        lastBilledDate: new Date(),
        nextBillingDate: nextBilling,
      },
    });

    return invoice;
  }

  async createServiceInvoice(
    companyId: string,
    serviceDescription: string,
    amount: number,
    zoneId: string,
  ): Promise<any> {
    return this.create(
      {
        zoneId,
        companyId,
        type: 'SERVICE_FEE' as any,
        direction: 'SALES' as any,
        partyName: 'سرویس',
        issueDate: new Date().toISOString().split('T')[0],
        sourceModule: 'SERVICE',
        lines: [
          {
            lineNumber: 1,
            description: serviceDescription,
            quantity: 1,
            unitPrice: amount,
            taxRate: 9,
          },
        ],
      },
      zoneId,
    );
  }

  /**
   * Generate a PDF for an invoice using Puppeteer.
   * Returns the PDF as a Buffer.
   */
  async generatePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.findById(invoiceId);

    const zone = await this.prisma.zone.findUnique({
      where: { id: invoice.zoneId },
    });

    if (!zone) {
      throw new AppException('ZONE_NOT_FOUND');
    }

    const templateData = await this.pdfService.buildTemplateData(invoice, zone);
    const pdfBuffer = await this.pdfService.generatePdf(templateData);

    this.logger.log(`Generated PDF for invoice ${invoice.invoiceNumber} (${pdfBuffer.length} bytes)`);

    return pdfBuffer;
  }

  private async getZoneSetting(zoneId: string, key: string): Promise<any> {
    const config = await (this.prisma as any).zoneFinanceConfig.findUnique({
      where: { zoneId },
    });
    return config?.[key];
  }
}
