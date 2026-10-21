import { RefreshCw, Download, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LiveDot } from '@/shared/components/feedback';
import { NotificationBell } from './NotificationBell';
import { useAuthStore } from '../stores';

export function TopBar() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-sidebar border-b border-sidebar-border px-4 py-2 flex items-center justify-between flex-shrink-0 z-50">
      <div className="flex items-center gap-2 ml-auto" dir="ltr">
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">LIVE</span>
        </div>
        <span className="text-[10px] text-sidebar-foreground/40">|</span>
        <span className="text-[10px] text-accent font-mono">AVAN v2.4.1</span>
        <span className="text-[10px] text-sidebar-foreground/40">|</span>
        <span className="text-[10px] text-sidebar-foreground/60 font-mono">24 zones · 4,820 devices</span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1.5 transition-colors">
          <Download className="w-3.5 h-3.5" />
          <span>گزارش ملی</span>
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-accent">A</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-white">آوان</span>
          <span className="text-[9px] text-accent mr-1">AVAN</span>
          {user && (
            <span className="text-[9px] text-sidebar-foreground/70 mr-1">· {user.firstName} {user.lastName}</span>
          )}
        </div>
      </div>
    </div>
  );
}