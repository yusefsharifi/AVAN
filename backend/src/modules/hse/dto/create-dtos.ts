import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MinLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HseIncidentType, IncidentCategory, HseIncidentSeverity, IncidentStatus,
  RootCauseCategory, CapaType, CapaPriority, CapaStatus,
  InspectionType, HseInspectionStatus, FindingSeverity,
  RiskStatus, HazardType, TrainingCategory,
} from './enums';

// ─── INCIDENT DTOs ──────────────────────────────────────────────────────────

export class ReportIncidentDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsEnum(HseIncidentType) type: HseIncidentType;
  @IsEnum(IncidentCategory) category: IncidentCategory;
  @IsEnum(HseIncidentSeverity) severity: HseIncidentSeverity;
  @IsString() location: string;
  @IsOptional() @IsString() block?: string;
  @IsOptional() @IsString() unit?: string;
  @IsDateString() occurredAt: string;
  @IsOptional() @IsString() injuredPersonName?: string;
  @IsOptional() @IsString() injuredPersonRole?: string;
  @IsOptional() @IsString() injuredPersonCompany?: string;
  @IsOptional() @IsArray() witnessNames?: string[];
  @IsOptional() @IsBoolean() firstAidGiven?: boolean;
  @IsOptional() @IsString() firstAidBy?: string;
  @IsOptional() @IsBoolean() hospitalRequired?: boolean;
  @IsOptional() @IsString() hospitalName?: string;
  @IsString() @MinLength(20) description: string;
  @IsOptional() @IsString() immediateActions?: string;
  @IsOptional() @IsBoolean() hazmatInvolved?: boolean;
  @IsOptional() @IsString() hazmatType?: string;
  @IsOptional() @IsBoolean() propertyDamage?: boolean;
  @IsOptional() @IsInt() @Min(0) propertyDamageValue?: number;
  @IsOptional() @IsBoolean() environmentalImpact?: boolean;
  @IsOptional() @IsString() environmentalDetails?: string;
  @IsOptional() @IsBoolean() isLostTime?: boolean;
  @IsOptional() @IsInt() @Min(0) lostTimeDays?: number;
  @IsOptional() @IsArray() imageKeys?: string[];
  @IsOptional() @IsBoolean() isWorkRelated?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class InvestigateIncidentDto {
  @IsUUID() incidentId: string;
  @IsString() @MinLength(20) rootCause: string;
  @IsEnum(RootCauseCategory) rootCauseCategory: RootCauseCategory;
  @IsOptional() @IsArray() contributingFactors?: string[];
  @IsString() @MinLength(20) investigationReport: string;
  @IsOptional() @IsArray() investigationImageKeys?: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCapaDto)
  correctiveActions: CreateCapaDto[];
}

// ─── CAPA DTOs ──────────────────────────────────────────────────────────────

export class CreateCapaDto {
  @IsOptional() @IsUUID() incidentId?: string;
  @IsOptional() @IsUUID() inspectionId?: string;
  @IsOptional() @IsUUID() riskId?: string;
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsEnum(CapaType) type: CapaType;
  @IsString() @MinLength(5) title: string;
  @IsString() @MinLength(10) description: string;
  @IsEnum(CapaPriority) priority: CapaPriority;
  @IsUUID() assignedTo: string;
  @IsString() assignedToName: string;
  @IsDateString() dueDate: string;
}

export class CompleteCapaDto {
  @IsString() @MinLength(10) completionNotes: string;
  @IsOptional() @IsArray() evidenceKeys?: string[];
}

export class VerifyCapaDto {
  @IsBoolean() isEffective: boolean;
  @IsString() @MinLength(5) verificationNotes: string;
}

// ─── INSPECTION DTOs ────────────────────────────────────────────────────────

export class CreateInspectionDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsEnum(InspectionType) type: InspectionType;
  @IsString() category: string;
  @IsString() title: string;
  @IsUUID() inspectorId: string;
  @IsString() inspectorName: string;
  @IsDateString() scheduledDate: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() block?: string;
  @IsOptional() @IsUUID() checklistId?: string;
  @IsOptional() @IsString() companyContact?: string;
}

export class ChecklistResultItemDto {
  @IsString() itemId: string;
  @IsIn(['PASS', 'FAIL', 'NA', 'OBS']) result: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() imageKey?: string;
}

export class AddFindingDto {
  @IsEnum(FindingSeverity) severity: FindingSeverity;
  @IsString() category: string;
  @IsString() @MinLength(10) description: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsArray() imageKeys?: string[];
  @IsOptional() @IsString() recommendation?: string;
}

export class SubmitInspectionResultsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistResultItemDto)
  checklistResults: ChecklistResultItemDto[];
  @IsOptional() @IsString() reportNotes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => AddFindingDto)
  findings: AddFindingDto[];
}

export class CreateChecklistDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsEnum(InspectionType) type: InspectionType;
  @IsArray() items: { id: string; category: string; item: string; guidance?: string; required: boolean; severity?: string }[];
}

// ─── RISK DTOs ──────────────────────────────────────────────────────────────

export class RiskHazardDto {
  @IsString() hazardDescription: string;
  @IsEnum(HazardType) hazardType: HazardType;
  @IsArray() affectedPersons: string[];
  @IsInt() @Min(1) @Max(5) initialLikelihood: number;
  @IsInt() @Min(1) @Max(5) initialSeverity: number;
  @IsOptional() @IsString() existingControls?: string;
  @IsOptional() @IsArray() additionalControls?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(5) residualLikelihood?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) residualSeverity?: number;
  @IsOptional() @IsBoolean() actionRequired?: boolean;
  @IsOptional() @IsString() actionOwner?: string;
  @IsOptional() @IsDateString() actionDue?: string;
}

export class CreateRiskAssessmentDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() title: string;
  @IsString() area: string;
  @IsOptional() @IsString() activity?: string;
  @IsDateString() validFrom: string;
  @IsDateString() validUntil: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RiskHazardDto)
  hazards: RiskHazardDto[];
  @IsOptional() @IsString() notes?: string;
}

// ─── TRAINING DTOs ──────────────────────────────────────────────────────────

export class CreateTrainingPlanDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(TrainingCategory) category: TrainingCategory;
  @IsNumber() @Min(0.5) durationHours: number;
  @IsInt() @Min(1) validityMonths: number;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() instructor?: string;
}

export class CreateTrainingRecordDto {
  @IsUUID() planId: string;
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsString() employeeName: string;
  @IsOptional() @IsString() employeeRole?: string;
  @IsDateString() trainingDate: string;
  @IsOptional() @IsNumber() score?: number;
  @IsBoolean() passed: boolean;
  @IsString() conductedBy: string;
  @IsOptional() @IsString() notes?: string;
}

// ─── ENVIRONMENTAL DTOs ─────────────────────────────────────────────────────

export class RecordEnvironmentalMeasurementDto {
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsString() type: string;
  @IsString() parameter: string;
  @IsNumber() value: number;
  @IsString() unit: string;
  @IsDateString() measuredAt: string;
  @IsOptional() @IsString() measuredBy?: string;
  @IsOptional() @IsString() device?: string;
  @IsOptional() @IsNumber() permittedLimit?: number;
  @IsOptional() @IsString() notes?: string;
}

// ─── EMERGENCY DTOs ─────────────────────────────────────────────────────────

export class CreateEmergencyContactDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() name: string;
  @IsString() role: string;
  @IsString() phone: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsInt() @Min(1) priority?: number;
  @IsOptional() @IsString() notes?: string;
}

export class ScheduleDrillDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() type: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() objectives?: string;
}

export class RecordDrillDto {
  @IsDateString() conductedAt: string;
  @IsOptional() @IsInt() participantCount?: number;
  @IsOptional() @IsInt() duration?: number;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() improvements?: string;
  @IsOptional() @IsString() conductedBy?: string;
}

// ─── FILTER DTOs ────────────────────────────────────────────────────────────

export class FilterIncidentsDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsEnum(HseIncidentType) type?: HseIncidentType;
  @IsOptional() @IsEnum(HseIncidentSeverity) severity?: HseIncidentSeverity;
  @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
  @IsOptional() @IsBoolean() isLostTime?: boolean;
  @IsOptional() @IsBoolean() hazmatInvolved?: boolean;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}

export class FilterCapaDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsEnum(CapaStatus) status?: CapaStatus;
  @IsOptional() @IsEnum(CapaPriority) priority?: CapaPriority;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsBoolean() overdue?: boolean;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
