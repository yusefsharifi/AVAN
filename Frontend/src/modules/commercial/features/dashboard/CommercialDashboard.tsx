// src/modules/commercial/features/dashboard/CommercialDashboard.tsx
import { FileText, ShoppingCart, AlertCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function CommercialDashboard() {
  const kpis = [
    { label: 'فروش این ماه',               value: '۴۸۰,۰۰۰,۰۰۰', sub: '+۱۲٪ نسبت به ماه قبل', icon: TrendingUp,   color: 'text-emerald-600 bg-emerald-50' },
    { label: 'خرید این ماه',               value: '۲۱۰,۰۰۰,۰۰۰', sub: '-۳٪ نسبت به ماه قبل',  icon: TrendingDown, color: 'text-blue-600 bg-blue-50'       },
    { label: 'مطالبات معوق',               value: '۹۵,۰۰۰,۰۰۰',  sub: '۳ فاکتور معوق',         icon: AlertCircle,  color: 'text-red-600 bg-red-50'         },
    { label: 'پیش‌فاکتور در انتظار تأیید', value: '۴',            sub: 'نیاز به بررسی',         icon: Clock,        color: 'text-amber-600 bg-amber-50'     },
  ];

  const recentProformas = [
    { num: 'PF-SALES-1403-0012', party: 'فولاد مبارکه', amount: '۱۲۰,۰۰۰,۰۰۰', status: 'در انتظار تأیید', sc: 'bg-amber-50 text-amber-700'    },
    { num: 'PF-SALES-1403-0011', party: 'ایران خودرو',  amount: '۳۵۰,۰۰۰,۰۰۰', status: 'پذیرفته شده',    sc: 'bg-emerald-50 text-emerald-700' },
    { num: 'PF-PUR-1403-0005',   party: 'پارس تأمین',   amount: '۸۵,۰۰۰,۰۰۰',  status: 'پیش‌نویس',       sc: 'bg-slate-100 text-slate-600'    },
    { num: 'PF-SALES-1403-0010', party: 'نوین تجارت',   amount: '۶۰,۰۰۰,۰۰۰',  status: 'تبدیل شده',      sc: 'bg-blue-50 text-blue-700'        },
  ];

  const expiring = [
    { num: 'PF-SALES-1403-0009', party: 'البرز صنعت', days: '۲ روز دیگر' },
    { num: 'PF-SALES-1403-0008', party: 'پترو شیمی',  days: '۵ روز دیگر' },
  ];

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <h1 className="text-lg font-bold text-foreground">داشبورد بازرگانی</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> پیش‌فاکتورهای اخیر
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['شماره', 'طرف تجاری', 'مبلغ (ریال)', 'وضعیت'].map(h => (
                  <th key={h} className="text-right pb-2 px-2 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentProformas.map(pf => (
                <tr key={pf.num} className="border-b border-border/40 last:border-0">
                  <td className="py-2 px-2 text-xs font-mono text-primary" dir="ltr">{pf.num}</td>
                  <td className="py-2 px-2 text-xs text-foreground">{pf.party}</td>
                  <td className="py-2 px-2 text-xs font-mono text-foreground" dir="ltr">{pf.amount}</td>
                  <td className="py-2 px-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pf.sc}`}>{pf.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> در حال انقضا
          </h2>
          {expiring.map(e => (
            <div key={e.num} className="p-3 rounded-lg bg-amber-50 border border-amber-100 space-y-1">
              <p className="text-xs font-mono text-amber-800" dir="ltr">{e.num}</p>
              <p className="text-xs text-amber-700">{e.party}</p>
              <p className="text-[11px] text-amber-600 font-medium">{e.days}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
