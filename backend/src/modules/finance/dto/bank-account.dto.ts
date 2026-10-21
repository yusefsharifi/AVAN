import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { TransactionType } from './enums';

export class CreateBankAccountDto {
  @IsString()
  bankName: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsString()
  accountType: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsString()
  ownerName: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordBankTransactionDto {
  @IsUUID()
  bankAccountId: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsUUID()
  voucherId?: string;
}

export class ReconcileBankDto {
  @IsString()
  statementDate: string;

  @IsInt()
  statementBalance: number;
}
