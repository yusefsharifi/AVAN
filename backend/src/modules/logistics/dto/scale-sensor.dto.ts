import { IsString, IsUUID, IsDecimal, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class ScaleSensorReadingDto {
  @IsString()
  deviceId: string;

  @IsUUID()
  scaleId: string;

  @IsDecimal({ decimal_digits: '0,3' })
  weight: number;

  @IsBoolean()
  isStable: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @IsString()
  timestamp: string;
}
