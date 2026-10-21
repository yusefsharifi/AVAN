import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Mirrors the frontend `BuyerSeller` union values exactly. */
export enum BuyerSellerType {
  buyer = 'buyer',
  seller = 'seller',
  both = 'both',
}

export enum BuyerSellerPaymentMethod {
  cash = 'cash',
  check = 'check',
  credit = 'credit',
  online = 'online',
  lc = 'lc',
  bank_transfer = 'bank_transfer',
}

export enum BuyerSellerStatus {
  active = 'active',
  inactive = 'inactive',
  blacklisted = 'blacklisted',
}

export class CreateBuyerSellerBankDto {
  @ApiProperty({ example: 'بانک ملت' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'IR12000000000012345678901' })
  @IsOptional()
  @IsString()
  iban?: string;
}

/** POST /finance/buyer-sellers */
export class CreateBuyerSellerDto {
  /**
   * Target zone, resolved by the shared `@ResolveZoneId()`:
   * body.zoneId -> query.zoneId -> session zone. Zone/company users never send
   * it; SUPER_ADMIN must (Step-4 TASK 3).
   */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'BS-1404-003' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'پتروپارس' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'شرکت پتروپارس خلیج فارس' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: BuyerSellerType })
  @IsEnum(BuyerSellerType)
  type: BuyerSellerType;

  @ApiPropertyOptional({ enum: BuyerSellerPaymentMethod, default: BuyerSellerPaymentMethod.cash })
  @IsOptional()
  @IsEnum(BuyerSellerPaymentMethod)
  paymentMethod?: BuyerSellerPaymentMethod;

  @ApiPropertyOptional({ example: 'گروه الف' })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subAccountId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  transferredFromAccounting?: boolean;

  @ApiPropertyOptional({ example: '4111111111' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'تهران، خیابان ولیعصر' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '02188776655' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 50000000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 1200000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentBalance?: number;

  @ApiPropertyOptional({ enum: BuyerSellerStatus, default: BuyerSellerStatus.active })
  @IsOptional()
  @IsEnum(BuyerSellerStatus)
  status?: BuyerSellerStatus;

  @ApiPropertyOptional({ type: [CreateBuyerSellerBankDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateBuyerSellerBankDto)
  bankAccounts?: CreateBuyerSellerBankDto[];

  // ── Client envelope; accepted, the server issues its own identity ──────────
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

/** PATCH /finance/buyer-sellers/:id */
export class UpdateBuyerSellerDto {
  /** See the note on `CreateBuyerSellerDto`; SUPER_ADMIN names the zone. */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: BuyerSellerType })
  @IsOptional()
  @IsEnum(BuyerSellerType)
  type?: BuyerSellerType;

  @ApiPropertyOptional({ enum: BuyerSellerPaymentMethod })
  @IsOptional()
  @IsEnum(BuyerSellerPaymentMethod)
  paymentMethod?: BuyerSellerPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  transferredFromAccounting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiPropertyOptional({ enum: BuyerSellerStatus })
  @IsOptional()
  @IsEnum(BuyerSellerStatus)
  status?: BuyerSellerStatus;

  // ── Client envelope; accepted, identity comes from the route ───────────────
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

  @ApiPropertyOptional({ type: [CreateBuyerSellerBankDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateBuyerSellerBankDto)
  bankAccounts?: CreateBuyerSellerBankDto[];
}
