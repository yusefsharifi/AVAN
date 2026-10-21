// ═══════════════════════════════════════════════════════════════════════════════
// DTOs — Workflow Definitions
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsBoolean,
  IsInt,
  MinLength,
  Min,
} from 'class-validator';
import { WorkflowCategory } from '@prisma/client';

export class CreateWorkflowDefinitionDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsString()
  @MinLength(3)
  code: string;

  @IsString()
  @MinLength(3)
  nameFa: string;

  @IsOptional()
  @IsString()
  descriptionFa?: string;

  @IsEnum(WorkflowCategory)
  category: WorkflowCategory;

  @IsObject()
  definition: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlaHours?: number;

  @IsOptional()
  @IsBoolean()
  allowReassign?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDelegate?: boolean;

  @IsOptional()
  @IsBoolean()
  requireComment?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnEachStep?: boolean;
}

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsString()
  nameFa?: string;

  @IsOptional()
  @IsString()
  descriptionFa?: string;

  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSlaHours?: number;

  @IsOptional()
  @IsBoolean()
  allowReassign?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDelegate?: boolean;

  @IsOptional()
  @IsBoolean()
  requireComment?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnEachStep?: boolean;

  @IsOptional()
  @IsString()
  changeNote?: string;
}

export class DuplicateDefinitionDto {
  @IsString()
  @MinLength(3)
  newCode: string;

  @IsOptional()
  @IsUUID()
  newZoneId?: string;
}
