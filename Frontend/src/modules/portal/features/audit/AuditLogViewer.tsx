import { Shield, Download, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  result: 'success' | 'failure';
  ip: string;
}

const MOCK_AUDIT: AuditEntry[] = [
  { id: 'AL-001', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۴:۳۲', user: 'احمد کریمی', action: 'APPROVE', resource: 'Shipment', resourceId: 'S-001', result: 'success', ip: '192.168.2.110' },
  { id: 'AL-002', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۳:۴۵', user: 'مریم رضایی', action: 'CREATE', resource: 'Invoice', resourceId: 'INV-004', result: 'success', ip: '192.168.2.88' },
  { id: 'AL-003', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۲:۲۰', user: 'زهرا امینی', action: 'EXPORT', resource: 'Report', resourceId: 'RPT-001', result: 'success', ip: '192.168.2.55' },
  { id: 'AL-004', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۱:۱۰', user: 'سعید موسوی', action: 'UPDATE', resource: 'Contractor', resourceId: 'CTR-002', result: 'success', ip: '192.168.5.8' },
  { id: 'AL-005', timestamp: '۱۴۰۳/۰۴/۱۶ ۱۰:۰۵', user: 'رضا کریمی', action: 'REJECT', resource: 'Shipment', resourceId: 'S-005', result: 'success', ip: '192.168.4.12' },
];

export function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filtered = MOCK_AUDIT.filter(e => {
    if (searchQuery && !e.user.includes(searchQuery) && !e.resourceId.includes(searchQuery)) return false;
    if (actionFilter && e.action !== actionFilter) return false;
    return true;
  });

  const verifyIntegrity = useMemo(() => {
    for (let i = MOCK_AUDIT.length - 1; i > 0; i--) {
      if (MOCK_AUDIT[i].id !== `AL-${String(i + 1).padStart(3, '0')}`) return false;
    }
    return true;
  }, []);

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">گزارش حسابرسی</h1>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${verifyIntegrity ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <Shield className="w-3.5 h-3.5" /><span>{verifyIntegrity ? 'یکپارچگی تأیید شد' : 'خطا در یکپارچگی'}</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="جستجو..."
            className="w-full bg-secondary border border-border rounded-lg py-2 pr-9 pl-3 text-xs text-foreground focus:outline-none focus:border-accent" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-2 px-2.5 text-xs text-foreground">
          <option value="">همه عملیات</option>
          {['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'LOGIN'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border overflow-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">
            {['نتیجه', 'IP', 'منبع', 'عملیات', 'کاربر', 'تاریخ'].map(h => <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.result === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{e.result === 'success' ? 'موفق' : 'ناموفق'}</span></td>
                <td className="py-3 px-3 text-[10px] text-muted-foreground font-mono" dir="ltr">{e.ip}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{e.resourceId}</td>
                <td className="py-3 px-3 text-xs text-foreground font-medium">{e.action}</td>
                <td className="py-3 px-3 text-xs text-foreground">{e.user}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{e.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
