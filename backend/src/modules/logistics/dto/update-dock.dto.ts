import { IsString, IsEnum, IsOptional, IsDecimal, IsObject, IsBoolean } from 'class-validator';
import { DockType, VehicleType } from '@prisma/client';

export class UpdateDockDto {
  @IsOptional()
  @IsString()
  nameFa?: string;

  @IsOptional()
  @IsEnum(DockType)
  type?: DockType;

  @IsOptional()
  @IsEnum(VehicleType)
  maxVehicleType?: VehicleType;

  @IsOptional()
  @IsObject()
  operatingHours?: { start: string; end: string };

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,8' })
  lat?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,8' })
  lng?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
