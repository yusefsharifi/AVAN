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
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AssetCategory,
  AssetStatus,
  AssetCriticality,
  MaintenancePlanType,
  MaintenanceCategory,
  TriggerType,
  WorkOrderType,
  WorkOrderPriority,
  WorkOrderStatus,
  FailureCause,
  StockMovementType,
  AssetCondition,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateAssetDto {
  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  nameFa: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsEnum(AssetCategory)
  category: AssetCategory;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsNumber()
  geoLat?: number;

  @IsOptional()
  @IsNumber()
  geoLng?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsBoolean()
  isIoTConnected?: boolean;

  @IsOptional()
  @IsString()
  iotDeviceId?: string;

  @IsOptional()
  @IsString()
  meterUnit?: string;

  @IsOptional()
  @IsNumber()
  depreciationRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salvageValue?: number;

  @IsOptional()
  @IsUUID()
  gateId?: string;

  @IsOptional()
  @IsUUID()
  scaleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConditionDto {
  @IsEnum(AssetCondition)
  condition: AssetCondition;

  @IsString()
  @MinLength(5)
  notes: string;
}

export class UpdateMeterReadingDto {
  @IsNumber()
  meterValue: number;

  @IsDateString()
  readAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE PLAN DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class ChecklistItemDto {
  @IsString()
  item: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}

export class RequiredPartDto {
  @IsUUID()
  partId: string;

  @IsString()
  partName: string;

  @IsNumber()
  quantity: number;
}

export class CreateMaintenancePlanDto {
  @IsUUID()
  assetId: string;

  @IsUUID()
  zoneId: string;

  @IsString()
  nameFa: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaintenancePlanType)
  type: MaintenancePlanType;

  @IsEnum(MaintenanceCategory)
  category: MaintenanceCategory;

  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalDays?: number;

  @IsOptional()
  @IsString()
  intervalUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  intervalMeter?: number;

  @IsOptional()
  @IsString()
  conditionThreshold?: string;

  @IsOptional()
  @IsString()
  conditionField?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @IsString()
  skillRequired?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredPartDto)
  requiredParts?: RequiredPartDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateWorkOrderDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  assetId: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsEnum(WorkOrderType)
  type: WorkOrderType;

  @IsEnum(MaintenanceCategory)
  category: MaintenanceCategory;

  @IsEnum(WorkOrderPriority)
  priority: WorkOrderPriority;

  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsUUID()
  maintenancePlanId?: string;

  @IsOptional()
  @IsUUID()
  failureLogId?: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsUUID()
  assignedContractorId?: string;

  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklistItems?: ChecklistItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  imageKeys?: string[];
}

export class UsedPartDto {
  @IsUUID()
  sparePartId: string;

  @IsNumber()
  @Min(0.001)
  quantityUsed: number;

  @IsInt()
  @Min(0)
  unitCost: number;
}

export class CompletedChecklistItemDto {
  @IsString()
  id: string;

  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteWorkOrderDto {
  @IsString()
  @MinLength(10)
  resolution: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsEnum(FailureCause)
  failureCause?: FailureCause;

  @IsNumber()
  @Min(0.01)
  actualHours: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsedPartDto)
  partsUsed?: UsedPartDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  contractorCost?: number;

  @IsOptional()
  @IsNumber()
  meterAfterWork?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedChecklistItemDto)
  checklistItems?: CompletedChecklistItemDto[];

  @IsOptional()
  @IsArray()
  imageKeys?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignTechnicianDto {
  @IsUUID()
  technicianId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE LOG DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class ReportFailureDto {
  @IsUUID()
  assetId: string;

  @IsUUID()
  zoneId: string;

  @IsDateString()
  failedAt: string;

  @IsString()
  failureMode: string;

  @IsOptional()
  @IsEnum(FailureCause)
  failureCause?: FailureCause;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  impact?: string;

  @IsOptional()
  @IsString()
  impactLevel?: string;

  @IsOptional()
  @IsArray()
  imageKeys?: string[];

  @IsOptional()
  @IsBoolean()
  createWorkOrder?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPARE PART DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateSparePartDto {
  @IsUUID()
  zoneId: string;

  @IsString()
  partNumber: string;

  @IsString()
  nameFa: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierContact?: string;

  @IsNumber()
  @Min(0)
  minimumStock: number;

  @IsNumber()
  @Min(0)
  maximumStock: number;

  @IsNumber()
  @Min(0)
  reorderPoint: number;

  @IsNumber()
  @Min(0)
  reorderQuantity: number;

  @IsOptional()
  @IsString()
  storageLocation?: string;

  @IsOptional()
  @IsString()
  binNumber?: string;

  @IsInt()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockMovementDto {
  @IsUUID()
  sparePartId: string;

  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;
}

export class LinkAssetDto {
  @IsUUID()
  assetId: string;

  @IsUUID()
  sparePartId: string;

  @IsNumber()
  @Min(0.001)
  quantityRequired: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICIAN DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateTechnicianDto {
  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsArray()
  specializations: string[];

  @IsOptional()
  @IsArray()
  certifications?: { name: string; issuer: string; issuedAt?: string; expiresAt?: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTOR DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateContractorDto {
  @IsUUID()
  zoneId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsArray()
  specializations: string[];

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @IsOptional()
  contractPeriod?: {
    startDate?: string;
    endDate?: string;
    value?: number;
    currency?: string;
  };
}

export class UpdateContractorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  specializations?: string[];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class FilterAssetsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class FilterWorkOrdersDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

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
  @Max(100)
  limit?: number;
}

export class FilterSparePartsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isLowStock?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
