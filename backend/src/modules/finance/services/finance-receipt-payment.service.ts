import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CreateReceiptPaymentDocDto,
  CreateReceiptPaymentLineDto,
  UpdateReceiptPaymentDocDto,
} from '../dto/receipt-payment.dto';

/**
 * Receipt / payment documents (Step 7 / TASK A).
 *
 * One table serves all six `docType` variants and all three `type` values,
 * because the frontend posts them all to the single path
 * `/finance/receipt-payment-docs`.
 *
 * `totalAmount` is RE-DERIVED from `lines` whenever lines are supplied, so a
 * header that disagrees with its own allocations cannot be stored. With no
 * lines (a plain cash receipt) the posted amount stands, because there is
 * nothing to derive it from.
 *
 * Money columns are BigInt; `exchangeRate` is a rate, so it stays `Float`.
 * Dates travel as ISO `YYYY-MM-DD` and blank values fall back — the store posts
 * `statusChangeDate: ''` for an untouched document.
 *
 * Every read is zone-scoped.
 */
@Injectable()
export class FinanceReceiptPaymentService {
  private readonly logger = new Logger(FinanceReceiptPaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  private static toBig(value: number | undefined | null, fallback = 0): bigint {
    return BigInt(Math.round(value ?? fallback));
  }

  private static toNum(value: bigint | number | null | undefined): number | undefined {
    if (value === null || value === undefined) return undefined;
    return Number(value);
  }

  private static toDate(value: string | undefined | null, fallback: string): Date {
    const raw = (value ?? '').trim();
    const parsed = new Date(raw || fallback);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(fallback || new Date().toISOString().slice(0, 10));
    }
    return parsed;
  }

  private static toDateOrNull(value: string | undefined | null): Date | null {
    const raw = (value ?? '').trim();
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private static dateOnly(value: Date | null | undefined): string {
    return value ? value.toISOString().slice(0, 10) : '';
  }

  /** Sums the allocations; mirrors what the store's own form computes. */
  private static sumLines(lines: CreateReceiptPaymentLineDto[] | undefined): number | null {
    if (!lines || lines.length === 0) return null;
    return lines.reduce((total, line) => total + (line.amount ?? 0), 0);
  }

  /** Returns exactly the fields the frontend `ReceiptPaymentDoc` declares. */
  private static present(doc: any): Record<string, unknown> {
    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      docType: doc.docType,
      date: FinanceReceiptPaymentService.dateOnly(doc.date),
      type: doc.type,
      status: doc.status,
      statusChangeDate: FinanceReceiptPaymentService.dateOnly(doc.statusChangeDate),
      entityId: doc.entityId ?? '',
      entityName: doc.entityName ?? '',
      entityType: doc.entityType,
      instrumentType: doc.instrumentType,
      checkId: doc.checkId ?? undefined,
      checkNumber: doc.checkNumber ?? undefined,
      checkDate: FinanceReceiptPaymentService.dateOnly(doc.checkDate),
      bankName: doc.bankName ?? undefined,
      bankBranch: doc.bankBranch ?? undefined,
      bankAccountId: doc.bankAccountId ?? undefined,
      transactionRef: doc.transactionRef ?? undefined,
      totalAmount: Number(doc.totalAmount ?? 0),
      currency: doc.currency,
      exchangeRate: doc.exchangeRate ?? 1,
      lines: (doc.lines ?? []).map((line: any) => ({
        id: line.id,
        accountId: line.accountId ?? '',
        accountCode: line.accountCode ?? '',
        accountName: line.accountName ?? '',
        amount: Number(line.amount ?? 0),
        description: line.description ?? '',
        projectId: line.projectId ?? undefined,
        costCenterId: line.costCenterId ?? undefined,
      })),
      parentDocumentId: doc.parentDocumentId ?? undefined,
      parentDocNumber: doc.parentDocNumber ?? undefined,
      isPartial: doc.isPartial ?? false,
      remainingAmount: FinanceReceiptPaymentService.toNum(doc.remainingAmount),
      preparedBy: doc.preparedBy ?? '',
      approvedBy: doc.approvedBy ?? undefined,
      postedBy: doc.postedBy ?? undefined,
      notes: doc.notes ?? '',
      description: doc.description ?? '',
      glVoucherId: doc.glVoucherId ?? undefined,
      cancelReason: doc.cancelReason ?? undefined,
      bounceReason: doc.bounceReason ?? undefined,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    };
  }

  private static lineData(
    line: CreateReceiptPaymentLineDto,
  ): {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: bigint;
    description: string;
    projectId: string | null;
    costCenterId: string | null;
  } {
    return {
      accountId: line.accountId ?? '',
      accountCode: line.accountCode ?? '',
      accountName: line.accountName ?? '',
      amount: FinanceReceiptPaymentService.toBig(line.amount),
      description: line.description ?? '',
      projectId: line.projectId ?? null,
      costCenterId: line.costCenterId ?? null,
    };
  }

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.financeReceiptPaymentDoc.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    return rows.map((row) => FinanceReceiptPaymentService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeReceiptPaymentDoc.findFirst({
      where: { id, zoneId },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    if (!row) throw new AppException('FINANCE_RECEIPT_PAYMENT_DOC_NOT_FOUND');
    return FinanceReceiptPaymentService.present(row);
  }

  async create(
    zoneId: string,
    dto: CreateReceiptPaymentDocDto,
  ): Promise<Record<string, unknown>> {
    const date = FinanceReceiptPaymentService.toDate(
      dto.date,
      new Date().toISOString().slice(0, 10),
    );
    const isoDate = date.toISOString().slice(0, 10);
    const derivedTotal = FinanceReceiptPaymentService.sumLines(dto.lines);
    const totalAmount = derivedTotal ?? dto.totalAmount ?? 0;

    const row = await this.prisma.financeReceiptPaymentDoc.create({
      data: {
        zoneId,
        documentNumber: dto.documentNumber,
        docType: (dto.docType ?? 'cash_receipt') as any,
        date,
        type: (dto.type ?? (dto.docType?.includes('payment') ? 'payment' : 'receipt')) as any,
        status: (dto.status ?? 'draft') as any,
        statusChangeDate: FinanceReceiptPaymentService.toDate(dto.statusChangeDate, isoDate),
        entityId: dto.entityId ?? '',
        entityName: dto.entityName ?? '',
        entityType: (dto.entityType ?? 'other') as any,
        instrumentType: (dto.instrumentType ?? 'cash') as any,
        checkId: dto.checkId,
        checkNumber: dto.checkNumber,
        checkDate: FinanceReceiptPaymentService.toDateOrNull(dto.checkDate),
        bankName: dto.bankName,
        bankBranch: dto.bankBranch,
        bankAccountId: dto.bankAccountId,
        transactionRef: dto.transactionRef,
        totalAmount: FinanceReceiptPaymentService.toBig(totalAmount),
        currency: (dto.currency ?? 'IRR') as any,
        exchangeRate: dto.exchangeRate ?? 1,
        parentDocumentId: dto.parentDocumentId,
        parentDocNumber: dto.parentDocNumber,
        isPartial: dto.isPartial ?? false,
        remainingAmount:
          dto.remainingAmount === undefined
            ? null
            : FinanceReceiptPaymentService.toBig(dto.remainingAmount),
        preparedBy: dto.preparedBy ?? '',
        approvedBy: dto.approvedBy,
        postedBy: dto.postedBy,
        notes: dto.notes ?? '',
        description: dto.description ?? '',
        glVoucherId: dto.glVoucherId,
        cancelReason: dto.cancelReason,
        bounceReason: dto.bounceReason,
        lines:
          dto.lines && dto.lines.length
            ? { create: dto.lines.map((line) => FinanceReceiptPaymentService.lineData(line)) }
            : undefined,
      },
      include: { lines: { orderBy: { id: 'asc' } } },
    });

    this.logger.log(
      `receipt/payment created zone=${zoneId} no=${dto.documentNumber} total=${totalAmount}` +
        (derivedTotal !== null ? ' (derived from lines)' : ''),
    );
    return FinanceReceiptPaymentService.present(row);
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateReceiptPaymentDocDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.financeReceiptPaymentDoc.findFirst({
      where: { id, zoneId },
      include: { lines: true },
    });
    if (!existing) throw new AppException('FINANCE_RECEIPT_PAYMENT_DOC_NOT_FOUND');

    const linesProvided = dto.lines !== undefined;
    const derivedTotal = linesProvided ? FinanceReceiptPaymentService.sumLines(dto.lines) : null;
    const totalAmount = derivedTotal ?? dto.totalAmount ?? Number(existing.totalAmount ?? 0);

    const data: Record<string, unknown> = {
      ...(dto.documentNumber !== undefined && { documentNumber: dto.documentNumber }),
      ...(dto.docType !== undefined && { docType: dto.docType }),
      ...(dto.date !== undefined && { date: FinanceReceiptPaymentService.toDate(dto.date, dto.date) }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.statusChangeDate !== undefined && {
        statusChangeDate: FinanceReceiptPaymentService.toDate(
          dto.statusChangeDate,
          dto.statusChangeDate,
        ),
      }),
      ...(dto.entityId !== undefined && { entityId: dto.entityId }),
      ...(dto.entityName !== undefined && { entityName: dto.entityName }),
      ...(dto.entityType !== undefined && { entityType: dto.entityType }),
      ...(dto.instrumentType !== undefined && { instrumentType: dto.instrumentType }),
      ...(dto.checkId !== undefined && { checkId: dto.checkId }),
      ...(dto.checkNumber !== undefined && { checkNumber: dto.checkNumber }),
      ...(dto.checkDate !== undefined && {
        checkDate: FinanceReceiptPaymentService.toDateOrNull(dto.checkDate),
      }),
      ...(dto.bankName !== undefined && { bankName: dto.bankName }),
      ...(dto.bankBranch !== undefined && { bankBranch: dto.bankBranch }),
      ...(dto.bankAccountId !== undefined && { bankAccountId: dto.bankAccountId }),
      ...(dto.transactionRef !== undefined && { transactionRef: dto.transactionRef }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
      ...(dto.parentDocumentId !== undefined && { parentDocumentId: dto.parentDocumentId }),
      ...(dto.parentDocNumber !== undefined && { parentDocNumber: dto.parentDocNumber }),
      ...(dto.isPartial !== undefined && { isPartial: dto.isPartial }),
      ...(dto.remainingAmount !== undefined && {
        remainingAmount: FinanceReceiptPaymentService.toBig(dto.remainingAmount),
      }),
      ...(dto.preparedBy !== undefined && { preparedBy: dto.preparedBy }),
      ...(dto.approvedBy !== undefined && { approvedBy: dto.approvedBy }),
      ...(dto.postedBy !== undefined && { postedBy: dto.postedBy }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.glVoucherId !== undefined && { glVoucherId: dto.glVoucherId }),
      ...(dto.cancelReason !== undefined && { cancelReason: dto.cancelReason }),
      ...(dto.bounceReason !== undefined && { bounceReason: dto.bounceReason }),
      totalAmount: FinanceReceiptPaymentService.toBig(totalAmount),
    };

    if (linesProvided) {
      // Replace the allocation set wholesale: that is what re-allocating a
      // document means to the caller, and it keeps ids from accumulating.
      await this.prisma.financeReceiptPaymentLine.deleteMany({ where: { docId: id } });
      if (dto.lines && dto.lines.length) {
        data.lines = { create: dto.lines.map((line) => FinanceReceiptPaymentService.lineData(line)) };
      }
    }

    const row = await this.prisma.financeReceiptPaymentDoc.update({
      where: { id },
      data: data as any,
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    return FinanceReceiptPaymentService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.financeReceiptPaymentDoc.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_RECEIPT_PAYMENT_DOC_NOT_FOUND');
    await this.prisma.financeReceiptPaymentDoc.delete({ where: { id } });
  }
}
