import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsEmail,
  Length,
  Matches,
  IsArray,
  IsIn,
  IsDateString,
  MinLength,
} from 'class-validator';

import { IsoDate } from '../../../common/decorators/iso-date.decorator';

import {
  Gender,
  MaritalStatus,
  MilitaryStatus,
  EmploymentType,
  EmploymentStatus,
  ContractType,
  AttendanceMethod,
  AttendanceStatus,
  LeaveType,
  LeaveStatus,
  ReviewType,
  LoanType,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateEmployeeDto {
  // Step-4 TASK 3: optional here — @ResolveZoneId() fills it from the session
  // zone (zone/company users, unchanged behaviour) and rejects a SUPER_ADMIN
  // write that carries no zone with the Persian ZONE_REQUIRED message instead
  // of this pipe's English "must be a UUID" text.
  @IsOptional() @IsUUID() zoneId?: string;
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsString() firstNameFa: string;
  @IsString() lastNameFa: string;
  @IsOptional() @IsString() firstNameEn?: string;
  @IsOptional() @IsString() lastNameEn?: string;
  @IsString() @Length(10, 10) nationalId: string;
  @IsString() dateOfBirth: string;
  @IsEnum(Gender) gender: Gender;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsEnum(MilitaryStatus) militaryStatus?: MilitaryStatus;
  @IsString() phone: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() emergencyContactRel?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() positionId?: string;
  // نام آزاد واحد/سمت از سمت UI؛ اگر id ارسال نشود، سرویس بر اساس همین نام
  // ردیف مربوطه را پیدا یا می‌سازد تا ثبت کارمند بدون داده مرجع هم ممکن باشد.
  @IsOptional() @IsString() departmentName?: string;
  @IsOptional() @IsString() positionName?: string;
  @IsOptional() @IsUUID() reportingManagerId?: string;
  @IsEnum(EmploymentType) employmentType: EmploymentType;
  // تاریخ‌ها همیشه به‌صورت ISO 8601 روی خط ارسال می‌شوند؛ ورودی شمسی برای
  // سازگاری پذیرفته و هشدار deprecation ثبت می‌شود.
  @IsoDate({ field: 'hireDate' }) @IsString() hireDate: string;
  @IsOptional() @IsoDate({ field: 'contractStartDate' }) @IsString() contractStartDate?: string;
  @IsOptional() @IsoDate({ field: 'contractEndDate' }) @IsString() contractEndDate?: string;
  @IsInt() @Min(0) baseSalary: number;
  @IsOptional() @IsInt() @Min(0) housingAllowance?: number;
  @IsOptional() @IsInt() @Min(0) transportAllowance?: number;
  @IsOptional() @IsInt() @Min(0) foodAllowance?: number;
  @IsOptional() @IsString() socialSecurityNumber?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() bankShebaNumber?: string;
  @IsOptional() @IsString() rfidCardNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() firstNameFa?: string;
  @IsOptional() @IsString() lastNameFa?: string;
  @IsOptional() @IsString() firstNameEn?: string;
  @IsOptional() @IsString() lastNameEn?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() positionId?: string;
  @IsOptional() @IsUUID() reportingManagerId?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() notes?: string;
}

export class TerminateEmployeeDto {
  @IsString() @MinLength(5) reason: string;
  @IsString() terminationDate: string;
}

export class UpdateSalaryDto {
  @IsInt() @Min(0) newBaseSalary: number;
  @IsString() effectiveDate: string;
  @IsString() @MinLength(5) reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class ClockInDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsUUID() gateId?: string;
  @IsOptional() @IsString() rfidCardNumber?: string;
  @IsOptional() @IsEnum(AttendanceMethod) method?: AttendanceMethod;
}

export class ManualAttendanceDto {
  @IsUUID() employeeId: string;
  @IsString() workDate: string;
  @IsDateString() clockIn: string;
  @IsOptional() @IsDateString() clockOut?: string;
  @IsString() @MinLength(5) reason: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEAVE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class RequestLeaveDto {
  @IsUUID() employeeId: string;
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsEnum(LeaveType) leaveType: LeaveType;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate: string;
  @IsOptional() @IsBoolean() isHalfDay?: boolean;
  @IsOptional() @IsIn(['morning', 'afternoon']) halfDayPeriod?: string;
  @IsString() @MinLength(5) reason: string;
  @IsOptional() @IsArray() attachmentKeys?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class ApproveLeaveDto {
  @IsBoolean() approved: boolean;
  @IsOptional() @IsString() rejectionReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class RunPayrollDto {
  @IsUUID() companyId: string;
  @IsUUID() zoneId: string;
  @IsInt() @Min(1) @Max(12) periodMonth: number;
  @IsInt() @Min(1400) periodYear: number;
  @IsOptional() @IsArray() employeeIds?: string[];
  @IsOptional() @IsBoolean() includeBonus?: boolean;
  @IsOptional() bonusOverrides?: Record<string, number>;
}

export class ApprovePayrollDto {
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE REVIEW DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreatePerformanceReviewDto {
  @IsUUID() employeeId: string;
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsString() period: string;
  @IsEnum(ReviewType) type: ReviewType;
  @IsOptional() @IsNumber() qualityScore?: number;
  @IsOptional() @IsNumber() attendanceScore?: number;
  @IsOptional() @IsNumber() initiativeScore?: number;
  @IsOptional() @IsNumber() teamworkScore?: number;
  @IsOptional() @IsNumber() communicationScore?: number;
  @IsOptional() @IsNumber() technicalScore?: number;
  @IsOptional() @IsString() strengths?: string;
  @IsOptional() @IsString() areasForImprovement?: string;
  @IsOptional() @IsString() goals?: string;
  @IsOptional() @IsString() developmentPlan?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAN DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateEmployeeLoanDto {
  @IsUUID() employeeId: string;
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsEnum(LoanType) type: LoanType;
  @IsInt() @Min(1) amount: number;
  @IsInt() @Min(1) @Max(60) installmentCount: number;
  @IsOptional() @IsNumber() interestRate?: number;
  @IsOptional() @IsString() notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT & POSITION DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateDepartmentDto {
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsString() code: string;
  @IsString() nameFa: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsString() costCenterId?: string;
}

export class CreatePositionDto {
  @IsUUID() zoneId: string;
  @IsUUID() companyId: string;
  @IsUUID() departmentId: string;
  @IsString() code: string;
  @IsString() titleFa: string;
  @IsOptional() @IsString() titleEn?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) level?: number;
  @IsOptional() @IsInt() grade?: number;
  @IsOptional() @IsInt() minSalary?: number;
  @IsOptional() @IsInt() maxSalary?: number;
  @IsOptional() @IsInt() @Min(1) headcount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class FilterEmployeesDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}

export class FilterAttendanceDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}

export class FilterLeavesDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
  @IsOptional() @IsEnum(LeaveType) leaveType?: LeaveType;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
