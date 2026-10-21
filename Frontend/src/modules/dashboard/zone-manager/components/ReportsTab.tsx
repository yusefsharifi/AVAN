import { useState } from "react";
import { ResponsiveContainer, LineChart, PieChart, ComposedChart, XAxis, YAxis, Tooltip, Line, Pie, Cell, Bar, Area, ReferenceDot } from "recharts";
import { AlertTriangle, Eye, Clock, Calendar, Plus, Play, Pause, Edit2, Trash2, GitCompare, BarChart2 } from "lucide-react";
import { heatmapData, HEATMAP_HOURS, WEEK_DAYS, trafficCombined, traffic30Day, trafficAnomalies, tomorrowForecast, maintenancePredictions, dockUtilization, vehicleTypeDist } from "@/entities/document";

type ReportsTabId = "traffic" | "security" | "logistics" | "predictive" | "scheduler" | "kpi-builder";

interface ReportsTabProps {
  analyticsTab: ReportsTabId; setAnalyticsTab: (t: ReportsTabId) => void;
}

const REPORT_TABS = [
  { id: "traffic" as ReportsTabId, label: "ترافیک" }, { id: "security" as ReportsTabId, label: "امنیت" },
  { id: "logistics" as ReportsTabId, label: "لجستیک" }, { id: "predictive" as ReportsTabId, label: "پیش‌بینی" },
  { id: "scheduler" as ReportsTabId, label: "زمان‌بندی" }, { id: "kpi-builder" as ReportsTabId, label: "ساخت KPI" },
];

const initialScheduled = [
  { id: 1, name: "گزارش ترافیک روزانه", freq: "روزانه", next: "فردا ۰۶:۰۰", recipients: "احمد کریمی", active: true },
  { id: 2, name: "گزارش مالی هفتگی", freq: "هفتگی", next: "شنبه ۰۸:۰۰", recipients: "زهرا امینی", active: true },
  { id: 3, name: "گزارش امنیت ماهانه", freq: "ماهانه", next: "۱ مهر ۰۸:۰۰", recipients: "حسین کاظمی", active: false },
  { id: 4, name: "گزارش عملکرد دستگاه‌ها", freq: "هفتگی", next: "شنبه ۰۹:۰۰", recipients: "مریم رضایی", active: true },
];

const initialKpis = [
  { id: 1, name: "نرخ تردد روزانه", formula: "مجموع", source: "سیستم ANPR", threshold: "1000", unit: "خودرو" },
  { id: 2, name: "آپتایم دستگاه‌ها", formula: "درصد", source: "سیستم مانیتورینگ", threshold: "99", unit: "%" },
];

export const ReportsTab = ({ analyticsTab, setAnalyticsTab }: ReportsTabProps) => {
  const [compareMode, setCompareMode] = useState(false);
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [kpis, setKpis] = useState(initialKpis);
  const [kpiForm, setKpiForm] = useState({ name: "", formula: "میانگین", source: "", threshold: "", unit: "" });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit mr-auto overflow-x-auto">
        {REPORT_TABS.map((t) => (
          <button key={t.id} onClick={() => setAnalyticsTab(t.id)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${analyticsTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {analyticsTab === "traffic" && (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">نقشه حرارتی ترافیک</h3>
            <div className="space-y-1">
              {heatmapData.map((row, ri) => (
                <div key={ri} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0 text-right">{WEEK_DAYS[ri]}</span>
                  <div className="flex-1 grid grid-cols-8 gap-1">{row.map((cell, ci) => (<div key={ci} title={`${cell.value} تردد`} className="h-7 rounded flex items-center justify-center text-[8px] font-mono text-white" style={{ background: `rgba(14,124,134,${Math.min(0.15 + cell.value / 130, 1)})` }} dir="ltr">{cell.value}</div>))}</div>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pt-1"><span className="w-14 flex-shrink-0" /><div className="flex-1 grid grid-cols-8 gap-1">{HEATMAP_HOURS.map((h) => <span key={h} className="text-[9px] text-muted-foreground text-center font-mono" dir="ltr">{h}</span>)}</div></div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCompareMode(!compareMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${compareMode ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}><GitCompare className="w-3.5 h-3.5" /><span>حالت مقایسه</span></button>
              <h3 className="text-sm font-semibold text-foreground">روند ترافیک ۳۰ روزه با پیش‌بینی</h3>
            </div>
            {compareMode ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-3"><p className="text-xs font-semibold text-foreground text-right mb-2">دوره اول (۱۵ روز اخیر)</p>
                  <ResponsiveContainer width="100%" height={160}><LineChart data={traffic30Day.slice(15)}>
                    <XAxis dataKey="day" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual" stroke="#0E7C86" strokeWidth={2} dot={false} />
                  </LineChart></ResponsiveContainer>
                </div>
                <div className="border border-border rounded-lg p-3"><p className="text-xs font-semibold text-foreground text-right mb-2">دوره دوم (۱۵ روز قبل)</p>
                  <ResponsiveContainer width="100%" height={160}><LineChart data={traffic30Day.slice(0, 15)}>
                    <XAxis dataKey="day" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual" stroke="#F2A541" strokeWidth={2} dot={false} />
                  </LineChart></ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-accent inline-block" />واقعی</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />پیش‌بینی</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />ناهنجاری</span>
              </div>
            )}
            {!compareMode && (
              <ResponsiveContainer width="100%" height={220}><LineChart data={trafficCombined}>
                <XAxis dataKey="day" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" stroke="#0E7C86" strokeWidth={2} dot={false} name="واقعی" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#F2A541" strokeWidth={2} strokeDasharray="5 4" dot={false} name="پیش‌بینی" connectNulls />
                {trafficAnomalies.map((a, i) => (<ReferenceDot key={i} x={traffic30Day[a.idx].day} y={a.value} r={5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />))}
              </LineChart></ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {analyticsTab === "security" && (
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-center"><AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">۷</p><p className="text-xs text-muted-foreground mt-1">حادثه امنیتی این ماه</p></div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-center"><Eye className="w-5 h-5 text-accent mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">۹۸.۴٪</p><p className="text-xs text-muted-foreground mt-1">پوشش دوربین‌های فعال</p></div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-center"><Clock className="w-5 h-5 text-primary mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">۳.۲ دقیقه</p><p className="text-xs text-muted-foreground mt-1">میانگین زمان پاسخ</p></div>
        </div>
      )}

      {analyticsTab === "logistics" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">اشغال دوک‌ها</h3>
            <div className="space-y-3">{dockUtilization.map((d) => (<div key={d.name}><div className="flex items-center justify-between mb-1"><span className="text-[11px] font-semibold text-foreground" dir="ltr">{d.pct}٪</span><span className="text-[11px] text-muted-foreground">{d.name}</span></div><div className="w-full h-2 bg-secondary rounded-full"><div className={`h-2 rounded-full ${d.pct >= 90 ? "bg-red-500" : d.pct >= 75 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${d.pct}%` }} /></div></div>))}</div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-3">ترکیب خودروها</h3>
            <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={vehicleTypeDist} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">{vehicleTypeDist.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer>
          </div>
        </div>
      )}

      {analyticsTab === "predictive" && (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">پیش‌بینی ساعتی فردا</h3>
            <ResponsiveContainer width="100%" height={220}><ComposedChart data={tomorrowForecast}>
              <XAxis dataKey="t" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#0E7C86" radius={[3, 3, 0, 0]} name="پیش‌بینی" barSize={14} />
              <Area dataKey="low" stackId="ci" stroke="none" fill="transparent" />
              <Area dataKey="range" stackId="ci" stroke="none" fill="#F2A541" fillOpacity={0.18} />
            </ComposedChart></ResponsiveContainer>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs text-accent">بر اساس الگوی تردد پیش‌بینی‌شده</span>
            <p className="text-sm font-semibold text-foreground text-right">پیشنهاد: ۲ نگهبان بیشتر فردا از ساعت ۹ تا ۱۱</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">پیش‌بینی نگهداری تجهیزات</h3>
            <div className="space-y-3">{maintenancePredictions.map((m) => (<div key={m.name}><div className="flex items-center justify-between mb-1"><span className={`text-[11px] font-semibold ${m.prob >= 60 ? "text-red-600" : m.prob >= 35 ? "text-amber-600" : "text-foreground"}`} dir="ltr">{m.prob}٪</span><span className="text-[11px] text-muted-foreground">{m.name}</span></div><div className="w-full h-2 bg-secondary rounded-full"><div className={`h-2 rounded-full ${m.prob >= 60 ? "bg-red-500" : m.prob >= 35 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${m.prob}%` }} /></div></div>))}</div>
          </div>
        </>
      )}

      {analyticsTab === "scheduler" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground text-right mb-4">زمان‌بندی گزارش‌ها</h3>
          <div className="space-y-2">
            {scheduled.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-3 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <button onClick={() => setScheduled((s) => s.map((x) => x.id === r.id ? { ...x, active: !x.active } : x))} className={`p-1.5 rounded-lg ${r.active ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>{r.active ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}</button>
                  <button className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setScheduled((s) => s.filter((x) => x.id !== r.id))} className="p-1.5 rounded-lg bg-secondary text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-right flex-1 mr-3">
                  <p className="text-xs font-semibold text-foreground">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">دریافت‌کننده: {r.recipients}</p>
                </div>
                <div className="text-left">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.active ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>{r.freq}</span>
                  <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">{r.next}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analyticsTab === "kpi-builder" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">ساخت KPI سفارشی</h3>
            <div className="grid grid-cols-5 gap-3 mb-4">
              <input dir="rtl" value={kpiForm.name} onChange={(e) => setKpiForm((f) => ({ ...f, name: e.target.value }))} placeholder="نام KPI" className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
              <select value={kpiForm.formula} onChange={(e) => setKpiForm((f) => ({ ...f, formula: e.target.value }))} className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent">
                <option>میانگین</option><option>مجموع</option><option>درصد</option></select>
              <input dir="rtl" value={kpiForm.source} onChange={(e) => setKpiForm((f) => ({ ...f, source: e.target.value }))} placeholder="منبع داده" className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
              <input dir="ltr" value={kpiForm.threshold} onChange={(e) => setKpiForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="آستانه" className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
              <button disabled={!kpiForm.name.trim()} onClick={() => {
                setKpis((k) => [...k, { id: Date.now(), name: kpiForm.name, formula: kpiForm.formula, source: kpiForm.source, threshold: kpiForm.threshold, unit: "" }]);
                setKpiForm({ name: "", formula: "میانگین", source: "", threshold: "", unit: "" });
              }} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 transition-colors"><Plus className="w-3.5 h-3.5" /><span>افزودن</span></button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">KPIهای تعریف‌شده</h3>
            <table className="w-full">
              <thead><tr className="border-b border-border">{["عملیات", "آستانه", "منبع", "فرمول", "نام"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-3"><button onClick={() => setKpis((s) => s.filter((x) => x.id !== k.id))} className="text-[11px] text-red-600 hover:underline">حذف</button></td>
                    <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{k.threshold}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{k.source}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{k.formula}</td>
                    <td className="py-3 px-3 text-xs font-medium text-foreground text-right">{k.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
