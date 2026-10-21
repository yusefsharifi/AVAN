import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from "recharts";
import { trafficHourly, vehicleTypeDist, COMPANIES } from "@/entities/document";
import { Clock, TrendingUp, Truck } from "lucide-react";

const topCompanies = [...COMPANIES].sort((a, b) => b.monthTraffic - a.monthTraffic).slice(0, 5);

export default function TrafficAnalytics() {
  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "میانگین انتظار", value: "۴.۲ دقیقه", Icon: Clock },
          { label: "تردد امروز", value: "۲۴۵", Icon: TrendingUp },
          { label: "خودرو فعال", value: "۱۸", Icon: Truck },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/10 p-3 text-center" style={{ background: "#0F1C2E" }}>
            <kpi.Icon className="w-5 h-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-white font-mono" dir="ltr">{kpi.value}</p>
            <p className="text-[10px] text-blue-300 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <p className="text-sm font-bold text-white text-right mb-3">ورودی و خروجی به تفکیک ساعت</p>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trafficHourly} barGap={2}>
              <XAxis dataKey="t" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0F1C2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="in" name="ورودی" fill="#10B981" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar dataKey="out" name="خروجی" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500" />ورودی</span>
          <span className="flex items-center gap-1.5 text-[10px] text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500" />خروجی</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <p className="text-sm font-bold text-white text-right mb-3">ترکیب نوع خودرو</p>
        <div className="flex items-center gap-4">
          <div style={{ width: 140, height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={vehicleTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                  {vehicleTypeDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {vehicleTypeDist.map((v) => (
              <div key={v.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                  <span className="text-[10px] text-white/80">{v.name}</span>
                </div>
                <span className="text-[10px] text-blue-300 font-mono" dir="ltr">{v.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
        <p className="text-sm font-bold text-white text-right mb-3">پرترددترین شرکت‌ها</p>
        <div className="space-y-2">
          {topCompanies.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono w-4 text-center">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white">{c.nameFa}</span>
                  <span className="text-[10px] text-blue-300 font-mono" dir="ltr">{c.monthTraffic}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.monthTraffic / topCompanies[0].monthTraffic) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
