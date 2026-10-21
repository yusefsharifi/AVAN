import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ShipmentDirection, VehicleType } from '@prisma/client';

export class CreateAppointmentDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  waybillId?: string;

  @IsString()
  vehiclePlate: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsString()
  driverName: string;

  @IsString()
  @Matches(/^09\d{9}$/)
  driverPhone: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  scheduledDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduledTime: string;

  @IsUUID()
  scheduledGateId: string;

  @IsOptional()
  @IsUUID()
  scheduledDockId?: string;

  @IsEnum(ShipmentDirection)
  direction: ShipmentDirection;

  @IsOptional()
  @IsString()
  cargoSummary?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  estimatedDuration?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
