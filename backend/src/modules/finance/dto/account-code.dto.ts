import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { AccountType, AccountCategory, BalanceType } from './enums';

export class CreateAccountCodeDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsString()
  code: string;

  @IsString()
  nameFa: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsEnum(AccountCategory)
  category: AccountCategory;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsEnum(BalanceType)
  normalBalance: BalanceType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAccountCodeDto {
  @IsOptional()
  @IsString()
  nameFa?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
