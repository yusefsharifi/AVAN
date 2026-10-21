import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiWidgetProps {
  label: string;
  labelFa: string;
  value: number | string;
  unit?: string;
  change?: number;
  icon: React.ElementType;
  color: string;
}

export function KpiWidget({ labelFa, value, unit, change, icon: Icon, color }: KpiWidgetProps) {
  const TrendIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : Minus;
  const trendColor = change && change > 0 ? 'text-emerald-600' : change && change < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-[10px] font-medium">{Math.abs(change)}٪</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xl font-bold text-foreground" dir="ltr">{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}{unit && <span className="text-xs text-muted-foreground mr-1">{unit}</span>}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{labelFa}</p>
      </div>
    </div>
  );
}
