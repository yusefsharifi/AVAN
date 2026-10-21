import { TrendingUp, TrendingDown, Activity, Truck, Clock, AlertTriangle, CreditCard, Map, FileCheck, Zap, Factory, Gauge, ShoppingBag } from "lucide-react";
import { ResponsiveContainer, BarChart, ComposedChart, PieChart, Pie, XAxis, YAxis, Tooltip, Bar, Line, Cell, Area } from "recharts";
import { LiveDot } from "@/shared/components/feedback";
import { CapacityGauge } from "./CapacityGauge";
import { trafficHourly, vehicleTypeDist, dockUtilization, SLA_COMPLIANCE, ENERGY_CONSUMPTION_KPI, REVENUE_FORECAST } from "@/entities/document";
import { useProductionStore } from "@/modules/production";
import { useProcurementStore } from "@/modules/procurement";

interface OverviewTabProps {
  gisMap: React.ReactNode;
  liveFeed: React.ReactNode;
}

const topPendingApprovals = [
  { company: "شرکت پلاستیک ایران", label: "درخواست تردد کامیون مواد اولیه" },
  { company: "صنایع فولاد البرز", label: "افزایش سقف تردد روزانه" },
  { company: "پتروشیمی پارس", label: "درخواست نصب تابلوی تبلیغاتی" },
  { company: "سرامیک شیراز", label: "تمدید مجوز فعالیت بلوک" },
  { company: "قطعات خودرو تبریز", label: "درخواست تردد شبانه" },
];

export const OverviewTab = ({ gisMap, liveFeed }: OverviewTabProps) => {
  // READ-ONLY: zone manager only observes production status, never mutates it.
  const { productionLines, workOrders } = useProductionStore();
  const linesRunning = productionLines.filter((l) => l.currentStatus === "running").length;
  const activeWOs = workOrders.filter((w) => w.status === "in_progress").length;
  const overallOEE = productionLines.length ? Math.round(productionLines.reduce((s, l) => s + l.oee, 0) / productionLines.length) : 0;

  // READ-ONLY: zone manager only observes procurement totals, never mutates them.
  // Note: procurement data is currently company-wide (not split per zone/company),
  // since the module doesn't yet scope purchase orders by industrial-park zone.
  const { getProcurementStats } = useProcurementStore();
  const procurementStats = getProcurementStats();

  return (
  <>
    {/* 8 KPI cards + occupancy ring */}
    <div className="grid grid-cols-4 gap-3">
      {/* Existing: Daily traffic */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3 h-3" /><span className="text-[11px] font-medium">+۸.۳٪</span></div>
          <div className="p-1.5 rounded-lg bg-primary/5"><Activity className="w-4 h-4 text-primary" /></div>
        </div>
        <div>
          <span className="text-xl font-bold text-foreground" dir="ltr">۱,۲۴۷</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">تردد امروز</p>
        </div>
      </div>

      {/* Existing: Trucks in compound */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <LiveDot />
          <div className="p-1.5 rounded-lg bg-accent/10"><Truck className="w-4 h-4 text-accent" /></div>
        </div>
        <div>
          <span className="text-xl font-bold text-foreground" dir="ltr">۹</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">کامیون در محوطه</p>
        </div>
      </div>

      {/* Existing: Parking capacity */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
        <CapacityGauge pct={84} size={48} />
        <div>
          <p className="text-[11px] text-muted-foreground leading-tight">ظرفیت پارکینگ</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">۲۱۰ / ۲۵۰ جای پارک</p>
        </div>
      </div>

      {/* Existing: Open requests */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="p-1.5 rounded-lg bg-amber-50"><Clock className="w-4 h-4 text-amber-600" /></div>
          <span className="text-xl font-bold text-foreground" dir="ltr">۱۴</span>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">درخواست باز</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-red-600 font-medium">۳ فوری</span>
            <span className="text-[10px] text-muted-foreground">۱۱ عادی</span>
          </div>
        </div>
      </div>

      {/* Existing: Security alerts */}
      <div className={`rounded-xl p-4 border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2 ${2 > 0 ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-red-700" dir="ltr">۲</span>
          <div className="p-1.5 rounded-lg bg-red-100"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
        </div>
        <p className="text-[11px] text-red-700 font-medium">هشدارهای امنیتی</p>
      </div>

      {/* Existing: Today's revenue */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3 h-3" /><span className="text-[11px] font-medium">+۵.۲٪</span></div>
          <div className="p-1.5 rounded-lg bg-primary/5"><CreditCard className="w-4 h-4 text-primary" /></div>
        </div>
        <div>
          <span className="text-base font-bold text-foreground" dir="ltr">۴۲۰,۰۰۰,۰۰۰</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">درآمد امروز (تومان)</p>
        </div>
      </div>

      {/* NEW: Occupancy ring gauge */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
        <CapacityGauge pct={89} size={52} />
        <div>
          <p className="text-[11px] text-muted-foreground leading-tight">نرخ اشغال</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">۸۹٪</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">فضای فعال</p>
        </div>
      </div>

      {/* NEW: SLA compliance KPI */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
        <div className="relative w-[52px] h-[52px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#E2EAF0" strokeWidth="4" />
            <circle cx="26" cy="26" r="22" fill="none" stroke="#22C55E" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 22 * (SLA_COMPLIANCE.overall / 100)} ${2 * Math.PI * 22}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground" dir="ltr">{SLA_COMPLIANCE.overall}%</span>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground leading-tight">رضایت SLA</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">۹۴.۲٪</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">بالای هدف</p>
        </div>
      </div>

      {/* NEW: Energy consumption KPI */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-600"><span className="text-[11px] font-medium">+۳.۱٪</span></div>
          <div className="p-1.5 rounded-lg bg-amber-50"><Zap className="w-4 h-4 text-amber-600" /></div>
        </div>
        <div>
          <span className="text-base font-bold text-foreground" dir="ltr">۲۶۲,۶۰۰</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">مصرف انرژی (کیلووات‌ساعت)</p>
        </div>
      </div>
    </div>

    {/* Main: map + feed */}
    <div className="grid grid-cols-3 gap-5" style={{ minHeight: 420 }}>
      <div className="col-span-2 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Map className="w-3.5 h-3.5 text-accent" /><span>لحظه‌ای</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">نقشه GIS شهرک صنعتی</h3>
        </div>
        {gisMap}
      </div>
      {liveFeed}
    </div>

    {/* Bottom: Revenue forecast + 3 charts */}
    <div className="grid grid-cols-2 gap-5">
      {/* NEW: Revenue forecast widget */}
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-3">پیش‌بینی درآمد</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={REVENUE_FORECAST}>
            <XAxis dataKey="month" tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="actual" fill="#0E7C86" radius={[3, 3, 0, 0]} name="واقعی" />
            <Line type="monotone" dataKey="forecast" stroke="#F2A541" strokeWidth={2} strokeDasharray="5 5" dot={false} name="پیش‌بینی" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* NEW: Top-5 pending approvals */}
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">۵ درخواست در انتظار تأیید</h3>
          <div className="p-1.5 rounded-lg bg-amber-50"><FileCheck className="w-4 h-4 text-amber-600" /></div>
        </div>
        <div className="space-y-2.5">
          {topPendingApprovals.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-foreground">{item.company}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] text-muted-foreground">در انتظار</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Existing: 3 charts */}
    <div className="grid grid-cols-3 gap-5">
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-3">ترافیک ساعتی امروز</h3>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={trafficHourly}>
            <XAxis dataKey="t" tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="in" fill="#0E7C86" radius={[3, 3, 0, 0]} name="ورود" />
            <Bar dataKey="out" fill="#F2A541" radius={[3, 3, 0, 0]} name="خروج" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-3">ترکیب انواع خودرو</h3>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={vehicleTypeDist} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
              {vehicleTypeDist.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-2">
          {vehicleTypeDist.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">{d.value}٪</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{d.name}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-4">اشغال دوک‌های بارگیری</h3>
        <div className="space-y-3.5">
          {dockUtilization.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-foreground" dir="ltr">{d.pct}٪</span>
                <span className="text-[11px] text-muted-foreground">{d.name}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full">
                <div className={`h-2 rounded-full ${d.pct >= 90 ? "bg-red-500" : d.pct >= 75 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="p-1.5 rounded-lg bg-accent/10"><Factory className="w-4 h-4 text-accent" /></div>
          <h3 className="text-sm font-semibold text-foreground">وضعیت تولید (فقط نمایش)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground" dir="ltr">{linesRunning}/{productionLines.length}</span>
            <span className="text-[11px] text-muted-foreground">خطوط در حال کار</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground" dir="ltr">{activeWOs}</span>
            <span className="text-[11px] text-muted-foreground">دستور کار در حال اجرا</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1" dir="ltr"><Gauge className="w-3 h-3" />{overallOEE}٪</span>
              <span className="text-[11px] text-muted-foreground">OEE میانگین</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full">
              <div className={`h-2 rounded-full ${overallOEE >= 85 ? "bg-emerald-500" : overallOEE >= 70 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${overallOEE}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="p-1.5 rounded-lg bg-accent/10"><ShoppingBag className="w-4 h-4 text-accent" /></div>
          <h3 className="text-sm font-semibold text-foreground">وضعیت خرید (فقط نمایش)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(procurementStats.totalPOValueThisMonth)}</span>
            <span className="text-[11px] text-muted-foreground">ارزش خرید این ماه (ریال)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground" dir="ltr">{procurementStats.pendingReceipts}</span>
            <span className="text-[11px] text-muted-foreground">PO در انتظار دریافت</span>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">داده‌ها در سطح کل شرکت است؛ تفکیک بر اساس منطقه هنوز پیاده‌سازی نشده.</p>
        </div>
      </div>
    </div>
  </>
  );
};
