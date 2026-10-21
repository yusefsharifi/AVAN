import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsArray } from 'class-validator';
import { VehicleType, VehiclePermitType } from '@prisma/client';

export class CreateVehicleDto {
  @IsUUID()
  zoneId!: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  plate!: string;

  @IsEnum(VehicleType)
  type!: VehicleType;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsString()
  driverNationalId?: string;

  @IsOptional()
  @IsEnum(VehiclePermitType)
  permitType?: VehiclePermitType;

  @IsOptional()
  @IsDateString()
  permitExpiresAt?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class IssuePermitDto {
  @IsEnum(VehiclePermitType)
  type!: VehiclePermitType;

  @IsOptional()
  @IsArray()
  allowedGates?: string[];

  @IsOptional()
  allowedHours?: { start: string; end: string; days: number[] };

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
