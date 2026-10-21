import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  MinLength,
  Matches,
  IsEmail,
  Min,
  Max,
} from 'class-validator';
import { VisitPurpose, VisitorType } from '@prisma/client';

export class CreateVisitorRequestDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MinLength(3)
  visitorName: string;

  @IsOptional()
  @IsString()
  visitorNationalId?: string;

  @IsString()
  visitorPhone: string;

  @IsOptional()
  @IsEmail()
  visitorEmail?: string;

  @IsOptional()
  @IsString()
  visitorCompany?: string;

  @IsOptional()
  @IsString()
  visitorJobTitle?: string;

  @IsEnum(VisitPurpose)
  purpose: VisitPurpose;

  @IsOptional()
  @IsString()
  purposeDetail?: string;

  @IsEnum(VisitorType)
  type: VisitorType;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expectedDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  expectedTime: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  expectedDuration?: number;

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

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsUUID()
  hostId: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresEscort?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
