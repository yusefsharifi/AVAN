// src/modules/commercial/features/crm-lite/PartyProfile.tsx
import { useState } from 'react';
import { Building2, Phone, Mail, CreditCard, FileText, ShoppingCart, AlertCircle } from 'lucide-react';

export default function PartyProfile({ partyId }: { partyId?: string }) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'receivables' | 'contracts' | 'info'>('transactions');

  const tabs = [
    { id: 'transactions' as const, label: 'سابقه معاملات' },
    { id: 'receivables'  as const, label: 'مطالبات' },
    { id: 'contracts'    as const, label: 'قراردادها' },
    { id: 'info'         as const, label: 'اطلاعات پایه' },
  ];

  return (
    <div dir="rtl" className="p-6 space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">شرکت فولاد مبارکه</h2>
          <p className="text-xs text-muted-foreground mt-0.5">کد: C-001 · مشتری</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">فعال</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t.id ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">سابقه معاملات</h3>
            {[
              { num: 'PF-SALES-1403-0001', type: 'پیش‌فاکتور', amount: '۱۲۰,۰۰۰,۰۰۰', date: '۱۴۰۳/۰۴/۱۰', status: 'تبدیل شده' },
              { num: 'SO-1403-0001', type: 'سفارش فروش', amount: '۱۲۰,۰۰۰,۰۰۰', date: '۱۴۰۳/۰۴/۱۵', status: 'در جریان' },
            ].map(tx => (
              <div key={tx.num} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{tx.status}</span>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{tx.num}</p>
                  <p className="text-[11px] text-muted-foreground">{tx.type} · {tx.date}</p>
                </div>
                <p className="text-xs font-mono text-foreground">{tx.amount} ریال</p>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'receivables' && (
          <div className="text-center text-muted-foreground py-8 text-sm">اطلاعات مطالبات در حال بارگذاری...</div>
        )}
        {activeTab === 'contracts' && (
          <div className="text-center text-muted-foreground py-8 text-sm">قراردادی ثبت نشده است</div>
        )}
        {activeTab === 'info' && (
          <div className="space-y-3">
            {[
              { label: 'تلفن', value: '۰۳۱-۳۳۳۳۳۳۳۳', icon: Phone },
              { label: 'ایمیل', value: 'info@foolad.ir', icon: Mail },
              { label: 'سقف اعتبار', value: '۵,۰۰۰,۰۰۰,۰۰۰ ریال', icon: CreditCard },
            ].map(row => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs text-foreground">{row.value}</span>
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
