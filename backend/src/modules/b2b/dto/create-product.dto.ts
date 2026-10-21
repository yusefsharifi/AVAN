import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateProductCatalogDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  nameFa: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsString()
  categoryId: string;

  @IsArray()
  categoryPath: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  leadTimeDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsArray()
  certifications?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateSupplierProfileDto {
  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  certifications?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsInBusiness?: number;

  @IsOptional()
  @IsString()
  annualRevenue?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;
}
