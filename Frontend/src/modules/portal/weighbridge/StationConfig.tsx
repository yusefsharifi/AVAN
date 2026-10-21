import { AlertTriangle, CheckCircle2, Settings } from "lucide-react";
import { WeighbridgeStation, WEIGHBRIDGE_STATIONS } from "@/entities/document";
import { STATUS_CFG } from "@/shared/constants/status";

export default function StationConfig() {
  const now = new Date();

  const isCalibrationOverdue = (station: WeighbridgeStation) => {
    const parts = station.nextCalibration.split("/");
    const calDate = new Date(+parts[0] + 621, +parts[1] - 1, +parts[2]);
    return calDate < now;
  };

  return (
    <div className="space-y-3">
      {WEIGHBRIDGE_STATIONS.map((st) => {
        const cfg = STATUS_CFG[st.status];
        const overdue = isCalibrationOverdue(st);
        return (
          <div key={st.id} className={`rounded-xl border bg-white/5 p-4 ${overdue ? "border-red-500/40" : "border-white/10"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-300/60" />
                <span className="text-sm font-bold text-white">{st.nameFa}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} font-medium`}>{cfg.fa}</span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-[11px]">
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-blue-300/40">موقعیت</p>
                <p className="text-white mt-0.5">{st.locationFa}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-blue-300/40">مدل</p>
                <p className="text-white mt-0.5">{st.model}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-blue-300/40">ظرفیت</p>
                <p className="text-white mt-0.5">{st.capacity.toLocaleString("fa-IR")} kg</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[9px] text-blue-300/40">دقت</p>
                <p className="text-white mt-0.5">±{st.precision} kg</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-blue-300/50">آخرین کالیبره: {st.lastCalibration}</span>
                <span className={overdue ? "text-red-400 font-bold" : "text-blue-300/50"}>
                  کالیبره بعدی: {st.nextCalibration}
                  {overdue && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />}
                </span>
              </div>
              {overdue ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                  نیاز به کالیبره
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 inline ml-1" /> کالیبره معتبر
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
