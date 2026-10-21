import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line } from "recharts";

import { ChevronLeft, Calendar, FileText, Truck, Wrench } from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import { Shipment } from "@/entities/document";

interface CompanyDashboardProps {
  shipmentsList: Shipment[];
  requestsList: { id: string; title: string; status: string; date: string; pri: string; priColor: string }[];
  pendingCount: number;
  weeklyTraffic: { d: string; in: number; out: number }[];
  setSelectedShipment: (s: Shipment) => void;
  setPage: (page: string) => void;
}

export default function CompanyDashboard({ shipmentsList, requestsList, pendingCount, weeklyTraffic, setSelectedShipment, setPage }: CompanyDashboardProps) {
  return (
    <>
      {/* Welcome banner */}
      <div className="bg-gradient-to-l from-accent/10 via-card to-card rounded-xl border border-border p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge status="active" />
          <span className="text-sm text-muted-foreground">شهرک صنعتی کاوه</span>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold text-primary">خوش آمدید، شرکت پلاستیک ایران</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/5"><Truck className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="text-base font-bold text-foreground" dir="ltr">۱۲ ورود / ۸ خروج</p>
            <p className="text-xs text-muted-foreground mt-0.5">تردد امروز</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100"><FileText className="w-5 h-5 text-amber-700" /></div>
          <div>
            <p className="text-base font-bold text-amber-800" dir="ltr">{pendingCount} بارنامه</p>
            <p className="text-xs text-amber-700 mt-0.5">بارنامه در انتظار تأیید</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/5"><Calendar className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="text-sm font-bold text-foreground" dir="ltr">۱۴۰۳/۰۴/۱۶ - ۱۰:۳۰</p>
            <p className="text-xs text-muted-foreground mt-0.5">نوبت آینده</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/5"><Wrench className="w-5 h-5 text-primary" /></div>
          <div>
            <p className="text-base font-bold text-foreground" dir="ltr">{requestsList.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">درخواست باز</p>
          </div>
        </div>
      </div>

      {/* 60/40 layout */}
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />ورود</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />خروج</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">تردد ۷ روز گذشته</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyTraffic}>
              <XAxis dataKey="d" tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="in" stroke="#0E7C86" strokeWidth={2} name="ورود" />
              <Line type="monotone" dataKey="out" stroke="#F2A541" strokeWidth={2} name="خروج" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setPage("shipments")} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
              <span>مشاهده همه</span><ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <h3 className="text-sm font-semibold text-foreground">بارنامه‌های اخیر</h3>
          </div>
          <div className="space-y-2.5">
            {shipmentsList.slice(0, 4).map((s) => (
              <div key={s.id} onClick={() => setSelectedShipment(s)} className="p-3 rounded-lg border border-border hover:border-accent/30 cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge status={s.status} />
                  <p className="text-sm font-medium text-foreground text-right">{s.cargoType}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{s.id} · {s.plate}</span>
                  <span className="text-[10px] text-muted-foreground">{s.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
