import { Plus, ArrowUp, ArrowDown, GripVertical, Truck, X } from "lucide-react";

import {
  WEEK_DAYS, TIME_SLOTS, DOCK_OPTIONS, CARGO_TYPES, SCHED_COMPANIES,
  getSlotBooking,
} from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface QueueItem {
  id: string;
  plate: string;
  company: string;
  cargoType: string;
  eta: string;
}

interface SchedulingViewProps {
  schedDock: string;
  setSchedDock: (dock: string) => void;
  schedCargoFilter: string;
  setSchedCargoFilter: (filter: string) => void;
  schedCompanyFilter: string;
  setSchedCompanyFilter: (filter: string) => void;
  popoverSlot: { day: string; time: string } | null;
  setPopoverSlot: (slot: { day: string; time: string } | null) => void;
  queue: QueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  quickBooking: { plate: string; cargoType: string; company: string };
  setQuickBooking: React.Dispatch<React.SetStateAction<{ plate: string; cargoType: string; company: string }>>;
}

export default function SchedulingView({
  schedDock, setSchedDock, schedCargoFilter, setSchedCargoFilter,
  schedCompanyFilter, setSchedCompanyFilter, popoverSlot, setPopoverSlot,
  queue, setQueue, quickBooking, setQuickBooking,
}: SchedulingViewProps) {
  const moveQueueItem = (index: number, dir: -1 | 1) => {
    setQueue((q) => {
      const next = [...q];
      const target = index + dir;
      if (target < 0 || target >= next.length) return q;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <button onClick={() => setPopoverSlot({ day: WEEK_DAYS[0], time: TIME_SLOTS[0] })}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /><span>رزرو نوبت جدید</span>
        </button>
        <h1 className="text-sm font-semibold text-foreground">نوبت‌دهی دوک بارگیری</h1>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={schedDock} onChange={(e) => setSchedDock(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent">
            {DOCK_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={schedCargoFilter} onChange={(e) => setSchedCargoFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent">
            <option value="all">همه انواع محموله</option>
            {CARGO_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={schedCompanyFilter} onChange={(e) => setSchedCompanyFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent">
            <option value="all">همه شرکت‌ها</option>
            {SCHED_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-50 border border-accent/30 inline-block" />خالی</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />۵۰–۸۰٪</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />پر</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border-2 border-primary inline-block" />بارنامه من</span>
          <h3 className="text-sm font-semibold text-foreground mr-2">نوبت‌دهی هفتگی — {schedDock}</h3>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="col-span-3 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 overflow-auto" style={{ maxHeight: 620 }}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-card z-10 text-[10px] text-muted-foreground font-medium py-1 px-1 w-14"></th>
                {WEEK_DAYS.map((d) => (
                  <th key={d} className="sticky top-0 bg-card z-10 text-xs font-semibold text-foreground py-1.5 px-1 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((time) => (
                <tr key={time}>
                  <td className="text-[9px] text-muted-foreground font-mono text-center py-0.5" dir="ltr">{time}</td>
                  {WEEK_DAYS.map((day) => {
                    const b = getSlotBooking(schedDock, day, time);
                    if (schedCargoFilter !== "all" && b.cargoType && b.cargoType !== schedCargoFilter) return <td key={day} className="p-0.5"><div className="h-6 rounded bg-secondary/20" /></td>;
                    if (schedCompanyFilter !== "all" && b.company && b.company !== schedCompanyFilter) return <td key={day} className="p-0.5"><div className="h-6 rounded bg-secondary/20" /></td>;
                    const cls = b.mine ? "bg-white border-2 border-primary"
                      : b.occupancy === "empty" ? "bg-teal-50/70 border border-accent/20 hover:border-accent cursor-pointer"
                      : b.occupancy === "partial" ? "bg-amber-100 border border-amber-300"
                      : "bg-red-100 border border-red-300";
                    return (
                      <td key={day} className="p-0.5">
                        <div onClick={() => b.occupancy === "empty" && !b.mine && setPopoverSlot({ day, time })}
                          className={`h-6 rounded flex items-center justify-center gap-1 transition-colors ${cls}`} title={b.company ? `${b.company} · ${b.cargoType}` : "خالی"}>
                          {b.company && (
                            <>
                              <Truck className="w-2.5 h-2.5 text-foreground/70 flex-shrink-0" />
                              <span className="text-[8px] text-foreground/80 font-mono truncate" dir="ltr">{b.company.slice(0, 4)}·{b.plateSuffix}</span>
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground text-right">صف امروز</h3>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 540 }}>
            {queue.map((q, i) => (
              <div key={q.id} className="p-2.5 rounded-lg border border-border bg-secondary/20 flex items-center gap-2">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveQueueItem(i, -1)} disabled={i === 0} className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveQueueItem(i, 1)} disabled={i === queue.length - 1} className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"><ArrowDown className="w-3 h-3" /></button>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">{i + 1}</div>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{q.company}</p>
                  <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{q.plate} · {q.eta}</p>
                </div>
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {popoverSlot && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setPopoverSlot(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl p-5 w-80 z-50" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPopoverSlot(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">رزرو نوبت جدید</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>روز</label>
                  <select value={popoverSlot.day} onChange={(e) => setPopoverSlot((s) => s && ({ ...s, day: e.target.value }))} className={inputCls}>
                    {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>ساعت</label>
                  <select value={popoverSlot.time} onChange={(e) => setPopoverSlot((s) => s && ({ ...s, time: e.target.value }))} className={inputCls}>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>پلاک کامیون</label>
                <input dir="rtl" value={quickBooking.plate} onChange={(e) => setQuickBooking((q) => ({ ...q, plate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>نوع محموله</label>
                <select value={quickBooking.cargoType} onChange={(e) => setQuickBooking((q) => ({ ...q, cargoType: e.target.value }))} className={inputCls}>
                  {CARGO_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>شرکت</label>
                <select value={quickBooking.company} onChange={(e) => setQuickBooking((q) => ({ ...q, company: e.target.value }))} className={inputCls}>
                  {SCHED_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                disabled={!quickBooking.plate.trim()}
                onClick={() => {
                  setQueue((q) => [...q, { id: `Q${q.length + 1}`, plate: quickBooking.plate, company: quickBooking.company, cargoType: quickBooking.cargoType, eta: popoverSlot.time }]);
                  setQuickBooking({ plate: "", cargoType: CARGO_TYPES[0], company: SCHED_COMPANIES[0] });
                  setPopoverSlot(null);
                }}
                className="w-full py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ثبت رزرو
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
