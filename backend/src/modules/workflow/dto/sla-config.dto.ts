// ═══════════════════════════════════════════════════════════════════════════════
// DTOs — Workflow SLA
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateSlaConfigDto {
  @IsString()
  definitionCode: string;

  @IsString()
  stepId: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsInt()
  @Min(1)
  slaHours: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(95)
  warningAtPercent?: number;

  @IsOptional()
  @IsString()
  escalationLevel1?: string;

  @IsOptional()
  @IsString()
  escalationLevel2?: string;

  @IsOptional()
  @IsString()
  escalationLevel3?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalateAfterHours?: number;
}
