import { useState } from "react";
import { Clock, Plus, X, FileText } from "lucide-react";
import { SHIFT_ROSTER } from "@/entities/document";

const BREAK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "on-duty": { label: "در حال خدمت", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  "break": { label: "استراحت", color: "text-amber-400", bg: "bg-amber-500/15" },
  "completed": { label: "پایان شیفت", color: "text-blue-300", bg: "bg-blue-500/15" },
  "off-duty": { label: "خارج از شیفت", color: "text-slate-400", bg: "bg-slate-500/15" },
};

export default function ShiftManagement() {
  const [showAdd, setShowAdd] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [newGuard, setNewGuard] = useState({ name: "", post: "" });
  const onDuty = SHIFT_ROSTER.filter((g) => g.breakStatus !== "off-duty");
  const inputCls = "w-full bg-secondary/60 border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs text-white font-bold hover:bg-accent/90">
            <Plus className="w-3.5 h-3.5" /> افزودن نگهبان
          </button>
          <p className="text-sm font-bold text-white text-right">لیست نگهبانان شیفت فعلی</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-blue-300 border-b border-white/10">
                <th className="py-2 px-2 text-right">وضعیت</th>
                <th className="py-2 px-2 text-right">ساعات</th>
                <th className="py-2 px-2 text-right">شیفت</th>
                <th className="py-2 px-2 text-right">پست</th>
                <th className="py-2 px-2 text-right">نام</th>
              </tr>
            </thead>
            <tbody>
              {SHIFT_ROSTER.map((g) => {
                const bs = BREAK_STATUS[g.breakStatus];
                return (
                  <tr key={g.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bs.bg} ${bs.color}`}>{bs.label}</span></td>
                    <td className="py-2 px-2 text-white font-mono" dir="ltr">{g.hoursWorked}h</td>
                    <td className="py-2 px-2 text-white/80 font-mono text-[10px]" dir="ltr">{g.shiftStart} — {g.shiftEnd}</td>
                    <td className="py-2 px-2 text-white/90">{g.post}</td>
                    <td className="py-2 px-2 text-white font-bold">{g.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <p className="text-sm font-bold text-white text-right mb-3">زمان‌بندی استراحت</p>
        <div className="space-y-2.5">
          {SHIFT_ROSTER.filter((g) => g.breakStart).map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="text-[10px] text-white/80 w-20 text-right truncate flex-shrink-0">{g.name}</span>
              <div className="flex-1 h-6 rounded-lg bg-white/5 relative overflow-hidden">
                <div className="absolute inset-y-0 bg-emerald-500/15 rounded-lg" style={{ left: "0%", right: "0%" }} />
                {g.breakStart && g.breakEnd && (
                  <div className="absolute inset-y-0 bg-amber-500/40 rounded-lg" style={{ left: "55%", right: "35%" }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-amber-300 font-bold">استراحت</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-blue-300 font-mono flex-shrink-0" dir="ltr">{g.shiftStart}–{g.shiftEnd}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowHandover(!showHandover)}
        className="flex items-center justify-between rounded-xl border border-white/10 p-3 hover:bg-white/5 transition-colors" style={{ background: "#0F1C2E" }}>
        <FileText className="w-4 h-4 text-blue-300" />
        <span className="text-xs font-bold text-white">گزارش تحویل شیفت</span>
      </button>
      {showHandover && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-2 text-xs" style={{ background: "#0F1C2E" }}>
          <p className="text-white font-bold text-right mb-2">خلاصه تحویل شیفت</p>
          {[
            `تعداد نگهبانان فعال: ${onDuty.length} نفر`,
            "ورودی ثبت‌شده: ۱۲۷ تردد",
            "خروجی ثبت‌شده: ۱۱۸ تردد",
            "پلاک مشکوک: ۳ مورد",
            "حوادث ثبت‌شده: ۰ مورد",
            "اعلام اضطراری: نداشته",
          ].map((line, i) => (
            <div key={i} className="flex items-center gap-2 text-white/80">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-5 w-80 z-50" style={{ background: "#0F1C2E" }} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-white">افزودن / حذف نگهبان</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-blue-300 mb-1 block text-right">نام نگهبان</label>
                <input dir="rtl" value={newGuard.name} onChange={(e) => setNewGuard((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-blue-300 mb-1 block text-right">پست</label>
                <input dir="rtl" value={newGuard.post} onChange={(e) => setNewGuard((f) => ({ ...f, post: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent/90">افزودن</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg bg-red-600/80 text-white text-sm font-bold hover:bg-red-500">حذف از شیفت</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
