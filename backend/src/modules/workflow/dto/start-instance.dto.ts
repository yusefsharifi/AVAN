// ═══════════════════════════════════════════════════════════════════════════════
// DTOs — Workflow Instances
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { InstanceStatus, TaskPriority } from '@prisma/client';

export class StartWorkflowInstanceDto {
  @IsString()
  definitionCode: string;

  @IsString()
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class FilterInstancesDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(InstanceStatus)
  status?: InstanceStatus;

  @IsOptional()
  @IsString()
  definitionCode?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  constructor() {
    this.limit = 20;
  }
}
