import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  CreateFixedAssetDto,
  CreateMaintenanceDto,
  UpdateFixedAssetDto,
} from '../dto/fixed-asset.dto';

/**
 * Fixed-asset register (Step 6 / TASK C — R5).
 *
 * Boundary rules:
 *   - Prisma columns are BigInt; DTO/response use plain `number`
 *     (`main.ts` installs a json replacer that emits bigint as Number).
 *   - Prisma columns are DateTime; DTO uses ISO `YYYY-MM-DD` on the wire
 *     (see the shared `@IsoDate()` decorator), so dates are converted both ways.
 *
 * The frontend store always POSTs a fully-populated object (including a
 * client-generated `id`, `createdAt`, `maintenanceRecords: []` and possibly
 * blank date strings), so this service tolerates blanks and derives the
 * accounting figures instead of trusting them blindly.
 */
@Injectable()
export class FixedAssetService {
  private readonly logger = new Logger(FixedAssetService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  /** Money: DTO number -> Prisma BigInt (irr is an integer currency). */
  private static toBig(value: number | undefined | null, fallback = 0): bigint {
    return BigInt(Math.round(value ?? fallback));
  }

  /** Money: Prisma BigInt -> response number. */
  private static toNum(value: bigint | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
  }

  /**
   * Wire ISO `YYYY-MM-DD` -> Date. Blank strings are legal in the DTO (the
   * store falls back to `''` when the user left a field empty), and `new Date('')`
   * would be an Invalid Date that Prisma rejects, so a fallback is applied.
   */
  private static toDate(value: string | undefined | null, fallback: string): Date {
    const raw = (value ?? '').trim();
    const candidate = raw || fallback;
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(fallback || new Date().toISOString().slice(0, 10));
    }
    return parsed;
  }

  /** Date columns -> `YYYY-MM-DD` so the wire stays symmetrical with `@IsoDate`. */
  private static dateOnly(value: Date | null | undefined): string {
    return value ? value.toISOString().slice(0, 10) : '';
  }

  /** Rows -> the exact shape the frontend `FixedAsset` interface declares. */
  private static present(asset: any): Record<string, unknown> {
    return {
      id: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      companyId: asset.companyId ?? '',
      location: asset.location ?? '',
      acquisitionDate: FixedAssetService.dateOnly(asset.acquisitionDate),
      acquisitionCost: FixedAssetService.toNum(asset.acquisitionCost),
      additionalCosts: FixedAssetService.toNum(asset.additionalCosts),
      totalCapitalizedCost: FixedAssetService.toNum(asset.totalCapitalizedCost),
      depreciationMethod: asset.depreciationMethod,
      usefulLifeYears: asset.usefulLifeYears,
      salvageValue: FixedAssetService.toNum(asset.salvageValue),
      depreciationStartDate: FixedAssetService.dateOnly(asset.depreciationStartDate),
      accumulatedDepreciation: FixedAssetService.toNum(asset.accumulatedDepreciation),
      netBookValue: FixedAssetService.toNum(asset.netBookValue),
      status: asset.status,
      disposalDate: FixedAssetService.dateOnly(asset.disposalDate),
      disposalType: asset.disposalType ?? undefined,
      disposalBuyer: asset.disposalBuyer ?? undefined,
      disposalNotes: asset.disposalNotes ?? undefined,
      disposalProceeds:
        asset.disposalProceeds === null || asset.disposalProceeds === undefined
          ? undefined
          : FixedAssetService.toNum(asset.disposalProceeds),
      gainLossOnDisposal:
        asset.gainLossOnDisposal === null || asset.gainLossOnDisposal === undefined
          ? undefined
          : FixedAssetService.toNum(asset.gainLossOnDisposal),
      maintenanceRecords: (asset.maintenanceRecords ?? []).map((record: any) => ({
        id: record.id,
        date: FixedAssetService.dateOnly(record.date),
        type: record.type,
        description: record.description,
        cost: FixedAssetService.toNum(record.cost),
        vendor: record.vendor ?? undefined,
        nextMaintenanceDate: FixedAssetService.dateOnly(record.nextMaintenanceDate),
      })),
      insurancePolicyId: asset.insurancePolicyId ?? undefined,
      depreciationVoucherIds: asset.depreciationVoucherIds ?? [],
      qrCode: asset.qrCode ?? undefined,
      attachmentName: asset.attachmentName ?? undefined,
      assetAccountId: asset.assetAccountId ?? undefined,
      depExpenseAccountId: asset.depExpenseAccountId ?? undefined,
      accumDepAccountId: asset.accumDepAccountId ?? undefined,
      custodianEmployeeId: asset.custodianEmployeeId ?? undefined,
      custodianName: asset.custodianName ?? undefined,
      assignedAt: asset.assignedAt ? asset.assignedAt.toISOString() : undefined,
      createdAt: asset.createdAt ? asset.createdAt.toISOString() : undefined,
      updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : undefined,
    };
  }

  /**
   * Recomputes the two figures that must always agree with each other.
   * `totalCapitalizedCost` = cost + capitalised extras; `netBookValue` is the
   * asset's cost less accumulated depreciation.
   */
  private static derive(base: Record<string, unknown>): Record<string, unknown> {
    const acquisitionCost = Number(base.acquisitionCost ?? 0);
    const additionalCosts = Number(base.additionalCosts ?? 0);
    const accumulatedDepreciation = Number(base.accumulatedDepreciation ?? 0);
    const totalCapitalizedCost = acquisitionCost + additionalCosts;
    return {
      ...base,
      totalCapitalizedCost,
      netBookValue: Math.max(0, totalCapitalizedCost - accumulatedDepreciation),
    };
  }

  private static maintenanceData(
    dto: CreateMaintenanceDto,
  ): Prisma.MaintenanceRecordUncheckedCreateWithoutAssetInput {
    return {
      date: FixedAssetService.toDate(dto.date, new Date().toISOString().slice(0, 10)),
      type: dto.type,
      description: dto.description,
      cost: FixedAssetService.toBig(dto.cost),
      vendor: dto.vendor,
      nextMaintenanceDate: dto.nextMaintenanceDate
        ? FixedAssetService.toDate(dto.nextMaintenanceDate, dto.nextMaintenanceDate)
        : null,
    };
  }

  // ── CRUD (every read is zone-scoped) ──────────────────────────────────────

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.fixedAsset.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      include: { maintenanceRecords: { orderBy: { date: 'desc' } } },
    });
    return rows.map((row) => FixedAssetService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.fixedAsset.findFirst({
      where: { id, zoneId },
      include: { maintenanceRecords: { orderBy: { date: 'desc' } } },
    });
    if (!row) throw new AppException('FIXED_ASSET_NOT_FOUND');
    return FixedAssetService.present(row);
  }

  async create(zoneId: string, dto: CreateFixedAssetDto): Promise<Record<string, unknown>> {
    const acquisitionDate = FixedAssetService.toDate(
      dto.acquisitionDate,
      new Date().toISOString().slice(0, 10),
    );
    const depreciationStartDate = FixedAssetService.toDate(
      dto.depreciationStartDate,
      acquisitionDate.toISOString().slice(0, 10),
    );

    const base = FixedAssetService.derive({
      acquisitionCost: FixedAssetService.toBig(dto.acquisitionCost),
      additionalCosts: FixedAssetService.toBig(dto.additionalCosts ?? 0),
      accumulatedDepreciation: FixedAssetService.toBig(dto.accumulatedDepreciation ?? 0),
    });

    try {
      const row = await this.prisma.fixedAsset.create({
        data: {
          zoneId,
          companyId: dto.companyId,
          assetCode: dto.assetCode,
          name: dto.name,
          category: dto.category,
          location: dto.location,
          acquisitionDate,
          acquisitionCost: base.acquisitionCost as bigint,
          additionalCosts: base.additionalCosts as bigint,
          totalCapitalizedCost: base.totalCapitalizedCost as bigint,
          depreciationMethod: dto.depreciationMethod ?? 'straight_line',
          usefulLifeYears: dto.usefulLifeYears ?? 1,
          salvageValue: FixedAssetService.toBig(dto.salvageValue),
          depreciationStartDate,
          accumulatedDepreciation: base.accumulatedDepreciation as bigint,
          netBookValue: base.netBookValue as bigint,
          status: dto.status ?? 'active',
          disposalDate: dto.disposalDate
            ? FixedAssetService.toDate(dto.disposalDate, dto.disposalDate)
            : null,
          disposalType: dto.disposalType,
          disposalBuyer: dto.disposalBuyer,
          disposalNotes: dto.disposalNotes,
          disposalProceeds:
            dto.disposalProceeds === undefined
              ? null
              : FixedAssetService.toBig(dto.disposalProceeds),
          gainLossOnDisposal:
            dto.gainLossOnDisposal === undefined
              ? null
              : FixedAssetService.toBig(dto.gainLossOnDisposal),
          insurancePolicyId: dto.insurancePolicyId,
          depreciationVoucherIds: dto.depreciationVoucherIds ?? [],
          qrCode: dto.qrCode,
          assetAccountId: dto.assetAccountId,
          depExpenseAccountId: dto.depExpenseAccountId,
          accumDepAccountId: dto.accumDepAccountId,
          custodianEmployeeId: dto.custodianEmployeeId,
          custodianName: dto.custodianName,
          assignedAt: dto.assignedAt
            ? FixedAssetService.toDate(dto.assignedAt, dto.assignedAt)
            : null,
          maintenanceRecords: dto.maintenanceRecords?.length
            ? { create: dto.maintenanceRecords.map((r) => FixedAssetService.maintenanceData(r)) }
            : undefined,
        },
        include: { maintenanceRecords: { orderBy: { date: 'desc' } } },
      });
      this.logger.log(`fixed asset created zone=${zoneId} code=${dto.assetCode}`);
      return FixedAssetService.present(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException('FIXED_ASSET_NOT_FOUND', { message: 'کد دارایی تکراری است' });
      }
      throw err;
    }
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateFixedAssetDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.fixedAsset.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FIXED_ASSET_NOT_FOUND');

    // Re-derive from the merged row so cost/NBV can never drift apart.
    const acquisitionCost = FixedAssetService.toBig(
      dto.acquisitionCost !== undefined
        ? dto.acquisitionCost
        : FixedAssetService.toNum(existing.acquisitionCost),
    );
    const additionalCosts = FixedAssetService.toBig(
      dto.additionalCosts !== undefined
        ? dto.additionalCosts
        : FixedAssetService.toNum(existing.additionalCosts),
    );
    const accumulatedDepreciation = FixedAssetService.toBig(
      dto.accumulatedDepreciation !== undefined
        ? dto.accumulatedDepreciation
        : FixedAssetService.toNum(existing.accumulatedDepreciation),
    );
    const derived = FixedAssetService.derive({
      acquisitionCost,
      additionalCosts,
      accumulatedDepreciation,
    });

    const data: Record<string, unknown> = {
      ...(dto.assetCode !== undefined && { assetCode: dto.assetCode }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.acquisitionDate !== undefined && {
        acquisitionDate: FixedAssetService.toDate(dto.acquisitionDate, dto.acquisitionDate),
      }),
      ...(dto.depreciationMethod !== undefined && { depreciationMethod: dto.depreciationMethod }),
      ...(dto.usefulLifeYears !== undefined && { usefulLifeYears: dto.usefulLifeYears }),
      ...(dto.salvageValue !== undefined && {
        salvageValue: FixedAssetService.toBig(dto.salvageValue),
      }),
      ...(dto.depreciationStartDate !== undefined && {
        depreciationStartDate: FixedAssetService.toDate(
          dto.depreciationStartDate,
          dto.depreciationStartDate,
        ),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.disposalType !== undefined && { disposalType: dto.disposalType }),
      ...(dto.disposalBuyer !== undefined && { disposalBuyer: dto.disposalBuyer }),
      ...(dto.disposalNotes !== undefined && { disposalNotes: dto.disposalNotes }),
      ...(dto.disposalProceeds !== undefined && {
        disposalProceeds: FixedAssetService.toBig(dto.disposalProceeds),
      }),
      ...(dto.gainLossOnDisposal !== undefined && {
        gainLossOnDisposal: FixedAssetService.toBig(dto.gainLossOnDisposal),
      }),
      ...(dto.insurancePolicyId !== undefined && { insurancePolicyId: dto.insurancePolicyId }),
      ...(dto.depreciationVoucherIds !== undefined && {
        depreciationVoucherIds: dto.depreciationVoucherIds,
      }),
      ...(dto.qrCode !== undefined && { qrCode: dto.qrCode }),
      ...(dto.attachmentName !== undefined && { attachmentName: dto.attachmentName }),
      ...(dto.custodianEmployeeId !== undefined && {
        custodianEmployeeId: dto.custodianEmployeeId,
      }),
      ...(dto.custodianName !== undefined && { custodianName: dto.custodianName }),
      acquisitionCost: derived.acquisitionCost as bigint,
      additionalCosts: derived.additionalCosts as bigint,
      accumulatedDepreciation: derived.accumulatedDepreciation as bigint,
      totalCapitalizedCost: derived.totalCapitalizedCost as bigint,
      netBookValue: derived.netBookValue as bigint,
    };

    const row = await this.prisma.fixedAsset.update({
      where: { id },
      data: data as any,
      include: { maintenanceRecords: { orderBy: { date: 'desc' } } },
    });
    return FixedAssetService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.fixedAsset.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FIXED_ASSET_NOT_FOUND');
    await this.prisma.fixedAsset.delete({ where: { id } });
  }
}
