import { IsString, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { PlotType } from '@prisma/client';

export class CreatePlotDto {
  @IsUUID()
  zoneId!: string;

  @IsString()
  code!: string;

  @IsString()
  block!: string;

  @IsString()
  unitNumber!: string;

  areaSqM!: number;

  @IsEnum(PlotType)
  type!: PlotType;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;

  @IsOptional()
  @IsObject()
  geoPolygon?: object;

  @IsOptional()
  monthlyRent?: bigint;

  @IsOptional()
  @IsObject()
  utilityMeter?: object;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePlotDto {
  @IsOptional()
  @IsEnum(PlotType)
  type?: PlotType;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;

  @IsOptional()
  @IsObject()
  geoPolygon?: object;

  @IsOptional()
  monthlyRent?: bigint;

  @IsOptional()
  @IsObject()
  utilityMeter?: object;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FilterPlotsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  minArea?: number;

  @IsOptional()
  maxArea?: number;
}
