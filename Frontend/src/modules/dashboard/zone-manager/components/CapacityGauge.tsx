export const CapacityGauge = ({ pct, size = 56 }: { pct: number; size?: number }) => {
  const color = pct >= 90 ? "#DC2626" : pct >= 80 ? "#F2A541" : "#0E7C86";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2EAF0" strokeWidth="3.2" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.2"
          strokeDasharray={`${pct} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color }}>{pct}٪</span>
      </div>
    </div>
  );
};
