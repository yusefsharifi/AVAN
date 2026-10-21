import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IsoDate } from '../../../common/decorators/iso-date.decorator';
import { CurrencyCode } from './finance-document.dto';

/**
 * Receipt / payment documents (Step 7 / TASK A).
 *
 * One endpoint serves all six `docType` variants and all three `type` values,
 * exactly as the frontend posts them to the single path
 * `/finance/receipt-payment-docs`.
 *
 * `totalAmount` is RE-DERIVED from `lines` whenever lines are supplied, so a
 * header that disagrees with its own allocations cannot be stored. When no
 * lines are given (a simple cash receipt) the posted amount stands.
 */

export enum FinanceRpDocTypeDto {
  cash_receipt = 'cash_receipt',
  check_receipt = 'check_receipt',
  transfer_receipt = 'transfer_receipt',
  cash_payment = 'cash_payment',
  check_payment = 'check_payment',
  transfer_payment = 'transfer_payment',
}

export enum FinanceRpTypeDto {
  receipt = 'receipt',
  payment = 'payment',
  internal_transfer = 'internal_transfer',
}

export enum FinanceRpStatusDto {
  draft = 'draft',
  prepared = 'prepared',
  approved = 'approved',
  posted = 'posted',
  bounced = 'bounced',
  cancelled = 'cancelled',
}

export enum FinanceInstrumentTypeDto {
  cash = 'cash',
  check = 'check',
  promissory_note = 'promissory_note',
  bank_transfer = 'bank_transfer',
  online = 'online',
  lc = 'lc',
}

export enum FinanceEntityTypeDto {
  buyer = 'buyer',
  seller = 'seller',
  employee = 'employee',
  other = 'other',
}

/** A single GL allocation row. Every property is optional-but-decorated: the
 *  form may post a row before all columns are chosen, and an undecorated
 *  property here would 400 the whole document (BUG-PERSIST-007). */
export class CreateReceiptPaymentLineDto {
  @ApiPropertyOptional({ description: 'Client line id; ignored' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Denormalised snapshot, stored as posted' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Denormalised snapshot, stored as posted' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ example: 45000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenterId?: string;
}

/** POST /finance/receipt-payment-docs */
export class CreateReceiptPaymentDocDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'RP-1404-001' })
  @IsString()
  documentNumber: string;

  @ApiPropertyOptional({ enum: FinanceRpDocTypeDto, default: FinanceRpDocTypeDto.cash_receipt })
  @IsOptional()
  @IsEnum(FinanceRpDocTypeDto)
  docType?: FinanceRpDocTypeDto;

  @ApiProperty({ example: '2026-04-01' })
  @IsoDate({ field: 'date' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ enum: FinanceRpTypeDto })
  @IsOptional()
  @IsEnum(FinanceRpTypeDto)
  type?: FinanceRpTypeDto;

  @ApiPropertyOptional({ enum: FinanceRpStatusDto, default: FinanceRpStatusDto.draft })
  @IsOptional()
  @IsEnum(FinanceRpStatusDto)
  status?: FinanceRpStatusDto;

  /** The store posts `''` for an untouched document; falls back to `date`. */
  @ApiPropertyOptional({ description: "Blank falls back to the document's date" })
  @IsOptional()
  @IsoDate({ field: 'statusChangeDate' })
  @IsString()
  statusChangeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ enum: FinanceEntityTypeDto })
  @IsOptional()
  @IsEnum(FinanceEntityTypeDto)
  entityType?: FinanceEntityTypeDto;

  @ApiPropertyOptional({ enum: FinanceInstrumentTypeDto })
  @IsOptional()
  @IsEnum(FinanceInstrumentTypeDto)
  instrumentType?: FinanceInstrumentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @ApiPropertyOptional({ description: 'سررسید; blank becomes null' })
  @IsOptional()
  @IsoDate({ field: 'checkDate' })
  @IsString()
  checkDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Re-derived from lines when lines are supplied' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ enum: CurrencyCode, default: CurrencyCode.IRR })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional({ example: 1, description: 'A rate, not an amount — Float not BigInt' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  /** Opaque: `ParentDocument` is a store-local concept with no backend table. */
  @ApiPropertyOptional({ description: 'Opaque reference; no backend parent table' })
  @IsOptional()
  @IsString()
  parentDocumentId?: string;

  @ApiPropertyOptional({ description: 'Denormalised parent number, stored as posted' })
  @IsOptional()
  @IsString()
  parentDocNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingAmount?: number;

  @ApiPropertyOptional({ description: 'Display name as posted by the client; not derived from the JWT' })
  @IsOptional()
  @IsString()
  preparedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  glVoucherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bounceReason?: string;

  @ApiPropertyOptional({ type: [CreateReceiptPaymentLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptPaymentLineDto)
  lines?: CreateReceiptPaymentLineDto[];

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

/** PATCH /finance/receipt-payment-docs/:id */
export class UpdateReceiptPaymentDocDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ enum: FinanceRpDocTypeDto })
  @IsOptional()
  @IsEnum(FinanceRpDocTypeDto)
  docType?: FinanceRpDocTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'date' })
  @IsString()
  date?: string;

  @ApiPropertyOptional({ enum: FinanceRpTypeDto })
  @IsOptional()
  @IsEnum(FinanceRpTypeDto)
  type?: FinanceRpTypeDto;

  @ApiPropertyOptional({ enum: FinanceRpStatusDto })
  @IsOptional()
  @IsEnum(FinanceRpStatusDto)
  status?: FinanceRpStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'statusChangeDate' })
  @IsString()
  statusChangeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ enum: FinanceEntityTypeDto })
  @IsOptional()
  @IsEnum(FinanceEntityTypeDto)
  entityType?: FinanceEntityTypeDto;

  @ApiPropertyOptional({ enum: FinanceInstrumentTypeDto })
  @IsOptional()
  @IsEnum(FinanceInstrumentTypeDto)
  instrumentType?: FinanceInstrumentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'checkDate' })
  @IsString()
  checkDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Re-derived from lines when lines are supplied' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ enum: CurrencyCode })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentDocNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  glVoucherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bounceReason?: string;

  @ApiPropertyOptional({ type: [CreateReceiptPaymentLineDto], description: 'Replaces the existing set' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptPaymentLineDto)
  lines?: CreateReceiptPaymentLineDto[];

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
