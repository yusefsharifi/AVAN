import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType, InvoiceDirection, PaymentMethod } from './enums';

export class CreateInvoiceLineDto {
  @IsInt()
  lineNumber: number;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsUUID()
  accountCodeId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsEnum(InvoiceType)
  type: InvoiceType;

  @IsEnum(InvoiceDirection)
  direction: InvoiceDirection;

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
  partyNationalId?: string;

  @IsOptional()
  @IsString()
  partyAddress?: string;

  @IsOptional()
  @IsString()
  partyPhone?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  issueDate: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsString()
  sourceEntityId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsString()
  paidAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
