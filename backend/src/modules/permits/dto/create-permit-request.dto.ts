import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsObject,
  MinLength,
  IsMobilePhone,
  IsEmail,
  IsArray,
} from 'class-validator';

export enum PermitType {
  CONSTRUCTION = 'CONSTRUCTION',
  NIGHT_TRAFFIC = 'NIGHT_TRAFFIC',
  HAZMAT_TRANSPORT = 'HAZMAT_TRANSPORT',
  ACTIVITY_LICENSE = 'ACTIVITY_LICENSE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  FIRE_SAFETY = 'FIRE_SAFETY',
  EMERGENCY_POWER = 'EMERGENCY_POWER',
  WASTE_DISPOSAL = 'WASTE_DISPOSAL',
  WORKING_AT_HEIGHT = 'WORKING_AT_HEIGHT',
  HOT_WORK = 'HOT_WORK',
  CONFINED_SPACE = 'CONFINED_SPACE',
  EXCAVATION = 'EXCAVATION',
  NOISE_WAIVER = 'NOISE_WAIVER',
  OVERSIZE_TRANSPORT = 'OVERSIZE_TRANSPORT',
  TEMPORARY_STRUCTURE = 'TEMPORARY_STRUCTURE',
  EVENT_PERMIT = 'EVENT_PERMIT',
  CUSTOM = 'CUSTOM',
}

export enum PermitPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum PermitStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SITE_VISIT_SCHEDULED = 'SITE_VISIT_SCHEDULED',
  SITE_VISIT_DONE = 'SITE_VISIT_DONE',
  CONDITIONALLY_APPROVED = 'CONDITIONALLY_APPROVED',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export enum IssuedPermitStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED',
}

export enum ConditionStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  WAIVED = 'WAIVED',
  OVERDUE = 'OVERDUE',
}

export enum PermitDocType {
  APPLICATION_FORM = 'APPLICATION_FORM',
  SITE_PLAN = 'SITE_PLAN',
  TECHNICAL_DRAWING = 'TECHNICAL_DRAWING',
  SAFETY_PLAN = 'SAFETY_PLAN',
  ENVIRONMENTAL_ASSESSMENT = 'ENVIRONMENTAL_ASSESSMENT',
  FIRE_SAFETY_PLAN = 'FIRE_SAFETY_PLAN',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  CONTRACTOR_LICENSE = 'CONTRACTOR_LICENSE',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  AUTHORITY_APPROVAL = 'AUTHORITY_APPROVAL',
  PREVIOUS_PERMIT = 'PREVIOUS_PERMIT',
  COMPLIANCE_EVIDENCE = 'COMPLIANCE_EVIDENCE',
  OTHER = 'OTHER',
}

export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum InspectionResult {
  PASS = 'PASS',
  PASS_WITH_CONDITIONS = 'PASS_WITH_CONDITIONS',
  FAIL = 'FAIL',
  INCOMPLETE = 'INCOMPLETE',
}

export class CreatePermitRequestDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsEnum(PermitType)
  type: PermitType;

  @IsOptional()
  @IsString()
  subType?: string;

  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsString()
  @MinLength(10)
  justification: string;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  @IsOptional()
  @IsString()
  locationBlock?: string;

  @IsOptional()
  @IsString()
  locationUnit?: string;

  @IsOptional()
  @IsString()
  affectedArea?: string;

  @IsOptional()
  @IsObject()
  geoPolygon?: object;

  @IsDateString()
  requestedFrom: string;

  @IsDateString()
  requestedUntil: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsObject()
  recurringPattern?: object;

  @IsString()
  applicantName: string;

  @IsMobilePhone('fa-IR')
  applicantPhone: string;

  @IsOptional()
  @IsEmail()
  applicantEmail?: string;

  @IsString()
  applicantRole: string;

  @IsOptional()
  @IsString()
  responsibleName?: string;

  @IsOptional()
  @IsMobilePhone('fa-IR')
  responsiblePhone?: string;

  @IsOptional()
  @IsEnum(PermitPriority)
  priority?: PermitPriority;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
