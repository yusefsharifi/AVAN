import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateFinanceCheckDto, UpdateFinanceCheckDto } from '../dto/check.dto';

/**
 * Cheques (Step 7 / TASK A).
 *
 * `amount` and `bouncePenaltyAmount` are BigInt in Prisma and plain numbers at
 * the boundary. Dates are stored as `DateTime` and travel as ISO `YYYY-MM-DD`
 * through the shared `@IsoDate()` decorator.
 *
 * `checkbookId` and `bankAccountId` are deliberately NOT foreign keys: the
 * store seeds checkbooks and bank accounts from local mocks that never exist
 * server-side, so an FK would turn a normal UI flow into a Prisma P2003 500.
 * Same for `rpDocumentId` / `glVoucherId` — see schema.prisma.
 *
 * Every read is zone-scoped.
 */
@Injectable()
export class FinanceCheckService {
  private readonly logger = new Logger(FinanceCheckService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Wire ISO `YYYY-MM-DD` -> Date. Blank is legal in the DTO (the store can
   * post `''`), and `new Date('')` is an Invalid Date Prisma rejects, so a
   * fallback is applied for required dates; optional ones pass `null` through.
   */
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

  private static toNum(value: bigint | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private static toBig(value: number | undefined | null, fallback = 0): bigint {
    return BigInt(Math.round(value ?? fallback));
  }

  /** Returns exactly the fields the frontend `Check` declares. */
  private static present(row: any): Record<string, unknown> {
    return {
      id: row.id,
      checkNumber: row.checkNumber,
      checkbookId: row.checkbookId ?? '',
      bankAccountId: row.bankAccountId ?? '',
      bankName: row.bankName ?? '',
      direction: row.direction,
      payeeName: row.payeeName ?? '',
      payerName: row.payerName ?? '',
      amount: FinanceCheckService.toNum(row.amount),
      currency: row.currency,
      issueDate: FinanceCheckService.dateOnly(row.issueDate),
      dueDate: FinanceCheckService.dateOnly(row.dueDate),
      clearanceDate: FinanceCheckService.dateOnly(row.clearanceDate),
      status: row.status,
      rpDocumentId: row.rpDocumentId ?? undefined,
      glVoucherId: row.glVoucherId ?? undefined,
      bounceReason: row.bounceReason ?? undefined,
      bounceDate: FinanceCheckService.dateOnly(row.bounceDate),
      bouncePenaltyAmount:
        row.bouncePenaltyAmount === null || row.bouncePenaltyAmount === undefined
          ? undefined
          : FinanceCheckService.toNum(row.bouncePenaltyAmount),
      notes: row.notes ?? '',
      createdBy: row.createdBy ?? '',
      createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
    };
  }

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.financeCheck.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => FinanceCheckService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeCheck.findFirst({ where: { id, zoneId } });
    if (!row) throw new AppException('FINANCE_CHECK_NOT_FOUND');
    return FinanceCheckService.present(row);
  }

  async create(zoneId: string, dto: CreateFinanceCheckDto): Promise<Record<string, unknown>> {
    const issueDate = FinanceCheckService.toDate(
      dto.issueDate,
      new Date().toISOString().slice(0, 10),
    );
    const row = await this.prisma.financeCheck.create({
      data: {
        zoneId,
        checkNumber: dto.checkNumber,
        checkbookId: dto.checkbookId ?? '',
        bankAccountId: dto.bankAccountId ?? '',
        bankName: dto.bankName ?? '',
        direction: dto.direction,
        payeeName: dto.payeeName ?? '',
        payerName: dto.payerName ?? '',
        amount: FinanceCheckService.toBig(dto.amount),
        currency: (dto.currency ?? 'IRR') as any,
        issueDate,
        dueDate: FinanceCheckService.toDate(dto.dueDate, issueDate.toISOString().slice(0, 10)),
        clearanceDate: FinanceCheckService.toDateOrNull(dto.clearanceDate),
        status: dto.status ?? 'issued',
        rpDocumentId: dto.rpDocumentId,
        glVoucherId: dto.glVoucherId,
        bounceReason: dto.bounceReason,
        bounceDate: FinanceCheckService.toDateOrNull(dto.bounceDate),
        bouncePenaltyAmount:
          dto.bouncePenaltyAmount === undefined
            ? null
            : FinanceCheckService.toBig(dto.bouncePenaltyAmount),
        notes: dto.notes ?? '',
        createdBy: dto.createdBy ?? '',
      },
    });
    this.logger.log(`check created zone=${zoneId} no=${dto.checkNumber}`);
    return FinanceCheckService.present(row);
  }

  async update(zoneId: string, id: string, dto: UpdateFinanceCheckDto): Promise<Record<string, unknown>> {
    const existing = await this.prisma.financeCheck.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_CHECK_NOT_FOUND');

    const row = await this.prisma.financeCheck.update({
      where: { id },
      data: {
        ...(dto.checkNumber !== undefined && { checkNumber: dto.checkNumber }),
        ...(dto.checkbookId !== undefined && { checkbookId: dto.checkbookId }),
        ...(dto.bankAccountId !== undefined && { bankAccountId: dto.bankAccountId }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.direction !== undefined && { direction: dto.direction }),
        ...(dto.payeeName !== undefined && { payeeName: dto.payeeName }),
        ...(dto.payerName !== undefined && { payerName: dto.payerName }),
        ...(dto.amount !== undefined && { amount: FinanceCheckService.toBig(dto.amount) }),
        ...(dto.currency !== undefined && { currency: dto.currency as any }),
        ...(dto.issueDate !== undefined && {
          issueDate: FinanceCheckService.toDate(dto.issueDate, dto.issueDate),
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: FinanceCheckService.toDate(dto.dueDate, dto.dueDate),
        }),
        ...(dto.clearanceDate !== undefined && {
          clearanceDate: FinanceCheckService.toDateOrNull(dto.clearanceDate),
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.rpDocumentId !== undefined && { rpDocumentId: dto.rpDocumentId }),
        ...(dto.glVoucherId !== undefined && { glVoucherId: dto.glVoucherId }),
        ...(dto.bounceReason !== undefined && { bounceReason: dto.bounceReason }),
        ...(dto.bounceDate !== undefined && {
          bounceDate: FinanceCheckService.toDateOrNull(dto.bounceDate),
        }),
        ...(dto.bouncePenaltyAmount !== undefined && {
          bouncePenaltyAmount: FinanceCheckService.toBig(dto.bouncePenaltyAmount),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.createdBy !== undefined && { createdBy: dto.createdBy }),
      },
    });
    return FinanceCheckService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.financeCheck.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_CHECK_NOT_FOUND');
    await this.prisma.financeCheck.delete({ where: { id } });
  }
}
