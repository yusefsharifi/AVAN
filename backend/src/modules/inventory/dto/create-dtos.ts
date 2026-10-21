import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEmail,
  IsArray,
  IsIn,
  IsDateString,
  MinLength,
  ValidateNested,
  IsObject,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  WarehouseType,
  ItemType,
  ValuationMethod,
  StockTransactionType,
  RequisitionStatus,
  RequisitionPriority,
  GRNStatus,
  PRStatus,
  POStatus,
  CountStatus,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// WAREHOUSE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateWarehouseDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsEnum(WarehouseType) type: WarehouseType;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsNumber() totalCapacity?: number;
  @IsOptional() @IsString() capacityUnit?: string;
  @IsOptional() @IsNumber() temperatureMin?: number;
  @IsOptional() @IsNumber() temperatureMax?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateLocationDto {
  @IsString() code: string;
  @IsOptional() @IsString() aisle?: string;
  @IsOptional() @IsString() rack?: string;
  @IsOptional() @IsString() bin?: string;
  @IsOptional() @IsInt() level?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsString() capacityUnit?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateItemDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsUUID() categoryId: string;
  @IsEnum(ItemType) type: ItemType;
  @IsString() unit: string;
  @IsOptional() @IsString() altUnit?: string;
  @IsOptional() @IsNumber() altUnitConversion?: number;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsObject() specifications?: object;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @IsOptional() @IsNumber() maxStock?: number;
  @IsOptional() @IsNumber() @Min(0) reorderPoint?: number;
  @IsOptional() @IsNumber() @Min(0) reorderQty?: number;
  @IsOptional() @IsInt() leadTimeDays?: number;
  @IsOptional() @IsBoolean() trackByBatch?: boolean;
  @IsOptional() @IsBoolean() trackBySerial?: boolean;
  @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @IsOptional() @IsInt() expiryWarningDays?: number;
  @IsOptional() @IsEnum(ValuationMethod) valuationMethod?: ValuationMethod;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsBoolean() isService?: boolean;
  @IsOptional() @IsBoolean() isStorable?: boolean;
  @IsOptional() @IsBoolean() isPurchasable?: boolean;
  @IsOptional() @IsBoolean() isSalable?: boolean;
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUISITION DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class RequisitionLineDto {
  @IsUUID() itemId: string;
  @IsNumber() @Min(0.001) requestedQty: number;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateRequisitionDto {
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsString() purpose: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) requiredDate: string;
  @IsEnum(RequisitionPriority) priority: RequisitionPriority;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RequisitionLineDto) lines: RequisitionLineDto[];
  @IsOptional() @IsString() notes?: string;
}

export class ApprovedLineDto {
  @IsUUID() lineId: string;
  @IsNumber() @Min(0) approvedQty: number;
}

export class ApproveRequisitionDto {
  @IsBoolean() approved: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ApprovedLineDto) lines?: ApprovedLineDto[];
  @IsOptional() @IsString() rejectionReason?: string;
}

export class IssuedLineDto {
  @IsUUID() lineId: string;
  @IsNumber() @Min(0.001) issuedQty: number;
  @IsUUID() warehouseId: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() serialNumber?: string;
}

export class IssueItemsDto {
  @IsUUID() requisitionId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => IssuedLineDto) lines: IssuedLineDto[];
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOODS RECEIPT DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class GRNLineDto {
  @IsOptional() @IsUUID() purchaseOrderLineId?: string;
  @IsUUID() itemId: string;
  @IsNumber() @Min(0.001) receivedQty: number;
  @IsInt() @Min(0) unitCost: number;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsArray() serialNumbers?: string[];
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() rejectionReason?: string;
}

export class CreateGoodsReceiptDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsUUID() warehouseId: string;
  @IsOptional() @IsUUID() purchaseOrderId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsString() vendorName: string;
  @IsOptional() @IsString() vendorInvoiceNumber?: string;
  @IsOptional() @IsString() deliveryNote?: string;
  @IsString() receivedDate: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => GRNLineDto) lines: GRNLineDto[];
  @IsOptional() @IsBoolean() requiresInspection?: boolean;
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE REQUEST DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class PRLineDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsString() itemName: string;
  @IsOptional() @IsString() itemCode?: string;
  @IsString() unit: string;
  @IsNumber() @Min(0.001) requestedQty: number;
  @IsOptional() @IsInt() unitPrice?: number;
  @IsOptional() @IsString() vendorSuggested?: string;
  @IsOptional() @IsString() specifications?: string;
}

export class CreatePurchaseRequestDto {
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsString() purpose: string;
  @IsString() requiredDate: string;
  @IsEnum(RequisitionPriority) priority: RequisitionPriority;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PRLineDto) lines: PRLineDto[];
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class POLineDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsString() itemName: string;
  @IsString() unit: string;
  @IsNumber() @Min(0.001) orderedQty: number;
  @IsInt() @Min(1) unitPrice: number;
  @IsOptional() @IsNumber() discount?: number;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsString() dueDate?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsString() vendorName: string;
  @IsOptional() @IsString() vendorPhone?: string;
  @IsOptional() @IsString() vendorEmail?: string;
  @IsString() orderDate: string;
  @IsOptional() @IsString() expectedDate?: string;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsUUID() purchaseRequestId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => POLineDto) lines: POLineDto[];
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICAL COUNT DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreatePhysicalCountDto {
  @IsUUID() zoneId: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsUUID() warehouseId: string;
  @IsString() plannedDate: string;
  @IsOptional() @IsArray() itemIds?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class CountLineResultDto {
  @IsUUID() lineId: string;
  @IsNumber() @Min(0) countedQty: number;
  @IsOptional() @IsString() notes?: string;
}

export class SubmitCountResultsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CountLineResultDto) lines: CountLineResultDto[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class AdjustStockDto {
  @IsUUID() warehouseId: string;
  @IsUUID() itemId: string;
  @IsNumber() quantity: number;
  @IsEnum(StockTransactionType) type: StockTransactionType;
  @IsString() @MinLength(5) reason: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() reference?: string;
}

export class TransferStockDto {
  @IsUUID() itemId: string;
  @IsUUID() fromWarehouseId: string;
  @IsUUID() toWarehouseId: string;
  @IsNumber() @Min(0.001) quantity: number;
  @IsOptional() @IsUUID() fromLocationId?: string;
  @IsOptional() @IsUUID() toLocationId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDOR DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateVendorDto {
  @IsUUID() zoneId: string;
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class FilterItemsDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ItemType) type?: ItemType;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() lowStock?: boolean;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}

export class FilterRequisitionsDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsEnum(RequisitionStatus) status?: RequisitionStatus;
  @IsOptional() @IsEnum(RequisitionPriority) priority?: RequisitionPriority;
  @IsOptional() @IsUUID() requestedBy?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
