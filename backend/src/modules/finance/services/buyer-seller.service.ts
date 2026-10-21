import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CreateBuyerSellerBankDto,
  CreateBuyerSellerDto,
  UpdateBuyerSellerDto,
} from '../dto/buyer-seller.dto';

/**
 * Buyer/seller (counterparty) register (Step 6 / TASK C — R5).
 *
 * `creditLimit` and `currentBalance` are BigInt in Prisma and plain `number` at
 * the boundary, per the platform convention. `bankAccounts` is a real child
 * table rather than a JSON column so the ERP can join on it; on update the set
 * is replaced wholesale (delete + create), which is what "edit the bank list"
 * means to the caller.
 */
@Injectable()
export class BuyerSellerService {
  private readonly logger = new Logger(BuyerSellerService.name);

  constructor(private readonly prisma: PrismaService) {}

  private static toBig(value: number | undefined | null, fallback = 0): bigint {
    return BigInt(Math.round(value ?? fallback));
  }

  private static toNum(value: bigint | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  private static present(row: any): Record<string, unknown> {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      title: row.title ?? '',
      type: row.type,
      paymentMethod: row.paymentMethod,
      groupName: row.groupName ?? '',
      groupId: row.groupId ?? undefined,
      notes: row.notes ?? '',
      visitorId: row.visitorId ?? undefined,
      subAccountId: row.subAccountId ?? undefined,
      transferredFromAccounting: row.transferredFromAccounting,
      taxId: row.taxId ?? '',
      address: row.address ?? '',
      phone: row.phone ?? '',
      creditLimit: BuyerSellerService.toNum(row.creditLimit),
      currentBalance: BuyerSellerService.toNum(row.currentBalance),
      status: row.status,
      bankAccounts: (row.bankAccounts ?? []).map((bank: any) => ({
        id: bank.id,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        iban: bank.iban ?? '',
      })),
      createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
    };
  }

  private static bankData(
    banks: CreateBuyerSellerBankDto[],
  ): { bankName: string; accountNumber: string; iban: string }[] {
    return banks.map((bank) => ({
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      iban: bank.iban ?? '',
    }));
  }

  // ── CRUD (every read is zone-scoped) ──────────────────────────────────────

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.buyerSeller.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      include: { bankAccounts: true },
    });
    return rows.map((row) => BuyerSellerService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.buyerSeller.findFirst({
      where: { id, zoneId },
      include: { bankAccounts: true },
    });
    if (!row) throw new AppException('BUYER_SELLER_NOT_FOUND');
    return BuyerSellerService.present(row);
  }

  async create(zoneId: string, dto: CreateBuyerSellerDto): Promise<Record<string, unknown>> {
    const row = await this.prisma.buyerSeller.create({
      data: {
        zoneId,
        code: dto.code,
        name: dto.name,
        title: dto.title ?? '',
        type: dto.type,
        paymentMethod: dto.paymentMethod ?? 'cash',
        groupName: dto.groupName ?? '',
        groupId: dto.groupId,
        notes: dto.notes ?? '',
        visitorId: dto.visitorId,
        subAccountId: dto.subAccountId,
        transferredFromAccounting: dto.transferredFromAccounting ?? false,
        taxId: dto.taxId ?? '',
        address: dto.address ?? '',
        phone: dto.phone ?? '',
        creditLimit: BuyerSellerService.toBig(dto.creditLimit),
        currentBalance: BuyerSellerService.toBig(dto.currentBalance),
        status: dto.status ?? 'active',
        bankAccounts: dto.bankAccounts?.length
          ? { create: BuyerSellerService.bankData(dto.bankAccounts) }
          : undefined,
      },
      include: { bankAccounts: true },
    });
    this.logger.log(`buyer/seller created zone=${zoneId} code=${dto.code}`);
    return BuyerSellerService.present(row);
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateBuyerSellerDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.buyerSeller.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('BUYER_SELLER_NOT_FOUND');

    const data: Record<string, unknown> = {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
      ...(dto.groupName !== undefined && { groupName: dto.groupName }),
      ...(dto.groupId !== undefined && { groupId: dto.groupId }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.visitorId !== undefined && { visitorId: dto.visitorId }),
      ...(dto.subAccountId !== undefined && { subAccountId: dto.subAccountId }),
      ...(dto.transferredFromAccounting !== undefined && {
        transferredFromAccounting: dto.transferredFromAccounting,
      }),
      ...(dto.taxId !== undefined && { taxId: dto.taxId }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.creditLimit !== undefined && {
        creditLimit: BuyerSellerService.toBig(dto.creditLimit),
      }),
      ...(dto.currentBalance !== undefined && {
        currentBalance: BuyerSellerService.toBig(dto.currentBalance),
      }),
    };

    if (dto.bankAccounts !== undefined) {
      await this.prisma.buyerSellerBankAccount.deleteMany({ where: { buyerSellerId: id } });
      data.bankAccounts = {
        create: dto.bankAccounts.length ? BuyerSellerService.bankData(dto.bankAccounts) : [],
      };
    }

    const row = await this.prisma.buyerSeller.update({
      where: { id },
      data: data as any,
      include: { bankAccounts: true },
    });
    return BuyerSellerService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.buyerSeller.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('BUYER_SELLER_NOT_FOUND');
    await this.prisma.buyerSeller.delete({ where: { id } });
  }
}
