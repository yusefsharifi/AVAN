import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  IsEmail,
  MinLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { VisitPurpose } from '@prisma/client';

export class CreateGroupVisitDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  organizerName: string;

  @IsString()
  organizerPhone: string;

  @IsOptional()
  @IsEmail()
  organizerEmail?: string;

  @IsInt()
  @Min(2)
  @Max(500)
  expectedCount: number;

  @IsEnum(VisitPurpose)
  purpose: VisitPurpose;

  @IsOptional()
  @IsString()
  purposeDetail?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  visitDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string;

  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedGates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedZones?: string[];

  @IsUUID()
  hostId: string;

  @IsOptional()
  @IsBoolean()
  escortRequired?: boolean;

  @IsOptional()
  @IsString()
  briefingNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
