import type { InventoryItem } from '../types';
import { ITEM_STATUS_CONFIG, ABC_CONFIG } from '../constants';

interface StockCardProps {
  item: InventoryItem;
}

export function StockCard({ item }: StockCardProps) {
  const statusCfg = ITEM_STATUS_CONFIG[item.status as keyof typeof ITEM_STATUS_CONFIG] || { fa: item.status, color: 'text-slate-600', bg: 'bg-slate-100' };
  const abcCfg = ABC_CONFIG[item.abcClass];
  const stockPct = item.maxStockLevel > 0 ? (item.totalQuantity / item.maxStockLevel) * 100 : 0;
  const isLow = item.totalQuantity <= item.reorderPoint;

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-mono text-primary" dir="ltr">{item.sku}</p>
          <h3 className="text-sm font-bold text-foreground mt-0.5">{item.nameFa}</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${abcCfg.color} ${abcCfg.bg}`}>{abcCfg.fa}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">موجودی</span>
          <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-foreground'}`} dir="ltr">{item.totalQuantity.toLocaleString('fa-IR')} {item.uom}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${stockPct > 90 ? 'bg-red-500' : stockPct > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(stockPct, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">رزرو: {item.reservedQuantity.toLocaleString('fa-IR')}</span>
          <span className="text-muted-foreground">قابل استفاده: {item.availableQuantity.toLocaleString('fa-IR')}</span>
        </div>
      </div>
      {isLow && (
        <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
          <p className="text-[10px] text-red-700 font-medium">⚠️ موجودی کمتر از نقطه سفارش مجدد</p>
        </div>
      )}
    </div>
  );
}
