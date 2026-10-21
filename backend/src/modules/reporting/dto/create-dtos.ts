import { ExecutionStatus } from "@prisma/client";
// M18: Reporting & BI — DTOs with class-validator
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  IsIn,
  IsEmail,
  ValidateNested,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReportCategory,
  ReportType,
  ScheduleFrequency,
  DeliveryChannel,
  ExportFormat,
  DashboardType,
  WidgetType,
} from './enums';

// ─── Report Definition DTOs ────────────────────────────────────────────────

export class FieldConfigDto {
  @IsString()
  source!: string;

  @IsString()
  field!: string;

  @IsString()
  labelFa!: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class FilterConfigDto {
  @IsString()
  field!: string;

  @IsIn(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'like', 'between'])
  operator!: string;

  value!: unknown;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class OrderConfigDto {
  @IsString()
  field!: string;

  @IsIn(['asc', 'desc'])
  direction!: 'asc' | 'desc';
}

export class AggConfigDto {
  @IsString()
  field!: string;

  @IsIn(['count', 'sum', 'avg', 'min', 'max', 'count_distinct'])
  function!: string;

  @IsString()
  alias!: string;
}

export class ReportConfigDto {
  @IsArray()
  @IsString({ each: true })
  dataSources!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldConfigDto)
  fields!: FieldConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConfigDto)
  filters?: FilterConfigDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderConfigDto)
  orderBy?: OrderConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggConfigDto)
  aggregations?: AggConfigDto[];

  @IsOptional()
  @IsString()
  chartType?: string;

  @IsOptional()
  @IsObject()
  chartConfig?: Record<string, unknown>;
}

export class CreateReportDefinitionDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  code!: string;

  @IsString()
  nameFa!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  descriptionFa?: string;

  @IsEnum(ReportCategory)
  category!: ReportCategory;

  @IsEnum(ReportType)
  type!: ReportType;

  @IsObject()
  @ValidateNested()
  @Type(() => ReportConfigDto)
  config!: ReportConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ─── Run Report DTOs ───────────────────────────────────────────────────────

export class RunReportParametersDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  [key: string]: unknown;
}

export class RunReportDto {
  @IsString()
  reportCode!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RunReportParametersDto)
  parameters?: RunReportParametersDto;

  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;

  @IsOptional()
  @IsBoolean()
  returnData?: boolean;
}

// ─── Schedule DTOs ─────────────────────────────────────────────────────────

export class CreateReportScheduleDto {
  @IsString()
  reportCode!: string;

  @IsEnum(ScheduleFrequency)
  frequency!: ScheduleFrequency;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RunReportParametersDto)
  parameters?: RunReportParametersDto;

  @IsArray()
  @IsEnum(DeliveryChannel, { each: true })
  deliveryChannels!: DeliveryChannel[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  smsRecipients?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inAppRecipients?: string[];

  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;
}

// ─── Dashboard DTOs ────────────────────────────────────────────────────────

export class CreateWidgetDto {
  @IsEnum(WidgetType)
  widgetType!: WidgetType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  reportCode?: string;

  @IsObject()
  config!: Record<string, unknown>;

  @IsObject()
  @ValidateNested()
  position!: { x: number; y: number; w: number; h: number };

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateDashboardDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsString()
  code!: string;

  @IsString()
  nameFa!: string;

  @IsEnum(DashboardType)
  type!: DashboardType;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWidgetDto)
  widgets?: CreateWidgetDto[];
}

export class UpdateWidgetLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  widgets!: WidgetPositionDto[];
}

export class WidgetPositionDto {
  @IsUUID()
  id!: string;

  @IsObject()
  position!: { x: number; y: number; w: number; h: number };
}

// ─── KPI DTOs ──────────────────────────────────────────────────────────────

export class SetKpiTargetDto {
  @IsUUID()
  zoneId!: string;

  @IsString()
  module!: string;

  @IsString()
  kpiCode!: string;

  @IsInt()
  targetValue!: number;

  @IsIn(['monthly', 'quarterly', 'annual'])
  period!: string;

  @IsInt()
  year!: number;

  @IsOptional()
  @IsInt()
  month?: number;

  @IsOptional()
  @IsInt()
  quarter?: number;
}

// ─── Filter DTOs ───────────────────────────────────────────────────────────

export class FilterReportDefinitionsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class FilterDashboardsDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(DashboardType)
  type?: DashboardType;
}

export class FilterExecutionsDto {
  @IsOptional()
  @IsString()
  reportCode?: string;

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

