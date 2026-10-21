// src/modules/commercial/features/crm-lite/CreditLimitManager.tsx
import { useState } from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';

interface PartyCredit {
  id: string;
  name: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'blacklisted';
}

const MOCK: PartyCredit[] = [
  { id: 'p1', name: 'شرکت فولاد مبارکه',       creditLimit: 5_000_000_000,  currentBalance: 2_100_000_000, status: 'active' },
  { id: 'p3', name: 'گروه صنعتی ایران خودرو', creditLimit: 10_000_000_000, currentBalance: 8_500_000_000, status: 'active' },
  { id: 'p4', name: 'بازرگانی نوین تجارت',    creditLimit: 1_000_000_000,  currentBalance: 950_000_000,   status: 'active' },
];

export default function CreditLimitManager() {
  const [parties, setParties] = useState(MOCK);

  const utilColor = (u: number) =>
    u > 90 ? 'bg-red-500' : u > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  const utilTextColor = (u: number) =>
    u > 90 ? 'text-red-600' : u > 70 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div dir="rtl" className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-foreground">مدیریت سقف اعتبار</h1>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['نام شرکت', 'سقف اعتبار (ریال)', 'مانده (ریال)', 'درصد استفاده', 'عملیات'].map(h => (
                <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parties.map(p => {
              const util = Math.round((p.currentBalance / p.creditLimit) * 100);
              return (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="py-3 px-4 text-sm font-medium text-foreground">{p.name}</td>
                  <td className="py-3 px-4 text-xs font-mono text-foreground" dir="ltr">
                    {p.creditLimit.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-foreground" dir="ltr">
                    {p.currentBalance.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${utilColor(util)}`} style={{ width: `${util}%` }} />
                      </div>
                      <span className={`text-xs font-medium ${utilTextColor(util)}`}>{util}٪</span>
                      {util > 90 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setParties(prev =>
                        prev.map(x => x.id === p.id ? { ...x, status: x.status === 'active' ? 'blacklisted' : 'active' } : x)
                      )}
                      className={`text-[11px] px-2 py-1 rounded-lg border font-medium transition-colors ${
                        p.status === 'active'
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {p.status === 'active' ? 'بلاک‌لیست' : 'فعال‌سازی'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
