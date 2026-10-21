// src/modules/commercial/features/crm-lite/PartyList.tsx
import { useState } from 'react';
import { Search, Plus, Users, Building2, Phone, Mail } from 'lucide-react';

interface Party {
  id: string;
  name: string;
  code: string;
  type: 'customer' | 'supplier' | 'both';
  phone?: string;
  email?: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'inactive' | 'blacklisted';
}

const MOCK_PARTIES: Party[] = [
  { id: 'p1', name: 'شرکت فولاد مبارکه', code: 'C-001', type: 'customer', phone: '۰۳۱-۳۳۳۳۳۳۳۳', email: 'info@foolad.ir', creditLimit: 5_000_000_000, currentBalance: 2_100_000_000, status: 'active' },
  { id: 'p2', name: 'تأمین‌کننده مواد اولیه پارس', code: 'S-001', type: 'supplier', phone: '۰۲۱-۴۴۴۴۴۴۴۴', email: 'supply@pars.ir', creditLimit: 0, currentBalance: 0, status: 'active' },
  { id: 'p3', name: 'گروه صنعتی ایران خودرو', code: 'C-002', type: 'both', phone: '۰۲۱-۵۵۵۵۵۵۵۵', email: 'b2b@ikco.ir', creditLimit: 10_000_000_000, currentBalance: 8_500_000_000, status: 'active' },
  { id: 'p4', name: 'بازرگانی نوین تجارت', code: 'C-003', type: 'customer', phone: '۰۲۱-۶۶۶۶۶۶۶۶', email: 'info@novin.ir', creditLimit: 1_000_000_000, currentBalance: 950_000_000, status: 'active' },
  { id: 'p5', name: 'واردات و صادرات البرز', code: 'S-002', type: 'supplier', phone: '۰۲۶-۷۷۷۷۷۷۷۷', email: 'alborz@trade.ir', creditLimit: 0, currentBalance: 0, status: 'inactive' },
];

const typeLabel = (t: Party['type']) =>
  t === 'customer' ? 'مشتری' : t === 'supplier' ? 'تأمین‌کننده' : 'هر دو';

const typeBadge = (t: Party['type']) =>
  t === 'customer' ? 'bg-blue-50 text-blue-700' :
  t === 'supplier' ? 'bg-purple-50 text-purple-700' :
  'bg-teal-50 text-teal-700';

const statusBadge = (s: Party['status']) =>
  s === 'active' ? 'bg-emerald-50 text-emerald-700' :
  s === 'blacklisted' ? 'bg-red-50 text-red-700' :
  'bg-slate-100 text-slate-500';

const statusLabel = (s: Party['status']) =>
  s === 'active' ? 'فعال' : s === 'blacklisted' ? 'بلاک‌لیست' : 'غیرفعال';

export default function PartyList() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Party['type']>('all');

  const filtered = MOCK_PARTIES.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.code.includes(search);
    const matchType = typeFilter === 'all' || p.type === typeFilter || p.type === 'both';
    return matchSearch && matchType;
  });

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" /> مشتریان و تأمین‌کنندگان
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus className="w-4 h-4" /> افزودن طرف تجاری
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو در نام یا کد..."
            className="w-full bg-card border border-border rounded-lg py-2 pr-9 pl-3 text-sm text-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {(['all', 'customer', 'supplier', 'both'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'همه' : typeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'مشتریان فعال', value: MOCK_PARTIES.filter(p => p.type !== 'supplier' && p.status === 'active').length, color: 'text-blue-600' },
          { label: 'تأمین‌کنندگان', value: MOCK_PARTIES.filter(p => p.type !== 'customer').length, color: 'text-purple-600' },
          { label: 'کل طرف‌های تجاری', value: MOCK_PARTIES.length, color: 'text-foreground' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['نام شرکت', 'کد', 'نوع', 'تلفن', 'اعتبار مجاز', 'مانده', 'وضعیت'].map(h => (
                <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const util = p.creditLimit > 0 ? (p.currentBalance / p.creditLimit) * 100 : 0;
              return (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground" dir="ltr">{p.code}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeBadge(p.type)}`}>
                      {typeLabel(p.type)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{p.phone ?? '—'}</td>
                  <td className="py-3 px-4 text-xs text-foreground">
                    {p.creditLimit > 0 ? p.creditLimit.toLocaleString('fa-IR') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {p.creditLimit > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-foreground">{p.currentBalance.toLocaleString('fa-IR')}</div>
                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${util > 90 ? 'bg-red-500' : util > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">نتیجه‌ای یافت نشد</div>
        )}
      </div>
    </div>
  );
}
