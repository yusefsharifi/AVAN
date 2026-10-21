import { useState } from "react";
import { Eye, FileText, AlertTriangle, Flag, ChevronLeft } from "lucide-react";
import { WeightSession, WEIGHBRIDGE_STATIONS } from "@/entities/document";
import { WEIGHT_SESSIONS } from "./mockData";

const STATUS_CFG: Record<string, { fa: string; color: string; bg: string }> = {
  weighing: { fa: "در حال وزن‌کشی", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40" },
  completed: { fa: "تکمیل شده", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40" },
  discrepancy: { fa: "اختلاف وزن", color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
  cancelled: { fa: "لغو شده", color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/40" },
};

type Filter = "all" | "completed" | "discrepancy" | "cancelled";

export default function SessionList() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<WeightSession | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");

  const filtered = filter === "all" ? WEIGHT_SESSIONS : WEIGHT_SESSIONS.filter((s) => s.status === filter);

  if (selected) return (
    <div>
      <button onClick={() => { setSelected(null); setCorrectionNote(""); }} className="flex items-center gap-1 text-xs text-blue-300/60 hover:text-white mb-4">
        <ChevronLeft className="w-3.5 h-3.5 rotate-180" /> بازگشت به لیست
      </button>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">جزئیات جلسه {selected.id}</h3>
          <span className={`text-[10px] px-2 py-1 rounded border ${STATUS_CFG[selected.status].bg} ${STATUS_CFG[selected.status].color}`}>
            {STATUS_CFG[selected.status].fa}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { l: "پلاک", v: selected.plate },
            { l: "راننده", v: selected.driverName },
            { l: "شرکت", v: selected.companyName },
            { l: "نوع بار", v: selected.cargoType },
            { l: "جهت", v: selected.direction === "in" ? "ورودی" : "خروجی" },
            { l: "ایستگاه", v: WEIGHBRIDGE_STATIONS.find((s) => s.id === selected.stationId)?.nameFa || selected.stationId },
            { l: "اپراتور", v: selected.operatorName },
            { l: "زمان", v: selected.timestamp },
            { l: "دوک", v: selected.dock },
          ].map((item) => (
            <div key={item.l} className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] text-blue-300/50 mb-1">{item.l}</p>
              <p className="text-white font-medium">{item.v}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-xs font-bold text-white mb-3">جزئیات وزن</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: "وزن تاره (خالی)", v: selected.tareWeight, color: "text-blue-300" },
              { l: "وزن ناخالص (پر)", v: selected.grossWeight, color: "text-amber-300" },
              { l: "وزن خالص", v: selected.netWeight, color: "text-emerald-400" },
              { l: "وزن اظهاری", v: selected.declaredWeight, color: selected.discrepancyPct > 0 ? "text-red-400" : "text-emerald-400" },
            ].map((w) => (
              <div key={w.l} className="text-center">
                <p className="text-[10px] text-blue-300/50">{w.l}</p>
                <p className={`text-lg font-bold ${w.color} mt-1`}>{w.v.toLocaleString("fa-IR")}</p>
                <p className="text-[9px] text-blue-300/30">kg</p>
              </div>
            ))}
          </div>
          {selected.discrepancyPct > 0 && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
              <p className="text-xs text-red-400 font-bold">اختلاف وزن: {selected.discrepancyPct}%</p>
            </div>
          )}
        </div>

        {selected.commodities && selected.commodities.length > 0 && (
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-xs font-bold text-white mb-3">اقلام کالا</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-blue-300/40">
                  <th className="text-right py-1 px-2">نام</th>
                  <th className="text-right py-1 px-2">کد HS</th>
                  <th className="text-right py-1 px-2">اظهاری</th>
                  <th className="text-right py-1 px-2">واقعی</th>
                  <th className="text-right py-1 px-2">واحد</th>
                </tr>
              </thead>
              <tbody>
                {selected.commodities.map((c, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-1.5 px-2 text-white">{c.name}</td>
                    <td className="py-1.5 px-2 text-blue-300/50">{c.hsCode}</td>
                    <td className="py-1.5 px-2 text-white">{c.declaredWeight.toLocaleString("fa-IR")}</td>
                    <td className="py-1.5 px-2 text-white">{c.actualWeight.toLocaleString("fa-IR")}</td>
                    <td className="py-1.5 px-2 text-blue-300/50">{c.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected.photos && (
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-xs font-bold text-white mb-2">عکس‌ها</p>
            <div className="flex gap-2">
              {selected.photos.truck && <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">کامیون</span>}
              {selected.photos.cargo && <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">بار</span>}
              {selected.photos.seal && <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">مهر/پلمپ</span>}
            </div>
          </div>
        )}

        {selected.correctedBy && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-[11px] text-amber-400">اصلاح شده توسط {selected.correctedBy} — جلسه اصلی: {selected.originalSessionId}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => alert(`گواهی وزن ${selected.id} تولید شد`)} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/80 transition-colors">
            <FileText className="w-3.5 h-3.5 inline ml-1.5" /> گواهی وزن
          </button>
          {selected.status === "completed" && (
            <div className="flex items-center gap-2">
              <input value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} placeholder="دلیل اصلاح..." className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[11px] text-white placeholder:text-blue-300/30 focus:outline-none w-48" />
              <button onClick={() => { alert(`جلسه ${selected.id} برای اصلاح ثبت شد`); setCorrectionNote(""); }} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[11px] font-medium hover:bg-amber-500/30 transition-colors">
                <Flag className="w-3 h-3 inline ml-1" /> اصلاح
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        {(["all", "completed", "discrepancy", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${filter === f ? "bg-accent text-white" : "text-blue-300/60 hover:text-white hover:bg-white/5"}`}>
            {f === "all" ? "همه" : STATUS_CFG[f].fa}
          </button>
        ))}
        <span className="mr-auto text-[10px] text-blue-300/40">{filtered.length} مورد</span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5">
              {["شناسه", "پلاک", "راننده", "شرکت", "وزن خالص", "اختلاف", "وضعیت", "زمان", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-right text-[10px] text-blue-300/50 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const cfg = STATUS_CFG[s.status];
              return (
                <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="px-3 py-2.5 text-white font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-white">{s.plate}</td>
                  <td className="px-3 py-2.5 text-blue-200/70">{s.driverName}</td>
                  <td className="px-3 py-2.5 text-blue-200/70">{s.companyName}</td>
                  <td className="px-3 py-2.5 text-white font-mono">{s.netWeight.toLocaleString("fa-IR")}</td>
                  <td className={`px-3 py-2.5 font-mono ${s.discrepancyPct > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {s.discrepancyPct > 0 ? `${s.discrepancyPct}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{cfg.fa}</span>
                  </td>
                  <td className="px-3 py-2.5 text-blue-300/50">{s.timestamp}</td>
                  <td className="px-3 py-2.5"><Eye className="w-3.5 h-3.5 text-blue-300/30" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
