import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsInt,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BiddingModeEnum, RFQStatusEnum } from './enums';

export class EvaluationCriterionDto {
  @IsString()
  criterion: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weight: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  subCriteria?: string;
}

export class CreateRfqDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsString()
  categoryId: string;

  @IsArray()
  categoryPath: string[];

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsDateString()
  deliveryDeadline?: string;

  @IsOptional()
  @IsString()
  incoterm?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsInt()
  maxBudget?: number;

  @IsOptional()
  @IsBoolean()
  budgetIsPublic?: boolean;

  @IsOptional()
  @IsString()
  technicalSpecs?: string;

  @IsOptional()
  @IsBoolean()
  sampleRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @IsEnum(BiddingModeEnum)
  biddingMode: BiddingModeEnum;

  @IsOptional()
  @IsBoolean()
  allowMultiRound?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxRounds?: number;

  @IsOptional()
  @IsBoolean()
  allowPartialBid?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  invitedSupplierIds?: string[];

  @IsDateString()
  submissionDeadline: string;

  @IsOptional()
  @IsDateString()
  clarificationDeadline?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  evaluationCriteria: EvaluationCriterionDto[];

  @IsOptional()
  @IsBoolean()
  autoConvertToPO?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRfqDto {
  // Step-4 TASK 6(c): a real update payload for PATCH /b2b/rfq/:id.
  // `Partial<CreateRfqDto>` cannot be used here — TypeScript erases the `Partial`
  // wrapper, so Nest would still instantiate CreateRfqDto and the ValidationPipe
  // (whitelist + forbidNonWhitelisted) would demand title/description/quantity/
  // submissionDeadline/... on every PATCH. Everything is optional instead, and
  // zoneId/companyId are deliberately absent: an RFQ must never change tenant.
  @IsOptional() @IsString() @MinLength(5) title?: string;
  @IsOptional() @IsString() @MinLength(20) description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsArray() categoryPath?: string[];
  @IsOptional() @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() deliveryLocation?: string;
  @IsOptional() @IsDateString() deliveryDeadline?: string;
  @IsOptional() @IsString() incoterm?: string;
  @IsOptional() @IsString() currencyCode?: string;
  @IsOptional() @IsInt() maxBudget?: number;
  @IsOptional() @IsBoolean() budgetIsPublic?: boolean;
  @IsOptional() @IsString() technicalSpecs?: string;
  @IsOptional() @IsBoolean() sampleRequired?: boolean;
  @IsOptional() @IsBoolean() inspectionRequired?: boolean;
  @IsOptional() @IsEnum(BiddingModeEnum) biddingMode?: BiddingModeEnum;
  @IsOptional() @IsBoolean() allowMultiRound?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(5) maxRounds?: number;
  @IsOptional() @IsBoolean() allowPartialBid?: boolean;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsArray() invitedSupplierIds?: string[];
  @IsOptional() @IsDateString() submissionDeadline?: string;
  @IsOptional() @IsDateString() clarificationDeadline?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EvaluationCriterionDto)
  evaluationCriteria?: EvaluationCriterionDto[];
  @IsOptional() @IsBoolean() autoConvertToPO?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class PublishRfqDto {
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @IsOptional()
  @IsBoolean()
  notifyInvited?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAll?: boolean;
}

export class SubmitClarificationDto {
  @IsUUID()
  rfqId: string;

  @IsString()
  @MinLength(10)
  question: string;
}

export class AnswerClarificationDto {
  @IsUUID()
  clarificationId: string;

  @IsString()
  @MinLength(5)
  answer: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class FilterRfqDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(RFQStatusEnum)
  status?: RFQStatusEnum;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  myRfqs?: boolean;

  @IsOptional()
  @IsBoolean()
  openForBidding?: boolean;

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

  @IsOptional()
  sortBy?: 'createdAt' | 'submissionDeadline' | 'quantity';

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
