import { IsOptional, IsUUID, IsEnum, IsBoolean, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WaybillStatus, ShipmentDirection, CargoCategory } from '@prisma/client';

export class FilterWaybillsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(WaybillStatus)
  status?: WaybillStatus;

  @IsOptional()
  @IsEnum(ShipmentDirection)
  direction?: ShipmentDirection;

  @IsOptional()
  @IsEnum(CargoCategory)
  cargoCategory?: CargoCategory;

  @IsOptional()
  @IsBoolean()
  isHazmat?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

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
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'expectedArrival' | 'waybillNumber';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
