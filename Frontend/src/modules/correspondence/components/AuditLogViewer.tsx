import { useAuditLog } from '../hooks';
import { ArrowRight, CheckCircle, XCircle, Plus, Edit2, Archive, Send, Shield } from 'lucide-react';

interface AuditLogViewerProps {
  onBack: () => void;
}

export function AuditLogViewer({ onBack }: AuditLogViewerProps) {
  const { logs, totalPages, page, setPage, filter, setFilter, verifyIntegrity } = useAuditLog();
  const integrity = verifyIntegrity();

  const actionIcons: Record<string, React.ElementType> = {
    CREATE: Plus, UPDATE: Edit2, APPROVE: CheckCircle, REJECT: XCircle,
    REFER: Send, ARCHIVE: Archive, SIGN: Shield, EXPORT: Edit2,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary"><ArrowRight className="w-4 h-4 text-muted-foreground" /></button>
          <h2 className="text-sm font-bold text-foreground">گزارش حسابرسی</h2>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${integrity.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          <Shield className="w-3.5 h-3.5" /><span>{integrity.valid ? 'یکپارچگی تأیید شد' : 'خطا در یکپارچگی'}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">
            {['عملیات', 'کاربر', 'منبع', 'تاریخ', 'نتیجه', 'IP'].map(h => (
              <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {logs.map(log => {
              const Icon = actionIcons[log.action] || Edit2;
              return (
                <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="py-3 px-3"><span className="flex items-center gap-1.5 text-xs"><Icon className="w-3.5 h-3.5 text-muted-foreground" />{log.action}</span></td>
                  <td className="py-3 px-3 text-xs text-foreground">{log.userName}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{log.resourceId}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{log.timestamp}</td>
                  <td className="py-3 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${log.result === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{log.result === 'success' ? 'موفق' : 'ناموفق'}</span></td>
                  <td className="py-3 px-3 text-[10px] text-muted-foreground font-mono" dir="ltr">{log.ipAddress}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="border-t border-border px-4 py-2 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-7 h-7 rounded text-xs font-medium ${page === i + 1 ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-secondary'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
