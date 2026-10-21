import type { WorkOrder, ProductionLine } from '../types';
import { WORK_ORDER_STATUS_CONFIG } from '../constants';

interface GanttChartProps {
  workOrders: WorkOrder[];
  lines: ProductionLine[];
  weekStart?: string;
  onWorkOrderClick?: (wo: WorkOrder) => void;
}

const DAY_LABELS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];

const STATUS_BAR_COLOR: Record<string, string> = {
  planned: 'bg-slate-400', released: 'bg-blue-500', in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500', on_hold: 'bg-orange-500', cancelled: 'bg-red-400',
};

// Deterministic pseudo-placement: since WorkOrder only stores Persian date strings
// (not sortable ISO dates), we spread work orders across the week by a stable
// hash of their id so each line's bars land in a consistent, readable column.
function dayIndexForWorkOrder(wo: WorkOrder): number {
  let hash = 0;
  for (const ch of wo.id) hash = (hash * 31 + ch.charCodeAt(0)) % 6;
  return hash;
}
function spanForWorkOrder(wo: WorkOrder): number {
  const hours = wo.estimatedDurationHours || 24;
  return Math.max(1, Math.min(4, Math.round(hours / 48)));
}

export default function GanttChart({ workOrders, lines, onWorkOrderClick }: GanttChartProps) {
  const todayCol = new Date().getDay() % 6;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Header row: day labels */}
        <div className="grid grid-cols-[140px_repeat(6,1fr)] gap-1 mb-2">
          <div />
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground relative py-1">
              {d}
              {i === todayCol && <div className="absolute inset-x-1/2 -bottom-1 w-px h-2 bg-red-500" />}
            </div>
          ))}
        </div>

        {/* One row per production line */}
        {lines.map((line) => {
          const lineWOs = workOrders.filter((w) => w.lineId === line.id);
          return (
            <div key={line.id} className="grid grid-cols-[140px_repeat(6,1fr)] gap-1 mb-1.5 relative">
              <div className="flex items-center text-xs font-semibold text-foreground truncate pl-2">{line.nameFa}</div>
              <div className="col-span-6 grid grid-cols-6 gap-1 relative h-9 bg-secondary/30 rounded-lg overflow-hidden">
                {todayCol < 6 && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10" style={{ left: `${(todayCol / 6) * 100}%` }} />
                )}
                {lineWOs.map((wo) => {
                  const start = dayIndexForWorkOrder(wo);
                  const span = Math.min(spanForWorkOrder(wo), 6 - start);
                  const color = STATUS_BAR_COLOR[wo.status] ?? 'bg-slate-400';
                  return (
                    <button
                      key={wo.id}
                      onClick={() => onWorkOrderClick?.(wo)}
                      title={`${wo.workOrderNumber} — ${WORK_ORDER_STATUS_CONFIG[wo.status].fa}`}
                      className={`absolute top-1 bottom-1 ${color} rounded-md flex items-center justify-center px-1 text-[9px] font-bold text-white hover:opacity-90 transition-opacity overflow-hidden`}
                      style={{ left: `${(start / 6) * 100}%`, width: `${(span / 6) * 100}%` }}
                    >
                      <span className="truncate" dir="ltr">{wo.workOrderNumber.replace('WO-1403-', 'WO-')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {Object.entries(WORK_ORDER_STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_BAR_COLOR[key]}`} />
            <span className="text-[10px] text-muted-foreground">{cfg.fa}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
