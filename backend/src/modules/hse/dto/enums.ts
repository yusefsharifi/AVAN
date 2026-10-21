export enum HseIncidentType {
  NEAR_MISS = 'NEAR_MISS',
  FIRST_AID = 'FIRST_AID',
  MEDICAL_TREATMENT = 'MEDICAL_TREATMENT',
  LOST_TIME_INJURY = 'LOST_TIME_INJURY',
  FATALITY = 'FATALITY',
  FIRE = 'FIRE',
  EXPLOSION = 'EXPLOSION',
  HAZMAT_RELEASE = 'HAZMAT_RELEASE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  SECURITY = 'SECURITY',
  TRAFFIC = 'TRAFFIC',
  OTHER = 'OTHER',
}

export enum IncidentCategory {
  SLIP_TRIP_FALL = 'SLIP_TRIP_FALL',
  STRUCK_BY = 'STRUCK_BY',
  CAUGHT_IN_BETWEEN = 'CAUGHT_IN_BETWEEN',
  ELECTRICAL = 'ELECTRICAL',
  CHEMICAL_EXPOSURE = 'CHEMICAL_EXPOSURE',
  FIRE_EXPLOSION = 'FIRE_EXPLOSION',
  VEHICLE_COLLISION = 'VEHICLE_COLLISION',
  MANUAL_HANDLING = 'MANUAL_HANDLING',
  WORKING_AT_HEIGHT = 'WORKING_AT_HEIGHT',
  CONFINED_SPACE = 'CONFINED_SPACE',
  ENVIRONMENTAL_SPILL = 'ENVIRONMENTAL_SPILL',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  OTHER = 'OTHER',
}

export enum HseIncidentSeverity {
  NEGLIGIBLE = 'NEGLIGIBLE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CATASTROPHIC = 'CATASTROPHIC',
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  INVESTIGATION_COMPLETE = 'INVESTIGATION_COMPLETE',
  CAPA_IN_PROGRESS = 'CAPA_IN_PROGRESS',
  CLOSED = 'CLOSED',
  DISPUTED = 'DISPUTED',
}

export enum RootCauseCategory {
  UNSAFE_ACT = 'UNSAFE_ACT',
  UNSAFE_CONDITION = 'UNSAFE_CONDITION',
  LACK_OF_TRAINING = 'LACK_OF_TRAINING',
  PROCEDURE_FAILURE = 'PROCEDURE_FAILURE',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  MANAGEMENT_FAILURE = 'MANAGEMENT_FAILURE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  UNKNOWN = 'UNKNOWN',
}

export enum CapaType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
}

export enum CapaPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CapaStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED_PENDING_VERIFICATION = 'COMPLETED_PENDING_VERIFICATION',
  VERIFIED_EFFECTIVE = 'VERIFIED_EFFECTIVE',
  VERIFIED_INEFFECTIVE = 'VERIFIED_INEFFECTIVE',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum InspectionType {
  GENERAL_HSE = 'GENERAL_HSE',
  FIRE_SAFETY = 'FIRE_SAFETY',
  ELECTRICAL = 'ELECTRICAL',
  HAZMAT = 'HAZMAT',
  MACHINERY = 'MACHINERY',
  EMERGENCY_SYSTEM = 'EMERGENCY_SYSTEM',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  HOUSEKEEPING = 'HOUSEKEEPING',
}

export enum HseInspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  OVERDUE = 'OVERDUE',
}

export enum FindingSeverity {
  OBSERVATION = 'OBSERVATION',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum RiskStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum HazardType {
  PHYSICAL = 'PHYSICAL',
  CHEMICAL = 'CHEMICAL',
  BIOLOGICAL = 'BIOLOGICAL',
  ERGONOMIC = 'ERGONOMIC',
  PSYCHOSOCIAL = 'PSYCHOSOCIAL',
  ELECTRICAL = 'ELECTRICAL',
  MECHANICAL = 'MECHANICAL',
  FIRE = 'FIRE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  RADIATION = 'RADIATION',
}

export enum HseRiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum TrainingCategory {
  FIRE_SAFETY = 'FIRE_SAFETY',
  FIRST_AID = 'FIRST_AID',
  HAZMAT = 'HAZMAT',
  PPE = 'PPE',
  WORKING_AT_HEIGHT = 'WORKING_AT_HEIGHT',
  CONFINED_SPACE = 'CONFINED_SPACE',
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE',
  GENERAL_HSE = 'GENERAL_HSE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  HOT_WORK = 'HOT_WORK',
  OTHER = 'OTHER',
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { limit: number; hasMore: boolean; cursor: string | null };
}

export interface IncidentStatsDto {
  total: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  byCategory: { category: string; count: number }[];
  lostTimeIncidents: number;
  totalLostDays: number;
  nearMisses: number;
  hazmatIncidents: number;
  totalPropertyDamageCost: number;
  byMonth: { month: string; count: number }[];
  byCompany: { companyId: string; count: number }[];
}

export interface CapaStatsDto {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  verified: number;
  overdue: number;
  overdueRate: number;
  avgCompletionDays: number;
  effectivenessRate: number;
}

export interface ComplianceTrendDto {
  month: string;
  avgScore: number;
  inspectionCount: number;
}

export interface RiskMatrixDto {
  matrix: number[][];
  highRiskHazards: any[];
  distribution: Record<string, number>;
}

export interface HseDashboardDto {
  daysSinceLastIncident: number;
  daysSinceLastLTI: number;
  trir: number;
  ltifr: number;
  nearMissRate: number;
  openCAPAs: number;
  overdueCapas: number;
  upcomingInspections: number;
  openIncidents: number;
  highRisks: number;
  trainingCompliance: number;
  recentIncidents: any[];
  openCapasByPriority: Record<string, number>;
  incidentTrend: { month: string; count: number }[];
}

export interface CompanyHseProfileDto {
  company: any;
  incidents: number;
  capas: number;
  inspections: number;
  trir: number;
  ltifr: number;
  trainingCompliance: number;
  openRisks: number;
  hseScore: number;
}

export interface TrainingComplianceDto {
  totalEmployees: number;
  trained: number;
  expired: number;
  notTrained: number;
  complianceRate: number;
  byPlan: { planId: string; planName: string; trained: number; expired: number }[];
  expiringIn30Days: any[];
}

export interface EnvironmentalReportDto {
  totalMeasurements: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  byParameter: { parameter: string; count: number; complianceRate: number }[];
  trend: { month: string; complianceRate: number }[];
}

export interface EnvironmentalComplianceSummaryDto {
  totalMeasurements: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  byParameter: { parameter: string; rate: number }[];
  recentExceedances: any[];
}
