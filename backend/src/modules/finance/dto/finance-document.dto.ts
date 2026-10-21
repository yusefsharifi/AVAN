import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  IsIn,
  ValidateNested,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsoDate } from '../../../common/decorators/iso-date.decorator';

/** Mirrors the frontend `DocumentStatus` union exactly. */
export enum DocumentStatus {
  draft = 'draft',
  prepared = 'prepared',
  approved = 'approved',
  authorized = 'authorized',
  posted = 'posted',
  cancelled = 'cancelled',
}

export enum PurchaseDocType {
  purchase_invoice = 'purchase_invoice',
  purchase_return = 'purchase_return',
  pre_invoice_purchase = 'pre_invoice_purchase',
}

export enum SalesDocType {
  sales_invoice = 'sales_invoice',
  sales_return = 'sales_return',
  pre_invoice_sales = 'pre_invoice_sales',
}

export enum CurrencyCode {
  IRR = 'IRR',
  USD = 'USD',
  EUR = 'EUR',
}

export class CreateDocumentLineDto {
  @ApiProperty({ example: 'RM-12' })
  @IsString()
  itemCode: string;

  @ApiProperty({ example: 'ورق فولادی ۲ میل' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 8500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 9, description: 'Percent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Computed server-side when omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lineTotal?: number;

  /**
   * Client-generated line id. The frontend's `DocumentLine` interface requires
   * one, so it is present on every real payload — it MUST be whitelisted or
   * `forbidNonWhitelisted` turns every document create into a 400
   * (BUG-PERSIST-007). Ignored: the server issues its own child-row ids.
   */
  @ApiPropertyOptional({ description: 'Client line id; ignored' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Body for POST /finance/documents — serves BOTH purchase and sales.
 *
 * The endpoint is shared (the frontend posts `createPurchase` and `createSales`
 * to the same path), so `kind` disambiguates; when it is omitted the service
 * infers it from `purchaseType` / `salesType`.
 */
export class CreateFinanceDocumentDto {
  /**
   * Target zone, resolved by the shared `@ResolveZoneId()`:
   * body.zoneId -> query.zoneId -> session zone. Zone/company users never send
   * it; SUPER_ADMIN must (Step-4 TASK 3 — no write may reach storage with an
   * undefined zone).
   */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'PUR-1404-0007' })
  @IsString()
  documentNumber: string;

  @ApiPropertyOptional({ enum: ['purchase', 'sales'], description: 'Inferred from type when omitted' })
  @IsOptional()
  @IsIn(['purchase', 'sales'])
  kind?: 'purchase' | 'sales';

  @ApiProperty({ example: '2026-04-10' })
  @IsoDate({ field: 'date' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ enum: DocumentStatus, default: DocumentStatus.draft })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Defaults to `date` when omitted' })
  @IsOptional()
  @IsoDate({ field: 'statusChangeDate' })
  @IsString()
  statusChangeDate?: string;

  // ── Purchase side ──
  @ApiPropertyOptional({ enum: PurchaseDocType })
  @IsOptional()
  @IsEnum(PurchaseDocType)
  purchaseType?: PurchaseDocType;

  @ApiPropertyOptional({ example: 'فولاد گستر' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  payableAmount?: number;

  // ── Sales side ──
  @ApiPropertyOptional({ enum: SalesDocType })
  @IsOptional()
  @IsEnum(SalesDocType)
  salesType?: SalesDocType;

  @ApiPropertyOptional({ example: 'پتروپارس' })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  receivableAmount?: number;

  // ── Shared header fields ──
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemNumber?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorizedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountingDocRef?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ enum: CurrencyCode, default: CurrencyCode.IRR })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: CurrencyCode;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  // ── Client envelope ────────────────────────────────────────────────────────
  // The finance store always POSTs a fully-built document object, not just the
  // user's input: it carries a client-generated id, the shared `type` union,
  // lineCount, the four totals and timestamps. They MUST be declared here or
  // `forbidNonWhitelisted` turns every create into a 400 (BUG-PERSIST-007).
  // The totals are accepted but re-derived server-side below, so a client cannot
  // post a header total that disagrees with its own lines.
  @ApiPropertyOptional({ description: 'Client-generated id; the server issues its own' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    enum: [
      ...Object.values(PurchaseDocType),
      ...Object.values(SalesDocType),
    ],
    description: 'Shared purchase/sales union; mapped to purchaseType or salesType',
  })
  @IsOptional()
  @IsIn([...Object.values(PurchaseDocType), ...Object.values(SalesDocType)])
  type?: string;

  @ApiPropertyOptional({ description: 'Re-derived from lines.length' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lineCount?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBeforeDiscount?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDiscount?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTax?: number;

  @ApiPropertyOptional({ description: 'Re-derived server-side' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grandTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;

  @ApiPropertyOptional({ type: [CreateDocumentLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentLineDto)
  lines?: CreateDocumentLineDto[];
}

/** PATCH /finance/documents/:id — header fields only; lines are replaced wholesale. */
export class UpdateFinanceDocumentDto {
  /** See the note on `CreateFinanceDocumentDto`; SUPER_ADMIN names the zone. */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'date' })
  @IsString()
  date?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsoDate({ field: 'statusChangeDate' })
  @IsString()
  statusChangeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  payableAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  receivableAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorizedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountingDocRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitorName?: string;

  @ApiPropertyOptional({ enum: CurrencyCode })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: CurrencyCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  // ── Client envelope (see the note on the create DTO) ───────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    enum: [
      ...Object.values(PurchaseDocType),
      ...Object.values(SalesDocType),
    ],
  })
  @IsOptional()
  @IsIn([...Object.values(PurchaseDocType), ...Object.values(SalesDocType)])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lineCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBeforeDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  grandTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;

  @ApiPropertyOptional({ type: [CreateDocumentLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentLineDto)
  lines?: CreateDocumentLineDto[];
}
