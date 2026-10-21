import { useState } from 'react';
import { useInventoryStore } from '../../store';
import { LOT_STATUS_CONFIG } from '../../constants';
import { Boxes, AlertTriangle, Search } from 'lucide-react';

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function LotTracking() {
  const { lots, items } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const filtered = lots
    .filter((l) => !itemFilter || l.itemId === itemFilter)
    .filter((l) => !search || l.lotNumber.toLowerCase().includes(search.toLowerCase()) || (l.supplierName ?? '').includes(search))
    // FEFO: First-Expired-First-Out ordering
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });

  const expiringSoon = lots.filter((l) => { const d = daysUntil(l.expiryDate); return d !== null && d >= 0 && d <= 30; }).length;
  const expired = lots.filter((l) => { const d = daysUntil(l.expiryDate); return d !== null && d < 0; }).length;
  const activeLots = lots.filter((l) => l.status === 'available').length;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">ردیابی بچ / سریال (Lot &amp; Serial)</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">بچ‌های فعال</p>
          <p className="text-lg font-bold text-emerald-600" dir="ltr">{activeLots}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">در آستانه انقضا (۳۰ روز)</p>
          <p className="text-lg font-bold text-amber-600" dir="ltr">{expiringSoon}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">منقضی‌شده</p>
          <p className="text-lg font-bold text-red-600" dir="ltr">{expired}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="جستجوی شماره بچ، تأمین‌کننده..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" dir="rtl" />
          </div>
          <select value={itemFilter} onChange={e => setItemFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
            <option value="">همه اقلام</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
          </select>
        </div>

        <p className="text-[11px] text-muted-foreground mb-2">مرتب‌سازی بر اساس FEFO (اول‌انقضا، اول‌خروج) — بچ‌هایی که زودتر منقضی می‌شوند بالای فهرست قرار دارند.</p>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['وضعیت', 'انقضا', 'موجودی باقیمانده', 'بهای واحد', 'تأمین‌کننده', 'کالا', 'شماره بچ'].map(h => (
                <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lot) => {
              const item = items.find((i) => i.id === lot.itemId);
              const statusCfg = LOT_STATUS_CONFIG[lot.status];
              const d = daysUntil(lot.expiryDate);
              const isExpiringSoon = d !== null && d >= 0 && d <= 30;
              const isExpired = d !== null && d < 0;
              return (
                <tr key={lot.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span></td>
                  <td className="py-2.5 px-3">
                    {lot.expiryDate ? (
                      <span className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`} dir="ltr">
                        {(isExpired || isExpiringSoon) && <AlertTriangle className="w-3 h-3" />}{lot.expiryDate}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{lot.remainingQuantity} / {lot.initialQuantity}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{lot.unitCost.toLocaleString('fa-IR')}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{lot.supplierName ?? '—'}</td>
                  <td className="py-2.5 px-3 text-xs text-foreground">{item?.nameFa ?? lot.itemId}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-primary" dir="ltr">{lot.lotNumber}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <Boxes className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">بچی یافت نشد</p>
          </div>
        )}
      </div>
    </div>
  );
}
