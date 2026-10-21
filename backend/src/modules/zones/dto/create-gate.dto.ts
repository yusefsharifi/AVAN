import { IsString, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { GateType } from '@prisma/client';

export class CreateGateDto {
  @IsString()
  code!: string;

  @IsString()
  nameFa!: string;

  @IsEnum(GateType)
  type!: GateType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  hasAnpr?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBarrier?: boolean;

  @IsOptional()
  @IsBoolean()
  hasScale?: boolean;

  @IsOptional()
  @IsArray()
  deviceIds?: string[];
}

export class CreateHolidayDto {
  @IsString()
  date!: string;

  @IsString()
  nameFa!: string;

  @IsEnum(['NATIONAL', 'RELIGIOUS', 'ZONE_SPECIFIC'] as const)
  type!: 'NATIONAL' | 'RELIGIOUS' | 'ZONE_SPECIFIC';
}
