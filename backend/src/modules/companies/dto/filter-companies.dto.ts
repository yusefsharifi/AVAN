import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyLifecycle, CompanyType, RiskLevel } from '@prisma/client';

export class FilterCompaniesDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsEnum(CompanyLifecycle)
  lifecycleStatus?: CompanyLifecycle;

  @IsOptional()
  @IsEnum(CompanyType)
  type?: CompanyType;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  industryCategory?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  sortBy?: 'nameFa' | 'createdAt' | 'healthScore';

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
