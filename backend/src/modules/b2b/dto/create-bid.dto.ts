import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BidStatusEnum } from './enums';

export class PriceBreakdownItemDto {
  @IsString()
  item: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  @Min(1)
  unitPrice: number;

  @IsInt()
  @Min(1)
  total: number;
}

export class CreateBidDto {
  @IsUUID()
  rfqId: string;

  @IsUUID()
  supplierId: string;

  @IsInt()
  @Min(1)
  unitPrice: number;

  @IsInt()
  @Min(1)
  totalPrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceBreakdownItemDto)
  priceBreakdown?: PriceBreakdownItemDto[];

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsInt()
  @Min(1)
  deliveryDays: number;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsString()
  paymentTerms: string;

  @IsOptional()
  @IsInt()
  @Min(7)
  validityDays?: number;

  @IsOptional()
  @IsString()
  technicalResponse?: string;

  @IsOptional()
  @IsBoolean()
  technicalCompliance?: boolean;

  @IsOptional()
  @IsString()
  technicalDeviations?: string;

  @IsOptional()
  @IsBoolean()
  sampleAttached?: boolean;

  @IsOptional()
  @IsInt()
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  afterSaleService?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitBidDto {
  @IsUUID()
  bidId: string;

  @IsOptional()
  @IsArray()
  attachmentKeys?: string[];
}

export class FilterBidsDto {
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(BidStatusEnum)
  status?: BidStatusEnum;

  @IsOptional()
  @IsInt()
  round?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

