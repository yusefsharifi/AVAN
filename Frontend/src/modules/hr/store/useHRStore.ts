import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { EMPLOYEES } from "@/entities/user";
import { zustandLocalStorage } from "@/shared/lib/persist";
import { useFinanceStore } from "@/modules/finance/store";
import { useAuthStore } from "@/core/stores/useAuthStore";
import { hrApi } from "@/shared/api";
import { seedFromMock, USE_MOCKS } from "@/shared/lib/mockMode";
import { loadCollection, persistMutation, reconcileEntity } from "@/shared/lib/serverSync";
import type {
  Employee, AttendanceRecord, AttendanceStatus, LeaveBalance, LeaveRequestExt,
  PayrollBatch, Payslip, PerformanceReview, PerformanceScores, AssetAssignment, PayrollComponent, EmployeePayrollComponent, EmployeeContract, EmployeeLoan, EmployeeDocument, LoanInstallmentPayment, HRAuditLog,
} from "../types";
import { DEFAULT_PAYROLL_COMPONENTS } from '../types/payroll.types';
import { PERFORMANCE_WEIGHTS } from "../types";

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Seed employees come from the shared `EMPLOYEES` UserEntity fixtures, which
// carry no HR display fields. Derive the four required Employee members from
// what the fixture actually has so the seed stays typed (and leave balances get
// a real employeeId instead of `undefined`).
const SEED_EMPLOYEES: Employee[] = EMPLOYEES.map((e) => ({
  ...e,
  name: e.displayName,
  employeeId: e.id,
  baseSalary: 0,
  status: e.status === 'active' ? 'active' : 'terminated',
  // Not carried by the user fixture; empty string keeps directory filters/type
  // contract satisfied (and renders identically to the previous `undefined`).
  department: '',
  position: '',
  phone: '',
}));

const SEED_LEAVE_BALANCES: LeaveBalance[] = SEED_EMPLOYEES.map((e) => ({
  employeeId: e.employeeId, annual: 26, medical: 15, emergency: 5,
}));

const todayISO = () => new Date().toISOString().slice(0, 10);

// ── Backend DTO mapping (BUG-PERSIST-001) ───────────────────────────────────
// The employee controller validates bodies with `whitelist: true` — unknown
// fields are REJECTED. Payloads are therefore narrowed to the accepted
// CreateEmployeeDto fields. Values the UI does not collect (departmentId,
// positionId, …) are simply absent and the server's validation error is
// surfaced as a Persian toast — never faked as a local success.

const currentScope = () => {
  const user = useAuthStore.getState().user;
  return { zoneId: user?.zoneId, companyId: user?.companyId };
};

/** Frontend gender values → Prisma Gender (no OTHER member on the backend). */
const GENDER_MAP: Record<string, string> = { male: 'MALE', female: 'FEMALE' };

/** Frontend contractType values → Prisma EmploymentType. */
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  permanent: 'FULL_TIME',
  contractual: 'CONTRACT',
  project: 'TEMPORARY',
};

const splitName = (name?: string): { firstNameFa: string; lastNameFa: string } => {
  const parts = (name ?? '').trim().split(/\s+/);
  return { firstNameFa: parts[0] ?? '', lastNameFa: parts.slice(1).join(' ') || '' };
};

/**
 * Maps the frontend employee shape onto the whitelisted CreateEmployeeDto
 * fields (used for both POST and PATCH — the update endpoint accepts
 * `Partial<CreateEmployeeDto>`).
 */
const toEmployeeDto = (data: Partial<Employee>): Record<string, unknown> => {
  const scope = currentScope();
  const { firstNameFa, lastNameFa } = splitName(data.name);
  return {
    // TASK A2: a SUPER_ADMIN carries no zone in its token, so it must name the
    // target zone explicitly in the form. Every other role leaves `zoneId`
    // unset and keeps inheriting the zone resolved from its own JWT.
    zoneId: data.zoneId ?? scope.zoneId,
    companyId: scope.companyId,
    firstNameFa,
    lastNameFa,
    nationalId: data.nationalId,
    dateOfBirth: data.birthDate,
    gender: data.gender ? GENDER_MAP[data.gender] : undefined,
    phone: data.phone,
    email: data.email,
    address: data.address,
    // UI نام واحد/سمت را به‌صورت متن آزاد نگه می‌دارد؛ بک‌اند آن را به ردیف
    // مرجع تبدیل می‌کند (ایجاد یا پیدا کردن واحد/سمت همنام).
    departmentName: data.department,
    positionName: data.position,
    emergencyContactName: data.emergencyContactName,
    emergencyContactPhone: data.emergencyContactPhone,
    employmentType: data.contractType ? EMPLOYMENT_TYPE_MAP[data.contractType] : undefined,
    hireDate: data.startDate,
    baseSalary: data.baseSalary,
    bankAccountNumber: data.bankAccount,
    socialSecurityNumber: data.insuranceNumber,
  };
};

interface HRStore {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequestExt[];
  leaveBalances: LeaveBalance[];
  payrollBatches: PayrollBatch[];
  performanceReviews: PerformanceReview[];
  assets: AssetAssignment[];
  payrollComponents: PayrollComponent[];
  employeePayrollComponents: EmployeePayrollComponent[];
  contracts: EmployeeContract[];
  loans: EmployeeLoan[];
  documents: EmployeeDocument[];
  loanPayments: LoanInstallmentPayment[];
  auditLogs: HRAuditLog[];
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API

  addContract: (data: Omit<EmployeeContract,'id'>) => void;
  updateContract: (id: string, updates: Partial<EmployeeContract>) => void;
  addLoan: (data: Omit<EmployeeLoan,'id'>) => void;
  updateLoan: (id: string, updates: Partial<EmployeeLoan>) => void;
  addDocument: (data: Omit<EmployeeDocument,'id'|'uploadedAt'>) => void;

  addPayrollComponent: (component: Omit<PayrollComponent, 'id'>) => PayrollComponent;
  updatePayrollComponent: (id: string, updates: Partial<PayrollComponent>) => void;
  removePayrollComponent: (id: string) => void;
  assignPayrollComponent: (employeeId: string, componentId: string, amount?: number) => void;
  removeEmployeePayrollComponent: (employeeId: string, componentId: string) => void;

  // Directory
  addEmployee: (data: Omit<Employee, "id" | "avatarInitial" | "status">) => Employee;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deactivateEmployee: (id: string) => void;
  softDeleteEmployee: (id: string) => void;

  // Attendance
  clockIn: (employeeId: string) => void;
  clockOut: (employeeId: string) => void;
  approveAttendance: (id: string) => void;
  getMonthlySummary: (employeeId: string) => { totalHours: number; lateCount: number; absentCount: number };

  // Leave
  requestLeave: (data: Omit<LeaveRequestExt, "id" | "status" | "employeeName" | "days"> & { days: number }) => void;
  decideLeave: (id: string, decision: "approved" | "rejected", approvedBy: string) => void;
  getLeaveBalance: (employeeId: string) => LeaveBalance | undefined;

  // Payroll — the critical cross-module action
  runPayroll: (month: string) => PayrollBatch;
  markPayrollPaid: (batchId: string, method: string) => void;

  // Performance
  addPerformanceReview: (data: Omit<PerformanceReview, "id" | "weightedScore" | "createdAt" | "status">) => void;
  getPerformanceHistory: (employeeId: string) => PerformanceReview[];

  // Assets — cross-module writes into Finance
  assignAsset: (data: Omit<AssetAssignment, "id" | "employeeName" | "status" | "assignedAt">) => void;
  returnAsset: (id: string) => void;
  getAssetHistory: (employeeId: string) => AssetAssignment[];
}

export const useHRStore = create<HRStore>()(
  persist(
    (set, get) => ({
      employees: seedFromMock(SEED_EMPLOYEES),
      attendance: [],
      leaveRequests: [],
      leaveBalances: seedFromMock(SEED_LEAVE_BALANCES),
      payrollBatches: [],
      performanceReviews: [],
      assets: [],
      payrollComponents: DEFAULT_PAYROLL_COMPONENTS,
      employeePayrollComponents: [],
      contracts: [], loans: [], documents: [], loanPayments: [], auditLogs: [],

      // ── API Integration (COMP-004): Load employees from backend ─────────
      // BUG-PERSIST-001: the server list REPLACES the local collection — there
      // is no seed fallback; a failed load surfaces a Persian toast only.
      loadFromApi: async () => {
        await loadCollection(
          () => hrApi.listEmployees(),
          (rows) =>
            set({
              // Compile-time only (erased at runtime) — the server row shape
              // (employeeNumber/firstNameFa/…) is not yet mapped onto the UI
              // Employee contract (employeeId/name). Thread through `unknown`
              // so TS requires an explicit, deliberate assertion rather than
              // silently accepting a weak overlap. See STEP6-REPORT §A.
              employees: rows as unknown as Employee[],
            }),
          'خطا در دریافت کارمندان',
        );
      },

      addContract: (data) => set(s=>({contracts:[{...data,id:genId('CON')},...s.contracts]})),
      updateContract: (id, updates) => set(s=>{const contract=s.contracts.find(x=>x.id===id);return {contracts:s.contracts.map(x=>x.id===id?{...x,...updates}:x),auditLogs:[{id:genId('AUD'),employeeId:contract?.employeeId,entity:'contract',entityId:id,action:'به‌روزرسانی قرارداد',detail:JSON.stringify(updates),createdAt:todayISO()},...s.auditLogs]}}),
      addLoan: (data) => set(s=>({loans:[{...data,id:genId('LOAN')},...s.loans]})),
      updateLoan: (id, updates) => set(s=>{const loan=s.loans.find(x=>x.id===id);return {loans:s.loans.map(x=>x.id===id?{...x,...updates}:x),auditLogs:[{id:genId('AUD'),employeeId:loan?.employeeId,entity:'loan',entityId:id,action:'به‌روزرسانی وام/مساعده',detail:JSON.stringify(updates),createdAt:todayISO()},...s.auditLogs]}}),
      addDocument: (data) => set(s=>({documents:[{...data,id:genId('DOC'),uploadedAt:todayISO()},...s.documents]})),

      addPayrollComponent: (component) => { const created = { ...component, id: genId('PC') }; set(s => ({ payrollComponents: [...s.payrollComponents, created] })); return created; },
      updatePayrollComponent: (id, updates) => set(s => ({ payrollComponents: s.payrollComponents.map(c => c.id === id ? { ...c, ...updates } : c), auditLogs:[{id:genId('AUD'),entity:'payroll_component',entityId:id,action:'به‌روزرسانی جزء حقوق',detail:JSON.stringify(updates),createdAt:todayISO()},...s.auditLogs] })),
      removePayrollComponent: (id) => set(s => ({ payrollComponents: s.payrollComponents.map(c => c.id === id ? { ...c, active: false } : c), employeePayrollComponents: s.employeePayrollComponents.map(c => c.componentId === id ? { ...c, active: false } : c) })),
      assignPayrollComponent: (employeeId, componentId, amount) => set(s => s.employeePayrollComponents.some(x => x.employeeId === employeeId && x.componentId === componentId) ? s : ({ employeePayrollComponents: [...s.employeePayrollComponents, { id: genId('EPC'), employeeId, componentId, amount, active: true, effectiveDate: todayISO() }] })),
      removeEmployeePayrollComponent: (employeeId, componentId) => set(s => ({ employeePayrollComponents: s.employeePayrollComponents.map(x => x.employeeId === employeeId && x.componentId === componentId ? { ...x, active: false } : x) })),

      // ── Directory ──────────────────────────────────────────────────────
      addEmployee: (data) => {
        const newEmp: Employee = {
          ...data,
          id: genId("EMP"),
          status: "active",
          avatarInitial: data.name.charAt(0),
        };
        void persistMutation<Employee, Record<string, unknown>>({
          skip: USE_MOCKS,
          optimistic: () =>
            set((s) => ({
              employees: [newEmp, ...s.employees],
              leaveBalances: [...s.leaveBalances, { employeeId: newEmp.employeeId, annual: 26, medical: 15, emergency: 5 }],
            })),
          request: () => hrApi.createEmployee(toEmployeeDto(data)),
          rollback: () =>
            set((s) => ({
              employees: s.employees.filter((e) => e.id !== newEmp.id),
              leaveBalances: s.leaveBalances.filter((b) => b.employeeId !== newEmp.employeeId),
            })),
          reconcile: (server) =>
            set((s) => ({ employees: reconcileEntity(s.employees, newEmp.id, server as Partial<Employee>) })),
          messageFa: 'خطا در ثبت کارمند؛ رکورد ذخیره نشد',
        });
        return newEmp;
      },
      updateEmployee: (id, data) => {
        const prevEmployees = get().employees;
        const prevAuditLogs = get().auditLogs;
        void persistMutation<Employee, Record<string, unknown>>({
          skip: USE_MOCKS,
          optimistic: () => {
            set((s) => { const emp=s.employees.find(e=>e.id===id); return { employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)), auditLogs:[{id:genId('AUD'),employeeId:emp?.employeeId,entity:'employee',entityId:id,action:'به‌روزرسانی پرسنل',detail:JSON.stringify(data),createdAt:todayISO()},...s.auditLogs] }; });
          },
          request: () => hrApi.updateEmployee(id, toEmployeeDto(data)),
          rollback: () => set({ employees: prevEmployees, auditLogs: prevAuditLogs }),
          reconcile: (server) =>
            set((s) => ({ employees: reconcileEntity(s.employees, id, server as Partial<Employee>) })),
          messageFa: 'خطا در به‌روزرسانی کارمند؛ تغییرات ذخیره نشد',
        });
      },
      deactivateEmployee: (id) => set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, status: "terminated", employmentStatus:'terminated' } : e)) })),
      softDeleteEmployee: (id) => {
        const prevEmployees = get().employees;
        const prevAuditLogs = get().auditLogs;
        void persistMutation<Employee, Record<string, unknown>>({
          skip: USE_MOCKS,
          optimistic: () => {
            set(s=>{const emp=s.employees.find(e=>e.id===id);return {employees:s.employees.map(e=>e.id===id?{...e,status:'terminated',employmentStatus:'deleted'}:e),auditLogs:[{id:genId('AUD'),employeeId:emp?.employeeId,entity:'employee',entityId:id,action:'حذف نرم پرسنل',createdAt:todayISO()},...s.auditLogs]}});
          },
          request: () => hrApi.terminateEmployee(id, { reason: 'حذف نرم پرسنل توسط کاربر', terminationDate: todayISO() }),
          rollback: () => set({ employees: prevEmployees, auditLogs: prevAuditLogs }),
          reconcile: (server) =>
            set((s) => ({ employees: reconcileEntity(s.employees, id, server as Partial<Employee>) })),
          messageFa: 'خطا در حذف پرسنل؛ عملیات انجام نشد',
        });
      },

      // ── Attendance ─────────────────────────────────────────────────────
      clockIn: (employeeId) => {
        const emp = get().employees.find((e) => e.employeeId === employeeId);
        if (!emp) return;
        const now = new Date();
        const time = now.toTimeString().slice(0, 5);
        const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
        const record: AttendanceRecord = {
          id: genId("ATT"), employeeId, employeeName: emp.name, date: todayISO(),
          checkIn: time, status: isLate ? "late" : "present", approved: false,
        };
        set((s) => ({ attendance: [record, ...s.attendance] }));
      },
      clockOut: (employeeId) => {
        const time = new Date().toTimeString().slice(0, 5);
        set((s) => ({
          attendance: s.attendance.map((a) =>
            a.employeeId === employeeId && a.date === todayISO() && !a.checkOut ? { ...a, checkOut: time } : a
          ),
        }));
      },
      approveAttendance: (id) => {
        set((s) => ({ attendance: s.attendance.map((a) => (a.id === id ? { ...a, approved: true } : a)) }));
      },
      getMonthlySummary: (employeeId) => {
        const records = get().attendance.filter((a) => a.employeeId === employeeId);
        const lateCount = records.filter((a) => a.status === "late").length;
        const absentCount = records.filter((a) => a.status === "absent").length;
        const totalHours = records.reduce((sum, a) => {
          if (!a.checkIn || !a.checkOut) return sum;
          const [ih, im] = a.checkIn.split(":").map(Number);
          const [oh, om] = a.checkOut.split(":").map(Number);
          return sum + Math.max(0, (oh * 60 + om - (ih * 60 + im)) / 60);
        }, 0);
        return { totalHours: Math.round(totalHours * 10) / 10, lateCount, absentCount };
      },

      // ── Leave ──────────────────────────────────────────────────────────
      requestLeave: (data) => {
        const emp = get().employees.find((e) => e.employeeId === data.employeeId);
        const req: LeaveRequestExt = { ...data, id: genId("LR"), employeeName: emp?.name ?? "—", status: "pending" };
        set((s) => ({ leaveRequests: [req, ...s.leaveRequests] }));
      },
      decideLeave: (id, decision, approvedBy) => {
        const req = get().leaveRequests.find((r) => r.id === id);
        if (!req) return;
        set((s) => ({
          leaveRequests: s.leaveRequests.map((r) =>
            r.id === id ? { ...r, status: decision, approvedBy, approvedAt: todayISO() } : r
          ),
        }));
        // Deduct from balance only when approved and the type tracks a balance
        if (decision === "approved" && (req.type === "annual" || req.type === "medical" || req.type === "emergency")) {
          // The guard above proves the type is one of the three LeaveBalance
          // fields (maternity/unpaid track no balance), but that narrowing does
          // not survive into the nested callback — capture it explicitly as the
          // numeric-key subset (keyof would also include `employeeId: string`).
          const balanceKey = req.type as 'annual' | 'medical' | 'emergency';
          set((s) => ({
            leaveBalances: s.leaveBalances.map((b) =>
              b.employeeId === req.employeeId ? { ...b, [balanceKey]: Math.max(0, b[balanceKey] - req.days) } : b
            ),
          }));
        }
      },
      getLeaveBalance: (employeeId) => get().leaveBalances.find((b) => b.employeeId === employeeId),

      // ── Payroll (cross-module: writes a real journal voucher in Finance) ─
      runPayroll: (month) => {
        const employees = get().employees.filter((e) => e.status !== "terminated");
        const attendance = get().attendance;
        const leave = get().leaveRequests.filter((r) => r.status === "approved");

        const payslips: Payslip[] = employees.map((emp) => {
          const empAttendance = attendance.filter((a) => a.employeeId === emp.employeeId);
          const absences = empAttendance.filter((a) => a.status === "absent").length;
          const lates = empAttendance.filter((a) => a.status === "late").length;
          const dailyRate = emp.baseSalary / 30;
          const attendanceDeduction = Math.round(absences * dailyRate + lates * dailyRate * 0.25);

          const unpaidLeaveDays = leave
            .filter((r) => r.employeeId === emp.employeeId && r.type === "unpaid")
            .reduce((s, r) => s + r.days, 0);
          const unpaidDeduction = Math.round(unpaidLeaveDays * dailyRate);

          const assignments = get().employeePayrollComponents.filter(x => x.employeeId === emp.employeeId && x.active);
          const componentFor = (id: string) => get().payrollComponents.find(c => c.id === id && c.active);
          const earningComponents = assignments.map(x => ({ assignment: x, component: componentFor(x.componentId) })).filter((x): x is { assignment: EmployeePayrollComponent; component: PayrollComponent } => !!x.component && x.component.category === 'earning');
          const deductionComponents = assignments.map(x => ({ assignment: x, component: componentFor(x.componentId) })).filter((x): x is { assignment: EmployeePayrollComponent; component: PayrollComponent } => !!x.component && x.component.category === 'deduction');
          const componentAmount = (x: { assignment: EmployeePayrollComponent; component: PayrollComponent }) => x.assignment.amount ?? x.component.amount;
          const bonuses = earningComponents.filter(x => x.component.code === 'BONUS').reduce((s,x)=>s+componentAmount(x),0);
          const overtime = earningComponents.filter(x => x.component.code === 'OT').reduce((s,x)=>s+componentAmount(x),0);
          const grossSalary = emp.baseSalary + earningComponents.reduce((s,x)=>s+componentAmount(x),0) - bonuses - overtime + bonuses + overtime;
          const insurance = Math.round(grossSalary * 0.07);
          const taxable = Math.max(0, grossSalary - insurance);
          const tax = taxable <= 5000000 ? 0 : taxable <= 10000000 ? Math.round((taxable - 5000000) * .1) : Math.round(500000 + (taxable - 10000000) * .2);
          const loanInstallments = get().loans.filter(l=>l.employeeId===emp.employeeId && l.status==='approved').reduce((s,l)=>s + Math.min(l.remaining, Math.round(l.amount / Math.max(1,l.installments))),0);
          const otherDeductions = deductionComponents.filter(x => !['TAX','INSURANCE'].includes(x.component.code)).reduce((s,x)=>s+componentAmount(x),0) + attendanceDeduction + unpaidDeduction + loanInstallments;
          const netPay = grossSalary - insurance - tax - otherDeductions;

          return {
            employeeId: emp.employeeId, employeeName: emp.name, baseSalary: emp.baseSalary, grossSalary,
            attendanceDeduction: attendanceDeduction + unpaidDeduction, bonuses, overtime, otherDeductions, tax, insurance, netPay,
          };
        });

        const totalNetPay = payslips.reduce((s, p) => s + p.netPay, 0);
        const batchId = genId("PRB");

        // Cross-module write: post the real journal voucher into Finance
        const totalGross = payslips.reduce((s, p) => s + (p.grossSalary ?? p.baseSalary), 0);
        const totalInsurance = payslips.reduce((s, p) => s + p.insurance, 0);
        const totalTax = payslips.reduce((s, p) => s + p.tax, 0);
        const totalOtherDeductions = payslips.reduce((s, p) => s + (p.otherDeductions ?? 0), 0);
        const voucher = useFinanceStore.getState().addPayrollVoucher({ batchId, totalNetPay, totalGross, totalInsurance, totalTax, totalOtherDeductions, month });

        const batch: PayrollBatch = {
          id: batchId, month, runAt: new Date().toISOString(), status: "processing",
          totalNetPay, payslips, journalVoucherId: voucher.id,
        };
        set((s) => ({ payrollBatches: [batch, ...s.payrollBatches] }));
        return batch;
      },
      markPayrollPaid: (batchId, method) => {
        const before = get().payrollBatches.find(b => b.id === batchId);
        if (!before || before.status === 'paid') return;
        set((s) => ({
          payrollBatches: s.payrollBatches.map((b) => b.id === batchId ? { ...b, status: "paid", paidAt: new Date().toISOString(), paymentMethod: method } : b),
          loans: s.loans.map(loan => {
            if (loan.status !== 'approved' || !before.payslips.some(p=>p.employeeId===loan.employeeId)) return loan;
            const installment = Math.min(loan.remaining, Math.round(loan.amount / Math.max(1, loan.installments)));
            const remaining = Math.max(0, loan.remaining - installment);
            return { ...loan, remaining, status: remaining === 0 ? 'closed' : loan.status };
          }),
          loanPayments: [...s.loanPayments, ...s.loans.filter(loan=>loan.status==='approved' && before.payslips.some(p=>p.employeeId===loan.employeeId)).map(loan=>({id:genId('LPM'),loanId:loan.id,employeeId:loan.employeeId,batchId,amount:Math.min(loan.remaining,Math.round(loan.amount/Math.max(1,loan.installments))),paidAt:new Date().toISOString()}))],
        }));
        if (before.journalVoucherId) useFinanceStore.getState().postVoucher(before.journalVoucherId);
      },

      // ── Performance ────────────────────────────────────────────────────
      addPerformanceReview: (data) => {
        const s = data.scores;
        const weighted =
          s.technicalSkills * PERFORMANCE_WEIGHTS.technicalSkills +
          s.communication * PERFORMANCE_WEIGHTS.communication +
          s.punctuality * PERFORMANCE_WEIGHTS.punctuality +
          s.leadership * PERFORMANCE_WEIGHTS.leadership +
          s.teamwork * PERFORMANCE_WEIGHTS.teamwork +
          s.goalAchievement * PERFORMANCE_WEIGHTS.goalAchievement;
        const review: PerformanceReview = {
          ...data, id: genId("PR"), weightedScore: Math.round(weighted * 100) / 100,
          status: "submitted", createdAt: todayISO(),
        };
        set((st) => ({ performanceReviews: [review, ...st.performanceReviews] }));
      },
      getPerformanceHistory: (employeeId) =>
        get().performanceReviews.filter((r) => r.employeeId === employeeId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

      // ── Assets (cross-module: writes custodian into Finance's FixedAsset) 
      assignAsset: (data) => {
        const emp = get().employees.find((e) => e.employeeId === data.employeeId);
        const asset: AssetAssignment = {
          ...data, id: genId("AST"), employeeName: emp?.name ?? "—", status: "assigned", assignedAt: todayISO(),
        };
        set((s) => ({ assets: [asset, ...s.assets] }));
        // Cross-module: if this tag matches a real Finance fixed asset, update its custodian
        const financeAsset = useFinanceStore.getState().getFixedAssetByCode(data.assetTag);
        if (financeAsset) {
          useFinanceStore.getState().setAssetCustodian(data.assetTag, data.employeeId, emp?.name ?? "—");
        }
      },
      returnAsset: (id) => {
        const asset = get().assets.find((a) => a.id === id);
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? { ...a, status: "returned", returnedAt: todayISO() } : a)),
        }));
        if (asset) {
          const financeAsset = useFinanceStore.getState().getFixedAssetByCode(asset.assetTag);
          if (financeAsset) useFinanceStore.getState().clearAssetCustodian(asset.assetTag);
        }
      },
      getAssetHistory: (employeeId) => get().assets.filter((a) => a.employeeId === employeeId),
    }),
    {
      name: "hr-store",
      storage: createJSONStorage(() => zustandLocalStorage),
    }
  )
);

export type { AttendanceStatus };
