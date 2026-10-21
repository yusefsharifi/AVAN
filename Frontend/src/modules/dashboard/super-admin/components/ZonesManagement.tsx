import { MoreHorizontal, Edit2, LogIn, Power, Settings } from "lucide-react";
import { Badge } from "@/shared/components/feedback";
import { Zone } from "@/entities/document";

interface ZonesManagementProps {
  zonesList: Zone[];
  openZoneMenu: string | null;
  setOpenZoneMenu: (id: string | null) => void;
  toggleSuspend: (id: string) => void;
  selectedZone: Zone | null;
  setSelectedZone: (z: Zone | null) => void;
  setPage: (p: string) => void;
}

export const ZonesManagement = ({
  zonesList, openZoneMenu, setOpenZoneMenu, toggleSuspend, selectedZone, setSelectedZone, setPage,
}: ZonesManagementProps) => (
  <>
    <div className="flex items-center justify-between">
      <h1 className="text-sm font-semibold text-foreground">مدیریت شهرک‌های صنعتی — سراسر ایران</h1>
    </div>
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["عملیات", "وضعیت", "ترافیک ماهانه", "طرح", "دستگاه‌ها", "شرکت‌ها", "شهر", "استان", "نام شهرک"].map((h) => (
              <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground select-none">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zonesList.map((z) => (
            <tr key={z.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/40 ${z.status === "critical" ? "bg-red-50/40" : ""}`}>
              <td className="py-3 px-3">
                <div className="relative">
                  <button onClick={() => setOpenZoneMenu(openZoneMenu === z.id ? null : z.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openZoneMenu === z.id && (
                    <div className="absolute top-8 right-0 z-20 bg-card border border-border rounded-lg shadow-lg w-52 py-1">
                      <button onClick={() => { setSelectedZone(z); setOpenZoneMenu(null); }} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>مدیریت</span><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedZone(z); setOpenZoneMenu(null); }} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>ورود به‌عنوان ادمین</span><LogIn className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { toggleSuspend(z.id); setOpenZoneMenu(null); }} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>{z.status === "suspended" ? "فعال‌سازی مجدد" : "تعلیق شهرک"}</span><Power className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setSelectedZone(z); setOpenZoneMenu(null); }} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>تنظیمات</span><Settings className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </td>
              <td className="py-3 px-3"><Badge status={z.status} /></td>
              <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{z.monthlyTraffic.toLocaleString()}</td>
              <td className="py-3 px-3"><span className="text-[11px] px-2 py-1 rounded-full bg-secondary text-foreground font-medium">{z.plan}</span></td>
              <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{z.online}/{z.devices}</td>
              <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{z.companies.toLocaleString()}</td>
              <td className="py-3 px-3 text-sm text-muted-foreground">{z.cityFa}</td>
              <td className="py-3 px-3 text-sm text-muted-foreground">{z.provinceFa}</td>
              <td className="py-3 px-3"><p className="text-sm font-semibold text-foreground">{z.nameFa}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);
