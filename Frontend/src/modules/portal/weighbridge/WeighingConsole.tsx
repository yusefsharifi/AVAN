import { useState, useEffect, useCallback } from "react";
import {
  Scale, Truck, Camera, Upload, AlertTriangle, CheckCircle2,
  Plus, Minus, ArrowDown, ArrowUp, X,
} from "lucide-react";
import { WeightSession, WEIGHBRIDGE_STATIONS } from "@/entities/document";
import { TRUCK_DB } from "./mockData";

/* ── Animated SVG Gauge ─────────────────────────────────────────────── */

function WeightGauge({ value, max }: { value: number; max: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const dur = 3000;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(e * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const pct = max > 0 ? Math.min(display / max, 1) : 0;
  const cx = 100, cy = 100, r = 70;

  const needleAngle = Math.PI * (1 - pct);
  const nx = cx + 58 * Math.cos(needleAngle);
  const ny = cy - 58 * Math.sin(needleAngle);

  const sx = cx + r * Math.cos(Math.PI);
  const sy = cy - r * Math.sin(Math.PI);
  const ex = cx + r;
  const ey = cy;

  const segArc = (sp: number, ep: number) => {
    const sa = Math.PI * (1 - sp);
    const ea = Math.PI * (1 - ep);
    return `M ${cx + r * Math.cos(sa)} ${cy - r * Math.sin(sa)} A ${r} ${r} 0 0 0 ${cx + r * Math.cos(ea)} ${cy - r * Math.sin(ea)}`;
  };

  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[300px] mx-auto">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 0 ${ex} ${ey}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
      <path d={segArc(0, 0.6)} fill="none" stroke="#10B981" strokeWidth="10" strokeLinecap="round" opacity={pct >= 0 ? 1 : 0} />
      <path d={segArc(0.6, 0.8)} fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" opacity={pct > 0.6 ? 1 : 0} />
      <path d={segArc(0.8, 1)} fill="none" stroke="#EF4444" strokeWidth="10" strokeLinecap="round" opacity={pct > 0.8 ? 1 : 0} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = Math.PI * (1 - t);
        return <line key={t} x1={cx + (r - 16) * Math.cos(a)} y1={cy - (r - 16) * Math.sin(a)} x2={cx + (r - 8) * Math.cos(a)} y2={cy - (r - 8) * Math.sin(a)} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#F2A541" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#F2A541" />
      <text x={cx} y={cy + 28} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="monospace">
        {display.toLocaleString("fa-IR")}
      </text>
      <text x={cx} y={cy + 42} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
        کیلوگرم
      </text>
    </svg>
  );
}

/* ── Photo Slot ─────────────────────────────────────────────────────── */

function PhotoSlot({ label, hasPhoto, onUpload }: { label: string; hasPhoto: boolean; onUpload: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-white/20 p-3 text-center hover:border-accent/50 transition-colors cursor-pointer" onClick={onUpload}>
      {hasPhoto ? (
        <div className="flex flex-col items-center gap-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">{label} — ثبت شد</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Camera className="w-5 h-5 text-blue-300/40" />
          <span className="text-[10px] text-blue-300/40">{label}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Console ───────────────────────────────────────────────────── */

interface WeighingConsoleProps {
  stations: typeof WEIGHBRIDGE_STATIONS;
}

export default function WeighingConsole({ stations }: WeighingConsoleProps) {
  const [mode, setMode] = useState<"tare" | "gross">("tare");
  const [plate, setPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [stationId, setStationId] = useState(stations[0]?.id || "");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [declaredWeight, setDeclaredWeight] = useState(0);

  const [tareWeight, setTareWeight] = useState(0);
  const [grossWeight, setGrossWeight] = useState(0);
  const [showTareGauge, setShowTareGauge] = useState(false);
  const [showGrossGauge, setShowGrossGauge] = useState(false);

  const [commodities, setCommodities] = useState<Array<{ name: string; declared: number; actual: number }>>([]);
  const [photos, setPhotos] = useState<{ truck: boolean; cargo: boolean; seal: boolean }>({ truck: false, cargo: false, seal: false });
  const [operatorNote, setOperatorNote] = useState("");

  const station = stations.find((s) => s.id === stationId);
  const netWeight = Math.max(0, grossWeight - tareWeight);
  const discrepancyPct = declaredWeight > 0 ? Math.abs(((netWeight - declaredWeight) / declaredWeight) * 100) : 0;
  const hasDiscrepancy = discrepancyPct > 5;

  const handlePlateChange = useCallback((val: string) => {
    setPlate(val);
    const match = TRUCK_DB[val];
    if (match) {
      setDriverName(match.driverName);
      setCompanyName(match.companyName);
      setCargoType(match.cargoType);
    }
  }, []);

  const simulateWeight = useCallback(() => {
    const fakeWeight = Math.round(10000 + Math.random() * 15000);
    if (mode === "tare") {
      setTareWeight(fakeWeight);
      setShowTareGauge(true);
      setShowGrossGauge(false);
    } else {
      setGrossWeight(fakeWeight + tareWeight);
      setShowGrossGauge(true);
      setShowTareGauge(false);
    }
  }, [mode, tareWeight]);

  const addCommodity = () => setCommodities([...commodities, { name: "", declared: 0, actual: 0 }]);
  const removeCommodity = (i: number) => setCommodities(commodities.filter((_, idx) => idx !== i));
  const updateCommodity = (i: number, field: string, val: string | number) => {
    const next = [...commodities];
    (next[i] as Record<string, unknown>)[field] = val;
    setCommodities(next);
  };

  return (
    <div className="space-y-5">
      {/* Calibration Banner */}
      {station && (() => {
        const now = new Date();
        const parts = station.nextCalibration.split("/");
        const calDate = new Date(+parts[0] + 621, +parts[1] - 1, +parts[2]);
        const isPast = calDate < now;
        return isPast ? (
          <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400 font-bold">کالیبره ایستگاه {station.nameFa} منقضی شده — نیاز به کالیبره مجدد</span>
          </div>
        ) : null;
      })()}

      {/* Mode + Station Row */}
      <div className="flex items-center gap-3">
        <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
          <button onClick={() => setMode("tare")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "tare" ? "bg-accent text-white" : "text-blue-300/60 hover:text-white"}`}>
            <ArrowUp className="w-3.5 h-3.5" /> وزن تاره (خالی)
          </button>
          <button onClick={() => setMode("gross")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "gross" ? "bg-accent text-white" : "text-blue-300/60 hover:text-white"}`}>
            <ArrowDown className="w-3.5 h-3.5" /> وزن ناخالص (پر)
          </button>
        </div>
        <select value={stationId} onChange={(e) => setStationId(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white appearance-none cursor-pointer">
          {stations.map((s) => <option key={s.id} value={s.id} className="bg-slate-800">{s.nameFa}</option>)}
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value as "in" | "out")} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white appearance-none cursor-pointer">
          <option value="in" className="bg-slate-800">ورودی</option>
          <option value="out" className="bg-slate-800">خروجی</option>
        </select>
      </div>

      {/* Plate + Auto-assign */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-blue-300/50 mb-1 block">پلاک خودرو</label>
          <div className="relative">
            <Truck className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-300/40" />
            <input value={plate} onChange={(e) => handlePlateChange(e.target.value)} placeholder="مثال: ۱۲ب۳۴۵ ایران" className="w-full bg-white/5 border border-white/10 rounded-lg pr-8 pl-3 py-2 text-xs text-white placeholder:text-blue-300/30 focus:outline-none focus:border-accent/50" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-blue-300/50 mb-1 block">راننده</label>
          <input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/50" />
        </div>
        <div>
          <label className="text-[10px] text-blue-300/50 mb-1 block">شرکت</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/50" />
        </div>
        <div>
          <label className="text-[10px] text-blue-300/50 mb-1 block">نوع بار</label>
          <input value={cargoType} onChange={(e) => setCargoType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent/50" />
        </div>
      </div>

      {/* Gauge + Weight Results */}
      <div className="grid grid-cols-[1fr_1.5fr] gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">
              {mode === "tare" ? "وزن تاره (خالی)" : "وزن ناخالص (پر)"}
            </span>
            <button onClick={simulateWeight} className="text-[10px] px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent/80 transition-colors">
              <Scale className="w-3 h-3 inline ml-1" /> شبیه‌سازی وزن
            </button>
          </div>
          <WeightGauge value={mode === "tare" ? tareWeight : grossWeight} max={station?.capacity || 60000} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-xs font-bold text-white">نتایج وزن</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "وزن تاره (خالی)", value: tareWeight, color: "text-blue-300" },
              { label: "وزن ناخالص (پر)", value: grossWeight, color: "text-amber-300" },
              { label: "وزن خالص", value: netWeight, color: "text-emerald-400" },
            ].map((w) => (
              <div key={w.label} className="text-center bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-blue-300/50">{w.label}</p>
                <p className={`text-2xl font-bold ${w.color} mt-1`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {w.value.toLocaleString("fa-IR")}
                </p>
                <p className="text-[9px] text-blue-300/30">kg</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] text-blue-300/50 mb-1">وزن اظهاری</p>
              <input type="number" value={declaredWeight || ""} onChange={(e) => setDeclaredWeight(+e.target.value)} className="w-full bg-transparent text-white text-sm font-bold focus:outline-none" placeholder="0" />
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] text-blue-300/50 mb-1">اختلاف</p>
              <p className={`text-sm font-bold ${hasDiscrepancy ? "text-red-400" : "text-emerald-400"}`}>
                {declaredWeight > 0 ? `${discrepancyPct.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          {hasDiscrepancy && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] text-red-400 font-bold">اختلاف بیش از ۵٪ — نیاز به بررسی</span>
              </div>
              <input value={operatorNote} onChange={(e) => setOperatorNote(e.target.value)} placeholder="یادداشت اپراتور..." className="w-full bg-red-500/5 border border-red-500/20 rounded px-2 py-1 text-[11px] text-white placeholder:text-red-300/30 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      {/* Multi-commodity */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white">اقلام کالا (چندکالایی)</p>
          <button onClick={addCommodity} className="text-[10px] px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors">
            <Plus className="w-3 h-3 inline ml-1" /> افزودن قلم
          </button>
        </div>
        {commodities.length === 0 ? (
          <p className="text-[11px] text-blue-300/30 text-center py-2">بدون قلم کالا</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_100px_30px] gap-2 text-[9px] text-blue-300/40 px-1">
              <span>نام کالا</span><span>وزن اظهاری</span><span>وزن واقعی</span><span />
            </div>
            {commodities.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_100px_30px] gap-2 items-center">
                <input value={c.name} onChange={(e) => updateCommodity(i, "name", e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-accent/50" />
                <input type="number" value={c.declared || ""} onChange={(e) => updateCommodity(i, "declared", +e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-accent/50" />
                <input type="number" value={c.actual || ""} onChange={(e) => updateCommodity(i, "actual", +e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-accent/50" />
                <button onClick={() => removeCommodity(i)} className="text-red-400/50 hover:text-red-400"><Minus className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Capture */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white mb-3">عکس‌برداری</p>
        <div className="grid grid-cols-3 gap-3">
          <PhotoSlot label="عکس کامیون" hasPhoto={photos.truck} onUpload={() => setPhotos({ ...photos, truck: true })} />
          <PhotoSlot label="عکس بار" hasPhoto={photos.cargo} onUpload={() => setPhotos({ ...photos, cargo: true })} />
          <PhotoSlot label="عکس مهر/پلمپ" hasPhoto={photos.seal} onUpload={() => setPhotos({ ...photos, seal: true })} />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button className="px-5 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/80 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5" /> ثبت وزن‌کشی
        </button>
        <button className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-blue-300/60 text-xs hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 inline ml-1.5" /> انصراف
        </button>
      </div>
    </div>
  );
}
