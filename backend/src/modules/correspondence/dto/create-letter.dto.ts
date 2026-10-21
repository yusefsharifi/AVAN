// ═══════════════════════════════════════════════════════════════════════════════
// M7: Correspondence — Create Letter DTO
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LetterDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  INTERNAL = 'INTERNAL',
}

export enum LetterType {
  OFFICIAL = 'OFFICIAL',
  MEMO = 'MEMO',
  CIRCULAR = 'CIRCULAR',
  REPORT = 'REPORT',
  INSTRUCTION = 'INSTRUCTION',
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
  NOTIFICATION = 'NOTIFICATION',
  INVITATION = 'INVITATION',
  WARNING = 'WARNING',
  CONTRACT = 'CONTRACT',
  CERTIFICATE = 'CERTIFICATE',
}

export enum LetterClassification {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  SECRET = 'SECRET',
}

export enum LetterPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  INSTANT = 'INSTANT',
}

export enum LetterStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  SIGNED = 'SIGNED',
  SENT = 'SENT',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
  ARCHIVED = 'ARCHIVED',
  RETURNED = 'RETURNED',
  REFERRED = 'REFERRED',
  CANCELLED = 'CANCELLED',
}

export enum TemplateCategory {
  PERMIT = 'PERMIT',
  WAYBILL = 'WAYBILL',
  VISITOR = 'VISITOR',
  HSE = 'HSE',
  FINANCE = 'FINANCE',
  ONBOARDING = 'ONBOARDING',
  LEASE = 'LEASE',
  COLLECTION = 'COLLECTION',
  GENERAL = 'GENERAL',
  SYSTEM = 'SYSTEM',
}

export enum StepType {
  REVIEWER = 'REVIEWER',
  APPROVER = 'APPROVER',
  SIGNER = 'SIGNER',
  CO_SIGNER = 'CO_SIGNER',
}

export type RecipientAction = 'ACTION' | 'INFO' | 'CC';

export const RECIPIENT_ACTIONS: RecipientAction[] = ['ACTION', 'INFO', 'CC'];

export class RecipientDto {
  @IsString()
  name!: string;

  @IsString()
  orgName!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsIn(RECIPIENT_ACTIONS)
  action!: RecipientAction;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CreateLetterDto {
  // اختیاری است تا کاربران بدون zone (مثل SUPER_ADMIN) هم بتوانند نامه ثبت کنند؛
  // در صورت نبود، سرویس zone پیش‌فرض سازمان را انتخاب می‌کند.
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsEnum(LetterDirection)
  direction!: LetterDirection;

  @IsEnum(LetterType)
  type!: LetterType;

  @IsEnum(LetterClassification)
  classification!: LetterClassification;

  @IsOptional()
  @IsEnum(LetterPriority)
  priority?: LetterPriority;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  salutation?: string;

  @IsOptional()
  @IsString()
  closing?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  enclosuresCount?: number;

  @IsString()
  @MinLength(1)
  senderName!: string;

  @IsString()
  @MinLength(1)
  senderOrgName!: string;

  @IsOptional()
  @IsString()
  senderRole?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients!: RecipientDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsString()
  referenceLetterNumber?: string;

  @IsOptional()
  @IsString()
  referenceLetterId?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @IsOptional()
  @IsString()
  signatory?: string;

  @IsOptional()
  @IsString()
  signatoryRole?: string;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}
