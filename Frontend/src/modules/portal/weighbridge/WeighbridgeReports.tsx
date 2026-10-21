import { DAILY_THROUGHPUT, COMMODITY_BREAKDOWN, DISCREPANCY_TREND, OPERATOR_PERF } from "./mockData";

/* ── Bar Chart ──────────────────────────────────────────────────────── */

function BarChart() {
  const max = Math.max(...DAILY_THROUGHPUT.map((d) => d.count));
  const barW = 36, gap = 12, h = 140;
  const totalW = DAILY_THROUGHPUT.length * (barW + gap);

  return (
    <svg viewBox={`0 0 ${totalW + 20} ${h + 30}`} className="w-full">
      {DAILY_THROUGHPUT.map((d, i) => {
        const bh = (d.count / max) * h;
        const x = i * (barW + gap) + 10;
        return (
          <g key={d.day}>
            <rect x={x} y={h - bh + 10} width={barW} height={bh} rx="4" fill="#0E7C86" opacity={0.85} />
            <text x={x + barW / 2} y={h - bh + 5} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{d.count}</text>
            <text x={x + barW / 2} y={h + 22} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Donut Chart ────────────────────────────────────────────────────── */

function DonutChart() {
  const total = COMMODITY_BREAKDOWN.reduce((s, c) => s + c.value, 0);
  const cx = 90, cy = 80, r = 55, inner = 35;
  let cumAngle = -90;

  const arcs = COMMODITY_BREAKDOWN.map((c) => {
    const angle = (c.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const ix1 = cx + inner * Math.cos(toRad(endAngle));
    const iy1 = cy + inner * Math.sin(toRad(endAngle));
    const ix2 = cx + inner * Math.cos(toRad(startAngle));
    const iy2 = cy + inner * Math.sin(toRad(startAngle));
    const large = angle > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z`;
    return { d, color: c.color, name: c.name, value: c.value, pct: ((c.value / total) * 100).toFixed(0) };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 180 160" className="w-[180px] flex-shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">مجموع</text>
      </svg>
      <div className="space-y-1.5">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: a.color }} />
            <span className="text-blue-200/70">{a.name}</span>
            <span className="text-white font-bold mr-auto">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line Chart ─────────────────────────────────────────────────────── */

function LineChart() {
  const max = Math.max(...DISCREPANCY_TREND.map((d) => d.avg));
  const w = 300, h = 120, pad = 20;
  const points = DISCREPANCY_TREND.map((d, i) => {
    const x = pad + (i / (DISCREPANCY_TREND.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.avg / max) * (h - pad * 2);
    return { x, y, ...d };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 10}`} className="w-full">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2A541" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F2A541" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={lineD} fill="none" stroke="#F2A541" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#F2A541" />
          <text x={p.x} y={h + 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7">{p.week}</text>
          <text x={p.x} y={p.y - 7} textAnchor="middle" fill="white" fontSize="8">{p.avg}%</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Reports Panel ──────────────────────────────────────────────────── */

export default function WeighbridgeReports() {
  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Daily Throughput */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white mb-3">بار روزانه (تعداد وزن‌کشی)</p>
        <BarChart />
      </div>

      {/* Commodity Breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white mb-3">ترکیب کالا</p>
        <DonutChart />
      </div>

      {/* Discrepancy Trend */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white mb-3">روند اختلاف وزن</p>
        <LineChart />
      </div>

      {/* Operator Performance */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-bold text-white mb-3">عملکرد اپراتورها</p>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-blue-300/40 border-b border-white/5">
              <th className="text-right py-1.5 px-2">نام</th>
              <th className="text-right py-1.5 px-2">جلسات</th>
              <th className="text-right py-1.5 px-2">میانگین زمان</th>
              <th className="text-right py-1.5 px-2">اختلاف</th>
              <th className="text-right py-1.5 px-2">دقت</th>
            </tr>
          </thead>
          <tbody>
            {OPERATOR_PERF.map((op) => (
              <tr key={op.name} className="border-t border-white/5">
                <td className="py-2 px-2 text-white font-medium">{op.name}</td>
                <td className="py-2 px-2 text-white">{op.sessions}</td>
                <td className="py-2 px-2 text-blue-200/70">{op.avgTime} دقیقه</td>
                <td className="py-2 px-2">
                  <span className={op.discrepancies > 0 ? "text-red-400" : "text-emerald-400"}>
                    {op.discrepancies}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${op.accuracy}%`, background: op.accuracy >= 90 ? "#10B981" : op.accuracy >= 70 ? "#F59E0B" : "#EF4444" }} />
                    </div>
                    <span className="text-white text-[10px]">{op.accuracy}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
