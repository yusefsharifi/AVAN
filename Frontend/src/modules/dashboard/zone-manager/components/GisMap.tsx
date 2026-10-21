import { Badge } from "@/shared/components/feedback";
import { MapLayer, MapDevice, StatusKind } from "@/entities/document";
import { MAP_LAYER_DEFS, MAP_DEVICES, TRUCK_PATHS } from "@/entities/document";
import { X } from "lucide-react";

interface GisMapProps {
  mapLayers: Record<MapLayer, boolean>;
  setMapLayers: React.Dispatch<React.SetStateAction<Record<MapLayer, boolean>>>;
  selectedDevice: MapDevice | null;
  setSelectedDevice: (d: MapDevice | null) => void;
  truckStep: number;
}

export const GisMap = ({ mapLayers, setMapLayers, selectedDevice, setSelectedDevice, truckStep }: GisMapProps) => (
  <div className="flex gap-3 h-full">
    <div className="w-32 flex-shrink-0 space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium mb-1 px-1">لایه‌ها</p>
      {MAP_LAYER_DEFS.map(({ id, label, Icon }) => (
        <button key={id}
          onClick={() => setMapLayers((s) => ({ ...s, [id]: !s[id] }))}
          className={`w-full flex items-center gap-2 justify-end px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
            mapLayers[id] ? "bg-accent/10 border-accent/30 text-accent" : "bg-secondary/40 border-border text-muted-foreground"
          }`}>
          <span>{label}</span>
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      ))}
    </div>

    <div className="relative flex-1 rounded-lg border border-border overflow-hidden" style={{ background: "#E7EFEC", minHeight: 340 }}>
      <svg viewBox="0 0 600 360" className="w-full h-full" onClick={() => setSelectedDevice(null)}>
        {/* Zone regions */}
        <rect x="20" y="20" width="180" height="110" rx="6" fill="#0E7C86" opacity="0.12" stroke="#0E7C86" strokeOpacity="0.4" />
        <text x="110" y="45" textAnchor="middle" fontSize="11" fill="#0E7C86" fontWeight="600">دروازه ورودی</text>

        <rect x="400" y="20" width="180" height="110" rx="6" fill="#F2A541" opacity="0.14" stroke="#F2A541" strokeOpacity="0.5" />
        <text x="490" y="45" textAnchor="middle" fontSize="11" fill="#B4761F" fontWeight="600">دروازه اضطراری</text>

        <rect x="150" y="150" width="180" height="80" rx="6" fill="#0F2A44" opacity="0.10" stroke="#0F2A44" strokeOpacity="0.35" />
        <text x="240" y="175" textAnchor="middle" fontSize="11" fill="#0F2A44" fontWeight="600">دوک‌های بارگیری</text>

        <rect x="380" y="160" width="150" height="90" rx="6" fill="#94A3B8" opacity="0.16" stroke="#64748B" strokeOpacity="0.4" />
        <text x="455" y="185" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">تأسیسات و برق</text>

        <rect x="220" y="260" width="200" height="80" rx="6" fill="#0E7C86" opacity="0.08" stroke="#0E7C86" strokeOpacity="0.3" />
        <text x="320" y="285" textAnchor="middle" fontSize="11" fill="#0E7C86" fontWeight="600">پارکینگ عمومی</text>

        {/* Roads */}
        <path d="M110,130 L110,340 M490,130 L490,340 M20,260 L580,260" stroke="#ffffff" strokeWidth="10" opacity="0.6" />

        {/* Vehicles layer — animated trucks */}
        {mapLayers.vehicles && TRUCK_PATHS.map((path, i) => {
          const pos = path[truckStep % path.length];
          return (
            <g key={i} transform={`translate(${pos[0]},${pos[1]})`} style={{ transition: "transform 2s linear" }}
              onClick={(e) => { e.stopPropagation(); setSelectedDevice({ id: `truck-${i}`, layer: "vehicles", x: pos[0], y: pos[1], label: `کامیون شماره ${i + 1}`, status: "entered" as StatusKind }); }}
              className="cursor-pointer">
              <circle r="9" fill="#0F2A44" />
              <circle r="9" fill="none" stroke="#0E7C86" strokeWidth="2">
                <animate attributeName="r" values="9;14;9" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <text textAnchor="middle" dy="3.5" fontSize="9" fill="#fff">🚚</text>
            </g>
          );
        })}

        {/* Static device layers */}
        {(["cameras", "barriers", "scales", "utilities"] as MapLayer[]).map((layer) =>
          mapLayers[layer] && MAP_DEVICES.filter((d) => d.layer === layer).map((d) => {
            const color = d.status === "online" ? "#0E7C86" : d.status === "warning" ? "#F2A541" : "#94A3B8";
            return (
              <g key={d.id} transform={`translate(${d.x},${d.y})`} className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setSelectedDevice(d); }}>
                <circle r="8" fill="#fff" stroke={color} strokeWidth="2.5" />
                <circle r="2.5" fill={color} />
              </g>
            );
          })
        )}
      </svg>

      {/* Device info popup */}
      {selectedDevice && (
        <div className="absolute top-3 left-3 bg-card border border-border rounded-lg shadow-lg p-3 w-52 z-10" dir="rtl">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setSelectedDevice(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            <p className="text-xs font-semibold text-foreground">{selectedDevice.label}</p>
          </div>
          <div className="flex justify-end mb-2"><Badge status={selectedDevice.status} /></div>
          <div className="flex items-center gap-2 justify-end">
            <button className="text-[10px] px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors">مشاهده جزئیات</button>
            <button className="text-[10px] px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:bg-secondary/70 transition-colors">اقدام سریع</button>
          </div>
        </div>
      )}

      {/* Mini legend */}
      <div className="absolute bottom-2 right-2 bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />آنلاین</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />هشدار</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />آفلاین</span>
      </div>
    </div>
  </div>
);
