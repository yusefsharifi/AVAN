// ═══════════════════════════════════════════════════════════════════════════════
// DTOs — Workflow Tasks
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsObject,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { TaskDecision, TaskStatus, TaskType, TaskPriority } from '@prisma/client';

export class CompleteTaskDto {
  @IsUUID()
  taskId: string;

  @IsEnum(TaskDecision)
  decision: TaskDecision;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  attachments?: string[];

  @IsOptional()
  @IsObject()
  variableUpdates?: Record<string, unknown>;
}

export class DelegateTaskDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  delegateToUserId: string;

  @IsString()
  @MinLength(5)
  reason: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class ClaimTaskDto {
  @IsUUID()
  taskId: string;
}

export class FilterTasksDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  assigneeRole?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  definitionCode?: string;

  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean;

  @IsOptional()
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  sortBy?: 'slaDueAt' | 'priority' | 'createdAt';

  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  constructor() {
    this.limit = 20;
  }
}
