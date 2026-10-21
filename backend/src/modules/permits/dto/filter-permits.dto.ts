import { IsOptional, IsUUID, IsEnum, IsString, IsDateString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PermitType, PermitStatus, PermitPriority, IssuedPermitStatus } from './create-permit-request.dto';

export class FilterPermitRequestsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(PermitType)
  type?: PermitType;

  @IsOptional()
  @IsEnum(PermitStatus)
  status?: PermitStatus;

  @IsOptional()
  @IsEnum(PermitPriority)
  priority?: PermitPriority;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  sortBy?: 'createdAt' | 'priority' | 'requestedFrom';

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class FilterIssuedPermitsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(PermitType)
  type?: PermitType;

  @IsOptional()
  @IsEnum(IssuedPermitStatus)
  status?: IssuedPermitStatus;

  @IsOptional()
  @IsBoolean()
  expiringWithin30Days?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOpenConditions?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
