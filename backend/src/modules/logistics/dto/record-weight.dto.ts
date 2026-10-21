import { IsUUID, IsOptional, IsEnum, IsDecimal, IsString, Min } from 'class-validator';
import { VehicleType, WeighType } from '@prisma/client';

export class RecordWeightDto {
  @IsUUID()
  scaleId: string;

  @IsOptional()
  @IsUUID()
  waybillId?: string;

  @IsString()
  vehiclePlate: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsEnum(WeighType)
  weighType: WeighType;

  @IsDecimal({ decimal_digits: '0,3' })
  @Min(0)
  grossWeight: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,3' })
  @Min(0)
  tareWeight?: number;

  @IsOptional()
  @IsString()
  imageKey?: string;
}
