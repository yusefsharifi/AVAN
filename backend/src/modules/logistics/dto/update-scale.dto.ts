import { IsString, IsOptional, IsDecimal, IsBoolean, IsEnum } from 'class-validator';
import { ScaleStatus } from '@prisma/client';

export class UpdateScaleDto {
  @IsOptional()
  @IsString()
  nameFa?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,3' })
  capacity?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,3' })
  precision?: number;

  @IsOptional()
  @IsEnum(ScaleStatus)
  status?: ScaleStatus;

  @IsOptional()
  @IsBoolean()
  isAutoCapture?: boolean;
}
