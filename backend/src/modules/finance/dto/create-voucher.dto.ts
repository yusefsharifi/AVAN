import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherType } from './enums';

export class CreateVoucherLineDto {
  @IsInt()
  lineNumber: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsUUID()
  debitAccountId?: string;

  @IsOptional()
  @IsUUID()
  creditAccountId?: string;

  @IsOptional()
  @Min(0)
  debitAmount?: number;

  @IsOptional()
  @Min(0)
  creditAmount?: number;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateVoucherDto {
  @IsUUID()
  zoneId: string;

  @IsEnum(VoucherType)
  type: VoucherType;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  sourceEntityId?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  exchangeRate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVoucherLineDto)
  lines: CreateVoucherLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
