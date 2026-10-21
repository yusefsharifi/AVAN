import { Outlet, useLocation } from 'react-router';
import { useTenantStore } from '../stores';
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { LiveDot } from '@/shared/components/feedback';
import { ThemeSwitcher } from '@/core/components/ThemeSwitcher';

export function SuperAdminLayout() {
  const { tenant } = useTenantStore();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="h-full flex" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col flex-shrink-0 transition-all duration-300`}>
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 text-right">
              <img src="/avan-logo.png" alt="آوان" className="h-8 w-8 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' }} />
              <div>
                <p className="text-[9px] text-sidebar-primary uppercase tracking-widest font-medium">SUPER ADMIN</p>
                <p className="text-sm font-bold text-white mt-0.5">پنل ملی آوان</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(s => !s)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70">
            {sidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
            <a href="/super-admin/dashboard" aria-current={isActive('/super-admin/dashboard') ? 'page' : undefined} className={`flex h-12 w-full items-center gap-3 justify-end rounded-lg px-3 text-sm transition-colors ${isActive('/super-admin/dashboard') ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}>
            {!sidebarCollapsed && <span>داشبورد</span>}
            <Globe className="w-4 h-4 flex-shrink-0" />
          </a>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            {!sidebarCollapsed && (
              <div className="text-right">
                <p className="text-xs text-white font-semibold">{tenant.userName}</p>
                <p className="text-[10px] text-sidebar-foreground/70">مدیر سیستم ملی</p>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">م</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-primary/5 border border-border rounded-lg px-3 py-1.5">
              <LiveDot />
              <span className="text-xs font-semibold text-foreground">۱۲۴ شهرک فعال</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-primary">پنل ملی آوان</h1>
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
