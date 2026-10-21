import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateFinanceCheckbookDto, UpdateFinanceCheckbookDto } from '../dto/checkbook.dto';

/**
 * Checkbooks (Step 7 / TASK A).
 *
 * Leaf numbers are strings end-to-end: `startNumber`/`endNumber`/
 * `currentNumber` carry leading zeros (`000123`) that a numeric column would
 * silently strip.
 *
 * `remainingLeaves` is RE-DERIVED as `totalLeaves - usedLeaves` on every write.
 * The store updates these optimistically when it issues a leaf, so the header
 * can disagree with itself; recomputing keeps the invariant the UI assumes.
 * A book that runs out is flagged `exhausted` automatically.
 *
 * Every read is zone-scoped.
 */
@Injectable()
export class FinanceCheckbookService {
  private readonly logger = new Logger(FinanceCheckbookService.name);

  constructor(private readonly prisma: PrismaService) {}

  private static dateOnly(value: Date | null | undefined): string {
    return value ? value.toISOString().slice(0, 10) : '';
  }

  /** Returns exactly the fourteen fields the frontend `Checkbook` declares. */
  private static present(row: any): Record<string, unknown> {
    return {
      id: row.id,
      bookNumber: row.bookNumber,
      bankAccountId: row.bankAccountId ?? '',
      bankName: row.bankName ?? '',
      accountNumber: row.accountNumber ?? '',
      series: row.series ?? '',
      startNumber: row.startNumber ?? '',
      endNumber: row.endNumber ?? '',
      currentNumber: row.currentNumber ?? '',
      totalLeaves: row.totalLeaves ?? 0,
      usedLeaves: row.usedLeaves ?? 0,
      remainingLeaves: row.remainingLeaves ?? 0,
      status: row.status,
      issuedDate: FinanceCheckbookService.dateOnly(row.issuedDate),
    };
  }

  /**
   * `usedLeaves` may only be derived from what is already stored on update, but
   * `remainingLeaves` always comes from the two counts. When no leaves were
   * consumed yet, a book at zero remaining is `exhausted` unless it was
   * cancelled.
   */
  private static derive(totalLeaves: number, usedLeaves: number): {
    remainingLeaves: number;
    status?: 'exhausted';
  } {
    const remaining = Math.max(0, totalLeaves - usedLeaves);
    return {
      remainingLeaves: remaining,
      ...(remaining === 0 && usedLeaves > 0 ? { status: 'exhausted' as const } : {}),
    };
  }

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.financeCheckbook.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => FinanceCheckbookService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeCheckbook.findFirst({ where: { id, zoneId } });
    if (!row) throw new AppException('FINANCE_CHECKBOOK_NOT_FOUND');
    return FinanceCheckbookService.present(row);
  }

  async create(zoneId: string, dto: CreateFinanceCheckbookDto): Promise<Record<string, unknown>> {
    const totalLeaves = dto.totalLeaves ?? 0;
    const usedLeaves = dto.usedLeaves ?? 0;
    const derived = FinanceCheckbookService.derive(totalLeaves, usedLeaves);

    const row = await this.prisma.financeCheckbook.create({
      data: {
        zoneId,
        bookNumber: dto.bookNumber,
        bankAccountId: dto.bankAccountId ?? '',
        bankName: dto.bankName ?? '',
        accountNumber: dto.accountNumber ?? '',
        series: dto.series ?? '',
        startNumber: dto.startNumber ?? '',
        endNumber: dto.endNumber ?? '',
        currentNumber: dto.currentNumber || dto.startNumber || '',
        totalLeaves,
        usedLeaves,
        remainingLeaves: derived.remainingLeaves,
        // An explicit status (e.g. cancelling a book) wins over the derived
        // `exhausted`; otherwise fall back to derived, then to `active`.
        status: dto.status ?? derived.status ?? 'active',
        issuedDate: new Date(
          dto.issuedDate?.trim() || new Date().toISOString().slice(0, 10),
        ),
      },
    });
    this.logger.log(`checkbook created zone=${zoneId} book=${dto.bookNumber}`);
    return FinanceCheckbookService.present(row);
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateFinanceCheckbookDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.financeCheckbook.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_CHECKBOOK_NOT_FOUND');

    const totalLeaves = dto.totalLeaves ?? existing.totalLeaves;
    const usedLeaves = dto.usedLeaves ?? existing.usedLeaves;
    const derived = FinanceCheckbookService.derive(totalLeaves, usedLeaves);

    const row = await this.prisma.financeCheckbook.update({
      where: { id },
      data: {
        ...(dto.bookNumber !== undefined && { bookNumber: dto.bookNumber }),
        ...(dto.bankAccountId !== undefined && { bankAccountId: dto.bankAccountId }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.series !== undefined && { series: dto.series }),
        ...(dto.startNumber !== undefined && { startNumber: dto.startNumber }),
        ...(dto.endNumber !== undefined && { endNumber: dto.endNumber }),
        ...(dto.currentNumber !== undefined && { currentNumber: dto.currentNumber }),
        totalLeaves,
        usedLeaves,
        remainingLeaves: derived.remainingLeaves,
        // An explicit `status` (e.g. cancelling a book) always wins over the
        // derived `exhausted`; only an implicit state gets derived.
        ...(dto.status !== undefined
          ? { status: dto.status }
          : derived.status
            ? { status: derived.status }
            : {}),
        ...(dto.issuedDate !== undefined && {
          issuedDate: new Date(dto.issuedDate.trim() || existing.issuedDate.toISOString()),
        }),
      },
    });
    return FinanceCheckbookService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.financeCheckbook.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_CHECKBOOK_NOT_FOUND');
    await this.prisma.financeCheckbook.delete({ where: { id } });
  }
}
