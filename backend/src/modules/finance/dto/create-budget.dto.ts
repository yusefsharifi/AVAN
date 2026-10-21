import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetLineDto {
  @IsUUID()
  accountCodeId: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @IsInt()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  q1Amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  q2Amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  q3Amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  q4Amount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBudgetDto {
  @IsUUID()
  zoneId: string;

  @IsString()
  name: string;

  @IsInt()
  fiscalYear: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines: CreateBudgetLineDto[];
}
