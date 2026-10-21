import { Outlet } from 'react-router';
import { useTenantStore } from '../stores';
import { Shield, Eye, Users, AlertTriangle } from 'lucide-react';
import { LiveDot } from '@/shared/components/feedback';

export function SecurityLayout() {
  const { tenant } = useTenantStore();

  const navItems = [
    { id: 'validation', label: 'اعتبارسنجی', icon: Shield, path: '/security/validation' },
    { id: 'gate-control', label: 'کنترل دروازه', icon: Eye, path: '/security/gate-control' },
    { id: 'alerts', label: 'هشدارها', icon: AlertTriangle, path: '/security/alerts' },
    { id: 'visitors', label: 'بازدیدکنندگان', icon: Users, path: '/security/visitors' },
  ];

  return (
    <div className="h-full flex" dir="rtl">
      <aside className="w-56 bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <p className="text-[9px] text-sidebar-primary uppercase tracking-widest font-medium">SECURITY</p>
              <p className="text-sm font-bold text-white mt-0.5">پرتال حراست</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-sidebar-primary" />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={item.path}
                className="w-full flex items-center gap-3 justify-end px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors">
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
              <p className="text-[10px] text-sidebar-foreground/70">افسر حراست</p>
            </div>
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
              <span className="text-xs text-emerald-700 font-semibold">آنلاین</span>
            </div>
          </div>
          <h1 className="text-base font-bold text-primary">پرتال حراست</h1>
        </header>
        <div className="flex-1 overflow-auto p-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
