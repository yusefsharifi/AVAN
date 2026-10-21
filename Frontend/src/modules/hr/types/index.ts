export * from './payroll.types';
/**
 * Hand-written base employee contract (Step 6 / TASK A1 — defect P1).
 *
 * This file previously did `import type { Employee as BaseEmployee } from
 * "@/entities/user"`, but that module exports only `UserEntity`, `EMPLOYEES`,
 * the role/status/scope types and two validators — never `Employee` (TS2724).
 * Because the base never resolved, `Employee` collapsed to just its own
 * declared members, which is what produced the ~90 cascading modules/hr
 * errors (`id`, `name`, `employeeId`, `status`, `baseSalary`, … "does not
 * exist on type 'Employee'").
 *
 * The fields below are derived from what `useHRStore`, `EmployeeList`,
 * `EmployeeModal`, `PayrollDashboard` and `HRScreen` actually read, and from
 * the rows the backend returns (cross-checked against CreateEmployeeDto).
 * Components deliberately do NOT import generated Prisma client types.
 */
export type EmployeeStatus = 'active' | 'on-leave' | 'terminated';

export interface BaseEmployee {
  /** Primary key (UUID). Also the `Omit<>`/`Partial<>` key used across the module. */
  id: string;
  /** Display name; `toEmployeeDto` splits it into firstNameFa/lastNameFa. */
  name: string;
  /** Business employee number returned by the backend, e.g. `EMP-COM-00031`. */
  employeeId: string;
  status: EmployeeStatus;
  /** Treated as a plain number at the boundary (existing json-replacer convention). */
  baseSalary: number;

  // Scope — TASK A2: SUPER_ADMIN selects the zone, everyone else inherits it.
  zoneId?: string;
  companyId?: string;

  // Directory columns / create-form fields.
  // department/position/phone/email are REQUIRED: EmployeeFormState declares them
  // as plain `string`, EmployeeModal always supplies them, and the directory
  // filters/table cells call string methods on them directly (e.g.
  // `e.department.includes(...)` in HRScreen.tsx:52 would throw on undefined).
  department: string;
  position: string;
  phone: string;
  email: string;
  contractType?: string;
  employmentType?: string;
  jobGrade?: string;
  startDate?: string;
  endDate?: string;
  avatarInitial?: string;
  managerId?: string;
  company?: string;
  branch?: string;
  costCenterId?: string;
  payrollGroup?: string;
  insuranceNumber?: string;
  insuranceType?: string;
  taxNumber?: string;
  taxExemption?: number;
}

// Employee: the base contract plus the HR-only fields requested
// (national ID, bank account, address, emergency contact, photo).
export interface Employee extends BaseEmployee {
  nationalId?: string;
  bankAccount?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
  signatureUrl?: string;
  gender?: 'male' | 'female' | 'other';
  birthDate?: string;
  fatherName?: string;
  maritalStatus?: string;
  employmentStatus?: 'active' | 'on_leave' | 'suspended' | 'mission' | 'retired' | 'contract_ended' | 'terminated' | 'dismissed' | 'deceased' | 'deleted';
}

export type AttendanceStatus = "present" | "late" | "absent" | "on-leave" | "half-day";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // ISO date
  checkIn?: string; // HH:mm
  checkOut?: string;
  status: AttendanceStatus;
  approved: boolean;
}

export interface LeaveBalance {
  employeeId: string;
  annual: number;
  medical: number;
  emergency: number;
}

export interface LeaveRequestExt {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "annual" | "medical" | "emergency" | "maternity" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  attachmentName?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
}

export interface EmployeeContract { id:string; employeeId:string; contractNumber:string; type:string; startDate:string; endDate:string; salaryType:string; workingHours:number; status:'active'|'terminated'|'pending'; renewable:boolean; }
export interface EmployeeLoan { id:string; employeeId:string; type:'loan'|'advance'; amount:number; installments:number; interestRate:number; remaining:number; status:'pending'|'approved'|'closed'|'rejected'; }
export interface EmployeeDocument { id:string; employeeId:string; type:string; fileName:string; uploadedAt:string; }
export interface LoanInstallmentPayment { id:string; loanId:string; employeeId:string; batchId:string; amount:number; paidAt:string; }
export interface HRAuditLog { id:string; employeeId?:string; entity:'employee'|'contract'|'loan'|'payroll_component'; entityId:string; action:string; createdAt:string; detail?:string; }

export interface Payslip {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  grossSalary?: number;
  attendanceDeduction: number;
  bonuses: number;
  overtime: number;
  otherDeductions?: number;
  tax: number;
  insurance: number;
  netPay: number;
}

export interface PayrollBatch {
  id: string;
  month: string; // e.g. "مرداد ۱۴۰۳"
  runAt: string;
  status: "processing" | "paid";
  paidAt?: string;
  paymentMethod?: string;
  totalNetPay: number;
  payslips: Payslip[];
  journalVoucherId?: string; // set once posted to Finance
}

export interface PerformanceScores {
  technicalSkills: number; // 1-10
  communication: number;
  punctuality: number;
  leadership: number;
  teamwork: number;
  goalAchievement: number;
}

export const PERFORMANCE_WEIGHTS: Record<keyof PerformanceScores, number> = {
  technicalSkills: 0.25,
  communication: 0.15,
  punctuality: 0.1,
  leadership: 0.15,
  teamwork: 0.15,
  goalAchievement: 0.2,
};

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string; // e.g. "Q1 2026"
  reviewer: string;
  scores: PerformanceScores;
  weightedScore: number; // 1-10, weighted average
  goals: string;
  strengths: string;
  improvementAreas: string;
  status: "draft" | "submitted" | "acknowledged";
  createdAt: string;
}

export interface RecruitmentCandidate {
  id: string;
  fullName: string;
  position: string;
  department: string;
  phone: string;
  email: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  appliedAt: string;
  resumeNote?: string;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  courseName: string;
  provider: string;
  startDate: string;
  endDate: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  certificateIssued: boolean;
}

export type AssetCategory = "Electronics" | "Furniture" | "Vehicle" | "AccessCard" | "Uniform" | "Other";
export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  Electronics: "الکترونیک", Furniture: "اثاثیه", Vehicle: "خودرو", AccessCard: "کارت تردد", Uniform: "لباس فرم", Other: "سایر",
};

export interface AssetAssignment {
  id: string;
  assetTag: string; // must match a Finance FixedAsset.assetCode to cross-link
  assetName: string;
  category: AssetCategory;
  value?: number; // reference value, ideally sourced from Finance's FixedAsset
  employeeId: string;
  employeeName: string;
  assignedAt: string;
  dueReturnDate?: string;
  returnedAt?: string;
  condition: "new" | "good" | "fair" | "damaged";
  status: "assigned" | "returned" | "overdue";
}
