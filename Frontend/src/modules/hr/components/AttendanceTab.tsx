import { toast } from "sonner";
import { Check, LogIn, LogOut } from "lucide-react";
import { Employee } from "../types";
import { useHRStore } from "../store/useHRStore";

const STATUS_LABELS: Record<string, string> = { present: "حاضر", late: "دیرکرد", absent: "غایب", "on-leave": "مرخصی", "half-day": "نیم‌وقت" };
const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-50 text-emerald-700", late: "bg-amber-50 text-amber-700",
  absent: "bg-red-50 text-red-700", "on-leave": "bg-blue-50 text-blue-700", "half-day": "bg-slate-100 text-slate-600",
};

export default function AttendanceTab({ employees, selectedEmployeeId }: { employees: Employee[]; selectedEmployeeId: string }) {
  const { attendance, clockIn, clockOut, approveAttendance, getMonthlySummary } = useHRStore();
  const todayISO = new Date().toISOString().slice(0, 10);
  const summary = getMonthlySummary(selectedEmployeeId);
  const todaysRecord = attendance.find((a) => a.employeeId === selectedEmployeeId && a.date === todayISO);

  const handleClockIn = () => {
    if (todaysRecord) { toast.error("امروز قبلاً ثبت ورود شده است"); return; }
    clockIn(selectedEmployeeId);
    toast.success("ورود ثبت شد");
  };
  const handleClockOut = () => {
    if (!todaysRecord || todaysRecord.checkOut) { toast.error("ابتدا باید ورود ثبت شده باشد"); return; }
    clockOut(selectedEmployeeId);
    toast.success("خروج ثبت شد");
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handleClockIn} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
            <LogIn className="w-3.5 h-3.5" />ثبت ورود
          </button>
          <button onClick={handleClockOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 transition-colors">
            <LogOut className="w-3.5 h-3.5" />ثبت خروج
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">وضعیت امروز</p>
          <p className="text-sm font-semibold text-foreground">
            {todaysRecord ? `${todaysRecord.checkIn ?? "—"} تا ${todaysRecord.checkOut ?? "در حال کار"}` : "هنوز ثبت نشده"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{summary.totalHours}</p>
          <p className="text-xs text-muted-foreground mt-1">مجموع ساعت کار (ثبت‌شده)</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600" dir="ltr">{summary.lateCount}</p>
          <p className="text-xs text-muted-foreground mt-1">تعداد دیرکرد</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600" dir="ltr">{summary.absentCount}</p>
          <p className="text-xs text-muted-foreground mt-1">تعداد غیبت</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold text-foreground">سوابق حضور و غیاب (همه کارکنان)</h3></div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["تأیید", "وضعیت", "خروج", "ورود", "تاریخ", "کارمند"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendance.slice(0, 30).map((a) => (
              <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-3">
                  {a.approved
                    ? <span className="text-[10px] text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />تأییدشده</span>
                    : <button onClick={() => { approveAttendance(a.id); toast.success("تأیید شد"); }} className="text-xs text-accent hover:underline">تأیید</button>}
                </td>
                <td className="py-3 px-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span></td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{a.checkOut ?? "—"}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{a.checkIn ?? "—"}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{a.date}</td>
                <td className="py-3 px-3 text-sm font-semibold text-foreground">{a.employeeName}</td>
              </tr>
            ))}
            {attendance.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">هنوز رکوردی ثبت نشده — از دکمه «ثبت ورود» استفاده کنید</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
