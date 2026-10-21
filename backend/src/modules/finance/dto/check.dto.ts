import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsoDate } from '../../../common/decorators/iso-date.decorator';
import { CurrencyCode } from './finance-document.dto';

/**
 * Cheques (Step 7 / TASK A).
 *
 * `amount` and `bouncePenaltyAmount` are BigInt in Prisma and plain numbers at
 * the boundary. Dates use the shared `@IsoDate()`, which converts legacy Jalali
 * and `YYYY/MM/DD` forms and REJECTS anything unparseable rather than letting a
 * string like `امروز` reach `new Date()`.
 */
export enum FinanceCheckDirectionDto {
  incoming = 'incoming',
  outgoing = 'outgoing',
}

export enum FinanceCheckStatusDto {
  issued = 'issued',
  pending_clearance = 'pending_clearance',
  cleared = 'cleared',
  bounced = 'bounced',
  cancelled = 'cancelled',
  returned = 'returned',
}

/** POST /finance/checks */
export class CreateFinanceCheckDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: '000123' })
  @IsString()
  checkNumber: string;

  @ApiPropertyOptional({ description: 'Opaque reference to a FinanceCheckbook' })
  @IsOptional()
  @IsString()
  checkbookId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ enum: FinanceCheckDirectionDto })
  @IsEnum(FinanceCheckDirectionDto)
  direction: FinanceCheckDirectionDto;

  @ApiPropertyOptional({ example: 'شرکت فولاد' })
  @IsOptional()
  @IsString()
  payeeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiProperty({ example: 45000000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: CurrencyCode, default: CurrencyCode.IRR })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiProperty({ example: '2026-04-01' })
  @IsoDate({ field: 'issueDate' })
  @IsString()
  issueDate: string;

  @ApiProperty({ example: '2026-05-01', description: 'سررسید' })
  @IsoDate({ field: 'dueDate' })
  @IsString()
  dueDate: string;

  @ApiPropertyOptional({ example: '2026-05-02' })
  @IsOptional()
  @IsoDate({ field: 'clearanceDate' })
  @IsString()
  clearanceDate?: string;

  @ApiPropertyOptional({ enum: FinanceCheckStatusDto, default: FinanceCheckStatusDto.issued })
  @IsOptional()
  @IsEnum(FinanceCheckStatusDto)
  status?: FinanceCheckStatusDto;

  /** Opaque: a receipt/payment doc this module does not validate. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rpDocumentId?: string;

  /** Opaque: a journal voucher this module does not validate. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  glVoucherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bounceReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'bounceDate' })
  @IsString()
  bounceDate?: string;

  @ApiPropertyOptional({ example: 1500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bouncePenaltyAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Display name as posted by the client; not derived from the JWT' })
  @IsOptional()
  @IsString()
  createdBy?: string;

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

/** PATCH /finance/checks/:id */
export class UpdateFinanceCheckDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkbookId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ enum: FinanceCheckDirectionDto })
  @IsOptional()
  @IsEnum(FinanceCheckDirectionDto)
  direction?: FinanceCheckDirectionDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payeeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: CurrencyCode })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'issueDate' })
  @IsString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'dueDate' })
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'clearanceDate' })
  @IsString()
  clearanceDate?: string;

  @ApiPropertyOptional({ enum: FinanceCheckStatusDto })
  @IsOptional()
  @IsEnum(FinanceCheckStatusDto)
  status?: FinanceCheckStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rpDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  glVoucherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bounceReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'bounceDate' })
  @IsString()
  bounceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  bouncePenaltyAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

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
