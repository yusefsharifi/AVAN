import { useState } from "react";
import { useNavigate } from 'react-router';
import { toast } from "sonner";
import { Plus, Search, Download, Upload, UserX, Landmark, Boxes } from "lucide-react";
import { Employee } from "./types";
import { useHRStore } from "./store/useHRStore";
import { useFinanceStore } from "@/modules/finance/store";
import { exportAllData, importAllData } from "@/shared/lib/persist";
import { toIsoDate, toJalaliStr } from "@/utils/persianFormat";
import EmployeeModal, { EmployeeFormState } from "./components/EmployeeModal";
import AttendanceTab from "./components/AttendanceTab";
import LeaveTab from "./components/LeaveTab";
import PayrollTab from "./components/PayrollTab";
import PerformanceEvaluation from "./components/PerformanceEvaluation";
import AssetCustody from "./components/AssetCustody";

const STATUS_LABELS: Record<string, string> = { active: "فعال", "on-leave": "مرخصی", terminated: "پایان‌یافته" };
// `path` is present only on the three entries that navigate to a routed
// screen; the rest switch a local tab. Annotating the array (instead of
// `as const`) is what makes `item.path` readable on every element — the
// inferred union from `as const` has no `path` on its first members.
const HR_MENU: readonly { id: string; label: string; sub: string; path?: string }[] = [
  { id: 'directory', label: 'پرسنل', sub: 'فهرست کارکنان' },
  { id: 'attendance', label: 'حضور و غیاب', sub: 'ثبت تردد و کارکرد' },
  { id: 'leave', label: 'مرخصی و مأموریت', sub: 'درخواست‌ها و مانده' },
  { id: 'payroll', label: 'حقوق و دستمزد', sub: 'محاسبه و فیش حقوقی' },
  { id: 'performance', label: 'عملکرد', sub: 'ارزیابی کارکنان' },
  { id: 'assets', label: 'اموال امانی', sub: 'دارایی‌های تخصیص‌یافته' },
  { id: 'employees_page', label: 'پرسنل پیشرفته', sub: 'Employee Master 360°', path: '/accounting/payroll/employees' },
  { id: 'payroll_page', label: 'محاسبه حقوق', sub: 'Payroll Register و فیش', path: '/accounting/payroll/calculation' },
  { id: 'reports_page', label: 'گزارشات حقوق', sub: 'گزارش‌ها و داشبورد', path: '/accounting/payroll/reports' },
];

const EMPTY_FORM: EmployeeFormState = {
  name: "", employeeId: "", position: "", department: "", phone: "", email: "", contractType: "permanent",
  nationalId: "", hireDateOverride: "", baseSalary: "", bankAccount: "", address: "",
  emergencyContactName: "", emergencyContactPhone: "", photoUrl: "",
  // MUST stay `undefined`, never "": toEmployeeDto falls back to the caller's
  // scope.zoneId only on nullish, so "" would clobber every non-SUPER_ADMIN.
  zoneId: undefined,
};

export default function HRScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"directory" | "attendance" | "leave" | "payroll" | "performance" | "assets">("directory");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(EMPTY_FORM);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { employees, deactivateEmployee, leaveRequests, payrollBatches } = useHRStore();
  const { vouchers, fixedAssets } = useFinanceStore();

  const activeEmployees = employees.filter((e) => e.status !== "terminated");
  const currentSelected = selectedEmployeeId || activeEmployees[0]?.employeeId || "";

  const filteredEmployees = activeEmployees.filter((e) =>
    !search || e.name.includes(search) || e.employeeId.includes(search) || e.department.includes(search) || e.position.includes(search)
  );

  const openAdd = () => {
    setEditingEmployee(null);
    setEmployeeForm({ ...EMPTY_FORM, employeeId: `EMP-${String(employees.length + 1).padStart(3, "0")}` });
    setModalOpen(true);
  };
  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    const rawHireDate = emp.startDate ?? "";
    setEmployeeForm({
      name: emp.name, employeeId: emp.employeeId, position: emp.position, department: emp.department,
      phone: emp.phone, email: emp.email, contractType: emp.contractType, nationalId: emp.nationalId ?? "",
      // ذخیره ISO است؛ انتخابگر شمسی نمایش می‌دهد. اگر مقدار قدیمی و غیرقابل
      // تبدیل باشد خودش را نشان می‌دهد تا کاربر بتواند اصلاحش کند.
      hireDateOverride: toIsoDate(rawHireDate) ? toJalaliStr(rawHireDate) : rawHireDate, baseSalary: String(emp.baseSalary ?? ""), bankAccount: emp.bankAccount ?? "",
      address: emp.address ?? "", emergencyContactName: emp.emergencyContactName ?? "",
      emergencyContactPhone: emp.emergencyContactPhone ?? "", photoUrl: emp.photoUrl ?? "",
    });
    setModalOpen(true);
  };
  const handleDeactivate = (emp: Employee) => {
    if (!confirm(`آیا از پایان همکاری «${emp.name}» مطمئن هستید؟`)) return;
    deactivateEmployee(emp.id);
    toast.success(`همکاری با ${emp.name} پایان یافت`);
  };

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hr-finance-data-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("داده‌ها به‌صورت JSON دانلود شد");
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAllData(String(reader.result));
        toast.success("داده‌ها بازیابی شد — صفحه را رفرش کنید تا اعمال شود");
      } catch {
        toast.error("فایل نامعتبر است");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Finance dashboard widget data (cross-module read)
  const currentMonthPayroll = payrollBatches[0]?.totalNetPay ?? 0;
  const totalAssetValueInCustody = fixedAssets.filter((a) => a.custodianName).reduce((s, a) => s + a.netBookValue, 0);
  const pendingVouchers = vouchers.filter((v) => v.status === "draft").length;

  return (
    <div className="flex h-full gap-5" dir="rtl">
      <aside className="w-56 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-2 text-right text-xs">
        <div className="border-b border-sidebar-border px-3 py-4"><p className="text-[10px] text-sidebar-primary">HUMAN RESOURCES</p><p className="mt-1 font-bold text-white">منابع انسانی</p></div>
        <nav className="mt-2 space-y-1">{HR_MENU.map(item => <button key={item.id} onClick={() => item.path ? navigate(item.path) : setTab(item.id as typeof tab)} className={`min-h-12 w-full rounded-lg px-3 py-2 text-right transition-colors ${tab === item.id ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}><span className="block font-semibold">{item.label}</span><span className="mt-1 block text-[10px] opacity-80">{item.sub}</span></button>)}</nav>
      </aside>
      <div className="min-w-0 flex-1 space-y-5 overflow-auto">
      {/* Breadcrumb */}
      <p className="text-[11px] text-muted-foreground">پرتال شرکت / منابع انسانی</p>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{HR_MENU.find(item => item.id === tab)?.sub}</p>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" />خروجی داده
          </button>
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />ورودی داده
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <h1 className="text-sm font-semibold text-foreground">مدیریت منابع انسانی</h1>
        </div>
      </div>

      {/* Finance cross-module widget */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{currentMonthPayroll.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">هزینه حقوق آخرین دوره (از مالی)</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Boxes className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{totalAssetValueInCustody.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">ارزش دفتری اموال در اختیار کارکنان (از مالی)</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{pendingVouchers}</p>
            <p className="text-[11px] text-muted-foreground">سند حسابداری در انتظار تأیید (از مالی)</p>
          </div>
        </div>
      </div>

      {/* Directory Tab */}
      {tab === "directory" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /><span>افزودن کارمند</span>
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input dir="rtl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در نام، شناسه، واحد، سمت..."
                className="bg-secondary border border-border rounded-lg py-1.5 pr-3 pl-9 text-xs text-foreground focus:outline-none focus:border-accent w-64" />
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
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(emp)} className="text-xs text-accent hover:underline">ویرایش</button>
                      <button onClick={() => handleDeactivate(emp)} className="text-xs text-red-600 hover:underline flex items-center gap-1"><UserX className="w-3 h-3" />پایان همکاری</button>
                    </div>
                  </td>
                  <td className="py-3 px-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${emp.status === "active" ? "bg-emerald-50 text-emerald-700" : emp.status === "on-leave" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[emp.status]}</span></td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{emp.email}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{emp.phone}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{emp.department}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{emp.position}</td>
                  <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{emp.employeeId}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent overflow-hidden">
                        {emp.photoUrl ? <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" /> : emp.avatarInitial}
                      </div>
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
        <div className="space-y-3">
          <select dir="rtl" value={currentSelected} onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground w-56">
            {activeEmployees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
          </select>
          <AttendanceTab employees={activeEmployees} selectedEmployeeId={currentSelected} />
        </div>
      )}

      {/* Leave Tab */}
      {tab === "leave" && <LeaveTab employees={activeEmployees} />}

      {/* Payroll Tab */}
      {tab === "payroll" && <PayrollTab />}

      {/* Performance Evaluation Tab */}
      {tab === "performance" && <PerformanceEvaluation employees={activeEmployees} />}

      {/* Asset Custody Tab */}
      {tab === "assets" && <AssetCustody employees={activeEmployees} />}

      {modalOpen && (
        <EmployeeModal
          form={employeeForm}
          setForm={setEmployeeForm}
          onClose={() => setModalOpen(false)}
          editingEmployee={editingEmployee}
        />
      )}
      </div>
    </div>
  );
}
