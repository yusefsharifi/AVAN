import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDecimal,
  IsObject,
} from 'class-validator';
import { DockType, VehicleType } from '@prisma/client';

export class CreateDockDto {
  @IsString()
  code: string;

  @IsString()
  nameFa: string;

  @IsEnum(DockType)
  type: DockType;

  @IsEnum(VehicleType)
  maxVehicleType: VehicleType;

  @IsOptional()
  @IsUUID()
  companyId?: string;

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
}
