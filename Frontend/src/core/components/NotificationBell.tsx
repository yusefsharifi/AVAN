import { useState, useRef, useEffect } from 'react';
import {
  Bell, Mail, AlertTriangle, CheckCircle2, XCircle, FileText,
  Archive, Star, LayoutTemplate, QrCode, Building2, X, Check,
} from 'lucide-react';
import { useNotificationHub } from '../notifications/useNotificationHub';
import type { HubNotification, NotificationModule } from '../notifications/useNotificationHub';

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail, AlertTriangle, CheckCircle2, XCircle, FileText,
  Archive, Star, LayoutTemplate, QrCode, Building2,
};

// ── Module labels ─────────────────────────────────────────────────────────────
const MODULE_FA: Record<NotificationModule, string> = {
  correspondence: 'مکاتبات',
  hse: 'HSE',
  finance: 'مالی',
  permits: 'مجوزها',
  b2b: 'B2B',
  archive: 'آرشیو',
  lifecycle: 'چرخه حیات',
  general: 'عمومی',
};

const MODULE_COLOR: Record<NotificationModule, string> = {
  correspondence: 'text-primary bg-primary/10',
  hse: 'text-red-500 bg-red-50',
  finance: 'text-emerald-500 bg-emerald-50',
  permits: 'text-amber-500 bg-amber-50',
  b2b: 'text-pink-500 bg-pink-50',
  archive: 'text-slate-500 bg-slate-100',
  lifecycle: 'text-violet-500 bg-violet-50',
  general: 'text-slate-500 bg-slate-50',
};

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-accent',
  low: 'bg-slate-300',
};

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${mins.toLocaleString('fa-IR')} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days.toLocaleString('fa-IR')} روز پیش`;
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ n, onRead, onDismiss }: {
  n: HubNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICON_MAP[n.icon] ?? Bell;
  const modColor = MODULE_COLOR[n.module];
  return (
    <div
      onClick={() => onRead(n.id)}
      className={`flex items-start gap-3 px-4 py-3 border-b border-border/60 cursor-pointer transition-colors hover:bg-secondary/50 ${!n.read ? 'bg-accent/[0.04]' : ''}`}
    >
      {/* Priority dot */}
      <div className="pt-1 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full block ${n.read ? 'bg-transparent' : PRIORITY_DOT[n.priority]}`} />
      </div>

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${modColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-xs leading-tight ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
            {n.titleFa}
          </p>
          <button
            onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
            className="p-0.5 rounded hover:bg-secondary text-muted-foreground flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {n.body && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${modColor}`}>
            {MODULE_FA[n.module]}
          </span>
          <span className="text-[9px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main bell component ───────────────────────────────────────────────────────
export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotificationHub();
  const [open, setOpen] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<NotificationModule | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = moduleFilter
    ? notifications.filter(n => n.module === moduleFilter)
    : notifications;

  // Group by module for the filter chips
  const modulesPresent = [...new Set(notifications.map(n => n.module))] as NotificationModule[];

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
            {unreadCount > 9 ? '۹+' : unreadCount.toLocaleString('fa-IR')}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-[9999] flex flex-col overflow-hidden"
          dir="rtl"
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-accent" />
              اعلان‌ها
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount.toLocaleString('fa-IR')}
                </span>
              )}
            </h3>
            <button
              onClick={() => markAllRead(moduleFilter ?? undefined)}
              className="text-[10px] text-accent hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              همه خوانده شد
            </button>
          </div>

          {/* Module filter chips */}
          {modulesPresent.length > 1 && (
            <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto flex-shrink-0">
              <button
                onClick={() => setModuleFilter(null)}
                className={`text-[9px] px-2 py-1 rounded-full border whitespace-nowrap font-medium transition-colors ${moduleFilter === null ? 'bg-accent text-white border-accent' : 'border-border text-muted-foreground hover:bg-secondary'}`}
              >
                همه
              </button>
              {modulesPresent.map(mod => (
                <button
                  key={mod}
                  onClick={() => setModuleFilter(moduleFilter === mod ? null : mod)}
                  className={`text-[9px] px-2 py-1 rounded-full border whitespace-nowrap font-medium transition-colors ${
                    moduleFilter === mod
                      ? `${MODULE_COLOR[mod]} border-current`
                      : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {MODULE_FA[mod]}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs">اعلانی وجود ندارد</p>
              </div>
            ) : filtered.map(n => (
              <NotifRow
                key={n.id}
                n={n}
                onRead={markRead}
                onDismiss={dismiss}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
