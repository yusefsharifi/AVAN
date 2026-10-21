interface OeeGaugeProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 64, md: 88, lg: 120 };

export default function OeeGauge({ value, label, size = 'md' }: OeeGaugeProps) {
  const dim = SIZE_MAP[size];
  const stroke = dim * 0.11;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  const color = clamped > 85 ? '#059669' : clamped >= 70 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={dim * 0.22} fontWeight="bold" fill="var(--foreground)" dir="ltr">
          {Math.round(clamped)}٪
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}
