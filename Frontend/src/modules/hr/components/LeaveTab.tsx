import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X as XIcon } from "lucide-react";
import { Employee } from "../types";
import { useHRStore } from "../store/useHRStore";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const LEAVE_TYPE_LABELS: Record<string, string> = { annual: "سالانه", medical: "بیماری", emergency: "اورژانسی", maternity: "زایمان", unpaid: "بدون حقوق" };
const STATUS_LABELS: Record<string, string> = { pending: "در انتظار", approved: "تأیید", rejected: "رد" };

function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
  return Math.round((e - s) / 86400000) + 1;
}

export default function LeaveTab({ employees }: { employees: Employee[] }) {
  const { leaveRequests, leaveBalances, requestLeave, decideLeave } = useHRStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: employees[0]?.employeeId ?? "", type: "annual" as "annual" | "medical" | "emergency" | "maternity" | "unpaid",
    startDate: "", endDate: "", reason: "", attachmentName: "",
  });

  const submitRequest = () => {
    if (!form.startDate || !form.endDate) { toast.error("تاریخ شروع و پایان الزامی است"); return; }
    const days = daysBetween(form.startDate, form.endDate);
    requestLeave({ ...form, days });
    toast.success("درخواست مرخصی ثبت شد");
    setModalOpen(false);
  };

  const handleDecision = (id: string, decision: "approved" | "rejected") => {
    decideLeave(id, decision, "علیرضا صادقی");
    toast.success(decision === "approved" ? "مرخصی تأیید و از مانده کسر شد" : "درخواست رد شد");
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold text-foreground">مانده مرخصی کارکنان</h3></div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["اورژانسی", "بیماری", "سالانه", "کارمند"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveBalances.map((b) => {
              const emp = employees.find((e) => e.employeeId === b.employeeId);
              return (
                <tr key={b.employeeId} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{b.emergency}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{b.medical}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{b.annual}</td>
                  <td className="py-2.5 px-3 text-sm font-semibold text-foreground">{emp?.name ?? b.employeeId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>درخواست مرخصی</span>
          </button>
          <h3 className="text-sm font-semibold text-foreground">درخواست‌های مرخصی</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["عملیات", "وضعیت", "روز", "پایان", "شروع", "نوع", "کارمند"].map((h) => (
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
                      <button onClick={() => handleDecision(r.id, "approved")} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDecision(r.id, "rejected")} className="p-1 rounded hover:bg-red-50 text-red-600"><XIcon className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : <span className="text-[10px] text-muted-foreground">{r.approvedBy}</span>}
                </td>
                <td className="py-3 px-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${r.status === "approved" ? "bg-emerald-50 text-emerald-700" : r.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{STATUS_LABELS[r.status]}</span></td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{r.days}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{r.endDate}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{r.startDate}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{LEAVE_TYPE_LABELS[r.type]}</td>
                <td className="py-3 px-3 text-sm font-semibold text-foreground">{r.employeeName}</td>
              </tr>
            ))}
            {leaveRequests.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">درخواستی ثبت نشده</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><XIcon className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">درخواست مرخصی جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>کارمند</label>
                <select dir="rtl" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls}>
                  {employees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>نوع مرخصی</label>
                <select dir="rtl" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))} className={inputCls}>
                  <option value="annual">سالانه</option><option value="medical">بیماری</option>
                  <option value="emergency">اورژانسی</option><option value="maternity">زایمان</option>
                  <option value="unpaid">بدون حقوق</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>تاریخ شروع</label><input type="date" dir="ltr" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>تاریخ پایان</label><input type="date" dir="ltr" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>دلیل</label><textarea dir="rtl" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} rows={2} /></div>
              <div><label className={labelCls}>پیوست (اختیاری — نام فایل)</label><input dir="rtl" value={form.attachmentName} onChange={(e) => setForm((f) => ({ ...f, attachmentName: e.target.value }))} placeholder="مثال: گواهی پزشک.pdf" className={inputCls} /></div>
              <button onClick={submitRequest} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">
                ثبت درخواست
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
