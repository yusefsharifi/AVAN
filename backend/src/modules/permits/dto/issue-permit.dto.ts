import { IsUUID, IsDateString, IsOptional, IsBoolean, IsArray, IsString, MinLength } from 'class-validator';

export class IssuePermitDto {
  @IsUUID()
  requestId: string;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsBoolean()
  isIndefinite?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedActivities?: string[];

  @IsOptional()
  @IsString()
  signatoryName?: string;

  @IsOptional()
  @IsString()
  signatoryRole?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finalConditions?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
