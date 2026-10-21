import { useState, useMemo, Suspense } from "react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";
import { Globe, Building2, Activity, Wifi, CreditCard, MapPin, Calendar, AlertTriangle, ChevronUp, ChevronDown, Info } from "lucide-react";
import { LiveDot } from "@/shared/components/feedback";
import { Badge } from "@/shared/components/feedback";
import { Zone, StatusKind } from "@/entities/document";
import { PROVINCES, SUBSCRIPTION_PLANS, IRAN_OUTLINE, zoneScores, ZONES } from "@/entities/document";



const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";

interface NationalOverviewProps {
  selectedProvinces: string[];
  setSelectedProvinces: React.Dispatch<React.SetStateAction<string[]>>;
  statusFilter: "all" | "active" | "warning" | "issue";
  setStatusFilter: (f: "all" | "active" | "warning" | "issue") => void;
  planFilter: string;
  setPlanFilter: (f: string) => void;
  dateRange: string;
  setDateRange: (r: string) => void;
  hoveredZoneId: string | null;
  setHoveredZoneId: (id: string | null) => void;
  selectedZone: Zone | null;
  setSelectedZone: (z: Zone | null) => void;
  zonesList: Zone[];
}

type SortKey = "nameFa" | "companies" | "occupancy" | "devices" | "online" | "monthlyTraffic" | "status";
type SortDir = "asc" | "desc";

const provinceKPIMap: Record<string, { zones: number; companies: number; revenue: number; uptime: number }> = {
  "مرکزی": { zones: 18, companies: 1240, revenue: 8.2, uptime: 97.1 },
  "البرز": { zones: 12, companies: 580, revenue: 5.8, uptime: 95.4 },
  "تهران": { zones: 22, companies: 1890, revenue: 12.4, uptime: 98.2 },
  "اصفهان": { zones: 16, companies: 920, revenue: 6.9, uptime: 96.8 },
  "خراسان رضوی": { zones: 14, companies: 710, revenue: 5.1, uptime: 94.3 },
  "فارس": { zones: 11, companies: 530, revenue: 4.2, uptime: 97.5 },
  "خوزستان": { zones: 15, companies: 680, revenue: 5.6, uptime: 96.1 },
  "آذربایجان شرقی": { zones: 16, companies: 1882, revenue: 7.3, uptime: 97.8 },
};

const nationalAlerts = [
  { id: "a1", msg: "شهرک بینالود: ۳۸٪ دستگاه‌های IoT آفلاین — خرابی زیرساخت شبکه", level: "critical" as StatusKind, time: "۱۲ دقیقه پیش" },
  { id: "a2", msg: "شهرک شمس‌آباد: قطع موقت برق — ناحیه C بلوک ۷", level: "warning" as StatusKind, time: "۴۵ دقیقه پیش" },
  { id: "a3", msg: "شهرک اشتهارد: ترافیک غیرعادی در دروازه اضطراری شمالی", level: "warning" as StatusKind, time: "۱ ساعت پیش" },
  { id: "a4", msg: "سرویس Kafka: قطع کامل — تأخیر مصرف‌کننده بیش از حد مجاز", level: "critical" as StatusKind, time: "۵ دقیقه پیش" },
  { id: "a5", msg: "شهرک مبارکه: کالیبراسیون باسکول شماره ۳ به تأخیر افتاد", level: "warning" as StatusKind, time: "۳ ساعت پیش" },
];

export default function NationalOverview({
  selectedProvinces, setSelectedProvinces, statusFilter, setStatusFilter,
  planFilter, setPlanFilter, dateRange, setDateRange,
  hoveredZoneId, setHoveredZoneId, selectedZone, setSelectedZone, zonesList,
}: NationalOverviewProps) {
  const [alertIdx, setAlertIdx] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("nameFa");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const dotColor = (status: StatusKind) =>
    status === "operational" ? "#10B981" : status === "partial" ? "#F59E0B" : status === "critical" ? "#EF4444" : "#94A3B8";

  const statusMatches = (z: Zone) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return z.status === "operational";
    if (statusFilter === "warning") return z.status === "partial";
    if (statusFilter === "issue") return z.status === "critical";
    return true;
  };

  const visibleZones = zonesList.filter((z) =>
    (selectedProvinces.length === 0 || selectedProvinces.includes(z.provinceFa)) &&
    statusMatches(z) &&
    (planFilter === "all" || z.plan === planFilter)
  );

  const toggleProvince = (p: string) =>
    setSelectedProvinces((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const clearFilters = () => { setSelectedProvinces([]); setStatusFilter("all"); setPlanFilter("all"); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedZones = useMemo(() => {
    const arr = [...visibleZones];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv), "fa") : String(bv).localeCompare(String(av), "fa");
    });
    return arr;
  }, [visibleZones, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <Info className="w-3 h-3 text-muted-foreground/40" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />;
  };

  return (
    <div className="space-y-5">
      {/* National Alert Ribbon Ticker */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center">
          <div className={`px-3 py-2.5 flex-shrink-0 ${nationalAlerts[alertIdx].level === "critical" ? "bg-red-500" : "bg-amber-500"}`}>
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 overflow-hidden px-4 py-2.5 relative">
            <div className="flex items-center gap-3 animate-[slideAlert_20s_linear_infinite]">
              {[...nationalAlerts, ...nationalAlerts].map((a, i) => (
                <span key={i} className="whitespace-nowrap text-xs text-foreground flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.level === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                  {a.msg}
                  <span className="text-muted-foreground text-[10px] font-mono" dir="ltr">{a.time}</span>
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setAlertIdx(i => (i + 1) % nationalAlerts.length)} className="px-3 py-2.5 text-muted-foreground hover:bg-secondary transition-colors flex-shrink-0 border-r border-border">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "220px 1fr" }}>
        <div className="bg-card rounded-xl border border-border p-4 space-y-4 self-start">
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 text-right flex items-center gap-1.5 justify-end">
              <span>استان</span><MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            </p>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {PROVINCES.map((p) => (
                <button key={p} onClick={() => toggleProvince(p)}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${selectedProvinces.includes(p) ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground mb-2 text-right">وضعیت</p>
            <div className="space-y-1">
              {([
                { id: "all", label: "همه" }, { id: "active", label: "فعال" },
                { id: "warning", label: "هشدار" }, { id: "issue", label: "دارای مشکل" },
              ] as const).map((s) => (
                <button key={s.id} onClick={() => setStatusFilter(s.id)}
                  className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs transition-colors ${statusFilter === s.id ? "bg-primary text-white font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground mb-2 text-right">طرح اشتراک</p>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className={inputCls}>
              <option value="all">همه طرح‌ها</option>
              {SUBSCRIPTION_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground mb-2 text-right flex items-center gap-1.5 justify-end">
              <span>بازه زمانی</span><Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            </p>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputCls}>
              <option value="today">امروز</option>
              <option value="week">این هفته</option>
              <option value="month">این ماه</option>
              <option value="quarter">سه ماه اخیر</option>
            </select>
          </div>
          {(selectedProvinces.length > 0 || statusFilter !== "all" || planFilter !== "all") && (
            <button onClick={clearFilters} className="w-full text-[11px] text-accent hover:underline text-center pt-1">
              پاک‌کردن فیلترها
            </button>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground">{visibleZones.length} از {zonesList.length} شهرک نمایش داده می‌شود</span>
              <h3 className="text-sm font-semibold text-foreground">نقشه شهرک‌های صنعتی کشور</h3>
            </div>
            <div className="relative rounded-lg overflow-hidden" style={{ height: 500, background: "#0F2A44" }}>
              <svg viewBox="0 0 460 420" className="w-full h-full">
                <path d={IRAN_OUTLINE} fill="#15406A" stroke="#3B6E99" strokeWidth="2" />
                {visibleZones.map((z) => {
                  const color = dotColor(z.status);
                  return (
                    <g key={z.id} transform={`translate(${z.mapX},${z.mapY})`} className="cursor-pointer"
                      onMouseEnter={() => setHoveredZoneId(z.id)} onMouseLeave={() => setHoveredZoneId(null)}
                      onClick={() => setSelectedZone(z)}>
                      <circle r="10" fill={color} opacity="0.25">
                        <animate attributeName="r" values="10;17;10" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <circle r="6" fill={color} stroke="#fff" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>

              {/* Province-level KPI tooltip on map */}
              {hoveredProvince && provinceKPIMap[hoveredProvince] && (() => {
                const kpi = provinceKPIMap[hoveredProvince];
                return (
                  <div className="absolute bg-card rounded-lg shadow-lg border border-border px-3 py-2.5 text-right pointer-events-none z-10 w-48"
                    style={{ left: "50%", top: "50%", transform: "translate(-50%, -125%)" }}>
                    <p className="text-xs font-bold text-foreground mb-2">{hoveredProvince}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-secondary/40 rounded p-1.5 text-center">
                        <p className="font-bold text-foreground">{kpi.zones}</p>
                        <p className="text-muted-foreground">شهرک</p>
                      </div>
                      <div className="bg-secondary/40 rounded p-1.5 text-center">
                        <p className="font-bold text-foreground">{kpi.companies.toLocaleString()}</p>
                        <p className="text-muted-foreground">شرکت</p>
                      </div>
                      <div className="bg-secondary/40 rounded p-1.5 text-center">
                        <p className="font-bold text-foreground" dir="ltr">{kpi.revenue}B</p>
                        <p className="text-muted-foreground">درآمد</p>
                      </div>
                      <div className="bg-secondary/40 rounded p-1.5 text-center">
                        <p className="font-bold text-emerald-600">{kpi.uptime}%</p>
                        <p className="text-muted-foreground">آپتایم</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {hoveredZoneId && (() => {
                const z = zonesList.find((zz) => zz.id === hoveredZoneId);
                if (!z) return null;
                return (
                  <div className="absolute bg-card rounded-lg shadow-lg border border-border px-3 py-2 text-right pointer-events-none z-10 w-44"
                    style={{ left: `${(z.mapX / 460) * 100}%`, top: `${(z.mapY / 420) * 100}%`, transform: "translate(-50%, -125%)" }}>
                    <p className="text-xs font-bold text-foreground">{z.nameFa}</p>
                    <p className="text-[10px] text-muted-foreground">{z.cityFa} · {z.provinceFa}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-foreground font-mono" dir="ltr">{Math.round(z.monthlyTraffic / 30)}</span>
                      <span className="text-[10px] text-muted-foreground">تردد امروز</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-foreground font-mono" dir="ltr">{z.companies}</span>
                      <span className="text-[10px] text-muted-foreground">شرکت فعال</span>
                    </div>
                  </div>
                );
              })()}

              <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />سالم</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />هشدار</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />مشکل</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />آفلاین</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 text-center">
              <Globe className="w-4 h-4 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground" dir="ltr">۱۲۴</p>
              <p className="text-[11px] text-muted-foreground mt-1">کل شهرک‌ها</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 text-center">
              <Building2 className="w-4 h-4 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground" dir="ltr">۸,۴۳۲</p>
              <p className="text-[11px] text-muted-foreground mt-1">شرکت‌ها</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 text-center">
              <Activity className="w-4 h-4 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground" dir="ltr">۲۴,۱۲۱</p>
              <p className="text-[11px] text-muted-foreground mt-1">تردد امروز</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 text-center">
              <Wifi className="w-4 h-4 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground" dir="ltr">۹۶.۲٪</p>
              <p className="text-[11px] text-muted-foreground mt-1">آنلاین</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 text-center">
              <CreditCard className="w-4 h-4 text-accent mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground" dir="ltr">۴۸.۲ میلیارد</p>
              <p className="text-[11px] text-muted-foreground mt-1">درآمد ماه</p>
            </div>
          </div>

          {/* Zone Comparison Table with Sortable Columns */}
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{sortedZones.length} شهرک</span>
              <h3 className="text-sm font-semibold text-foreground">مقایسه شهرک‌ها</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {[
                      { key: "status" as SortKey, label: "وضعیت" },
                      { key: "monthlyTraffic" as SortKey, label: "ترافیک ماهانه" },
                      { key: "online" as SortKey, label: "آنلاین" },
                      { key: "devices" as SortKey, label: "دستگاه‌ها" },
                      { key: "occupancy" as SortKey, label: "اشغال" },
                      { key: "companies" as SortKey, label: "شرکت‌ها" },
                      { key: "nameFa" as SortKey, label: "نام شهرک" },
                    ].map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)} className="text-right py-3 px-3 text-xs font-semibold text-foreground cursor-pointer hover:bg-secondary/50 transition-colors select-none">
                        <span className="flex items-center gap-1 justify-end">{label}<SortIcon col={key} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedZones.map(z => (
                    <tr key={z.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedZone(z)}>
                      <td className="py-3 px-3">
                        <Badge status={z.status} />
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{z.monthlyTraffic.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{z.online}/{z.devices}</td>
                      <td className="py-3 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{z.devices}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${z.occupancy}%`, background: z.occupancy > 80 ? "#EF4444" : z.occupancy > 60 ? "#F59E0B" : "#10B981" }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground" dir="ltr">{z.occupancy}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{z.companies}</td>
                      <td className="py-3 px-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{z.nameFa}</p>
                          <p className="text-[10px] text-muted-foreground">{z.cityFa} · {z.provinceFa}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-accent" />عملیاتی ≥80</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />جزئی ≥60</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />بحرانی &lt;60</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">امتیاز عملیاتی شهرک‌ها</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={zoneScores} layout="vertical" barSize={20}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} name="امتیاز">
                    {zoneScores.map((d, i) => (
                      <Cell key={i} fill={d.score >= 80 ? "#0E7C86" : d.score >= 60 ? "#F2A541" : "#DC2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold flex-shrink-0">۳</div>
                <h3 className="text-sm font-semibold text-foreground">هشدارهای فعال</h3>
              </div>
              <div className="space-y-3">
                {nationalAlerts.slice(0, 3).map((a) => (
                  <div key={a.id} className={`p-3 rounded-xl border ${a.level === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50/70"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <LiveDot color={a.level === "critical" ? "bg-red-500" : "bg-amber-500"} />
                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{a.time}</span>
                    </div>
                    <p className={`text-xs leading-relaxed text-right ${a.level === "critical" ? "text-red-700" : "text-amber-700"}`}>{a.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
