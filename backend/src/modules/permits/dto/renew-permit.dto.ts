import { IsUUID, IsDateString, IsOptional, IsBoolean, IsString } from 'class-validator';

export class RenewPermitDto {
  @IsUUID()
  existingPermitId: string;

  @IsDateString()
  newValidFrom: string;

  @IsDateString()
  newValidUntil: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  carryOverConditions?: boolean;
}
