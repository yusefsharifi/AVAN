import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CreateDocumentLineDto,
  CreateFinanceDocumentDto,
  UpdateFinanceDocumentDto,
} from '../dto/finance-document.dto';

interface ComputedLine {
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: bigint;
  discount: bigint;
  taxRate: number;
  lineTotal: bigint;
  warehouseId: string | null;
  projectId: string | null;
  costCenterId: string | null;
  notes: string;
}

interface Totals {
  totalBeforeDiscount: bigint;
  totalDiscount: bigint;
  totalTax: bigint;
  grandTotal: bigint;
}

/**
 * Purchase/sales document register (Step 6 / TASK C — R5).
 *
 * ONE table serves both kinds (`kind` = 'purchase' | 'sales'), because the
 * frontend posts `createPurchase` and `createSales` to the same path
 * (`/finance/documents`) and the two interfaces are the same header with the
 * vendor pair swapped for the buyer pair.
 *
 * Totals are RE-DERIVED from the lines on every write. The store already sends
 * its own `totalBeforeDiscount` / `totalDiscount` / `totalTax` / `grandTotal`,
 * but a header that disagrees with its own lines must not reach storage — the
 * formulas below mirror the store's exactly, so an honest client sees no change.
 */
@Injectable()
export class FinanceDocumentService {
  private readonly logger = new Logger(FinanceDocumentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private static toBig(value: number | undefined | null, fallback = 0): bigint {
    return BigInt(Math.round(value ?? fallback));
  }

  private static toNum(value: bigint | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
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

  private static dateOnly(value: Date | null | undefined): string {
    return value ? value.toISOString().slice(0, 10) : '';
  }

  /**
   * The wire carries one shared `type` union; storage splits it into
   * `purchaseType` / `salesType` so a single column never holds both shapes.
   * `kind` is explicit when given, otherwise inferred from `type`.
   */
  private static resolveKind(
    dto: { kind?: 'purchase' | 'sales'; type?: string; salesType?: unknown; purchaseType?: unknown },
  ): 'purchase' | 'sales' {
    if (dto.kind === 'purchase' || dto.kind === 'sales') return dto.kind;
    if (dto.type) return dto.type.startsWith('sales') ? 'sales' : 'purchase';
    if (dto.salesType) return 'sales';
    if (dto.purchaseType) return 'purchase';
    return 'purchase';
  }

  /** Mirrors the store's four reductions over the line items. */
  private static compute(lines: CreateDocumentLineDto[]): {
    rows: ComputedLine[];
    totals: Totals;
  } {
    let totalBeforeDiscount = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const rows: ComputedLine[] = lines.map((line) => {
      const quantity = line.quantity ?? 1;
      const unitPrice = line.unitPrice ?? 0;
      const discountPct = line.discount ?? 0;
      const taxPct = line.taxRate ?? 0;

      const before = quantity * unitPrice;
      const discount = before * (discountPct / 100);
      const tax = before * (1 - discountPct / 100) * (taxPct / 100);

      totalBeforeDiscount += before;
      totalDiscount += discount;
      totalTax += tax;

      return {
        itemCode: line.itemCode,
        itemName: line.itemName,
        quantity,
        unitPrice: FinanceDocumentService.toBig(unitPrice),
        discount: FinanceDocumentService.toBig(discount),
        taxRate: taxPct,
        lineTotal: FinanceDocumentService.toBig(before - discount + tax),
        warehouseId: line.warehouseId ?? null,
        projectId: line.projectId ?? null,
        costCenterId: line.costCenterId ?? null,
        notes: line.notes ?? '',
      };
    });

    return {
      rows,
      totals: {
        totalBeforeDiscount: FinanceDocumentService.toBig(totalBeforeDiscount),
        totalDiscount: FinanceDocumentService.toBig(totalDiscount),
        totalTax: FinanceDocumentService.toBig(totalTax),
        grandTotal: FinanceDocumentService.toBig(
          totalBeforeDiscount - totalDiscount + totalTax,
        ),
      },
    };
  }

  /** Rows -> the shape of the frontend `PurchaseDocument` / `SalesDocument`. */
  private static present(doc: any): Record<string, unknown> {
    const kind = doc.kind as string;
    return {
      id: doc.id,
      kind,
      documentNumber: doc.documentNumber,
      date: FinanceDocumentService.dateOnly(doc.date),
      notes: doc.notes ?? '',
      itemNumber: doc.itemNumber ?? '',
      lineCount: doc.lineCount,
      preparedBy: doc.preparedBy ?? '',
      approvedBy: doc.approvedBy ?? '',
      authorizedBy: doc.authorizedBy ?? '',
      status: doc.status,
      statusChangeDate: FinanceDocumentService.dateOnly(doc.statusChangeDate),
      accountingDocRef: doc.accountingDocRef ?? undefined,
      escrowRequired: doc.escrowRequired,
      visitorName: doc.visitorName ?? '',
      type: kind === 'sales' ? doc.salesType : doc.purchaseType,
      vendorName: doc.vendorName ?? undefined,
      vendorCode: doc.vendorCode ?? undefined,
      payableAmount: FinanceDocumentService.toNum(doc.payableAmount),
      buyerName: doc.buyerName ?? undefined,
      buyerCode: doc.buyerCode ?? undefined,
      receivableAmount: FinanceDocumentService.toNum(doc.receivableAmount),
      projectId: doc.projectId ?? undefined,
      costCenterId: doc.costCenterId ?? undefined,
      currencyCode: doc.currencyCode,
      exchangeRate: doc.exchangeRate,
      totalBeforeDiscount: FinanceDocumentService.toNum(doc.totalBeforeDiscount),
      totalDiscount: FinanceDocumentService.toNum(doc.totalDiscount),
      totalTax: FinanceDocumentService.toNum(doc.totalTax),
      grandTotal: FinanceDocumentService.toNum(doc.grandTotal),
      lines: (doc.lines ?? []).map((line: any) => ({
        id: line.id,
        itemCode: line.itemCode,
        itemName: line.itemName,
        quantity: line.quantity,
        unitPrice: FinanceDocumentService.toNum(line.unitPrice),
        discount: FinanceDocumentService.toNum(line.discount),
        taxRate: line.taxRate,
        lineTotal: FinanceDocumentService.toNum(line.lineTotal),
        warehouseId: line.warehouseId ?? undefined,
        projectId: line.projectId ?? undefined,
        costCenterId: line.costCenterId ?? undefined,
        notes: line.notes ?? '',
      })),
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
    };
  }

  private static lineConnect(
    rows: ComputedLine[],
  ): Prisma.DocumentLineUncheckedCreateWithoutDocumentInput[] {
    return rows.map((row) => ({ ...row }));
  }

  // ── CRUD (every read is zone-scoped) ──────────────────────────────────────

  async findAll(zoneId: string, kind?: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.financeDocument.findMany({
      where: { zoneId, ...(kind === 'purchase' || kind === 'sales' ? { kind } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    return rows.map((row) => FinanceDocumentService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeDocument.findFirst({
      where: { id, zoneId },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    if (!row) throw new AppException('FINANCE_DOCUMENT_NOT_FOUND');
    return FinanceDocumentService.present(row);
  }

  async create(zoneId: string, dto: CreateFinanceDocumentDto): Promise<Record<string, unknown>> {
    const kind = FinanceDocumentService.resolveKind(dto);
    const date = FinanceDocumentService.toDate(dto.date, new Date().toISOString().slice(0, 10));
    const isoDate = date.toISOString().slice(0, 10);

    const { rows, totals } = FinanceDocumentService.compute(dto.lines ?? []);
    const grandTotal = FinanceDocumentService.toNum(totals.grandTotal);

    const row = await this.prisma.financeDocument.create({
      data: {
        zoneId,
        documentNumber: dto.documentNumber,
        kind,
        date,
        status: dto.status ?? 'draft',
        statusChangeDate: FinanceDocumentService.toDate(dto.statusChangeDate, isoDate),
        purchaseType: kind === 'purchase' ? ((dto.purchaseType ?? dto.type) as any) : null,
        vendorName: dto.vendorName,
        vendorCode: dto.vendorCode,
        payableAmount:
          kind === 'purchase'
            ? dto.payableAmount !== undefined
              ? FinanceDocumentService.toBig(dto.payableAmount)
              : totals.grandTotal
            : null,
        salesType: kind === 'sales' ? ((dto.salesType ?? dto.type) as any) : null,
        buyerName: dto.buyerName,
        buyerCode: dto.buyerCode,
        receivableAmount:
          kind === 'sales'
            ? dto.receivableAmount !== undefined
              ? FinanceDocumentService.toBig(dto.receivableAmount)
              : totals.grandTotal
            : null,
        itemNumber: dto.itemNumber,
        lineCount: rows.length,
        notes: dto.notes ?? '',
        preparedBy: dto.preparedBy ?? '',
        approvedBy: dto.approvedBy ?? '',
        authorizedBy: dto.authorizedBy ?? '',
        accountingDocRef: dto.accountingDocRef,
        escrowRequired: dto.escrowRequired ?? false,
        visitorName: dto.visitorName ?? '',
        projectId: dto.projectId,
        costCenterId: dto.costCenterId,
        currencyCode: (dto.currencyCode ?? 'IRR') as any,
        exchangeRate: dto.exchangeRate ?? 1,
        totalBeforeDiscount: totals.totalBeforeDiscount,
        totalDiscount: totals.totalDiscount,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        lines: { create: FinanceDocumentService.lineConnect(rows) },
      },
      include: { lines: { orderBy: { id: 'asc' } } },
    });

    this.logger.log(
      `document created zone=${zoneId} kind=${kind} no=${dto.documentNumber} total=${grandTotal}`,
    );
    return FinanceDocumentService.present(row);
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateFinanceDocumentDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.financeDocument.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_DOCUMENT_NOT_FOUND');

    const linesProvided = dto.lines !== undefined;
    const { rows, totals } = FinanceDocumentService.compute(
      linesProvided ? dto.lines! : [],
    );
    const effective = linesProvided ? rows : null;
    const effectiveTotals = linesProvided
      ? totals
      : {
          totalBeforeDiscount: existing.totalBeforeDiscount,
          totalDiscount: existing.totalDiscount,
          totalTax: existing.totalTax,
          grandTotal: existing.grandTotal,
        };

    const kind = existing.kind;
    const data: Record<string, unknown> = {
      ...(dto.documentNumber !== undefined && { documentNumber: dto.documentNumber }),
      ...(dto.date !== undefined && {
        date: FinanceDocumentService.toDate(dto.date, dto.date),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.statusChangeDate !== undefined && {
        statusChangeDate: FinanceDocumentService.toDate(dto.statusChangeDate, dto.statusChangeDate),
      }),
      ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
      ...(dto.vendorCode !== undefined && { vendorCode: dto.vendorCode }),
      ...(dto.buyerName !== undefined && { buyerName: dto.buyerName }),
      ...(dto.buyerCode !== undefined && { buyerCode: dto.buyerCode }),
      ...(dto.itemNumber !== undefined && { itemNumber: dto.itemNumber }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.preparedBy !== undefined && { preparedBy: dto.preparedBy }),
      ...(dto.approvedBy !== undefined && { approvedBy: dto.approvedBy }),
      ...(dto.authorizedBy !== undefined && { authorizedBy: dto.authorizedBy }),
      ...(dto.accountingDocRef !== undefined && { accountingDocRef: dto.accountingDocRef }),
      ...(dto.escrowRequired !== undefined && { escrowRequired: dto.escrowRequired }),
      ...(dto.visitorName !== undefined && { visitorName: dto.visitorName }),
      ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
      ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
      totalBeforeDiscount: effectiveTotals.totalBeforeDiscount,
      totalDiscount: effectiveTotals.totalDiscount,
      totalTax: effectiveTotals.totalTax,
      grandTotal: effectiveTotals.grandTotal,
    };

    if (kind === 'purchase') {
      data.payableAmount =
        dto.payableAmount !== undefined
          ? FinanceDocumentService.toBig(dto.payableAmount)
          : effectiveTotals.grandTotal;
    } else {
      data.receivableAmount =
        dto.receivableAmount !== undefined
          ? FinanceDocumentService.toBig(dto.receivableAmount)
          : effectiveTotals.grandTotal;
    }

    if (effective) {
      data.lineCount = effective.length;
      await this.prisma.documentLine.deleteMany({ where: { documentId: id } });
    }

    const row = await this.prisma.financeDocument.update({
      where: { id },
      data: {
        ...data,
        ...(effective ? { lines: { create: FinanceDocumentService.lineConnect(effective) } } : {}),
      } as any,
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    return FinanceDocumentService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.financeDocument.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_DOCUMENT_NOT_FOUND');
    await this.prisma.financeDocument.delete({ where: { id } });
  }
}
