// src/modules/commercial/features/orders/OrderList.tsx
import { useState } from 'react';
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';

const STATUS_PIPELINE = [
  { key: 'confirmed',        label: 'تأیید شده'      },
  { key: 'in_production',    label: 'در تولید'        },
  { key: 'ready_to_ship',    label: 'آماده ارسال'     },
  { key: 'shipped',          label: 'ارسال شده'       },
  { key: 'fully_received',   label: 'دریافت کامل'    },
  { key: 'invoiced',         label: 'فاکتور صادر شد' },
];

const STATUS_COLOR: Record<string, string> = {
  draft:            'bg-slate-100 text-slate-600',
  confirmed:        'bg-blue-50 text-blue-700',
  in_production:    'bg-amber-50 text-amber-700',
  ready_to_ship:    'bg-purple-50 text-purple-700',
  shipped:          'bg-indigo-50 text-indigo-700',
  partially_received: 'bg-orange-50 text-orange-700',
  fully_received:   'bg-teal-50 text-teal-700',
  invoiced:         'bg-emerald-50 text-emerald-700',
  closed:           'bg-slate-100 text-slate-500',
  cancelled:        'bg-red-50 text-red-600',
};

export default function OrderList() {
  const { orders, updateOrderStatus } = useCommercialStore();
  const [dirFilter, setDirFilter]       = useState<'all' | 'sales' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch]             = useState('');

  const filtered = orders.filter(o => {
    if (dirFilter !== 'all' && o.direction !== dirFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search && !o.orderNumber.includes(search) && !o.partyName.includes(search)) return false;
    return true;
  });

  const pipelineCounts = STATUS_PIPELINE.map(s => ({
    ...s,
    count: orders.filter(o => o.status === s.key).length,
  }));

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> مدیریت سفارشات
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus className="w-4 h-4" /> سفارش جدید
        </button>
      </div>

      {/* Pipeline funnel */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground mb-3">خط لوله سفارشات</p>
        <div className="flex items-center gap-1 overflow-x-auto">
          {pipelineCounts.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-colors text-center min-w-[80px] ${
                  statusFilter === s.key ? 'border-accent bg-accent/10' : 'border-border hover:bg-secondary/50'
                }`}
              >
                <span className="text-lg font-bold text-foreground">{s.count}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{s.label}</span>
              </button>
              {i < pipelineCounts.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="جستجو شماره سفارش یا طرف تجاری..."
          className="bg-card border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent w-64"
        />
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {(['all', 'sales', 'purchase'] as const).map(d => (
            <button key={d} onClick={() => setDirFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dirFilter === d ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {d === 'all' ? 'همه' : d === 'sales' ? 'فروش' : 'خرید'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['شماره سفارش', 'طرف تجاری', 'جهت', 'مبلغ کل (ریال)', 'تاریخ تحویل', 'وضعیت', 'عملیات'].map(h => (
                <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-4 text-xs font-mono text-primary" dir="ltr">{o.orderNumber}</td>
                <td className="py-3 px-4 text-sm text-foreground">{o.partyName}</td>
                <td className="py-3 px-4">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    o.direction === 'sales' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {o.direction === 'sales' ? 'فروش' : 'خرید'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-foreground" dir="ltr">
                  {o.grandTotal.toLocaleString('fa-IR')}
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{o.deliveryDate}</td>
                <td className="py-3 px-4">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_PIPELINE.find(s => s.key === o.status)?.label ?? o.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {o.status === 'draft' && (
                      <button
                        onClick={() => updateOrderStatus(o.id, 'confirmed')}
                        className="text-[11px] px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        تأیید
                      </button>
                    )}
                    {o.status === 'fully_received' && (
                      <button
                        onClick={() => updateOrderStatus(o.id, 'invoiced')}
                        className="text-[11px] px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        صدور فاکتور
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">سفارشی یافت نشد</div>
        )}
      </div>
    </div>
  );
}
