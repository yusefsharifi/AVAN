import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsoDate } from '../../../common/decorators/iso-date.decorator';

/**
 * ERP-extension enums (Step 6 / TASK C — R5).
 *
 * Values mirror the frontend wire contract exactly (lowercase) so no mapping
 * layer is needed, and they mirror the `Finance*` Prisma enums 1:1.
 */
export enum FixedAssetCategory {
  land = 'land',
  building = 'building',
  machinery = 'machinery',
  vehicle = 'vehicle',
  furniture = 'furniture',
  it_equipment = 'it_equipment',
}

export enum DepreciationMethod {
  straight_line = 'straight_line',
  declining_balance = 'declining_balance',
  units_of_production = 'units_of_production',
}

export enum FixedAssetStatus {
  active = 'active',
  under_maintenance = 'under_maintenance',
  idle = 'idle',
  disposed = 'disposed',
  sold = 'sold',
  deleted = 'deleted',
}

export enum DisposalType {
  sale = 'sale',
  scrap = 'scrap',
  donation = 'donation',
}

export enum MaintenanceType {
  preventive = 'preventive',
  corrective = 'corrective',
  emergency = 'emergency',
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsoDate({ field: 'date' })
  @IsString()
  date: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @ApiProperty({ example: 'روغن‌کاری دوره‌ای' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 2500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsoDate({ field: 'nextMaintenanceDate' })
  @IsString()
  nextMaintenanceDate?: string;

  /** Echoed back by the client when it re-posts existing records; accepted, ignored. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

/** Create body for POST /finance/fixed-assets. */
export class CreateFixedAssetDto {
  /**
   * Target zone. The shared `@ResolveZoneId()` decorator resolves it in this
   * order: body.zoneId -> query.zoneId -> session zone. Zone/company users
   * therefore never send it (their session wins); SUPER_ADMIN must name one,
   * which is the Step-4 TASK 3 contract that stops a platform write from
   * silently landing in `zoneId: undefined` and dying inside Prisma.
   */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'FA-1404-001' })
  @IsString()
  assetCode: string;

  @ApiProperty({ example: 'جدول برش CNC' })
  @IsString()
  name: string;

  @ApiProperty({ enum: FixedAssetCategory })
  @IsEnum(FixedAssetCategory)
  category: FixedAssetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: 'سالن تولید ۲' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: '2024-05-01' })
  @IsoDate({ field: 'acquisitionDate' })
  @IsString()
  acquisitionDate: string;

  @ApiProperty({ example: 4800000000 })
  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @ApiPropertyOptional({ example: 120000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCosts?: number;

  @ApiPropertyOptional({ example: 4920000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCapitalizedCost?: number;

  @ApiPropertyOptional({ enum: DepreciationMethod, default: DepreciationMethod.straight_line })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usefulLifeYears?: number;

  @ApiPropertyOptional({ example: 200000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiProperty({ example: '2024-06-01' })
  @IsoDate({ field: 'depreciationStartDate' })
  @IsString()
  depreciationStartDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  accumulatedDepreciation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  netBookValue?: number;

  @ApiPropertyOptional({ enum: FixedAssetStatus, default: FixedAssetStatus.active })
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'disposalDate' })
  @IsString()
  disposalDate?: string;

  @ApiPropertyOptional({ enum: DisposalType })
  @IsOptional()
  @IsEnum(DisposalType)
  disposalType?: DisposalType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disposalBuyer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disposalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalProceeds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gainLossOnDisposal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurancePolicyId?: string;

  @ApiPropertyOptional({ type: [String], example: ['VCH-001'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  depreciationVoucherIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional({ description: 'Attachment file name shown in the asset card' })
  @IsOptional()
  @IsString()
  attachmentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  depExpenseAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accumDepAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custodianEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custodianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'assignedAt' })
  @IsString()
  assignedAt?: string;

  @ApiPropertyOptional({ type: [CreateMaintenanceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  maintenanceRecords?: CreateMaintenanceDto[];

  // ── Client envelope (see the note on the document DTO) ─────────────────────
  @ApiPropertyOptional({ description: 'Client id; ignored, the server issues its own' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

/** PATCH /finance/fixed-assets/:id — every field optional. */
export class UpdateFixedAssetDto {
  /** See the note on `CreateFixedAssetDto`; SUPER_ADMIN names the zone. */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: FixedAssetCategory })
  @IsOptional()
  @IsEnum(FixedAssetCategory)
  category?: FixedAssetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'acquisitionDate' })
  @IsString()
  acquisitionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCapitalizedCost?: number;

  @ApiPropertyOptional({ enum: DepreciationMethod })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usefulLifeYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'depreciationStartDate' })
  @IsString()
  depreciationStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  accumulatedDepreciation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  netBookValue?: number;

  @ApiPropertyOptional({ enum: FixedAssetStatus })
  @IsOptional()
  @IsEnum(FixedAssetStatus)
  status?: FixedAssetStatus;

  @ApiPropertyOptional({ enum: DisposalType })
  @IsOptional()
  @IsEnum(DisposalType)
  disposalType?: DisposalType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disposalBuyer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disposalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalProceeds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gainLossOnDisposal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurancePolicyId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  depreciationVoucherIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custodianEmployeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custodianName?: string;

  // ── Remaining model fields the client may echo back in a partial update ────
  @ApiPropertyOptional({ description: 'Client id; ignored, the route owns identity' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'disposalDate' })
  @IsString()
  disposalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  depExpenseAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accumDepAccountId?: string;

  @ApiPropertyOptional({ type: [CreateMaintenanceDto], description: 'Replaces the existing set' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  maintenanceRecords?: CreateMaintenanceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
