import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, BarChart3, FileText, Handshake, Send, Store } from 'lucide-react';

const companyItems = [
  { label: 'داشبورد بازارگاه', path: '/portal/marketplace', icon: BarChart3 },
  { label: 'درخواست‌های خرید', path: '/portal/marketplace/rfqs', icon: FileText },
  { label: 'فرصت‌های فروش', path: '/portal/marketplace/bids/opportunities', icon: Store },
  { label: 'پیشنهادات من', path: '/portal/marketplace/bids', icon: Send },
];

export function B2BSidebar({ parkView = false }: { parkView?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = parkView
    ? [{ label: 'آمار تجمیعی بازارگاه', path: '/city/marketplace', icon: BarChart3 }]
    : companyItems;

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-2 text-xs" dir="rtl">
      <div className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-between text-white">
          <Handshake className="h-5 w-5 text-sidebar-primary" />
          <div className="text-right">
            <p className="font-bold">بازارگاه صنعتی</p>
            <p className="mt-1 text-[10px] text-sidebar-primary">
              {parkView ? 'نمای مدیریت شهرک' : 'خرید و فروش B2B'}
            </p>
          </div>
        </div>
      </div>
      <nav className="mt-2 space-y-1">
        <button
          onClick={() => navigate('/company')}
          className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sidebar-foreground/80 hover:bg-sidebar-accent border border-sidebar-border"
        >
          <span>بازگشت به پرتال شرکت</span>
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="my-1 border-t border-sidebar-border" />
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              className={`flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-2 text-right ${active ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}
              key={item.path}
              onClick={() => navigate(item.path)}
            >
              <span>{item.label}</span>
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </nav>
      <p className="mt-auto p-3 text-[10px] text-sidebar-foreground/60">پیشنهادها در مرحله sealed bid محرمانه هستند.</p>
    </aside>
  );
}
export default B2BSidebar;
