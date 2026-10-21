// ═══════════════════════════════════════════════════════════════════════════════
// M15: HR & Payroll — Enums & TypeScript Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export Prisma enums for convenience
export {
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
  PayrollStatus,
  PayslipStatus,
  ReviewType,
  ReviewStatus,
  PerformanceRating,
  LoanType,
  LoanStatus,
} from '@prisma/client';

// ─── DTO Response Interfaces ──────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    cursor?: string;
    hasMore: boolean;
  };
}

export interface OrgChartDto {
  departments: DepartmentTreeNode[];
}

export interface DepartmentTreeNode {
  id: string;
  nameFa: string;
  nameEn?: string;
  code: string;
  managerId?: string;
  managerName?: string;
  employeeCount: number;
  children: DepartmentTreeNode[];
}

export interface LeaveBalanceDto {
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  personal: { total: number; used: number; remaining: number };
}

export interface EmployeeStatsDto {
  total: number;
  active: number;
  onProbation: number;
  onLeave: number;
  byDepartment: { departmentId: string; departmentName: string; count: number }[];
  byType: { type: string; count: number }[];
  byGender: { gender: string; count: number }[];
  avgTenureMonths: number;
  newHires30Days: number;
  terminationsThisMonth: number;
}

export interface TeamAttendanceDto {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  employees: {
    employeeId: string;
    name: string;
    status: string;
    clockIn?: string;
    clockOut?: string;
  }[];
}

export interface AttendanceSummaryDto {
  workDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalWorkedHours: number;
  overtimeHours: number;
  lateCount: number;
  lateMinutesTotal: number;
  earlyLeaveCount: number;
}

export interface PayslipCalculationResult {
  employeeId: string;
  employeeName: string;
  workDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  baseSalary: bigint;
  absenceDeduction: bigint;
  effectiveBaseSalary: bigint;
  housingAllowance: bigint;
  transportAllowance: bigint;
  foodAllowance: bigint;
  overtimePay: bigint;
  bonusAmount: bigint;
  otherEarnings: bigint;
  grossSalary: bigint;
  incomeTax: bigint;
  socialSecurityEmployee: bigint;
  socialSecurityEmployer: bigint;
  loanDeduction: bigint;
  absenceDeductionTotal: bigint;
  otherDeductions: bigint;
  totalDeductions: bigint;
  netSalary: bigint;
}

export interface PayrollStatsDto {
  currentMonthGross: bigint;
  currentMonthNet: bigint;
  currentMonthTax: bigint;
  currentMonthInsurance: bigint;
  totalPayroll12Months: { month: string; amount: bigint }[];
  avgSalary: bigint;
  minSalary: bigint;
  maxSalary: bigint;
  overtimeCostMonth: bigint;
}

export interface TeamPerformanceDto {
  departmentId: string;
  departmentName: string;
  period: string;
  averageScores: {
    quality: number;
    attendance: number;
    initiative: number;
    teamwork: number;
    communication: number;
    technical: number;
    overall: number;
  };
  employeeCount: number;
  topPerformers: { employeeId: string; name: string; overallScore: number }[];
}

export interface LeaveCalendarDto {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export interface LeaveStatsDto {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: { leaveType: string; count: number; totalDays: number }[];
  topAbsentees: { employeeId: string; name: string; totalDays: number }[];
}

export interface DepartmentTreeDto {
  id: string;
  nameFa: string;
  nameEn?: string;
  code: string;
  managerId?: string;
  employeeCount: number;
  positionCount: number;
  children: DepartmentTreeDto[];
}
