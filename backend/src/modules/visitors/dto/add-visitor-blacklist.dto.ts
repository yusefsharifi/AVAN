import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BlacklistSeverity } from '@prisma/client';

export class AddVisitorBlacklistDto {
  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  reason: string;

  @IsEnum(BlacklistSeverity)
  severity: BlacklistSeverity;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
