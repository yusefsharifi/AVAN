// M20: IoT & Device Integration — DTOs
import { IsString, IsOptional, IsEnum, IsUUID, IsInt, IsDecimal, IsBoolean, IsArray, IsNumber, IsDateString, IsObject, Min, Max, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, DeviceProtocol, DeviceStatus, ReadingType, CommandType, AlertSeverity, DeviceAlertType } from '@prisma/client';

export class CreateIoTDeviceDto {
  @IsUUID() zoneId: string;
  @IsString() name: string;
  @IsEnum(DeviceType) type: DeviceType;
  @IsEnum(DeviceProtocol) protocol: DeviceProtocol;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() gateId?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsInt() port?: number;
  @IsOptional() @IsString() macAddress?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() firmwareVersion?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() installDate?: string;
  @IsOptional() @IsDateString() warrantyExpiry?: string;
  @IsOptional() @IsObject() config?: object;
  @IsOptional() @IsInt() heartbeatInterval?: number;
  @IsOptional() @IsString() notes?: string;
}

export class SendDeviceCommandDto {
  @IsString() deviceId: string;
  @IsEnum(CommandType) type: CommandType;
  @IsOptional() @IsObject() payload?: object;
  @IsOptional() @IsInt() @Min(1) @Max(120) timeoutSeconds?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) priority?: number;
  @IsOptional() @IsBoolean() waitForResponse?: boolean;
}

export class BulkCommandDto {
  @IsArray() @IsString({ each: true }) deviceIds: string[];
  @IsEnum(CommandType) type: CommandType;
  @IsOptional() @IsObject() payload?: object;
  @IsOptional() @IsInt() timeoutSeconds?: number;
}

export class AnprReadingDto {
  @IsString() deviceId: string;
  @IsUUID() zoneId: string;
  @IsString() plate: string;
  @IsNumber() @Min(0) @Max(1) confidence: number;
  @IsOptional() @IsString() direction?: string;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() imageKey?: string;
  @IsOptional() @IsString() plateImageKey?: string;
  @IsOptional() @IsNumber() speed?: number;
  @IsOptional() @IsString() color?: string;
  @IsString() timestamp: string;
}

export class ScaleReadingDto {
  @IsString() deviceId: string;
  @IsUUID() zoneId: string;
  @IsNumber() weight: number;
  @IsString() unit: string;
  @IsBoolean() isStable: boolean;
  @IsNumber() @Min(0) @Max(100) confidence: number;
  @IsOptional() @IsNumber() axle1?: number;
  @IsOptional() @IsNumber() axle2?: number;
  @IsOptional() @IsNumber() axle3?: number;
  @IsString() timestamp: string;
}

export class RfidTapDto {
  @IsString() deviceId: string;
  @IsUUID() zoneId: string;
  @IsString() cardNumber: string;
  @IsString() protocol: string;
  @IsOptional() @IsNumber() signalStrength?: number;
  @IsString() timestamp: string;
}

export class GpsPositionDto {
  @IsString() deviceId: string;
  @IsUUID() zoneId: string;
  @IsOptional() @IsString() vehiclePlate?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsNumber() speed: number;
  @IsOptional() @IsInt() heading?: number;
  @IsOptional() @IsNumber() altitude?: number;
  @IsOptional() @IsNumber() accuracy?: number;
  @IsOptional() @IsInt() satellites?: number;
  @IsString() timestamp: string;
}

export class EnvironmentalReadingDto {
  @IsString() deviceId: string;
  @IsUUID() zoneId: string;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsNumber() humidity?: number;
  @IsOptional() @IsNumber() co2?: number;
  @IsOptional() @IsNumber() co?: number;
  @IsOptional() @IsNumber() nox?: number;
  @IsOptional() @IsNumber() pm25?: number;
  @IsOptional() @IsNumber() pm10?: number;
  @IsOptional() @IsNumber() noiseLevel?: number;
  @IsOptional() @IsBoolean() isRaining?: boolean;
  @IsString() timestamp: string;
}

export class DeviceHeartbeatDto {
  @IsString() deviceId: string;
  @IsOptional() @IsNumber() signalStrength?: number;
  @IsOptional() @IsNumber() batteryLevel?: number;
  @IsOptional() @IsInt() uptimeSeconds?: number;
  @IsOptional() @IsNumber() cpuPercent?: number;
  @IsOptional() @IsNumber() memoryPercent?: number;
  @IsOptional() @IsNumber() diskPercent?: number;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsInt() errorCount?: number;
  @IsOptional() @IsNumber() responseMs?: number;
  @IsString() timestamp: string;
}

export class DeviceAlertDto {
  @IsString() deviceId: string;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsEnum(DeviceAlertType) alertType: DeviceAlertType;
  @IsEnum(AlertSeverity) severity: AlertSeverity;
  @IsString() message: string;
  @IsOptional() @IsObject() details?: object;
  @IsString() timestamp: string;
}

export class CommandAckDto {
  @IsString() correlationId: string;
  @IsBoolean() success: boolean;
  @IsOptional() @IsObject() response?: object;
  @IsOptional() @IsString() errorMessage?: string;
}

export class CreateGeofenceDto {
  @IsUUID() zoneId: string;
  @IsString() name: string;
  @IsString() type: string;
  @IsObject() polygon: object;
  @IsOptional() @IsNumber() radius?: number;
  @IsOptional() @IsNumber() centerLat?: number;
  @IsOptional() @IsNumber() centerLng?: number;
  @IsOptional() @IsBoolean() notifyOnEntry?: boolean;
  @IsOptional() @IsBoolean() notifyOnExit?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) allowedVehicles?: string[];
}

export class FilterDevicesDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsEnum(DeviceType) type?: DeviceType;
  @IsOptional() @IsEnum(DeviceStatus) status?: DeviceStatus;
  @IsOptional() @IsBoolean() isOnline?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() gateId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}

export class FilterDeviceReadingsDto {
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsEnum(ReadingType) type?: ReadingType;
  @IsOptional() @IsBoolean() isProcessed?: boolean;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}

export class FilterAlertsDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsEnum(DeviceAlertType) alertType?: DeviceAlertType;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsBoolean() isResolved?: boolean;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}
