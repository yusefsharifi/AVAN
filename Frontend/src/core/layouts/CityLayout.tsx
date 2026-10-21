import { Outlet, useLocation } from 'react-router';
import { useTenantStore } from '../stores';
import { LayoutDashboard, Building2, CreditCard, Package, Truck, BarChart2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { LiveDot } from '@/shared/components/feedback';

export function CityLayout() {
  const { tenant } = useTenantStore();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, path: '/city/dashboard' },
    { id: 'accounting', label: 'حسابداری', icon: CreditCard, path: '/city/accounting' },
    { id: 'inventory', label: 'انبار', icon: Package, path: '/city/inventory' },
    { id: 'companies', label: 'شرکت‌ها', icon: Building2, path: '/city/companies' },
    { id: 'waybills', label: 'بارنامه‌ها', icon: Truck, path: '/city/waybills' },
    { id: 'reports', label: 'گزارشات', icon: BarChart2, path: '/city/reports' },
    { id: 'settings', label: 'تنظیمات', icon: Settings, path: '/city/settings' },
  ];

  return (
    <div className="h-full flex" dir="rtl">
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col flex-shrink-0 transition-all duration-300`}>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            {!sidebarCollapsed && (
              <div className="text-right">
                <p className="text-[9px] text-accent uppercase tracking-widest font-medium">CITY MANAGEMENT</p>
                <p className="text-sm font-bold text-white mt-0.5">{tenant.zoneName || 'شهرک صنعتی'}</p>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(s => !s)} aria-label={sidebarCollapsed ? 'باز کردن منو' : 'بستن منو'} className="p-1.5 rounded-lg hover:bg-sidebar-accent">
              {sidebarCollapsed ? <ChevronLeft className="w-4 h-4 text-sidebar-foreground" /> : <ChevronRight className="w-4 h-4 text-sidebar-foreground" />}
            </button>
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
                {!sidebarCollapsed && <span>{item.label}</span>}
                <Icon className="w-4 h-4 flex-shrink-0" />
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            {!sidebarCollapsed && (
              <div className="text-right">
                <p className="text-xs text-white font-semibold">{tenant.userName}</p>
                <p className="text-[10px] text-sidebar-foreground/70">مدیر شهرک</p>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
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
          <h1 className="text-base font-bold text-primary">{tenant.zoneName || 'شهرک صنعتی'}</h1>
        </header>
        <div className="flex-1 overflow-auto p-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
