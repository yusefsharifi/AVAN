import { useNotifications } from '../hooks';
import { X, Bell, Check, Trash2 } from 'lucide-react';

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-96 max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">اعلان‌ها</h3>
          <div className="flex items-center gap-2">
            <button onClick={markAllAsRead} className="text-[10px] text-accent hover:underline">خواندن همه</button>
            <button onClick={onClose} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">اعلان جدیدی ندارید</p>
            </div>
          ) : notifications.map(n => (
            <div key={n.id} className={`p-3 border-b border-border/50 hover:bg-secondary/30 transition-colors ${!n.read ? 'bg-accent/5' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{n.titleFa}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.bodyFa}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1" dir="ltr">{n.createdAt}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!n.read && <button onClick={() => markAsRead(n.id)} className="p-1 rounded hover:bg-secondary"><Check className="w-3 h-3 text-emerald-500" /></button>}
                  <button onClick={() => deleteNotification(n.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
