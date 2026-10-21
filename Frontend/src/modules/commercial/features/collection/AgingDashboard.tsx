// src/modules/commercial/features/collection/AgingDashboard.tsx
import { AlertCircle, TrendingDown, Clock, CheckCircle } from 'lucide-react';

const MOCK_CASES = [
  { partyName: 'شرکت فولاد مبارکه',    bucket: 'current', amount: 45_000_000,  days: 0  },
  { partyName: 'گروه صنعتی ایران خودرو', bucket: '1-30',   amount: 82_000_000,  days: 18 },
  { partyName: 'بازرگانی نوین تجارت',   bucket: '31-60',  amount: 31_000_000,  days: 45 },
  { partyName: 'پترو شیمی البرز',       bucket: '61-90',  amount: 19_500_000,  days: 72 },
  { partyName: 'صنایع سبز ایران',       bucket: '90+',    amount: 12_000_000,  days: 105 },
];

const BUCKETS = [
  { key: 'current', label: 'جاری',     color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: '1-30',    label: '۱-۳۰ روز', color: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  { key: '31-60',   label: '۳۱-۶۰ روز',color: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
  { key: '61-90',   label: '۶۱-۹۰ روز',color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50'     },
  { key: '90+',     label: '۹۰+ روز',  color: 'bg-red-800',     text: 'text-red-900',     bg: 'bg-red-100'    },
];

export default function AgingDashboard() {
  const total = MOCK_CASES.reduce((s, c) => s + c.amount, 0);

  const byBucket = BUCKETS.map(b => ({
    ...b,
    cases: MOCK_CASES.filter(c => c.bucket === b.key),
    amount: MOCK_CASES.filter(c => c.bucket === b.key).reduce((s, c) => s + c.amount, 0),
  }));

  const kpis = [
    { label: 'کل مطالبات',      value: total.toLocaleString('fa-IR'),       icon: TrendingDown, color: 'text-foreground bg-secondary'      },
    { label: 'جاری (به موقع)',  value: byBucket[0].amount.toLocaleString('fa-IR'), icon: CheckCircle,  color: 'text-emerald-700 bg-emerald-50'  },
    { label: '۱-۳۰ روز معوق',  value: byBucket[1].amount.toLocaleString('fa-IR'), icon: Clock,        color: 'text-amber-700 bg-amber-50'      },
    { label: '۹۰+ روز بحرانی', value: byBucket[4].amount.toLocaleString('fa-IR'), icon: AlertCircle,  color: 'text-red-700 bg-red-50'          },
  ];

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" /> داشبورد وصول مطالبات
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label} (ریال)</p>
            </div>
          );
        })}
      </div>

      {/* Aging Matrix */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-foreground">ماتریس سنی مطالبات</h2>
        <div className="grid grid-cols-5 gap-2">
          {byBucket.map(b => (
            <div key={b.key} className={`rounded-lg p-3 text-center ${b.bg} border border-border/30`}>
              <p className={`text-xs font-semibold mb-1 ${b.text}`}>{b.label}</p>
              <p className={`text-base font-bold ${b.text}`}>{b.cases.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {b.amount.toLocaleString('fa-IR')}
              </p>
              <div className={`mt-2 h-1.5 rounded-full ${b.color}`}
                style={{ width: `${total > 0 ? Math.round((b.amount / total) * 100) : 0}%`, minWidth: '8px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Overdue list */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-foreground">لیست مطالبات معوق</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['طرف تجاری', 'مبلغ (ریال)', 'روزهای تأخیر', 'دسته'].map(h => (
                <th key={h} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_CASES.filter(c => c.bucket !== 'current').map((c, i) => {
              const b = BUCKETS.find(b => b.key === c.bucket)!;
              return (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="py-2 px-3 text-sm text-foreground">{c.partyName}</td>
                  <td className="py-2 px-3 text-xs font-mono text-foreground" dir="ltr">
                    {c.amount.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-2 px-3 text-xs text-foreground">{c.days} روز</td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.bg} ${b.text}`}>
                      {b.label}
                    </span>
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
