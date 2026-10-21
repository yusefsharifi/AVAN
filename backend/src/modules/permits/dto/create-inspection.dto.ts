import { IsUUID, IsOptional, IsDateString, IsString } from 'class-validator';

export class CreatePermitInspectionDto {
  @IsOptional()
  @IsUUID()
  permitRequestId?: string;

  @IsOptional()
  @IsUUID()
  issuedPermitId?: string;

  @IsUUID()
  inspectorId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
