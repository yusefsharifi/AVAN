import { AlertTriangle, Plus, Search, Wrench, Cpu, Activity, RefreshCw, Power, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/shared/components/feedback";
import { MapLayerExt, MapDeviceExt, StatusKind } from "@/entities/document";
import { MAP_LAYER_DEFS_EXT, genDeviceEvents, MAINTENANCE_SCHEDULE, DEVICE_HEALTH_SCORES, FIRMWARE_UPDATES } from "@/entities/document";

interface DevicesTabProps {
  deviceSearch: string; setDeviceSearch: (s: string) => void;
  deviceStatusFilter: string; setDeviceStatusFilter: (s: string) => void;
  devicesListState: MapDeviceExt[]; setDevicesListState: React.Dispatch<React.SetStateAction<MapDeviceExt[]>>;
  selectedDeviceExt: MapDeviceExt | null; setSelectedDeviceExt: (d: MapDeviceExt | null) => void;
  deviceModalOpen: boolean; setDeviceModalOpen: (o: boolean) => void;
  deviceModalMode: "add" | "edit"; setDeviceModalMode: (m: "add" | "edit") => void;
  deviceForm: { label: string; layer: MapLayerExt; model: string; status: StatusKind };
  setDeviceForm: React.Dispatch<React.SetStateAction<{ label: string; layer: MapLayerExt; model: string; status: StatusKind }>>;
  deviceMapLayers: Record<MapLayerExt, boolean>; setDeviceMapLayers: React.Dispatch<React.SetStateAction<Record<MapLayerExt, boolean>>>;
  filteredDevicesExt: MapDeviceExt[]; offlineDevicesCount: number;
}

export const DevicesTab = ({
  deviceSearch, setDeviceSearch, deviceStatusFilter, setDeviceStatusFilter,
  devicesListState, setDevicesListState, selectedDeviceExt, setSelectedDeviceExt,
  deviceModalOpen, setDeviceModalOpen, deviceModalMode, setDeviceModalMode,
  deviceForm, setDeviceForm, deviceMapLayers, setDeviceMapLayers,
  filteredDevicesExt, offlineDevicesCount,
}: DevicesTabProps) => (
  <div className="space-y-4">
    {offlineDevicesCount > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700">{offlineDevicesCount} دستگاه آفلاین نیاز به بررسی دارند</span>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs font-bold text-red-700">هشدار</span></div>
      </div>
    )}

    <div className="grid gap-4" style={{ gridTemplateColumns: "260px 1fr" }}>
      <div className="bg-card rounded-xl border border-border p-3 space-y-3" style={{ maxHeight: 620 }}>
        <button onClick={() => { setDeviceModalMode("add"); setDeviceForm({ label: "", layer: "cameras", model: "", status: "online" }); setDeviceModalOpen(true); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"><Plus className="w-3.5 h-3.5" /><span>افزودن دستگاه</span></button>
        <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder="جستجو..." className="w-full bg-secondary border border-border rounded-lg py-1.5 pr-2.5 pl-8 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
        <select value={deviceStatusFilter} onChange={(e) => setDeviceStatusFilter(e.target.value)} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent">
          <option value="all">همه وضعیت‌ها</option><option value="online">آنلاین</option><option value="warning">هشدار</option><option value="offline">آفلاین</option></select>
        <div className="flex flex-wrap gap-1.5">{MAP_LAYER_DEFS_EXT.map((l) => (<button key={l.id} onClick={() => setDeviceMapLayers((s) => ({ ...s, [l.id]: !s[l.id] }))} className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${deviceMapLayers[l.id] ? "bg-accent/10 border-accent/40 text-accent" : "border-border text-muted-foreground"}`}>{l.emoji} {l.label}</button>))}</div>
        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 380 }}>
          {filteredDevicesExt.map((d) => (
            <button key={d.id} onClick={() => setSelectedDeviceExt(d)} className={`w-full text-right p-2.5 rounded-lg border transition-colors ${selectedDeviceExt?.id === d.id ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/50"}`}>
              <div className="flex items-center justify-between mb-1"><Badge status={d.status} /><span className="text-xs font-medium text-foreground">{d.label}</span></div>
              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{d.model}</p>
            </button>
          ))}
          {filteredDevicesExt.length === 0 && <p className="text-center py-6 text-xs text-muted-foreground">دستگاهی یافت نشد.</p>}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
        <h3 className="text-sm font-semibold text-foreground text-right mb-3">نقشه مدیریت دستگاه‌ها</h3>
        <div className="relative rounded-lg border border-border overflow-hidden" style={{ background: "#E7EFEC", minHeight: 400 }}>
          <svg viewBox="0 0 600 360" className="w-full h-full" onClick={() => setSelectedDeviceExt(null)}>
            <rect x="20" y="20" width="180" height="110" rx="6" fill="#0E7C86" opacity="0.08" stroke="#0E7C86" strokeOpacity="0.3" />
            <rect x="400" y="20" width="180" height="110" rx="6" fill="#F2A541" opacity="0.10" stroke="#F2A541" strokeOpacity="0.4" />
            <rect x="150" y="150" width="180" height="80" rx="6" fill="#0F2A44" opacity="0.08" stroke="#0F2A44" strokeOpacity="0.3" />
            <rect x="380" y="160" width="150" height="90" rx="6" fill="#94A3B8" opacity="0.12" stroke="#64748B" strokeOpacity="0.3" />
            <rect x="220" y="260" width="200" height="80" rx="6" fill="#0E7C86" opacity="0.06" stroke="#0E7C86" strokeOpacity="0.25" />
            {(Object.keys(deviceMapLayers) as MapLayerExt[]).map((layer) =>
              deviceMapLayers[layer] && devicesListState.filter((d) => d.layer === layer && (!deviceSearch || d.label.includes(deviceSearch)) && (deviceStatusFilter === "all" || d.status === deviceStatusFilter)).map((d) => {
                const color = d.status === "online" ? "#0E7C86" : d.status === "warning" ? "#F2A541" : "#DC2626";
                const emoji = MAP_LAYER_DEFS_EXT.find((l) => l.id === layer)?.emoji ?? "•";
                return (
                  <g key={d.id} transform={`translate(${d.x},${d.y})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedDeviceExt(d); }}>
                    {d.status === "offline" && (<circle r="11" fill={color} opacity="0.3"><animate attributeName="r" values="11;18;11" dur="1.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0;0.4" dur="1.4s" repeatCount="indefinite" /></circle>)}
                    <circle r="10" fill="#fff" stroke={color} strokeWidth="2.5" /><text textAnchor="middle" dy="4" fontSize="11">{emoji}</text>
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>
    </div>

    {/* Preventive Maintenance Scheduler */}
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-foreground">برنامه نگهداری پیشگیرانه</h3><Wrench className="w-4 h-4 text-accent" /></div>
      <table className="w-full">
        <thead><tr className="border-b border-border">{["وضعیت", "اولویت", "تاریخ بعدی", "نوع سرویس", "دستگاه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {MAINTENANCE_SCHEDULE.map((m) => (
            <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
              <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.status === "overdue" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{m.status === "overdue" ? "عقب‌افتاده" : "برنامه‌ریزی‌شده"}</span></td>
              <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.priority === "high" ? "bg-red-50 text-red-700" : m.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{m.priority === "high" ? "بالا" : m.priority === "medium" ? "متوسط" : "پایین"}</span></td>
              <td className="py-3 px-3 text-xs text-muted-foreground">{m.nextDate}</td>
              <td className="py-3 px-3 text-xs text-foreground text-right">{m.type}</td>
              <td className="py-3 px-3 text-xs font-medium text-foreground text-right">{m.device}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Device Health Scores */}
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-foreground">امتیاز سلامت دستگاه‌ها</h3><Activity className="w-4 h-4 text-accent" /></div>
      <div className="grid grid-cols-2 gap-3">
        {DEVICE_HEALTH_SCORES.map((d) => (
          <div key={d.id} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground font-medium">{d.name}</span>
              <div className="flex items-center gap-1.5">
                {d.issues > 0 && <span className="text-[10px] text-red-600">{d.issues} مشکل</span>}
                <span className={`text-sm font-bold ${d.score >= 80 ? "text-emerald-600" : d.score >= 50 ? "text-amber-600" : "text-red-600"}`} dir="ltr">{d.score}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full"><div className={`h-2 rounded-full ${d.score >= 80 ? "bg-emerald-500" : d.score >= 50 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${d.score}%` }} /></div>
          </div>
        ))}
      </div>
    </div>

    {/* Firmware Update Panel */}
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-foreground">به‌روزرسانی فریمور</h3><Cpu className="w-4 h-4 text-accent" /></div>
      <table className="w-full">
        <thead><tr className="border-b border-border">{["وضعیت", "تاریخ انتشار", "آخرین نسخه", "نسخه فعلی", "نوع دستگاه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {FIRMWARE_UPDATES.map((f, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
              <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${f.status === "available" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{f.status === "available" ? "موجود" : "به‌روز"}</span></td>
              <td className="py-3 px-3 text-xs text-muted-foreground">{f.date}</td>
              <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{f.latest}</td>
              <td className="py-3 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{f.current}</td>
              <td className="py-3 px-3 text-xs font-medium text-foreground text-right">{f.device}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Connectivity Map */}
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-foreground">نقشه اتصال</h3></div>
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-emerald-50 rounded-lg p-3 text-center"><Wifi className="w-5 h-5 text-emerald-600 mx-auto mb-1" /><p className="text-lg font-bold text-emerald-700" dir="ltr">{devicesListState.filter((d) => d.status === "online").length}</p><p className="text-[10px] text-emerald-600">آنلاین</p></div>
        <div className="bg-amber-50 rounded-lg p-3 text-center"><AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" /><p className="text-lg font-bold text-amber-700" dir="ltr">{devicesListState.filter((d) => d.status === "warning").length}</p><p className="text-[10px] text-amber-600">هشدار</p></div>
        <div className="bg-red-50 rounded-lg p-3 text-center"><WifiOff className="w-5 h-5 text-red-600 mx-auto mb-1" /><p className="text-lg font-bold text-red-700" dir="ltr">{devicesListState.filter((d) => d.status === "offline").length}</p><p className="text-[10px] text-red-600">آفلاین</p></div>
        <div className="bg-secondary rounded-lg p-3 text-center"><Activity className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-lg font-bold text-foreground" dir="ltr">{devicesListState.length}</p><p className="text-[10px] text-muted-foreground">مجموع</p></div>
      </div>
    </div>
  </div>
);
