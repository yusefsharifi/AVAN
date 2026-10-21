interface StatusBadgeProps {
  label: string;
  color: string;
  bg: string;
}

export function StatusBadge({ label, color, bg }: StatusBadgeProps) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color} ${bg}`}>
      {label}
    </span>
  );
}
