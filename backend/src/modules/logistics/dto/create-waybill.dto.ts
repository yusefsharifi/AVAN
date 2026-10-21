import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDecimal,
  IsUUID,
  IsDateString,
  MinLength,
  Min,
  Matches,
} from 'class-validator';
import {
  ShipmentDirection,
  WaybillType,
  CargoCategory,
  VehicleType,
} from '@prisma/client';

export class CreateWaybillDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsEnum(ShipmentDirection)
  direction: ShipmentDirection;

  @IsEnum(WaybillType)
  type: WaybillType;

  @IsString()
  @MinLength(3)
  cargoDescription: string;

  @IsEnum(CargoCategory)
  cargoCategory: CargoCategory;

  @IsBoolean()
  isHazmat: boolean;

  @IsOptional()
  @IsString()
  hazmatClass?: string;

  @IsOptional()
  @IsString()
  hazmatUnNumber?: string;

  @IsOptional()
  @IsString()
  hazmatEmergencyPhone?: string;

  @IsDecimal({ decimal_digits: '0,3' })
  @Min(0)
  quantity: number;

  @IsString()
  quantityUnit: string;

  @IsOptional()
  @IsString()
  declaredValue?: string;

  @IsString()
  carrierName: string;

  @IsOptional()
  @IsString()
  carrierPhone?: string;

  @IsOptional()
  @IsString()
  carrierLicense?: string;

  @IsString()
  vehiclePlate: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,3' })
  vehicleCapacity?: number;

  @IsString()
  driverName: string;

  @IsString()
  @Matches(/^09\d{9}$/)
  driverPhone: string;

  @IsOptional()
  @IsString()
  driverNationalId?: string;

  @IsOptional()
  @IsString()
  originAddress?: string;

  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @IsOptional()
  @IsString()
  destinationDock?: string;

  @IsOptional()
  @IsDateString()
  expectedArrival?: string;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresEscort?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresColdChain?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
