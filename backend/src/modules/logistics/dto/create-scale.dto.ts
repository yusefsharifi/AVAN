import { IsString, IsOptional, IsUUID, IsDecimal, IsBoolean } from 'class-validator';

export class CreateScaleDto {
  @IsString()
  code: string;

  @IsString()
  nameFa: string;

  @IsDecimal({ decimal_digits: '0,3' })
  capacity: number;

  @IsDecimal({ decimal_digits: '0,3' })
  precision: number;

  @IsOptional()
  @IsUUID()
  gateId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsBoolean()
  isAutoCapture?: boolean;
}
