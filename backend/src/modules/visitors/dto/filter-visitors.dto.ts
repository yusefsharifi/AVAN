import { IsOptional, IsUUID, IsEnum, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { VisitorStatus, VisitPurpose, VisitorType } from '@prisma/client';

export class FilterVisitorsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  hostId?: string;

  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;

  @IsOptional()
  @IsEnum(VisitPurpose)
  purpose?: VisitPurpose;

  @IsOptional()
  @IsEnum(VisitorType)
  type?: VisitorType;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  currentlyInside?: boolean;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
