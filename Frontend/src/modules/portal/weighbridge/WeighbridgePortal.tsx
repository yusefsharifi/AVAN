import { useState } from "react";
import {
  Scale, Weight, AlertTriangle, XCircle, Settings, BarChart3,
  ClipboardList, Activity,
} from "lucide-react";
import { LiveDot } from "@/shared/components/feedback";
import { WEIGHBRIDGE_STATIONS, WEIGHBRIDGE_TODAY_STATS } from "@/entities/document";
import WeighingConsole from "./WeighingConsole";
import SessionList from "./SessionList";
import StationConfig from "./StationConfig";
import WeighbridgeReports from "./WeighbridgeReports";

const TABS = [
  { key: "console", label: "کنسول وزن‌کشی", icon: Scale },
  { key: "sessions", label: "لیست جلسات", icon: ClipboardList },
  { key: "stations", label: "ایستگاه‌ها", icon: Settings },
  { key: "reports", label: "گزارش‌ها", icon: BarChart3 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function WeighbridgePortal() {
  const [tab, setTab] = useState<TabKey>("console");
  const stats = WEIGHBRIDGE_TODAY_STATS;

  return (
    <div className="dark h-full flex" dir="rtl">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{ background: "#0F2A44" }}>
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent" />
            <span className="text-sm font-bold text-white">پورتال باسکول</span>
          </div>
          <p className="text-[10px] text-blue-300/60 mt-1">Weighbridge Operator Console</p>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-2">
          {[
            { label: "وزن‌کشی امروز", value: stats.totalWeighings, icon: Scale },
            { label: "کل وزن (kg)", value: stats.totalWeight.toLocaleString("fa-IR"), icon: Weight },
            { label: "اختلاف وزن", value: stats.discrepancyCount, icon: AlertTriangle },
            { label: "لغو شده", value: stats.cancelledCount, icon: XCircle },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/5 border border-white/10 p-3">
              <s.icon className="w-4 h-4 text-blue-300/70 mb-1" />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-blue-300/50">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Station List */}
        <div className="px-4 pt-2">
          <p className="text-[10px] text-blue-300/50 font-bold mb-2">ایستگاه‌ها</p>
          {WEIGHBRIDGE_STATIONS.map((st) => {
            const isOverdue = (() => {
              const now = new Date();
              const parts = st.nextCalibration.split("/");
              return new Date(+parts[0] + 621, +parts[1] - 1, +parts[2]) < now;
            })();
            return (
              <div key={st.id} className={`rounded-lg bg-white/5 border p-3 mb-2 ${isOverdue ? "border-red-500/40" : "border-white/10"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{st.nameFa}</span>
                  {isOverdue ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-medium">کالیبره منقضی</span>
                  ) : (
                    <Activity className="w-3 h-3 text-emerald-400" />
                  )}
                </div>
                <p className="text-[10px] text-blue-300/50">{st.locationFa} · {st.model}</p>
                <div className="flex items-center justify-between mt-2 text-[9px] text-blue-300/40">
                  <span>ظرفیت: {st.capacity.toLocaleString("fa-IR")} kg</span>
                  <span className={isOverdue ? "text-red-400 font-bold" : ""}>کالیبره: {st.nextCalibration}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Operator Info */}
        <div className="mt-auto px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
              <span className="text-xs text-white font-bold">ر.ا</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">رضا احمدی</p>
              <p className="text-[10px] text-blue-300/50">اپراتور باسکول</p>
            </div>
            <LiveDot color="bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0A1420" }}>
        {/* Header + Tabs */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? "bg-accent text-white" : "text-blue-300/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === "console" && <WeighingConsole stations={WEIGHBRIDGE_STATIONS} />}
          {tab === "sessions" && <SessionList />}
          {tab === "stations" && <StationConfig />}
          {tab === "reports" && <WeighbridgeReports />}
        </div>
      </div>
    </div>
  );
}

export default WeighbridgePortal;
