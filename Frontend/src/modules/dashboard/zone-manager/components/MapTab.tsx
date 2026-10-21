import { useState, useRef, useCallback } from "react";
import { Map, Download, Ruler, Flame, Zap, Droplets, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

interface MapTabProps { gisMap: ReactNode; }

const INCIDENT_PINS = [
  { x: 110, y: 80, label: "نشت مواد شیمیایی", severity: "high" },
  { x: 455, y: 170, label: "آتش‌سوزی جزئی", severity: "critical" },
  { x: 320, y: 290, label: "سقوط کارگر", severity: "medium" },
];

const UTILITY_LINES = [
  { points: "110,130 110,200 240,200 240,260", color: "#3B82F6", label: "آب" },
  { points: "490,130 490,200 380,200 380,260", color: "#F59E0B", label: "برق" },
  { points: "20,260 150,260 150,190 380,190 380,160", color: "#10B981", label: "گاز" },
];

const HEATMAP_ZONES = [
  { x: 20, y: 20, w: 180, h: 110, intensity: 0.9 },
  { x: 400, y: 20, w: 180, h: 110, intensity: 0.6 },
  { x: 150, y: 150, w: 180, h: 80, intensity: 0.75 },
  { x: 380, y: 160, w: 150, h: 90, intensity: 0.4 },
  { x: 220, y: 260, w: 200, h: 80, intensity: 0.55 },
];

export const MapTab = ({ gisMap }: MapTabProps) => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showUtilities, setShowUtilities] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!measureMode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;
    const y = ((e.clientY - rect.top) / rect.height) * 360;
    setMeasurePoints((prev) => (prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }]));
  }, [measureMode]);

  const measureDistance = measurePoints.length === 2
    ? Math.round(Math.hypot(measurePoints[1].x - measurePoints[0].x, measurePoints[1].y - measurePoints[0].y))
    : 0;

  const exportPng = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 720;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => { ctx?.drawImage(img, 0, 0); const a = document.createElement("a"); a.download = "map-export.png"; a.href = canvas.toDataURL("image/png"); a.click(); };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">نقشه کامل GIS شهرک صنعتی کاوه</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showHeatmap ? "bg-red-50 border-red-200 text-red-700" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            <Flame className="w-3.5 h-3.5" /><span>لایه حرارتی</span>
          </button>
          <button onClick={() => setShowUtilities(!showUtilities)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showUtilities ? "bg-accent/10 border-accent/30 text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            <Zap className="w-3.5 h-3.5" /><span>شبکه تأسیسات</span>
          </button>
          <button onClick={() => setShowIncidents(!showIncidents)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showIncidents ? "bg-red-50 border-red-200 text-red-700" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            <AlertTriangle className="w-3.5 h-3.5" /><span>حوادث</span>
          </button>
          <button onClick={() => { setMeasureMode(!measureMode); setMeasurePoints([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${measureMode ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            <Ruler className="w-3.5 h-3.5" /><span>اندازه‌گیری</span>
          </button>
          <button onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /><span>خروجی PNG</span>
          </button>
        </div>
      </div>

      {measureDistance > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-primary">
          <Ruler className="w-3.5 h-3.5" />
          <span>فاصله: <strong dir="ltr">{measureDistance.toFixed(0)} واحد</strong></span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4" style={{ minHeight: 560 }}>
        <div className="relative rounded-lg border border-border overflow-hidden" style={{ background: "#E7EFEC", minHeight: 500 }}>
          <svg ref={svgRef} viewBox="0 0 600 360" className="w-full h-full" onClick={handleMapClick} style={{ cursor: measureMode ? "crosshair" : "default" }}>
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
            <path d="M110,130 L110,340 M490,130 L490,340 M20,260 L580,260" stroke="#ffffff" strokeWidth="10" opacity="0.6" />

            {/* Heatmap overlay */}
            {showHeatmap && HEATMAP_ZONES.map((z, i) => (
              <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} rx="6"
                fill={`rgba(220,38,38,${z.intensity * 0.35})`} stroke="none">
                <animate attributeName="opacity" values={`${z.intensity * 0.3};${z.intensity * 0.5};${z.intensity * 0.3}`} dur="3s" repeatCount="indefinite" />
              </rect>
            ))}

            {/* Utility network lines */}
            {showUtilities && UTILITY_LINES.map((line, i) => (
              <g key={i}>
                <polyline points={line.points} fill="none" stroke={line.color} strokeWidth="2.5" strokeDasharray="8 4" opacity="0.7" />
                <polyline points={line.points} fill="none" stroke={line.color} strokeWidth="1" opacity="0.3">
                  <animate attributeName="strokeDashoffset" values="24;0" dur="2s" repeatCount="indefinite" />
                </polyline>
              </g>
            ))}

            {/* Incident pins */}
            {showIncidents && INCIDENT_PINS.map((pin, i) => (
              <g key={i} transform={`translate(${pin.x},${pin.y})`} className="cursor-pointer">
                <circle r="12" fill="#DC2626" opacity="0.2">
                  <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle r="6" fill="#DC2626" stroke="#fff" strokeWidth="2" />
                <text textAnchor="middle" dy="3" fontSize="7" fill="#fff" fontWeight="bold">!</text>
                <title>{pin.label}</title>
              </g>
            ))}

            {/* Measurement line */}
            {measurePoints.length === 2 && (
              <g>
                <line x1={measurePoints[0].x} y1={measurePoints[0].y} x2={measurePoints[1].x} y2={measurePoints[1].y}
                  stroke="#0E7C86" strokeWidth="2" strokeDasharray="6 3" />
                <circle cx={measurePoints[0].x} cy={measurePoints[0].y} r="4" fill="#0E7C86" stroke="#fff" strokeWidth="1.5" />
                <circle cx={measurePoints[1].x} cy={measurePoints[1].y} r="4" fill="#0E7C86" stroke="#fff" strokeWidth="1.5" />
                <text x={(measurePoints[0].x + measurePoints[1].x) / 2} y={(measurePoints[0].y + measurePoints[1].y) / 2 - 8}
                  textAnchor="middle" fontSize="10" fill="#0E7C86" fontWeight="600" dir="ltr">{measureDistance.toFixed(0)}u</text>
              </g>
            )}

            {/* Measure mode click points */}
            {measureMode && measurePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="5" fill="#0E7C86" stroke="#fff" strokeWidth="2" />
            ))}
          </svg>

          {/* Heatmap legend */}
          {showHeatmap && (
            <div className="absolute top-2 right-2 bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-2 text-[10px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-1">تراکم ترافیک</p>
              <div className="flex items-center gap-2"><span className="w-4 h-2.5 rounded" style={{ background: "rgba(220,38,38,0.15)" }} />پایین</div>
              <div className="flex items-center gap-2"><span className="w-4 h-2.5 rounded" style={{ background: "rgba(220,38,38,0.35)" }} />متوسط</div>
              <div className="flex items-center gap-2"><span className="w-4 h-2.5 rounded" style={{ background: "rgba(220,38,38,0.55)" }} />بالا</div>
            </div>
          )}

          {/* Utility legend */}
          {showUtilities && (
            <div className="absolute bottom-2 right-2 bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-2 text-[10px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-1">شبکه تأسیسات</p>
              <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-blue-500 inline-block" style={{ borderBottom: "2px dashed #3B82F6" }} />آب</div>
              <div className="flex items-center gap-2"><span className="w-4 h-0.5 inline-block" style={{ borderBottom: "2px dashed #F59E0B" }} />برق</div>
              <div className="flex items-center gap-2"><span className="w-4 h-0.5 inline-block" style={{ borderBottom: "2px dashed #10B981" }} />گاز</div>
            </div>
          )}

          {/* Mini legend */}
          <div className="absolute bottom-2 left-2 bg-card/95 backdrop-blur rounded-lg border border-border px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" />آنلاین</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />هشدار</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />آفلاین</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />حادثه</span>
          </div>
        </div>
      </div>
    </div>
  );
};
