// ═══════════════════════════════════════════════════════════════════════════════
// CMMS Enums — M13: Computerized Maintenance Management System
// ═══════════════════════════════════════════════════════════════════════════════

export enum AssetCategory {
  GATE_EQUIPMENT = 'GATE_EQUIPMENT',
  WEIGH_SCALE = 'WEIGH_SCALE',
  SECURITY = 'SECURITY',
  ELECTRICAL = 'ELECTRICAL',
  CIVIL = 'CIVIL',
  VEHICLE = 'VEHICLE',
  IT_NETWORK = 'IT_NETWORK',
  HVAC = 'HVAC',
  FIRE_SYSTEM = 'FIRE_SYSTEM',
  LIFTING = 'LIFTING',
  PRODUCTION = 'PRODUCTION',
  OTHER = 'OTHER',
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
  DISPOSED = 'DISPOSED',
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}

export enum AssetCriticality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MaintenancePlanType {
  PREVENTIVE = 'PREVENTIVE',
  PREDICTIVE = 'PREDICTIVE',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION',
  LUBRICATION = 'LUBRICATION',
  CLEANING = 'CLEANING',
}

export enum MaintenanceCategory {
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  ELECTRONIC = 'ELECTRONIC',
  CIVIL = 'CIVIL',
  IT = 'IT',
  CALIBRATION = 'CALIBRATION',
  GENERAL = 'GENERAL',
}

export enum TriggerType {
  TIME_BASED = 'TIME_BASED',
  METER_BASED = 'METER_BASED',
  CONDITION_BASED = 'CONDITION_BASED',
  MANUAL = 'MANUAL',
}

export enum WorkOrderType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION',
  EMERGENCY = 'EMERGENCY',
  IMPROVEMENT = 'IMPROVEMENT',
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum FailureCause {
  WEAR_AND_TEAR = 'WEAR_AND_TEAR',
  OPERATOR_ERROR = 'OPERATOR_ERROR',
  MATERIAL_DEFECT = 'MATERIAL_DEFECT',
  DESIGN_FAULT = 'DESIGN_FAULT',
  OVERLOAD = 'OVERLOAD',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  LACK_OF_MAINTENANCE = 'LACK_OF_MAINTENANCE',
  EXTERNAL_DAMAGE = 'EXTERNAL_DAMAGE',
  UNKNOWN = 'UNKNOWN',
}

export enum StockMovementType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  SCRAP = 'SCRAP',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResult<T> {
  data: T[];
  meta: { limit: number; hasMore: boolean; cursor: string | null };
}

export interface AssetHierarchyDto {
  id: string;
  assetNumber: string;
  nameFa: string;
  category: string;
  children: AssetHierarchyDto[];
}

export interface AssetHistoryDto {
  asset: any;
  workOrders: any[];
  failureLogs: any[];
  maintenancePlans: any[];
  sparePartsUsed: any[];
  totalMaintenanceCost: number;
  mtbf: number;
  mttr: number;
}

export interface AssetKpiDto {
  totalAssets: number;
  byCategory: { category: string; count: number }[];
  byCondition: { condition: string; count: number }[];
  activeWorkOrders: number;
  overdueWorkOrders: number;
  assetsUnderMaintenance: number;
  criticalAssets: number;
  avgAssetAge: number;
  totalDepreciation: number;
}

export interface AssetMapDto {
  id: string;
  assetNumber: string;
  nameFa: string;
  category: string;
  status: string;
  condition: string;
  lat: number | null;
  lng: number | null;
}

export interface UpcomingMaintenanceDto {
  planId: string;
  planNumber: string;
  assetId: string;
  assetNumber: string;
  assetName: string;
  type: string;
  category: string;
  nextDueAt: Date;
  leadTimeDays: number;
}

export interface CalendarEventDto {
  date: string;
  planId: string;
  planNumber: string;
  assetId: string;
  assetName: string;
  type: string;
  category: string;
}

export interface MaintenanceStatsDto {
  totalPlans: number;
  activePlans: number;
  dueThisWeek: number;
  dueThisMonth: number;
  overdueCount: number;
  avgCompletionRate: number;
}

export interface WorkOrderStatsDto {
  total: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  emergency: number;
  slaBreached: number;
  slaComplianceRate: number;
  avgCompletionHours: number;
  avgDowntimeMinutes: number;
  totalCost: number;
  laborCost: number;
  partsCost: number;
  contractorCost: number;
  byTechnician: { name: string; count: number; avgHours: number }[];
}

export interface SparePartReorderDto {
  partId: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
}

export interface FailureReportDto {
  totalFailures: number;
  byAsset: { assetId: string; assetName: string; count: number }[];
  byFailureCause: { cause: string; count: number }[];
  byFailureMode: { mode: string; count: number }[];
  totalDowntime: number;
  criticalFailures: number;
  avgMTBF: number;
  avgMTTR: number;
  mostFailedAssets: { assetId: string; assetName: string; count: number; downtime: number }[];
}

export interface ParetoDto {
  assetId: string;
  assetNumber: string;
  assetName: string;
  failureCount: number;
  cumulativePercent: number;
}
