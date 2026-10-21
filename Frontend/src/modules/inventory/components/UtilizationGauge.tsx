interface UtilizationGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

export function UtilizationGauge({ value, size = 56, label }: UtilizationGaugeProps) {
  const color = value >= 90 ? '#DC2626' : value >= 70 ? '#F2A541' : '#0E7C86';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2EAF0" strokeWidth="3.2" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.2"
          strokeDasharray={`${value} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color }}>{Math.round(value)}٪</span>
        {label && <span className="text-[8px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
