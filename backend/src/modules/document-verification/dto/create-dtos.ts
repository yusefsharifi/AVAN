// ═══════════════════════════════════════════════════════════════════════════════
// M22: Document Verification Portal — DTOs with validation
// ═══════════════════════════════════════════════════════════════════════════════

import { IsString, IsOptional, IsIn, MinLength, IsEnum } from 'class-validator';

export class VerifyByQrDto {
  @IsString()
  @MinLength(10)
  qrHash!: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  language?: string;
}

export class VerifyByNumberDto {
  @IsString()
  documentType!: string;

  @IsString()
  @MinLength(3)
  documentNumber!: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  language?: string;
}

export class VerifyCompoundDto {
  @IsString()
  documentType!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  language?: string;
}

export class BlockIpDto {
  @IsString()
  ipAddress!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  durationHours?: number;
}
