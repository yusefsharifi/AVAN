import { useState } from "react";
import { Plus, Search, Check, X as XIcon, Clock, UserCheck, UserX, Wallet, Calendar } from "lucide-react";
import { Employee, LeaveRequest, PayrollEntry, EMPLOYEES } from "@/entities/user";
import { Badge } from "@/shared/components/feedback";
import EmployeeModal from "./modals/EmployeeModal";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const STATUS_MAP = { active: "active" as const, "on-leave": "warning" as const, terminated: "inactive" as const };
const STATUS_LABELS = { active: "فعال", "on-leave": "مرخصی", terminated: "اخراج" };
const LEAVE_TYPE_LABELS: Record<LeaveRequest["type"], string> = { annual: "سالانه", medical: "بیماری", emergency: "اورژانسی", maternity: "زایمان", unpaid: "بدون حقوق" };
const LEAVE_STATUS_MAP = { pending: "pending" as const, approved: "approved" as const, rejected: "rejected" as const };
const LEAVE_STATUS_LABELS = { pending: "در انتظار", approved: "تأیید", rejected: "رد" };

const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'LR-001', employeeId: 'E007', employeeName: 'سارا نوری', type: 'annual', startDate: '۱۴۰۳/۰۴/۲۰', endDate: '۱۴۰۳/۰۴/۲۵', days: 5, reason: 'مسافرت خانوادگی', status: 'approved', approvedBy: 'احمد کریمی' },
  { id: 'LR-002', employeeId: 'E003', employeeName: 'حسین کاظمی', type: 'medical', startDate: '۱۴۰۳/۰۴/۱۸', endDate: '۱۴۰۳/۰۴/۱۹', days: 2, reason: 'ویزیت پزشک', status: 'pending' },
  { id: 'LR-003', employeeId: 'E010', employeeName: 'محسن رحیمی', type: 'emergency', startDate: '۱۴۰۳/۰۴/۱۷', endDate: '۱۴۰۳/۰۴/۱۷', days: 1, reason: 'کار شخصی فوری', status: 'pending' },
  { id: 'LR-004', employeeId: 'E011', employeeName: 'نگار احمدی', type: 'annual', startDate: '۱۴۰۳/۰۴/۱۰', endDate: '۱۴۰۳/۰۴/۱۲', days: 3, reason: 'مراسم خانوادگی', status: 'approved', approvedBy: 'علیرضا صادقی' },
  { id: 'LR-005', employeeId: 'E014', employeeName: 'امیر کاظمی', type: 'annual', startDate: '۱۴۰۳/۰۴/۲۲', endDate: '۱۴۰۳/۰۴/۲۴', days: 3, reason: 'استراحت', status: 'rejected', approvedBy: 'احمد کریمی' },
];

const PAYROLL: PayrollEntry[] = [
  { id: 'PAY-001', employeeId: 'E012', employeeName: 'علیرضا صادقی', month: 'تیر ۱۴۰۳', baseSalary: 50000000, allowances: { housing: 8000000, transport: 3000000, food: 2000000, other: 0 }, deductions: { insurance: 2500000, tax: 5000000, loan: 0, other: 0 }, netPay: 55500000, status: 'paid', paidAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'PAY-002', employeeId: 'E001', employeeName: 'احمد کریمی', month: 'تیر ۱۴۰۳', baseSalary: 45000000, allowances: { housing: 7000000, transport: 2500000, food: 1500000, other: 0 }, deductions: { insurance: 2250000, tax: 4500000, loan: 0, other: 0 }, netPay: 49250000, status: 'paid', paidAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'PAY-003', employeeId: 'E002', employeeName: 'مریم رضایی', month: 'تیر ۱۴۰۳', baseSalary: 35000000, allowances: { housing: 5500000, transport: 2000000, food: 1500000, other: 0 }, deductions: { insurance: 1750000, tax: 3500000, loan: 0, other: 0 }, netPay: 38750000, status: 'paid', paidAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'PAY-004', employeeId: 'E005', employeeName: 'رضا احمدی', month: 'تیر ۱۴۰۳', baseSalary: 25000000, allowances: { housing: 4000000, transport: 1500000, food: 1000000, other: 0 }, deductions: { insurance: 1250000, tax: 2500000, loan: 0, other: 0 }, netPay: 27750000, status: 'paid', paidAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'PAY-005', employeeId: 'E006', employeeName: 'سعید موسوی', month: 'تیر ۱۴۰۳', baseSalary: 22000000, allowances: { housing: 3500000, transport: 1500000, food: 1000000, other: 0 }, deductions: { insurance: 1100000, tax: 2200000, loan: 0, other: 0 }, netPay: 24700000, status: 'processing' },
];

const ATTENDANCE_HEATMAP = Array.from({ length: 30 }, (_, i) => {
  const val = Math.random();
  return { day: i + 1, status: val > 0.85 ? 'absent' as const : val > 0.8 ? 'leave' as const : val > 0.75 ? 'half-day' as const : 'present' as const };
});

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "bg-emerald-400", absent: "bg-red-400", leave: "bg-amber-400", "half-day": "bg-blue-400",
};
const ATTENDANCE_LABELS: Record<string, string> = {
  present: "حاضر", absent: "غایب", leave: "مرخصی", "half-day": "نیم‌وقت",
};

export default function HrModule() {
  const [tab, setTab] = useState<"directory" | "attendance" | "leave" | "payroll">("directory");
  const [search, setSearch] = useState("");
  const [employeesList, setEmployeesList] = useState<Employee[]>(EMPLOYEES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: "", employeeId: "", position: "", department: "", phone: "", email: "", contractType: "permanent" as Employee["contractType"] });
  const [leaveRequests, setLeaveRequests] = useState(LEAVE_REQUESTS);
  const [leaveBalance] = useState({ annual: 18, medical: 10, emergency: 5 });

  const filteredEmployees = employeesList.filter((e) =>
    !search || e.name.includes(search) || e.employeeId.includes(search) || e.department.includes(search) || e.position.includes(search)
  );

  const presentCount = ATTENDANCE_HEATMAP.filter((a) => a.status === "present").length;
  const absentCount = ATTENDANCE_HEATMAP.filter((a) => a.status === "absent").length;

  const openAdd = () => { setEditingEmployee(null); setEmployeeForm({ name: "", employeeId: `EMP-${String(employeesList.length + 1).padStart(3, '0')}`, position: "", department: "", phone: "", email: "", contractType: "permanent" }); setModalOpen(true); };
  const openEdit = (emp: Employee) => { setEditingEmployee(emp); setEmployeeForm({ name: emp.name, employeeId: emp.employeeId, position: emp.position, department: emp.department, phone: emp.phone, email: emp.email, contractType: emp.contractType }); setModalOpen(true); };

  const handleLeaveAction = (id: string, action: "approved" | "rejected") => {
    setLeaveRequests((list) => list.map((r) => r.id === id ? { ...r, status: action, approvedBy: "علیرضا صادقی", approvedAt: "۱۴۰۳/۰۴/۱۶" } : r));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([
            { id: "directory", label: "فهرست کارکنان" },
            { id: "attendance", label: "حضورغیاب" },
            { id: "leave", label: "مرخصی" },
            { id: "payroll", label: "حقوق‌وخوارک" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <h1 className="text-sm font-semibold text-foreground">مدیریت منابع انسانی</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{employeesList.filter((e) => e.status === "active").length}</p>
          <p className="text-xs text-muted-foreground mt-1">کارمند فعال</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600" dir="ltr">{presentCount}</p>
          <p className="text-xs text-muted-foreground mt-1">حاضر امروز</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600" dir="ltr">{leaveRequests.filter((r) => r.status === "pending").length}</p>
          <p className="text-xs text-muted-foreground mt-1">درخواست مرخصی منتظر</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600" dir="ltr">{absentCount}</p>
          <p className="text-xs text-muted-foreground mt-1">غایب امروز</p>
        </div>
      </div>

      {/* Directory Tab */}
      {tab === "directory" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /><span>افزودن کارمند</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input dir="rtl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..."
                className="bg-secondary border border-border rounded-lg py-1.5 pr-3 pl-9 text-xs text-foreground focus:outline-none focus:border-accent w-52" />
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["عملیات", "وضعیت", "ایمیل", "تلفن", "واحد", "سمت", "شناسه", "نام"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3">
                    <button onClick={() => openEdit(emp)} className="text-xs text-accent hover:underline">ویرایش</button>
                  </td>
                  <td className="py-3 px-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${emp.status === "active" ? "bg-emerald-50 text-emerald-700" : emp.status === "on-leave" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[emp.status]}</span></td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{emp.email}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{emp.phone}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{emp.department}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{emp.position}</td>
                  <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{emp.employeeId}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">{emp.avatarInitial}</div>
                      <span className="text-sm font-semibold text-foreground">{emp.name}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">نتیجه‌ای یافت نشد</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === "attendance" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" /><span className="text-[11px] text-muted-foreground">حاضر</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" /><span className="text-[11px] text-muted-foreground">غایب</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /><span className="text-[11px] text-muted-foreground">مرخصی</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400" /><span className="text-[11px] text-muted-foreground">نیم‌وقت</span></div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">نمودار حضور ماهانه</h3>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {ATTENDANCE_HEATMAP.map((a) => (
                <div key={a.day} className="group relative">
                  <div className={`w-full aspect-square rounded-md ${ATTENDANCE_COLORS[a.status]} flex items-center justify-center text-[10px] text-white font-medium cursor-default transition-transform hover:scale-110`}>
                    {a.day}
                  </div>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {a.day} {ATTENDANCE_LABELS[a.status]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">خلاصه حضور</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-emerald-50"><p className="text-lg font-bold text-emerald-600">{presentCount}</p><p className="text-[11px] text-muted-foreground">روز حاضر</p></div>
              <div className="text-center p-3 rounded-lg bg-red-50"><p className="text-lg font-bold text-red-600">{absentCount}</p><p className="text-[11px] text-muted-foreground">روز غایب</p></div>
              <div className="text-center p-3 rounded-lg bg-amber-50"><p className="text-lg font-bold text-amber-600">{ATTENDANCE_HEATMAP.filter((a) => a.status === "leave").length}</p><p className="text-[11px] text-muted-foreground">روز مرخصی</p></div>
              <div className="text-center p-3 rounded-lg bg-blue-50"><p className="text-lg font-bold text-blue-600">{ATTENDANCE_HEATMAP.filter((a) => a.status === "half-day").length}</p><p className="text-[11px] text-muted-foreground">نیم‌وقت</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Tab */}
      {tab === "leave" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">مانده مرخصی</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "سالانه", remaining: leaveBalance.annual, total: 26, color: "text-accent" },
                { label: "بیماری", remaining: leaveBalance.medical, total: 15, color: "text-amber-600" },
                { label: "اورژانسی", remaining: leaveBalance.emergency, total: 5, color: "text-red-600" },
              ].map((l) => (
                <div key={l.label} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{l.label}</span>
                    <span className={`text-sm font-bold ${l.color}`} dir="ltr">{l.remaining}/{l.total} روز</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${l.color === "text-accent" ? "bg-accent" : l.color === "text-amber-600" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(l.remaining / l.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">درخواست‌های مرخصی</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["عملیات", "وضعیت", "تعداد روز", "تاریخ پایان", "تاریخ شروع", "نوع", "کارمند"].map((h) => (
                    <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3">
                      {r.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleLeaveAction(r.id, "approved")} className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleLeaveAction(r.id, "rejected")} className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors"><XIcon className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : <span className="text-[10px] text-muted-foreground">{r.approvedBy}</span>}
                    </td>
                    <td className="py-3 px-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${r.status === "approved" ? "bg-emerald-50 text-emerald-700" : r.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{LEAVE_STATUS_LABELS[r.status]}</span></td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{r.days}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{r.endDate}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{r.startDate}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{LEAVE_TYPE_LABELS[r.type]}</td>
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{r.employeeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {tab === "payroll" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <p className="text-lg font-bold text-emerald-600" dir="ltr">{PAYROLL.filter((p) => p.status === "paid").length}</p>
              <p className="text-xs text-muted-foreground mt-1">پرداخت‌شده</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <p className="text-lg font-bold text-amber-600" dir="ltr">{PAYROLL.filter((p) => p.status === "processing").length}</p>
              <p className="text-xs text-muted-foreground mt-1">در حال پردازش</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <p className="text-lg font-bold text-foreground" dir="ltr">{(PAYROLL.reduce((s, p) => s + p.netPay, 0) / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-muted-foreground mt-1">جمع خالص پرداختی (تومان)</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">لیست حقوق تیر ۱۴۰۳</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["وضعیت", "خالص پرداختی", "کسورات", "مزايا", "حقوق پایه", "ماه", "نام"].map((h) => (
                    <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAYROLL.map((p) => {
                  const totalAllowance = Object.values(p.allowances).reduce((s, v) => s + v, 0);
                  const totalDeduction = Object.values(p.deductions).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p.status === "paid" ? "bg-emerald-50 text-emerald-700" : p.status === "processing" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{p.status === "paid" ? "پرداخت‌شده" : p.status === "processing" ? "در حال پردازش" : "منتظر"}</span></td>
                      <td className="py-3 px-3 text-xs font-semibold text-emerald-600 font-mono" dir="ltr">{p.netPay.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-red-600 font-mono" dir="ltr">{totalDeduction.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-accent font-mono" dir="ltr">{totalAllowance.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{p.baseSalary.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{p.month}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-foreground">{p.employeeName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <EmployeeModal
          employeeForm={employeeForm}
          setEmployeeForm={setEmployeeForm}
          setEmployeesList={setEmployeesList}
          setModalOpen={setModalOpen}
          editingEmployee={editingEmployee}
        />
      )}
    </div>
  );
}
