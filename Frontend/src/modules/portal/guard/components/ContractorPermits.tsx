import { useState } from "react";
import { CheckCircle2, X, Wrench } from "lucide-react";
import { WORK_PERMITS } from "@/entities/document";

const RISK_CFG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "کم", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  medium: { label: "متوسط", color: "text-amber-400", bg: "bg-amber-500/15" },
  high: { label: "زیاد", color: "text-orange-400", bg: "bg-orange-500/15" },
  "very-high": { label: "بسیار زیاد", color: "text-red-400", bg: "bg-red-500/15" },
};

const PPE_OPTIONS = ["کلاه ایمنی", "دستکش کار", "عینک ایمنی", "کمربند ایمنی", "جلیقه ایمنی", "ماسک", "دستکش ضد اسید"];

export default function ContractorPermits() {
  const [showIssue, setShowIssue] = useState(false);
  const [ppeCheck, setPpeCheck] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ contractor: "", workType: "", area: "", risk: "medium", workers: "1" });
  const activePermits = WORK_PERMITS.filter((p) => p.status === "active");
  const inputCls = "w-full bg-secondary/60 border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <p className="text-sm font-bold text-white text-right mb-3">تأیید تجهیزات ایمنی (PPE)</p>
        <div className="grid grid-cols-2 gap-2">
          {PPE_OPTIONS.map((ppe) => (
            <button key={ppe} onClick={() => setPpeCheck((c) => ({ ...c, [ppe]: !c[ppe] }))}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${ppeCheck[ppe] ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300" : "bg-white/5 border border-white/10 text-white/60"}`}>
              {ppeCheck[ppe] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20" />}
              {ppe}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowIssue(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs text-white font-bold hover:bg-accent/90">
            <Wrench className="w-3.5 h-3.5" /> صدور مجوز
          </button>
          <p className="text-sm font-bold text-white text-right">مجوزهای کار فعال</p>
        </div>
        <div className="space-y-2">
          {activePermits.map((p) => {
            const risk = RISK_CFG[p.riskLevel];
            return (
              <div key={p.id} className="rounded-xl border border-white/10 p-3" style={{ background: "#0A1420" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${risk.bg} ${risk.color}`}>ریسک {risk.label}</span>
                  <span className="text-xs text-white font-bold">{p.contractorName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-blue-300">{p.area} · {p.workers} نفر</span>
                  <span className="text-white/70">{p.workType}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.ppeRequired.map((ppe) => (
                    <span key={ppe} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-blue-300/70">{ppe}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showIssue && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowIssue(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-5 w-96 max-h-[80vh] overflow-y-auto z-50" style={{ background: "#0F1C2E" }} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowIssue(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-white">صدور مجوز کار جدید</p>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-blue-300 mb-1 block text-right">نام پیمانکار</label><input dir="rtl" value={form.contractor} onChange={(e) => setForm((f) => ({ ...f, contractor: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-blue-300 mb-1 block text-right">نوع کار</label><input dir="rtl" value={form.workType} onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-blue-300 mb-1 block text-right">محل اجرا</label><input dir="rtl" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-blue-300 mb-1 block text-right">تعداد کارگران</label><input dir="ltr" type="number" value={form.workers} onChange={(e) => setForm((f) => ({ ...f, workers: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-xs text-blue-300 mb-1 block text-right">سطح ریسک</label>
                <select value={form.risk} onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))} className={inputCls}>
                  <option value="low">کم</option><option value="medium">متوسط</option><option value="high">زیاد</option><option value="very-high">بسیار زیاد</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-blue-300 mb-1 block text-right">تجهیزات ایمنی مورد نیاز</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PPE_OPTIONS.map((ppe) => (
                    <button key={ppe} onClick={() => setPpeCheck((c) => ({ ...c, [ppe]: !c[ppe] }))}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] transition-colors ${ppeCheck[ppe] ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300" : "bg-white/5 border border-white/10 text-white/50"}`}>
                      {ppeCheck[ppe] ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-white/20" />}
                      {ppe}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowIssue(false)} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent/90 mt-2">صدور مجوز</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
