import { useState, useEffect } from "react";
import {
  ScanLine, Clock, Users, HardHat, AlertTriangle, BarChart2, Edit2, Search,
  Lock, Unlock, Shield, User, X, ArrowRight, ArrowLeft,
} from "lucide-react";
import { LiveDot, Badge } from "@/shared/components/feedback";
import { LiveClock } from "@/shared/components/layout";
import { StatusKind, VEHICLES, TODAY_QUEUE } from "@/entities/document";
import ScanConsole from "./components/ScanConsole";
import ShiftManagement from "./components/ShiftManagement";
import VisitorWizard from "./components/VisitorWizard";
import ContractorPermits from "./components/ContractorPermits";
import IncidentLog from "./components/IncidentLog";
import TrafficAnalytics from "./components/TrafficAnalytics";

const SECTIONS = [
  { id: "scan", label: "اسکن خودرو", Icon: ScanLine },
  { id: "shift", label: "مدیریت شیفت", Icon: Clock },
  { id: "visitor", label: "بازدیدکنندگان", Icon: Users },
  { id: "contractor", label: "پیمانکاران", Icon: HardHat },
  { id: "incident", label: "حوادث", Icon: AlertTriangle },
  { id: "analytics", label: "ترافیک", Icon: BarChart2 },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

function GuardPortal() {
  const [activeSection, setActiveSection] = useState<Section>("scan");
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<null | "manual" | "search" | "emergency">(null);
  const [manualPlate, setManualPlate] = useState("");
  const [manualDriver, setManualDriver] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [shiftStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() - 4, d.getMinutes() - 12);
    return d;
  });
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const shiftElapsedMs = now.getTime() - shiftStart.getTime();
  const shiftH = Math.floor(shiftElapsedMs / 3600000).toString().padStart(2, "0");
  const shiftM = Math.floor((shiftElapsedMs % 3600000) / 60000).toString().padStart(2, "0");

  const searchResults = searchQuery
    ? VEHICLES.filter((v) => v.plate.includes(searchQuery) || v.driver.includes(searchQuery))
    : VEHICLES;

  const eventIcon = (status: StatusKind) => {
    if (status === "entered") return { Icon: ArrowRight, color: "text-emerald-400" };
    if (status === "exited") return { Icon: ArrowLeft, color: "text-slate-400" };
    if (status === "denied") return { Icon: X, color: "text-red-400" };
    return { Icon: Clock, color: "text-amber-400" };
  };

  const inputCls =
    "w-full bg-secondary/60 border border-border rounded-lg py-2.5 px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
  const closeModal = () => setActiveModal(null);

  return (
    <div className="dark h-full flex flex-col" dir="rtl">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 56, background: "#0F2A44" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-blue-300" dir="ltr">
            Gate North
          </span>
          <span className="text-sm font-bold text-white">درب شمالی</span>
          <LiveDot color="bg-emerald-400" />
        </div>
        <LiveClock dark />
        <div className="flex items-center gap-3">
          <div className="text-left" dir="ltr">
            <p className="text-[10px] text-blue-300">SHIFT</p>
            <p className="text-xs font-mono font-bold text-white">
              {shiftH}:{shiftM}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <button
            onClick={() => setBarrierOpen(!barrierOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              barrierOpen
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {barrierOpen ? "باز" : "بسته"}
            {barrierOpen ? (
              <Unlock className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main 3-column */}
      <div
        className="flex-1 overflow-hidden p-4 grid gap-4"
        style={{ gridTemplateColumns: "220px 1fr 260px", background: "#0A1420" }}
      >
        {/* LEFT: nav + events */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="flex flex-col gap-1.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
                  activeSection === s.id
                    ? "bg-accent text-white"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                <s.Icon className="w-4 h-4" />
                <span>{s.label}</span>
              </button>
            ))}
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={() => setActiveModal("manual")}
              className="flex items-center gap-2 rounded-xl border border-white/15 text-white/90 hover:bg-white/5 px-3 py-2.5 text-xs font-bold"
            >
              <Edit2 className="w-4 h-4" /> ثبت دستی
            </button>
            <button
              onClick={() => setActiveModal("search")}
              className="flex items-center gap-2 rounded-xl border border-white/15 text-white/90 hover:bg-white/5 px-3 py-2.5 text-xs font-bold"
            >
              <Search className="w-4 h-4" /> جستجوی پلاک
            </button>
          </div>
          <div
            className="rounded-xl border border-white/10 p-3 flex-1 overflow-hidden flex flex-col"
            style={{ background: "#0F1C2E" }}
          >
            <p className="text-xs font-semibold text-white/80 mb-2 text-right">
              رویدادهای اخیر
            </p>
            <div className="space-y-1.5 overflow-y-auto">
              {VEHICLES.slice(0, 8).map((v) => {
                const { Icon, color } = eventIcon(v.status);
                return (
                  <div
                    key={v.plate}
                    className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                    <span
                      className="text-[10px] text-blue-300 font-mono flex-shrink-0"
                      dir="ltr"
                    >
                      {v.time}
                    </span>
                    <span
                      className="text-[10px] text-white/90 font-mono flex-1 text-right truncate"
                      dir="ltr"
                    >
                      {v.plate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: active section */}
        <div className="min-h-0 overflow-hidden">
          {activeSection === "scan" && <ScanConsole />}
          {activeSection === "shift" && <ShiftManagement />}
          {activeSection === "visitor" && <VisitorWizard />}
          {activeSection === "contractor" && <ContractorPermits />}
          {activeSection === "incident" && <IncidentLog />}
          {activeSection === "analytics" && <TrafficAnalytics />}
        </div>

        {/* RIGHT: queue + stats + emergency */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="rounded-xl border border-white/10 p-3.5" style={{ background: "#0F1C2E" }}>
            <p className="text-xs font-semibold text-white/80 mb-2.5 text-right">
              صف انتظار
            </p>
            <div className="space-y-2">
              {TODAY_QUEUE.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-[10px] text-blue-300 font-mono" dir="ltr">
                    {q.eta}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-white font-mono" dir="ltr">
                      {q.plate}
                    </p>
                    <p className="text-[10px] text-blue-300/70">{q.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-3.5" style={{ background: "#0F1C2E" }}>
            <p className="text-xs font-semibold text-white/80 mb-2.5 text-right">
              آمار شیفت
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "ورودی", val: "۱۲۷" },
                { label: "خروجی", val: "۱۱۸" },
                { label: "پرچم‌دار", val: "۳" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-2 text-center"
                  style={{ background: "#0A1420" }}
                >
                  <p className="text-base font-bold text-white font-mono" dir="ltr">
                    {s.val}
                  </p>
                  <p className="text-[9px] text-blue-300 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveModal("emergency")}
            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors flex-shrink-0"
            style={{ height: 56 }}
          >
            <span>کنترل اضطراری</span>
            <Shield className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Manual entry modal */}
      {activeModal === "manual" && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={closeModal} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-5 w-[400px] z-50"
            style={{ background: "#0F1C2E" }}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-sm font-bold text-white">ثبت دستی تردد</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>پلاک خودرو</label>
                <input
                  dir="rtl"
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>نام راننده</label>
                <input
                  dir="rtl"
                  value={manualDriver}
                  onChange={(e) => setManualDriver(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>شرکت مقصد</label>
                <input
                  dir="rtl"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button
                onClick={closeModal}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent/90 mt-2"
              >
                ثبت ورود
              </button>
            </div>
          </div>
        </>
      )}

      {/* Search modal */}
      {activeModal === "search" && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={closeModal} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-5 w-[400px] max-h-[80vh] overflow-y-auto z-50"
            style={{ background: "#0F1C2E" }}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-sm font-bold text-white">جستجوی پلاک</p>
            </div>
            <div className="space-y-3">
              <input
                dir="rtl"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="پلاک یا نام راننده..."
                className={inputCls}
              />
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {searchResults.map((v) => (
                  <div
                    key={v.plate}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-white/10"
                  >
                    <Badge status={v.status} />
                    <div className="text-right">
                      <p className="text-xs text-white font-mono" dir="ltr">
                        {v.plate}
                      </p>
                      <p className="text-[10px] text-blue-300">
                        {v.driver} · {v.companyFa}
                      </p>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-xs text-blue-300 text-center py-4">
                    نتیجه‌ای یافت نشد.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Emergency confirm */}
      {activeModal === "emergency" && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40" onClick={closeModal} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-500/40 p-6 w-96 z-50 text-center"
            style={{ background: "#0F1C2E" }}
            dir="rtl"
          >
            <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              فعال‌سازی کنترل اضطراری
            </p>
            <p className="text-xs text-blue-300 mb-5">
              همه دروازه‌ها قفل و واحد HSE مطلع می‌شود. آیا اطمینان دارید؟
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-lg border border-white/15 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
              >
                فعال‌سازی
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GuardPortal;
