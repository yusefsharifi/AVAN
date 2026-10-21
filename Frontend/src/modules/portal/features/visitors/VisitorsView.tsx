import { useState } from 'react';
import { Plus, Download, QrCode, Clock } from 'lucide-react';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  host: string;
  purpose: string;
  date: string;
  time: string;
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'expired';
}

const MOCK_VISITORS: Visitor[] = [
  { id: 'V-001', name: 'محسن قربانی', phone: '۰۹۱۲۱۲۳۴۵۶۷', host: 'علیرضا صادقی', purpose: 'بازدید فنی', date: '۱۴۰۳/۰۴/۱۶', time: '۱۰:۳۰', status: 'scheduled' },
  { id: 'V-002', name: 'سارا کاظمی', phone: '۰۹۳۵۷۶۵۴۳۲۱', host: 'رضا کریمی', purpose: 'جلسه قرارداد', date: '۱۴۰۳/۰۴/۱۶', time: '۰۹:۰۰', status: 'checked_in' },
  { id: 'V-003', name: 'حامد رستمی', phone: '۰۹۱۹۸۸۷۷۶۶۵', host: 'احمد کریمی', purpose: 'بازرسی ایمنی', date: '۱۴۰۳/۰۴/۱۵', time: '۱۳:۰۰', status: 'checked_out' },
];

export function VisitorsView() {
  const [statusFilter, setStatusFilter] = useState('');
  const filtered = MOCK_VISITORS.filter(v => !statusFilter || v.status === statusFilter);

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">مهمانان</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>مهمان جدید</span></button>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">
            {['عملیات', 'وضعیت', 'زمان', 'تاریخ', 'هدف', 'میزبان', 'نام'].map(h => <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3"><button className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><QrCode className="w-4 h-4" /></button></td>
                <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700' : v.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>{v.status === 'checked_in' ? 'در محوطه' : v.status === 'scheduled' ? 'زمان‌بندی' : 'خروج ثبت‌شده'}</span></td>
                <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{v.time}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{v.date}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{v.purpose}</td>
                <td className="py-3 px-3 text-xs text-foreground">{v.host}</td>
                <td className="py-3 px-3 text-sm font-semibold text-foreground">{v.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
