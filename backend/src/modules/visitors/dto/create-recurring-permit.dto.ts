import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsDateString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { RecurringPermitType } from '@prisma/client';

export class CreateRecurringPermitDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  visitorName: string;

  @IsString()
  visitorNationalId: string;

  @IsString()
  visitorPhone: string;

  @IsOptional()
  @IsString()
  visitorCompany?: string;

  @IsEnum(RecurringPermitType)
  permitType: RecurringPermitType;

  @IsArray()
  @IsInt({ each: true })
  allowedDays: number[];

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  allowedTimeStart: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  allowedTimeEnd: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedGates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedZones?: string[];

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxVisitsPerDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
