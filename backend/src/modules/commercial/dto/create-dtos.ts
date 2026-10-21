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
  IsEmail,
  ValidateNested,
  Min,
  Max,
  MinLength,
  Matches,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProformaDirection,
  ProformaStatus,
  OrderStatus,
  MilestoneType,
  AgingBucket,
  CollectionStatus,
  CollectionActionType,
  CollectionOutcome,
  PartyType,
  ApprovalStatus,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════
// PROFORMA DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class ProformaLineDto {
  @IsInt()
  lineNumber: number;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  unit: string;

  @IsInt()
  @Min(1)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateProformaDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsEnum(ProformaDirection)
  direction: ProformaDirection;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsString()
  partyName: string;

  @IsOptional()
  @IsString()
  partyCode?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  issueDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validUntil: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsString()
  paymentTerms: string;

  @IsOptional()
  @IsString()
  incoterm?: string;

  @IsOptional()
  @IsIn(['IRR', 'USD', 'EUR'])
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaLineDto)
  lines: ProformaLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  rfqId?: string;

  @IsOptional()
  @IsString()
  bidId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class SubmitProformaApprovalDto {
  @IsUUID()
  proformaId: string;

  @IsOptional()
  @IsBoolean()
  useWorkflowEngine?: boolean;
}

export class ApproveProformaStepDto {
  @IsOptional()
  @IsUUID()
  proformaId?: string;

  @IsInt()
  stepOrder: number;

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class RecordPartyResponseDto {
  @IsBoolean()
  accepted: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviseProformaDto {
  @IsString()
  @MinLength(5)
  changeNote: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaLineDto)
  lines?: ProformaLineDto[];

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class OrderLineDto {
  @IsInt()
  lineNumber: number;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  itemName: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsInt()
  @Min(1)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class OrderMilestoneDto {
  @IsString()
  label: string;

  @IsEnum(MilestoneType)
  type: MilestoneType;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentOfTotal?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsEnum(ProformaDirection)
  direction: ProformaDirection;

  @IsOptional()
  @IsUUID()
  proformaId?: string;

  @IsOptional()
  @IsString()
  rfqId?: string;

  @IsOptional()
  @IsString()
  bidId?: string;

  @IsString()
  partyName: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];

  @IsString()
  paymentTerms: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  deliveryDate: string;

  @IsString()
  deliveryLocation: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderMilestoneDto)
  milestones?: OrderMilestoneDto[];

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECTION DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class OpenCollectionCaseDto {
  @IsUUID()
  invoiceId: string;

  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsString()
  partyName: string;

  @IsInt()
  @Min(1)
  originalAmount: number;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddCollectionActionDto {
  @IsUUID()
  caseId: string;

  @IsEnum(CollectionActionType)
  type: CollectionActionType;

  @IsString()
  @MinLength(5)
  notes: string;

  @IsEnum(CollectionOutcome)
  outcome: CollectionOutcome;

  @IsOptional()
  @IsBoolean()
  generateLetter?: boolean;
}

export class SetInstallmentPlanDto {
  @IsUUID()
  caseId: string;

  @IsInt()
  @Min(2)
  @Max(24)
  installmentCount: number;

  @IsIn(['monthly', 'biweekly'])
  frequency: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class ContractPaymentScheduleDto {
  @IsString()
  dueDate: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  description: string;
}

export class ContractDeliverableDto {
  @IsString()
  title: string;

  @IsString()
  dueDate: string;
}

export class ContractSignatoryDto {
  @IsString()
  name: string;

  @IsString()
  role: string;
}

export class CreateCommercialContractDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  title: string;

  @IsEnum(ProformaDirection)
  direction: ProformaDirection;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsString()
  partyName: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsInt()
  renewalNoticeDays?: number;

  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @IsIn(['IRR', 'USD', 'EUR'])
  currencyCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractPaymentScheduleDto)
  paymentSchedule?: ContractPaymentScheduleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractDeliverableDto)
  deliverables?: ContractDeliverableDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractSignatoryDto)
  signatories?: ContractSignatoryDto[];

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class AddAddendumDto {
  @IsUUID()
  contractId: string;

  @IsString()
  title: string;

  @IsString()
  effectiveDate: string;

  @IsString()
  @MinLength(10)
  changes: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTY DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class CreateCommercialPartyDto {
  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(PartyType)
  type: PartyType;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditLimit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class FilterProformaDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(ProformaDirection)
  direction?: ProformaDirection;

  @IsOptional()
  @IsEnum(ProformaStatus)
  status?: ProformaStatus;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsBoolean()
  expiringWithin7Days?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

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
}

export class FilterOrdersDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(ProformaDirection)
  direction?: ProformaDirection;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class FilterCollectionCasesDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(AgingBucket)
  agingBucket?: AgingBucket;

  @IsOptional()
  @IsEnum(CollectionStatus)
  collectionStatus?: CollectionStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
