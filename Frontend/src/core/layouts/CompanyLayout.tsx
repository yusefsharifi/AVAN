import { Outlet, useLocation } from 'react-router';
import { useTenantStore } from '../stores';
import { Building2, CreditCard, Package, Truck, FileText, BarChart2 } from 'lucide-react';
import { LiveDot } from '@/shared/components/feedback';
import { ThemeSwitcher } from '@/core/components/ThemeSwitcher';

export function CompanyLayout() {
  const { tenant } = useTenantStore();
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: Building2, path: '/company/dashboard' },
    { id: 'accounting', label: 'حسابداری', icon: CreditCard, path: '/company/accounting' },
    { id: 'inventory', label: 'انبار', icon: Package, path: '/company/inventory' },
    { id: 'waybills', label: 'بارنامه‌ها', icon: Truck, path: '/company/waybills' },
    { id: 'purchase', label: 'سفارش خرید', icon: FileText, path: '/company/purchase' },
    { id: 'reports', label: 'گزارشات', icon: BarChart2, path: '/company/reports' },
  ];

  return (
    <div className="h-full flex" dir="rtl">
      <aside className="w-56 bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <p className="text-[9px] text-accent uppercase tracking-widest font-medium">COMPANY PORTAL</p>
              <p className="text-sm font-bold text-white mt-0.5">{tenant.companyName || 'شرکت'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={item.path}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`flex h-12 w-full items-center gap-3 justify-end rounded-lg px-3 text-sm transition-colors ${
                  isActive(item.path)
                    ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                }`}>
                <span>{item.label}</span>
                <Icon className="w-4 h-4 flex-shrink-0" />
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <p className="text-xs text-white font-semibold">{tenant.userName}</p>
              <p className="text-[10px] text-sidebar-foreground/70">مدیر شرکت</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">{tenant.userName?.charAt(0)}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <LiveDot />
              <span className="text-xs text-emerald-700 font-semibold">عملیاتی</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-primary">{tenant.companyName || 'شرکت'}</h1>
            <ThemeSwitcher />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
