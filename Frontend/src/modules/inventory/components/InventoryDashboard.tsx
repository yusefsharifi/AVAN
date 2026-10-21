import { useInventoryStore } from '../store';
import { Package, AlertTriangle, Clock, TrendingUp, Warehouse, CheckCircle } from 'lucide-react';

export function InventoryDashboard() {
  const { getStockSummary, warehouses } = useInventoryStore();
  const summary = getStockSummary();

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">داشبورد انبارداری</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'کل کالاها', value: summary.totalItems, icon: Package, color: 'bg-blue-50 text-blue-600' },
          { label: 'ارزش موجودی', value: `${(summary.totalValue / 1000000).toFixed(0)}M`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'کم‌موجود', value: summary.lowStockItems, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
          { label: 'قرنطینه', value: summary.expiredLots, icon: Clock, color: 'bg-red-50 text-red-600' },
          { label: 'انبارها', value: warehouses.length, icon: Warehouse, color: 'bg-purple-50 text-purple-600' },
          { label: 'GRN فعال', value: summary.activeGRNs, icon: CheckCircle, color: 'bg-teal-50 text-teal-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl border border-border p-4">
            <div className={`p-2 rounded-lg ${kpi.color} w-fit mb-2`}><kpi.icon className="w-4 h-4" /></div>
            <p className="text-xl font-bold text-foreground" dir="ltr">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
