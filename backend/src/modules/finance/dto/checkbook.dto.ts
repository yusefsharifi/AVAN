import { IsString, IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsoDate } from '../../../common/decorators/iso-date.decorator';

/**
 * Checkbooks (Step 7 / TASK A).
 *
 * `startNumber` / `endNumber` / `currentNumber` / `bookNumber` / `series` /
 * `accountNumber` are STRINGS on the wire and stay strings here: cheque leaf
 * numbers carry leading zeros (`000123`) that a numeric column would destroy.
 *
 * `usedLeaves` and `remainingLeaves` are accepted but RE-DERIVED server-side,
 * because the store updates them optimistically when a leaf is issued.
 */
export enum FinanceCheckbookStatusDto {
  active = 'active',
  exhausted = 'exhausted',
  cancelled = 'cancelled',
}

/** POST /finance/checkbooks */
export class CreateFinanceCheckbookDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'دسته-چک-001' })
  @IsString()
  bookNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional({ example: '000123' })
  @IsOptional()
  @IsString()
  startNumber?: string;

  @ApiPropertyOptional({ example: '000150' })
  @IsOptional()
  @IsString()
  endNumber?: string;

  @ApiPropertyOptional({ description: 'Re-derived: defaults to startNumber' })
  @IsOptional()
  @IsString()
  currentNumber?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalLeaves?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsInt()
  @Min(0)
  usedLeaves?: number;

  @ApiPropertyOptional({ description: 'Re-derived as totalLeaves - usedLeaves' })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingLeaves?: number;

  @ApiPropertyOptional({ enum: FinanceCheckbookStatusDto })
  @IsOptional()
  @IsEnum(FinanceCheckbookStatusDto)
  status?: FinanceCheckbookStatusDto;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsoDate({ field: 'issuedDate' })
  @IsString()
  issuedDate?: string;

  // ── Client envelope; accepted, ignored ─────────────────────────────────────
  @ApiPropertyOptional({ description: 'Client id; ignored' })
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

/** PATCH /finance/checkbooks/:id */
export class UpdateFinanceCheckbookDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  series?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endNumber?: string;

  @ApiPropertyOptional({ description: 'Re-derived on update' })
  @IsOptional()
  @IsString()
  currentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  totalLeaves?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsInt()
  @Min(0)
  usedLeaves?: number;

  @ApiPropertyOptional({ description: 'Re-derived as totalLeaves - usedLeaves' })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingLeaves?: number;

  @ApiPropertyOptional({ enum: FinanceCheckbookStatusDto })
  @IsOptional()
  @IsEnum(FinanceCheckbookStatusDto)
  status?: FinanceCheckbookStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'issuedDate' })
  @IsString()
  issuedDate?: string;

  @ApiPropertyOptional({ description: 'Client id; ignored' })
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
