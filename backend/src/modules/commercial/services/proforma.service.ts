import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import {
  CreateProformaDto,
  SubmitProformaApprovalDto,
  ApproveProformaStepDto,
  RecordPartyResponseDto,
  ReviseProformaDto,
  FilterProformaDto,
} from '../dto/create-dtos';
import {
  getApprovalSteps,
  calculateLineTotals,
  checkCreditLimit,
} from '../utils/commercial.utils';
import { CommercialGatewayService } from './commercial-gateway.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ProformaService {
  private readonly logger = new Logger(ProformaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CommercialGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateProformaDto, createdBy: string): Promise<any> {
    // 1. Generate proforma number
    const year = new Date().getFullYear().toString();
    const dir = dto.direction === 'SALES' ? 'SALES' : 'PUR';
    const seqKey = REDIS_KEYS.commercialProformaSeq(dto.zoneId, dir, year);
    const seq = await this.redis.incr(seqKey);
    const proformaNumber = `PF-${dir}-${year}-${seq.toString().padStart(4, '0')}`;

    // 2. Validate dates
    if (dto.validUntil <= dto.issueDate) {
      throw new AppException('PROFORMA_DATE_INVALID');
    }

    // 3. Calculate line totals
    let totalBeforeDiscount = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const lineResults = dto.lines.map((line) => {
      const calc = calculateLineTotals(
        line.quantity,
        line.unitPrice,
        line.discount || 0,
        line.taxRate ?? 9,
      );
      totalBeforeDiscount += calc.lineSubtotal;
      totalDiscount += calc.lineDiscount;
      totalTax += calc.lineTax;
      grandTotal += calc.lineTotal;
      return { ...line, ...calc };
    });

    // 4. Calculate grandTotalBaseCurrency
    const exchangeRate = dto.exchangeRate || 1;
    const grandTotalBaseCurrency = Math.round(grandTotal * exchangeRate);

    // 5. Credit limit check if direction=SALES
    let creditWarning = false;
    if (dto.direction === 'SALES' && dto.partyId) {
      const party = await this.prisma.commercialParty.findUnique({
        where: { id: dto.partyId },
      });
      if (party) {
        const creditCheck = checkCreditLimit(
          Number(party.creditLimit),
          Number(party.creditUsed),
          grandTotal,
        );
        creditWarning = creditCheck.warning;
      }
    }

    // 6. Create Proforma + lines
    const proforma = await this.prisma.proforma.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        proformaNumber,
        direction: dto.direction as any,
        status: 'DRAFT',
        partyId: dto.partyId,
        partyName: dto.partyName,
        partyCode: dto.partyCode,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        issueDate: dto.issueDate,
        validUntil: dto.validUntil,
        deliveryDate: dto.deliveryDate,
        deliveryLocation: dto.deliveryLocation,
        paymentTerms: dto.paymentTerms,
        incoterm: dto.incoterm,
        currencyCode: dto.currencyCode || 'IRR',
        exchangeRate: new Prisma.Decimal(exchangeRate),
        totalBeforeDiscount: BigInt(totalBeforeDiscount),
        totalDiscount: BigInt(totalDiscount),
        totalTax: BigInt(totalTax),
        grandTotal: BigInt(grandTotal),
        grandTotalBaseCurrency: BigInt(grandTotalBaseCurrency),
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        rfqId: dto.rfqId,
        bidId: dto.bidId,
        tags: dto.tags || [],
        createdBy,
        lines: {
          create: lineResults.map((line) => ({
            lineNumber: line.lineNumber,
            itemCode: line.itemCode,
            itemName: line.itemName,
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unit: line.unit,
            unitPrice: BigInt(line.unitPrice),
            discount: new Prisma.Decimal(line.discount || 0),
            taxRate: new Prisma.Decimal(line.taxRate ?? 9),
            lineSubtotal: BigInt(line.lineSubtotal),
            lineDiscount: BigInt(line.lineDiscount),
            lineTax: BigInt(line.lineTax),
            lineTotal: BigInt(line.lineTotal),
            notes: line.notes,
          })),
        },
      },
      include: { lines: true },
    });

    // 7. Audit
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: proforma.id,
      targetType: 'Proforma',
      action: 'PROFORMA_CREATED',
      metadata: { proformaNumber, direction: dto.direction, grandTotal, partyName: dto.partyName },
    });

    // 8. Emit event
    this.gateway.emitProformaCreated({
      companyId: dto.companyId,
      proformaId: proforma.id,
      proformaNumber,
      direction: dto.direction,
      partyName: dto.partyName,
      grandTotal,
    });

    return { ...proforma, creditWarning };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT FOR APPROVAL
  // ═══════════════════════════════════════════════════════════════════════════

  async submitForApproval(dto: SubmitProformaApprovalDto, submittedBy: string): Promise<any> {
    const proforma = await this.findById(dto.proformaId);

    if (proforma.status !== 'DRAFT') {
      throw new AppException('PROFORMA_INVALID_STATUS', {
        details: { currentStatus: proforma.status, requiredStatus: 'DRAFT' },
      });
    }

    // 1. Determine approval chain
    const steps = getApprovalSteps(Number(proforma.grandTotal));

    // 2. Create approval steps
    for (const step of steps) {
      await this.prisma.proformaApprovalStep.create({
        data: {
          proformaId: dto.proformaId,
          stepOrder: step.stepOrder,
          roleFa: step.roleFa,
          status: 'PENDING',
        },
      });
    }

    // 3. Update status
    const updated = await this.prisma.proforma.update({
      where: { id: dto.proformaId },
      data: { status: 'PENDING_INTERNAL_APPROVAL' },
      include: { lines: true, approvalChain: true },
    });

    // 4. Audit
    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: submittedBy,
      targetId: dto.proformaId,
      targetType: 'Proforma',
      action: 'PROFORMA_SUBMITTED',
      metadata: { proformaNumber: proforma.proformaNumber, stepsCount: steps.length },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE STEP
  // ═══════════════════════════════════════════════════════════════════════════

  async approveStep(
    dto: ApproveProformaStepDto,
    approverId: string,
    zoneId: string,
  ): Promise<any> {
    const step = await this.prisma.proformaApprovalStep.findFirst({
      where: { proformaId: dto.proformaId || '', stepOrder: dto.stepOrder },
    });

    if (!step) {
      throw new AppException('PROFORMA_NOT_FOUND');
    }

    const proforma = await this.findById(step.proformaId);

    if (proforma.status !== 'PENDING_INTERNAL_APPROVAL') {
      throw new AppException('PROFORMA_INVALID_STATUS');
    }

    // Update step
    const updatedStep = await this.prisma.proformaApprovalStep.update({
      where: { id: step.id },
      data: {
        status: dto.status as any,
        approvedAt: new Date(),
        comment: dto.comment,
        assigneeId: approverId,
      },
    });

    if (dto.status === 'REJECTED') {
      // Reset to DRAFT
      await this.prisma.proforma.update({
        where: { id: step.proformaId },
        data: { status: 'DRAFT' },
      });

      await this.audit.log({
        zoneId,
        userId: approverId,
        targetId: step.proformaId,
        targetType: 'Proforma',
        action: 'PROFORMA_STEP_REJECTED',
        metadata: { stepOrder: dto.stepOrder, comment: dto.comment },
      });

      return this.findById(step.proformaId);
    }

    // Check if all steps approved
    const allSteps = await this.prisma.proformaApprovalStep.findMany({
      where: { proformaId: step.proformaId },
      orderBy: { stepOrder: 'asc' },
    });

    const allApproved = allSteps.every((s) => s.status === 'APPROVED');

    if (allApproved) {
      await this.prisma.proforma.update({
        where: { id: step.proformaId },
        data: { status: 'INTERNALLY_APPROVED' },
      });

      this.gateway.emitProformaInternallyApproved({
        companyId: proforma.companyId,
        proformaId: proforma.id,
        proformaNumber: proforma.proformaNumber,
        grandTotal: Number(proforma.grandTotal),
      });
    }

    this.gateway.emitProformaStepApproved({
      companyId: proforma.companyId,
      proformaId: proforma.id,
      stepOrder: dto.stepOrder,
      roleFa: step.roleFa,
      comment: dto.comment,
    });

    await this.audit.log({
      zoneId,
      userId: approverId,
      targetId: step.proformaId,
      targetType: 'Proforma',
      action: 'PROFORMA_STEP_APPROVED',
      metadata: { stepOrder: dto.stepOrder, roleFa: step.roleFa },
    });

    return this.findById(step.proformaId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK SENT TO PARTY
  // ═══════════════════════════════════════════════════════════════════════════

  async markSentToParty(id: string, sentBy: string): Promise<any> {
    const proforma = await this.findById(id);

    if (proforma.status !== 'INTERNALLY_APPROVED') {
      throw new AppException('PROFORMA_INVALID_STATUS', {
        details: { currentStatus: proforma.status, requiredStatus: 'INTERNALLY_APPROVED' },
      });
    }

    const updated = await this.prisma.proforma.update({
      where: { id },
      data: { status: 'SENT_TO_PARTY' },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: sentBy,
      targetId: id,
      targetType: 'Proforma',
      action: 'PROFORMA_SENT_TO_PARTY',
      metadata: { proformaNumber: proforma.proformaNumber },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORD PARTY RESPONSE
  // ═══════════════════════════════════════════════════════════════════════════

  async recordPartyResponse(
    id: string,
    dto: RecordPartyResponseDto,
    recordedBy: string,
  ): Promise<any> {
    const proforma = await this.findById(id);

    if (proforma.status !== 'SENT_TO_PARTY') {
      throw new AppException('PROFORMA_INVALID_STATUS', {
        details: { currentStatus: proforma.status, requiredStatus: 'SENT_TO_PARTY' },
      });
    }

    const newStatus = dto.accepted ? 'PARTY_ACCEPTED' : 'PARTY_REJECTED';

    const updated = await this.prisma.proforma.update({
      where: { id },
      data: {
        status: newStatus as any,
        partyResponse: dto.accepted ? 'ACCEPTED' : 'REJECTED',
        partyResponseNote: dto.note,
        partyResponseAt: new Date(),
        partyRespondedBy: recordedBy,
      },
      include: { lines: true },
    });

    if (dto.accepted) {
      this.gateway.emitProformaPartyAccepted({
        companyId: proforma.companyId,
        proformaId: id,
        proformaNumber: proforma.proformaNumber,
        partyName: proforma.partyName,
      });
    } else {
      this.gateway.emitProformaPartyRejected({
        companyId: proforma.companyId,
        proformaId: id,
        proformaNumber: proforma.proformaNumber,
        partyName: proforma.partyName,
        note: dto.note,
      });
    }

    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: recordedBy,
      targetId: id,
      targetType: 'Proforma',
      action: dto.accepted ? 'PROFORMA_PARTY_ACCEPTED' : 'PROFORMA_PARTY_REJECTED',
      metadata: { proformaNumber: proforma.proformaNumber, note: dto.note },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVISE
  // ═══════════════════════════════════════════════════════════════════════════

  async revise(id: string, dto: ReviseProformaDto, revisedBy: string): Promise<any> {
    const proforma = await this.findById(id);

    // 1. Save snapshot as ProformaVersion
    await this.prisma.proformaVersion.create({
      data: {
        proformaId: id,
        versionNumber: proforma.currentVersion,
        changeNote: dto.changeNote,
        snapshot: {
          lines: proforma.lines,
          totalBeforeDiscount: proforma.totalBeforeDiscount.toString(),
          totalDiscount: proforma.totalDiscount.toString(),
          totalTax: proforma.totalTax.toString(),
          grandTotal: proforma.grandTotal.toString(),
          notes: proforma.notes,
          validUntil: proforma.validUntil,
        },
        createdBy: revisedBy,
      },
    });

    // 2. Update proforma if new lines provided
    const updateData: any = {
      currentVersion: proforma.currentVersion + 1,
      status: 'DRAFT',
      approvalChain: { deleteMany: {} },
    };

    if (dto.validUntil) updateData.validUntil = dto.validUntil;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.lines) {
      // Delete old lines and create new ones
      await this.prisma.proformaLine.deleteMany({ where: { proformaId: id } });

      let totalBeforeDiscount = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let grandTotal = 0;

      const lineResults = dto.lines.map((line) => {
        const calc = calculateLineTotals(
          line.quantity,
          line.unitPrice,
          line.discount || 0,
          line.taxRate ?? 9,
        );
        totalBeforeDiscount += calc.lineSubtotal;
        totalDiscount += calc.lineDiscount;
        totalTax += calc.lineTax;
        grandTotal += calc.lineTotal;
        return { ...line, ...calc };
      });

      updateData.totalBeforeDiscount = BigInt(totalBeforeDiscount);
      updateData.totalDiscount = BigInt(totalDiscount);
      updateData.totalTax = BigInt(totalTax);
      updateData.grandTotal = BigInt(grandTotal);
      updateData.grandTotalBaseCurrency = BigInt(
        Math.round(grandTotal * Number(proforma.exchangeRate)),
      );

      for (const line of lineResults) {
        await this.prisma.proformaLine.create({
          data: {
            proformaId: id,
            lineNumber: line.lineNumber,
            itemCode: line.itemCode,
            itemName: line.itemName,
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unit: line.unit,
            unitPrice: BigInt(line.unitPrice),
            discount: new Prisma.Decimal(line.discount || 0),
            taxRate: new Prisma.Decimal(line.taxRate ?? 9),
            lineSubtotal: BigInt(line.lineSubtotal),
            lineDiscount: BigInt(line.lineDiscount),
            lineTax: BigInt(line.lineTax),
            lineTotal: BigInt(line.lineTotal),
            notes: line.notes,
          },
        });
      }
    }

    await this.prisma.proforma.update({ where: { id }, data: updateData });

    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: revisedBy,
      targetId: id,
      targetType: 'Proforma',
      action: 'PROFORMA_REVISED',
      metadata: { proformaNumber: proforma.proformaNumber, changeNote: dto.changeNote },
    });

    return this.findById(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERT TO ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  async convertToOrder(id: string, convertedBy: string): Promise<any> {
    const proforma = await this.findById(id);

    if (proforma.status !== 'PARTY_ACCEPTED') {
      throw new AppException('PROFORMA_NOT_PARTY_ACCEPTED');
    }

    if (proforma.convertedToOrderId) {
      throw new AppException('PROFORMA_ALREADY_CONVERTED');
    }

    // Generate order number
    const year = new Date().getFullYear().toString();
    const dir = proforma.direction === 'SALES' ? 'SO' : 'PO';
    const seqKey = REDIS_KEYS.commercialOrderSeq(proforma.zoneId, dir, year);
    const seq = await this.redis.incr(seqKey);
    const orderNumber = `${dir}-${year}-${seq.toString().padStart(4, '0')}`;

    // Create CommercialOrder
    const order = await this.prisma.commercialOrder.create({
      data: {
        zoneId: proforma.zoneId,
        companyId: proforma.companyId,
        orderNumber,
        direction: proforma.direction as any,
        proformaId: id,
        rfqId: proforma.rfqId,
        bidId: proforma.bidId,
        partyId: proforma.partyId,
        partyName: proforma.partyName,
        partyCode: proforma.partyCode,
        status: 'CONFIRMED',
        totalBeforeDiscount: proforma.totalBeforeDiscount,
        totalDiscount: proforma.totalDiscount,
        totalTax: proforma.totalTax,
        grandTotal: proforma.grandTotal,
        currencyCode: proforma.currencyCode,
        exchangeRate: proforma.exchangeRate,
        paymentTerms: proforma.paymentTerms,
        deliveryDate: proforma.deliveryDate || '',
        deliveryLocation: proforma.deliveryLocation || '',
        createdBy: convertedBy,
        lines: {
          create: proforma.lines.map((line) => ({
            lineNumber: line.lineNumber,
            itemCode: line.itemCode,
            itemName: line.itemName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            taxRate: line.taxRate,
            lineSubtotal: line.lineSubtotal,
            lineDiscount: line.lineDiscount,
            lineTax: line.lineTax,
            lineTotal: line.lineTotal,
            unit: line.unit,
          })),
        },
      },
      include: { lines: true },
    });

    // Update proforma
    await this.prisma.proforma.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedToOrderId: order.id,
      },
    });

    // Emit event
    this.gateway.emitProformaConverted({
      companyId: proforma.companyId,
      proformaId: id,
      orderId: order.id,
      orderNumber,
    });

    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: convertedBy,
      targetId: id,
      targetType: 'Proforma',
      action: 'PROFORMA_CONVERTED',
      metadata: { proformaNumber: proforma.proformaNumber, orderNumber },
    });

    return order;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════════════════

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const proforma = await this.findById(id);

    if (['CONVERTED', 'CANCELLED'].includes(proforma.status)) {
      throw new AppException('PROFORMA_INVALID_STATUS');
    }

    const updated = await this.prisma.proforma.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: `${proforma.notes || ''}\nلغو شده: ${reason}`,
      },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: proforma.zoneId,
      userId: cancelledBy,
      targetId: id,
      targetType: 'Proforma',
      action: 'PROFORMA_CANCELLED',
      metadata: { proformaNumber: proforma.proformaNumber, reason },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterProformaDto): Promise<any> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.direction) where.direction = filter.direction;
    if (filter.status) where.status = filter.status;
    if (filter.partyId) where.partyId = filter.partyId;

    if (filter.expiringWithin7Days) {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.status = 'SENT_TO_PARTY';
      where.validUntil = { lte: weekLater.toISOString().split('T')[0] };
    }

    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }

    if (filter.search) {
      where.OR = [
        { proformaNumber: { contains: filter.search, mode: 'insensitive' } },
        { partyName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;

    const data = await this.prisma.proforma.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { lines: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const proforma = await this.prisma.proforma.findUnique({
      where: { id },
      include: { lines: true, approvalChain: true },
    });

    if (!proforma) {
      throw new AppException('PROFORMA_NOT_FOUND');
    }

    return proforma;
  }

  async getExpiringProformas(zoneId: string, withinDays: number): Promise<any[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + withinDays);

    return this.prisma.proforma.findMany({
      where: {
        zoneId,
        status: 'SENT_TO_PARTY',
        validUntil: {
          lte: targetDate.toISOString().split('T')[0],
          gte: new Date().toISOString().split('T')[0],
        },
      },
      include: { lines: true },
    });
  }

  async getDashboardStats(zoneId: string, companyId?: string): Promise<any> {
    const where: any = { zoneId, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const all = await this.prisma.proforma.findMany({ where });

    const byStatus = (status: string) => all.filter((p) => p.status === status).length;

    const sentToParty = all.filter((p) => p.status === 'SENT_TO_PARTY');
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringIn7Days = sentToParty.filter(
      (p) => new Date(p.validUntil) <= sevenDaysLater,
    ).length;

    const salesValue = all
      .filter((p) => p.direction === 'SALES' && p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + Number(p.grandTotal), 0);

    const purchaseValue = all
      .filter((p) => p.direction === 'PURCHASE' && p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + Number(p.grandTotal), 0);

    const converted = byStatus('CONVERTED');
    const total = all.length;

    return {
      total,
      draft: byStatus('DRAFT'),
      pendingApproval: byStatus('PENDING_INTERNAL_APPROVAL'),
      internallyApproved: byStatus('INTERNALLY_APPROVED'),
      sentToParty: byStatus('SENT_TO_PARTY'),
      partyAccepted: byStatus('PARTY_ACCEPTED'),
      converted,
      expired: byStatus('EXPIRED'),
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      avgApprovalHours: 0,
      expiringIn7Days,
      byDirection: {
        sales: all.filter((p) => p.direction === 'SALES').length,
        purchase: all.filter((p) => p.direction === 'PURCHASE').length,
      },
      totalSalesValue: salesValue,
      totalPurchaseValue: purchaseValue,
    };
  }

  async uploadAttachment(
    proformaId: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<any> {
    const proforma = await this.findById(proformaId);
    const ext = file.originalname.split('.').pop() || 'bin';
    const fileKey = `proforma-docs/${proformaId}/${crypto.randomUUID()}.${ext}`;

    const attachment = await this.prisma.proformaAttachment.create({
      data: {
        proformaId,
        fileName: file.originalname,
        fileKey,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
      },
    });

    return attachment;
  }

  async getVersions(proformaId: string): Promise<any[]> {
    return this.prisma.proformaVersion.findMany({
      where: { proformaId },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
