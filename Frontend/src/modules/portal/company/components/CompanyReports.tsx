import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from "recharts";

import { Download, HardHat, FileText, Truck, Wrench } from "lucide-react";

import { Shipment, Contractor } from "@/entities/document";
import { FINANCE_REPORTS } from "@/entities/document";

interface CompanyReportsProps {
  shipmentsList: Shipment[];
  contractorsList: Contractor[];
  requestsList: { id: string; title: string; status: string; date: string; pri: string; priColor: string }[];
}

export default function CompanyReports({ shipmentsList, contractorsList, requestsList }: CompanyReportsProps) {
  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold text-foreground text-right">گزارش‌های شرکت</h1>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "تردد این ماه", value: "۴۸۲", Icon: Truck, color: "text-primary" },
          { label: "بارنامه صادر شده", value: shipmentsList.length.toString(), Icon: FileText, color: "text-accent" },
          { label: "پیمانکار فعال", value: contractorsList.filter(c => c.status === "active").length.toString(), Icon: HardHat, color: "text-emerald-600" },
          { label: "درخواست خدمات باز", value: requestsList.length.toString(), Icon: Wrench, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
            <s.Icon className={`w-4 h-4 ${s.color} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`} dir="ltr">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-4">ترافیک ماهانه</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={[
            { m: "فروردین", v: 340 }, { m: "اردیبهشت", v: 420 }, { m: "خرداد", v: 390 },
            { m: "تیر", v: 482 },
          ]}>
            <defs>
              <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0E7C86" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0E7C86" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="v" stroke="#0E7C86" fill="url(#trafficGrad)" strokeWidth={2} name="تردد" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /><span>دانلود گزارش</span>
          </button>
          <h3 className="text-sm font-semibold text-foreground">گزارش‌های آماده</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FINANCE_REPORTS.map((r) => (
            <div key={r.title} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <button className="text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1 flex-shrink-0">
                <Download className="w-3 h-3" /><span>دانلود</span>
              </button>
              <div className="text-right flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{r.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
