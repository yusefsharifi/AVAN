import { IsString, IsOptional, IsEnum, IsUUID, IsObject, IsArray, MinLength } from 'class-validator';
import { TrafficDirection, EntryMethod } from '@prisma/client';

export class ProcessEntryDto {
  @IsUUID()
  gateId!: string;

  @IsString()
  plate!: string;

  @IsEnum(TrafficDirection)
  direction!: TrafficDirection;

  @IsEnum(EntryMethod)
  entryMethod!: EntryMethod;

  @IsOptional()
  @IsUUID()
  waybillId?: string;

  @IsOptional()
  @IsUUID()
  visitorId?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  weight?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ManualOverrideDto {
  @IsUUID()
  trafficLogId!: string;

  @IsString()
  @MinLength(10)
  reason!: string;

  @IsOptional()
  durationMinutes?: number;
}

export class AnprEventDto {
  @IsString()
  cameraId!: string;

  @IsUUID()
  gateId!: string;

  @IsString()
  plate!: string;

  confidence!: number;

  @IsOptional()
  @IsEnum(TrafficDirection)
  direction?: TrafficDirection;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsOptional()
  @IsString()
  plateImageKey?: string;

  @IsOptional()
  speed?: number;
}

export class FilterTrafficDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  gateId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsEnum(TrafficDirection)
  direction?: TrafficDirection;

  @IsOptional()
  @IsString()
  accessResult?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  manualOverride?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

export class StartShiftDto {
  @IsUUID()
  gateId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndShiftDto {
  @IsOptional()
  @IsUUID()
  handoverTo?: string;

  @IsOptional()
  @IsString()
  handoverNotes?: string;
}

export class CreateGateIncidentDto {
  @IsUUID()
  gateId!: string;

  @IsOptional()
  @IsUUID()
  trafficLogId?: string;

  @IsString()
  type!: string;

  @IsString()
  severity!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  personName?: string;

  @IsOptional()
  @IsArray()
  imageKeys?: string[];

  @IsOptional()
  @IsString()
  videoKey?: string;
}

export class AddToBlacklistDto {
  @IsString()
  type!: string;

  @IsString()
  value!: string;

  @IsString()
  @MinLength(5)
  reason!: string;

  @IsString()
  severity!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ScanQrDto {
  @IsUUID()
  gateId!: string;

  @IsString()
  qrPayload!: string;
}
