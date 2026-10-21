import { useState } from "react";
import { AlertTriangle, Clock, Shield, Plus, X } from "lucide-react";
import { HSE_INCIDENTS, HSEIncident } from "@/entities/document";

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  security: { label: "امنیتی", color: "text-blue-400" },
  hse: { label: "HSE", color: "text-amber-400" },
  fire: { label: "حریق", color: "text-red-400" },
  medical: { label: "پزشکی", color: "text-emerald-400" },
  theft: { label: "سرقت", color: "text-orange-400" },
  environmental: { label: "محیط زیست", color: "text-teal-400" },
};

const SEV_CFG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "پایین", color: "text-blue-300", bg: "bg-blue-500/15" },
  medium: { label: "متوسط", color: "text-amber-400", bg: "bg-amber-500/15" },
  high: { label: "زیاد", color: "text-orange-400", bg: "bg-orange-500/15" },
  critical: { label: "بحرانی", color: "text-red-400", bg: "bg-red-500/15" },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  logged: { label: "ثبت شده", color: "text-slate-400" },
  assigned: { label: "تخصیص یافته", color: "text-blue-300" },
  "in-progress": { label: "در حال انجام", color: "text-amber-400" },
  resolved: { label: "حل شده", color: "text-emerald-400" },
  closed: { label: "بسته شده", color: "text-white/50" },
};

export default function IncidentLog() {
  const [tab, setTab] = useState<"register" | "report">("register");
  const [selected, setSelected] = useState<HSEIncident | null>(null);
  const [form, setForm] = useState({ type: "hse", severity: "medium", location: "", gps: "", desc: "", injured: "0", actions: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-secondary/60 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent";
  const labelCls = "text-xs text-blue-300 mb-1 block text-right";

  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      <button className="flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors py-3">
        <Shield className="w-4 h-4" /> پخش اعلان اضطراری
      </button>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5">
        <button onClick={() => setTab("register")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === "register" ? "bg-accent text-white" : "text-white/60"}`}>ثبت‌نام حوادث</button>
        <button onClick={() => setTab("report")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === "report" ? "bg-accent text-white" : "text-white/60"}`}>گزارش حادثه</button>
      </div>

      {tab === "register" && (
        <>
          <div className="rounded-2xl border border-white/10 p-3" style={{ background: "#0F1C2E" }}>
            <div className="space-y-2">
              {HSE_INCIDENTS.map((inc) => {
                const sev = SEV_CFG[inc.severity];
                const tp = TYPE_CFG[inc.type];
                const st = STATUS_CFG[inc.status];
                return (
                  <button key={inc.id} onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
                    className={`w-full text-right rounded-xl border p-3 transition-colors ${selected?.id === inc.id ? "border-accent bg-accent/10" : "border-white/10 hover:bg-white/5"}`} style={{ background: selected?.id === inc.id ? undefined : "#0A1420" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sev.bg} ${sev.color} font-bold`}>{sev.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${tp.color}`}>{tp.label}</span>
                        <span className="text-xs text-white font-bold">{inc.id}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/90 mb-1">{inc.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${st.color}`}>{st.label}</span>
                      <span className="text-[10px] text-blue-300/70">{inc.date} {inc.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
              <p className="text-sm font-bold text-white text-right mb-3">خط زمانی — {selected.id}</p>
              <div className="space-y-3 relative">
                <div className="absolute right-3 top-0 bottom-0 w-0.5 bg-white/10" />
                {selected.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 z-10">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white font-bold">{t.action}</p>
                      <p className="text-[10px] text-blue-300/70">{t.by} · {t.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "report" && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: "#0F1C2E" }}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>نوع حادثه</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                <option value="hse">HSE</option><option value="security">امنیتی</option><option value="fire">حریق</option><option value="medical">پزشکی</option><option value="theft">سرقت</option><option value="environmental">محیط زیست</option>
              </select>
            </div>
            <div><label className={labelCls}>شدت</label>
              <select value={form.severity} onChange={(e) => set("severity", e.target.value)} className={inputCls}>
                <option value="low">پایین</option><option value="medium">متوسط</option><option value="high">زیاد</option><option value="critical">بحرانی</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>محل حادثه</label><input dir="rtl" value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>مختصات GPS</label><input dir="ltr" value={form.gps} onChange={(e) => set("gps", e.target.value)} placeholder="35.6892, 51.3890" className={inputCls} /></div>
          <div><label className={labelCls}>شرح حادثه</label><textarea dir="rtl" rows={3} value={form.desc} onChange={(e) => set("desc", e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>تعداد مصدومین</label><input dir="ltr" type="number" value={form.injured} onChange={(e) => set("injured", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>اقدامات انجام‌شده</label><input dir="rtl" value={form.actions} onChange={(e) => set("actions", e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>عکس‌ها</label>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center text-xs text-white/40 hover:border-accent/50 cursor-pointer transition-colors">
              کلیک یا فایل را اینجا رها کنید
            </div>
          </div>
          <button className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors mt-2">ثبت گزارش حادثه</button>
        </div>
      )}
    </div>
  );
}
