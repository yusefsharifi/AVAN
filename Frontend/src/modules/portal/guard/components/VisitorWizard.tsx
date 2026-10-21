import { useState } from "react";
import { User, Building2, Target, Truck, Printer, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { VISITORS } from "@/entities/document";

const STEPS = [
  { label: "هویت", Icon: User },
  { label: "میزبان", Icon: Building2 },
  { label: "هدف", Icon: Target },
  { label: "وسیله نقلیه", Icon: Truck },
];

export default function VisitorWizard() {
  const [tab, setTab] = useState<"new" | "history" | "overstay">("new");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", idNumber: "", phone: "", host: "", contact: "", purpose: "", duration: "", plate: "", vehicleType: "car" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-secondary/60 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent";
  const labelCls = "text-xs text-blue-300 mb-1 block text-right";
  const overstayed = VISITORS.filter((v) => v.status === "checked-in");

  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      <div className="flex gap-1 p-1 rounded-xl bg-white/5">
        {([["new", "بازدیدکننده جدید"], ["history", "تاریخچه"], ["overstay", "تاخیر خروج"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === id ? "bg-accent text-white" : "text-white/60 hover:text-white/80"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i <= step ? "bg-accent" : "bg-white/10"}`}>
                  <s.Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={`text-[10px] ${i <= step ? "text-white" : "text-white/40"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-accent" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: "#0F1C2E" }}>
            {step === 0 && (
              <>
                <div><label className={labelCls}>نام و نام خانوادگی</label><input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>کد ملی</label><input dir="ltr" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>شماره تماس</label><input dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} /></div>
              </>
            )}
            {step === 1 && (
              <>
                <div><label className={labelCls}>شرکت میزبان</label><input dir="rtl" value={form.host} onChange={(e) => set("host", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>فرد مسئول</label><input dir="rtl" value={form.contact} onChange={(e) => set("contact", e.target.value)} className={inputCls} /></div>
              </>
            )}
            {step === 2 && (
              <>
                <div><label className={labelCls}>هدف از بازدید</label><input dir="rtl" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>مدت انتظار (دقیقه)</label><input dir="ltr" type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} className={inputCls} /></div>
              </>
            )}
            {step === 3 && (
              <>
                <div><label className={labelCls}>پلاک خودرو</label><input dir="ltr" value={form.plate} onChange={(e) => set("plate", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>نوع خودرو</label>
                  <select value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)} className={inputCls}>
                    <option value="car">سواری</option><option value="truck">کامیون</option><option value="motorcycle">موتور</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/90 text-sm font-bold hover:bg-white/5 flex items-center justify-center gap-1"><ChevronRight className="w-4 h-4" /> قبلی</button>}
            {step < 3 ? (
              <button onClick={() => setStep((s) => s + 1)} className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 flex items-center justify-center gap-1">بعدی <ChevronLeft className="w-4 h-4" /></button>
            ) : (
              <button className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"><Printer className="w-4 h-4" /> صدور کارت ورود</button>
            )}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border border-white/10 p-3" style={{ background: "#0F1C2E" }}>
          <div className="space-y-1.5">
            {VISITORS.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.status === "checked-in" ? "bg-emerald-500/15 text-emerald-400" : v.status === "scheduled" ? "bg-amber-500/15 text-amber-400" : "bg-white/10 text-white/50"}`}>
                  {v.status === "checked-in" ? "حضور" : v.status === "scheduled" ? "برنامه‌ریزی" : v.status === "checked-out" ? "خروج" : "لغو"}
                </span>
                <div className="text-right">
                  <p className="text-xs text-white">{v.name}</p>
                  <p className="text-[10px] text-blue-300/70">{v.host} · {v.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "overstay" && (
        <div className="rounded-2xl border border-red-500/30 p-4" style={{ background: "#0F1C2E" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-bold text-red-300">بازدیدکنندگان با تاخیر خروج</p>
          </div>
          {overstayed.length === 0 ? (
            <p className="text-xs text-white/50 text-center py-4">موردی ثبت نشده</p>
          ) : (
            <div className="space-y-2">
              {overstayed.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] text-red-300 font-bold">
                    <AlertTriangle className="w-3 h-3" /> تاخیر
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-white font-bold">{v.name}</p>
                    <p className="text-[10px] text-red-300/70">{v.host} · ورود: {v.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
