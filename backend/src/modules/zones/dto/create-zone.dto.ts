import { IsString, IsOptional, IsEmail, IsObject, IsDecimal } from 'class-validator';

export class ZoneSettingsDto {
  @IsOptional()
  workingHours?: { start: string; end: string };

  @IsOptional()
  weekends?: number[];

  @IsOptional()
  defaultSlaHours?: number;

  @IsOptional()
  requireHazmatApproval?: boolean;

  @IsOptional()
  autoApproveVisitor?: boolean;

  @IsOptional()
  maxVisitorDaysAdvance?: number;

  @IsOptional()
  gateCount?: number;

  @IsOptional()
  weightUnit?: string;

  @IsOptional()
  currency?: string;

  @IsOptional()
  timezone?: string;

  @IsOptional()
  maxDwellMinutes?: number;
}

export class CreateZoneDto {
  @IsString()
  code!: string;

  @IsString()
  nameFa!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  mapCenterLat?: number;

  @IsOptional()
  mapCenterLng?: number;

  @IsOptional()
  totalAreaHectares?: number;

  @IsOptional()
  @IsObject()
  settings?: ZoneSettingsDto;
}
