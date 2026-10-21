import { useState } from "react";
import { Camera, Fingerprint, Package, AlertTriangle, X, CheckCircle2, Archive, QrCode } from "lucide-react";
import { VEHICLES, SHIPMENTS } from "@/entities/document";
import { useArchiveStore } from "@/modules/correspondence/store/useArchiveStore";

const CAMERAS = ["دوربین دروازه اصلی — ANPR", "دوربین دروازه اضطراری", "دوربین پارکینگ"];

const MOCK_SCAN_LOG = Array.from({ length: 20 }, (_, i) => ({
  plate: VEHICLES[i % VEHICLES.length].plate,
  time: `۰۸:${(i * 3 + 14).toString().padStart(2, "0")}`,
  status: i % 5 === 0 ? "بررسی" : i % 7 === 0 ? "ممنوع" : "مجاز",
}));

type ScanMode = "vehicle" | "visitor" | "letter-archive";

export default function ScanConsole() {
  const [cameraIdx, setCameraIdx] = useState(0);
  const [biometricOn, setBiometricOn] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("vehicle");

  // Letter-archive scan state
  const { shelves, receiveBarcode } = useArchiveStore();
  const [archiveBarcode, setArchiveBarcode] = useState("");
  const [archiveShelf, setArchiveShelf] = useState(shelves[0]?.id ?? "");
  const [archiveResult, setArchiveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const demo = VEHICLES[0];
  const shipment = SHIPMENTS[0];
  const confidence = 94;
  const confColor = confidence > 70 ? "bg-emerald-500" : confidence > 30 ? "bg-amber-500" : "bg-red-500";
  const isHazmat = shipment.cargoType.includes("شیمیایی") || shipment.cargoType.includes("خطرناک");

  function handleArchiveScan() {
    if (!archiveBarcode.trim()) return;
    if (!archiveBarcode.startsWith("LTR-")) {
      setArchiveResult({ ok: false, msg: "بارکد نامه باید با LTR- شروع شود." });
      return;
    }
    const ok = receiveBarcode(archiveBarcode.trim(), archiveShelf, "نگهبان دروازه");
    if (ok) {
      setArchiveResult({ ok: true, msg: `نامه ${archiveBarcode} با موفقیت در آرشیو ثبت شد.` });
      setArchiveBarcode("");
    } else {
      setArchiveResult({ ok: false, msg: "خطا: بارکد تکراری یا جایگاه پر است." });
    }
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-secondary/40 rounded-xl p-1">
        {([
          { id: "vehicle", label: "خودرو", icon: Camera },
          { id: "visitor", label: "بازدیدکننده", icon: Fingerprint },
          { id: "letter-archive", label: "آرشیو نامه", icon: Archive },
        ] as { id: ScanMode; label: string; icon: typeof Camera }[]).map(m => (
          <button
            key={m.id}
            onClick={() => { setScanMode(m.id); setArchiveResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              scanMode === m.id ? "bg-accent text-white" : "text-blue-300/70 hover:text-white/80"
            }`}
          >
            <m.icon className="w-3 h-3" />
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Vehicle / visitor mode (unchanged) ───────────────────────────── */}
      {scanMode !== "letter-archive" && (
        <>
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-300" />
            <select value={cameraIdx} onChange={(e) => setCameraIdx(+e.target.value)}
              className="bg-secondary/60 border border-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:border-accent">
              {CAMERAS.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center" style={{ background: "#050B12", aspectRatio: "16/9" }}>
            <div className="flex flex-col items-center gap-2 text-blue-400/40">
              <Camera className="w-12 h-12" />
              <span className="text-xs">پخش زنده — {CAMERAS[cameraIdx]}</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-900/80 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-red-300 font-mono font-bold">LIVE</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">مجاز</span>
              <div className="text-right">
                <p className="text-white font-mono font-bold text-2xl" dir="ltr">{demo.plate}</p>
                <p className="text-blue-200 text-xs mt-0.5">{demo.driver} — {demo.companyFa}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-blue-300">امتیاز اعتماد</span>
              <span className="text-xs font-mono font-bold text-white" dir="ltr">{confidence}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${confColor}`} style={{ width: `${confidence}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 p-4" style={{ background: "#0F1C2E" }}>
            <p className="text-xs font-semibold text-white/80 mb-2 text-right">تصویر وسیله نقلیه</p>
            <div className="rounded-xl flex items-center justify-center gap-3 text-blue-400/40 mb-3" style={{ background: "#050B12", height: 120 }}>
              <Package className="w-8 h-8" />
              <span className="text-xs">تصویر خودرو</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-blue-300">
                <Package className="w-3 h-3" /> {shipment.cargoType}
              </span>
              {isHazmat && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-xs text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-3 h-3" /> مواد خطرناک
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs text-blue-300">
                {demo.type === "truck" ? "کامیون" : demo.type === "car" ? "سواری" : "موتور"}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── Letter-archive mode ───────────────────────────────────────────── */}
      {scanMode === "letter-archive" && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-4" style={{ background: "#0F1C2E" }}>
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-white">دریافت نامه فیزیکی</span>
          </div>
          <p className="text-[11px] text-blue-300/60">بارکد روی پاکت نامه (با پیشوند LTR-) را اسکن یا وارد کنید.</p>

          <div>
            <label className="text-[10px] text-blue-300/60 mb-1.5 block">بارکد نامه</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={archiveBarcode}
                onChange={e => { setArchiveBarcode(e.target.value); setArchiveResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleArchiveScan()}
                placeholder="LTR-000001"
                dir="ltr"
                className="flex-1 bg-white/5 border border-white/20 rounded-xl py-2 px-3 text-xs text-white placeholder-blue-300/30 focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={handleArchiveScan}
                className="bg-accent text-white px-4 rounded-xl text-xs font-bold hover:bg-accent/90 transition-colors flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                ثبت
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-blue-300/60 mb-1.5 block">جایگاه آرشیو</label>
            <select
              value={archiveShelf}
              onChange={e => setArchiveShelf(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-accent"
            >
              {shelves.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-800">
                  {s.nameFa} ({s.letters.length}/{s.capacity})
                </option>
              ))}
            </select>
          </div>

          {archiveResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              archiveResult.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {archiveResult.ok
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              }
              {archiveResult.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}