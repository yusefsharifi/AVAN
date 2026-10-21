import { IsString, IsUUID, IsOptional, IsInt, IsEnum, MinLength, Min, Max } from 'class-validator';
import { VisitPurpose } from '@prisma/client';

export class WalkInVisitorDto {
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
  @IsString()
  visitorCompany?: string;

  @IsEnum(VisitPurpose)
  purpose: VisitPurpose;

  @IsOptional()
  @IsString()
  purposeDetail?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsUUID()
  gateId: string;

  @IsUUID()
  hostId: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  expectedDuration?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
