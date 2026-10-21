import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  ProductionLineStatus,
  ProductionLineShift,
  ProductionSalesOrderStatus,
  ProductionOrderPriority,
  ProductionWorkOrderStatus,
  ProductionShift,
  ProductionBomStatus,
  ProductionCheckType,
  ProductionCheckResult,
  NcrSeverity,
  NcrStatus,
  ScrapReason,
  ScrapDisposalMethod,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// NESTED (JSON) DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class SalesOrderLineDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsOptional() @IsString() itemSku?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() uom?: string;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsNumber() @Min(0) totalPrice?: number;
  @IsOptional() @IsNumber() @Min(0) deliveredQuantity?: number;
  @IsOptional() @IsIn(['pending', 'in_production', 'completed']) status?: string;
}

export class BomLineDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsOptional() @IsString() itemSku?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() uom?: string;
  @IsOptional() @IsNumber() @Min(0) scrapFactor?: number;
  @IsOptional() @IsNumber() @Min(0) effectiveQuantity?: number;
  @IsOptional() @IsBoolean() isOptional?: boolean;
  @IsOptional() @IsString() substituteItemId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class QualityParameterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() target?: number;
  @IsOptional() @IsNumber() actual?: number;
  @IsOptional() @IsNumber() tolerance?: number;
  @IsOptional() @IsBoolean() pass?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION LINE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateProductionLineDto {
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsNumber() @Min(0) capacity: number;
  @IsOptional() @IsEnum(ProductionLineStatus) currentStatus?: ProductionLineStatus;
  @IsOptional() @IsString() currentWorkOrderId?: string;
  @IsOptional() @IsEnum(ProductionLineShift) shift?: ProductionLineShift;
  @IsOptional() @IsNumber() @Min(0) oee?: number;
  @IsOptional() @IsString() lastMaintenanceDate?: string;
  @IsOptional() @IsString() nextMaintenanceDate?: string;
  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional() @IsString() zoneId?: string;
}

// Step-4 TASK 6(b): PATCH /production/lines/:id did not exist at all.
// `Partial<CreateProductionLineDto>` cannot be used as the handler type — the
// `Partial` wrapper is erased at runtime, so the ValidationPipe would still
// require code/nameFa/capacity on a status-only PATCH. Every field is optional.
export class UpdateProductionLineDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() nameFa?: string;
  @IsOptional() @IsNumber() @Min(0) capacity?: number;
  @IsOptional() @IsEnum(ProductionLineStatus) currentStatus?: ProductionLineStatus;
  @IsOptional() @IsString() currentWorkOrderId?: string;
  @IsOptional() @IsEnum(ProductionLineShift) shift?: ProductionLineShift;
  @IsOptional() @IsNumber() @Min(0) oee?: number;
  @IsOptional() @IsString() lastMaintenanceDate?: string;
  @IsOptional() @IsString() nextMaintenanceDate?: string;
  @IsOptional() @IsString() supervisorName?: string;
  // Deliberately no zoneId: a line must never move between zones via PATCH.
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES ORDER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateSalesOrderDto {
  @IsOptional() @IsString() orderNumber?: string;
  @IsString() customerId: string;
  @IsString() customerName: string;
  @IsString() orderDate: string;
  @IsString() requiredDate: string;
  @IsOptional() @IsEnum(ProductionSalesOrderStatus) status?: ProductionSalesOrderStatus;
  @IsOptional() @IsEnum(ProductionOrderPriority) priority?: ProductionOrderPriority;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SalesOrderLineDto) lines?: SalesOrderLineDto[];
  @IsOptional() @IsNumber() @Min(0) totalValue?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() confirmedAt?: string;
  @IsOptional() @IsString() completedAt?: string;
}

export class UpdateSalesOrderDto {
  @IsOptional() @IsString() orderNumber?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() orderDate?: string;
  @IsOptional() @IsString() requiredDate?: string;
  @IsOptional() @IsEnum(ProductionSalesOrderStatus) status?: ProductionSalesOrderStatus;
  @IsOptional() @IsEnum(ProductionOrderPriority) priority?: ProductionOrderPriority;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SalesOrderLineDto) lines?: SalesOrderLineDto[];
  @IsOptional() @IsNumber() @Min(0) totalValue?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() confirmedAt?: string;
  @IsOptional() @IsString() completedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateWorkOrderDto {
  @IsOptional() @IsString() workOrderNumber?: string;
  @IsOptional() @IsString() salesOrderId?: string;
  @IsOptional() @IsString() salesOrderNumber?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsOptional() @IsString() itemSku?: string;
  @IsNumber() @Min(0) plannedQuantity: number;
  @IsOptional() @IsNumber() @Min(0) actualQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) scrapQuantity?: number;
  @IsString() uom: string;
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() lineName?: string;
  @IsOptional() @IsString() scheduledStart?: string;
  @IsOptional() @IsString() scheduledEnd?: string;
  @IsOptional() @IsString() actualStart?: string;
  @IsOptional() @IsString() actualEnd?: string;
  @IsOptional() @IsEnum(ProductionWorkOrderStatus) status?: ProductionWorkOrderStatus;
  @IsOptional() @IsEnum(ProductionOrderPriority) priority?: ProductionOrderPriority;
  @IsOptional() @IsEnum(ProductionShift) assignedShift?: ProductionShift;
  @IsOptional() @IsString() supervisorId?: string;
  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional() @IsString() bomId?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedDurationHours?: number;
  @IsOptional() @IsNumber() @Min(0) actualDurationHours?: number;
}

export class UpdateWorkOrderDto {
  @IsOptional() @IsString() workOrderNumber?: string;
  @IsOptional() @IsString() salesOrderId?: string;
  @IsOptional() @IsString() salesOrderNumber?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsOptional() @IsString() itemSku?: string;
  @IsOptional() @IsNumber() @Min(0) plannedQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) actualQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) scrapQuantity?: number;
  @IsOptional() @IsString() uom?: string;
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() lineName?: string;
  @IsOptional() @IsString() scheduledStart?: string;
  @IsOptional() @IsString() scheduledEnd?: string;
  @IsOptional() @IsString() actualStart?: string;
  @IsOptional() @IsString() actualEnd?: string;
  @IsOptional() @IsEnum(ProductionWorkOrderStatus) status?: ProductionWorkOrderStatus;
  @IsOptional() @IsEnum(ProductionOrderPriority) priority?: ProductionOrderPriority;
  @IsOptional() @IsEnum(ProductionShift) assignedShift?: ProductionShift;
  @IsOptional() @IsString() supervisorId?: string;
  @IsOptional() @IsString() supervisorName?: string;
  @IsOptional() @IsString() bomId?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedDurationHours?: number;
  @IsOptional() @IsNumber() @Min(0) actualDurationHours?: number;
}

export class UpdateWorkOrderStatusDto {
  @IsEnum(ProductionWorkOrderStatus) status: ProductionWorkOrderStatus;
  @IsOptional() @IsNumber() @Min(0) actualQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) scrapQuantity?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOM DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateBomDto {
  @IsOptional() @IsString() bomNumber?: string;
  @IsOptional() @IsString() finishedItemId?: string;
  @IsOptional() @IsString() finishedItemNameFa?: string;
  @IsOptional() @IsString() finishedItemSku?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsEnum(ProductionBomStatus) status?: ProductionBomStatus;
  @IsOptional() @IsNumber() @Min(0) outputQuantity?: number;
  @IsOptional() @IsString() outputUom?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomLineDto) lines?: BomLineDto[];
  @IsOptional() @IsNumber() @Min(0) totalMaterialCost?: number;
  @IsOptional() @IsNumber() @Min(0) processingCost?: number;
  @IsOptional() @IsNumber() @Min(0) totalCost?: number;
  @IsOptional() @IsString() effectiveFrom?: string;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsString() approvedAt?: string;
}

export class UpdateBomDto {
  @IsOptional() @IsString() bomNumber?: string;
  @IsOptional() @IsString() finishedItemId?: string;
  @IsOptional() @IsString() finishedItemNameFa?: string;
  @IsOptional() @IsString() finishedItemSku?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsEnum(ProductionBomStatus) status?: ProductionBomStatus;
  @IsOptional() @IsNumber() @Min(0) outputQuantity?: number;
  @IsOptional() @IsString() outputUom?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BomLineDto) lines?: BomLineDto[];
  @IsOptional() @IsNumber() @Min(0) totalMaterialCost?: number;
  @IsOptional() @IsNumber() @Min(0) processingCost?: number;
  @IsOptional() @IsNumber() @Min(0) totalCost?: number;
  @IsOptional() @IsString() effectiveFrom?: string;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsString() approvedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY CHECK DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateQualityCheckDto {
  @IsOptional() @IsString() checkNumber?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() workOrderNumber?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsOptional() @IsEnum(ProductionCheckType) checkType?: ProductionCheckType;
  @IsOptional() @IsInt() @Min(0) sampleSize?: number;
  @IsOptional() @IsInt() @Min(0) defectCount?: number;
  @IsOptional() @IsNumber() @Min(0) defectRate?: number;
  @IsOptional() @IsEnum(ProductionCheckResult) result?: ProductionCheckResult;
  @IsOptional() @IsString() checkedBy?: string;
  @IsOptional() @IsString() checkedAt?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QualityParameterDto) parameters?: QualityParameterDto[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() attachments?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NCR DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateNcrDto {
  @IsOptional() @IsString() ncrNumber?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() grnId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(NcrSeverity) severity?: NcrSeverity;
  @IsOptional() @IsEnum(NcrStatus) status?: NcrStatus;
  @IsOptional() @IsString() raisedBy?: string;
  @IsOptional() @IsString() raisedAt?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() correctiveAction?: string;
  @IsOptional() @IsString() closedAt?: string;
  @IsOptional() @IsString() closedBy?: string;
}

export class UpdateNcrDto {
  @IsOptional() @IsString() ncrNumber?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() grnId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(NcrSeverity) severity?: NcrSeverity;
  @IsOptional() @IsEnum(NcrStatus) status?: NcrStatus;
  @IsOptional() @IsString() raisedBy?: string;
  @IsOptional() @IsString() raisedAt?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() correctiveAction?: string;
  @IsOptional() @IsString() closedAt?: string;
  @IsOptional() @IsString() closedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAP RECORD DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateScrapRecordDto {
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() itemId?: string;
  @IsOptional() @IsString() itemNameFa?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsOptional() @IsString() uom?: string;
  @IsOptional() @IsEnum(ScrapReason) reason?: ScrapReason;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() recordedBy?: string;
  @IsOptional() @IsString() recordedAt?: string;
  @IsOptional() @IsEnum(ScrapDisposalMethod) disposalMethod?: ScrapDisposalMethod;
}
