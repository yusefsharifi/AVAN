// M21: Super Admin Panel — DTOs
import { IsString, IsOptional, IsEnum, IsUUID, IsInt, IsDecimal, IsBoolean, IsArray, IsNumber, IsDateString, IsObject, IsEmail, Min, Max, ValidateNested, IsIn, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, AnnouncementType, AlertSeverity, UserRole } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsString() nameEn: string;
  @IsOptional() @IsString() descriptionFa?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() annualPrice?: number;
  @IsEnum(BillingCycle) billingCycle: BillingCycle;
  @IsInt() @Min(0) maxCompanies: number;
  @IsInt() @Min(0) maxUsers: number;
  @IsInt() @Min(0) maxGates: number;
  @IsInt() @Min(0) maxDevices: number;
  @IsInt() @Min(0) storageGb: number;
  @IsInt() @Min(0) apiCallsPerDay: number;
  @IsInt() @Min(0) smsCredits: number;
  @IsObject() features: object;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class AssignPlanDto {
  @IsUUID() zoneId: string;
  @IsString() planCode: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isTrial?: boolean;
  @IsOptional() @IsDateString() trialEndsAt?: string;
  @IsOptional() @IsBoolean() autoRenew?: boolean;
  @IsOptional() @IsObject() customLimits?: object;
  @IsOptional() @IsObject() customFeatures?: object;
  @IsOptional() @IsString() notes?: string;
}

export class SetFeatureFlagDto {
  @IsString() flagCode: string;
  @IsBoolean() value: boolean;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class UpdateSystemConfigDto {
  @IsString() key: string;
  @IsString() value: string;
  @IsOptional() @IsBoolean() isEncrypted?: boolean;
  @IsOptional() @IsString() description?: string;
}

export class CreateAnnouncementDto {
  @IsString() @MinLength(5) title: string;
  @IsString() @MinLength(10) body: string;
  @IsEnum(AnnouncementType) type: AnnouncementType;
  @IsEnum(AlertSeverity) severity: AlertSeverity;
  @IsOptional() @IsArray() @IsString({ each: true }) targetZoneIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetRoles?: string[];
  @IsOptional() @IsDateString() publishAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsArray() @IsIn(['IN_APP', 'EMAIL', 'SMS'], { each: true }) channels: string[];
}

export class CreateMaintenanceWindowDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsOptional() @IsArray() @IsString() affectedZoneIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) affectedModules?: string[];
  @IsOptional() @IsInt() @Min(15) notifyBefore?: number;
}

export class OnboardZoneDto {
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsString() province: string;
  @IsString() city: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsNumber() mapCenterLat?: number;
  @IsOptional() @IsNumber() mapCenterLng?: number;
  @IsOptional() @IsNumber() totalAreaHectares?: number;
  @IsString() planCode: string;
  @IsOptional() @IsBoolean() isTrial?: boolean;
  @IsString() managerFirstName: string;
  @IsString() managerLastName: string;
  @IsEmail() managerEmail: string;
  @IsString() managerPhone: string;
  @IsOptional() @IsString() managerNationalId?: string;
  @IsOptional() @IsObject() settings?: object;
}

export class GlobalUserFilterDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() createdAfter?: string;
  @IsOptional() @IsDateString() createdBefore?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}

export class ImpersonateUserDto {
  @IsUUID() targetUserId: string;
  @IsString() @MinLength(10) reason: string;
  @IsOptional() @IsInt() @Min(5) @Max(120) durationMinutes?: number;
}

export class SecurityPoliciesDto {
  @IsOptional() @IsInt() @Min(6) @Max(32) passwordMinLength?: number;
  @IsOptional() @IsBoolean() passwordRequireUpper?: boolean;
  @IsOptional() @IsBoolean() passwordRequireNumber?: boolean;
  @IsOptional() @IsInt() @Min(3) @Max(20) maxLoginAttempts?: number;
  @IsOptional() @IsInt() @Min(5) @Max(480) sessionTimeoutMinutes?: number;
  @IsOptional() @IsInt() @Min(5) @Max(1440) jwtExpiryMinutes?: number;
  @IsOptional() @IsArray() allowedIpRanges?: string[];
}
