import React, { useMemo, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNationalStore } from '../store/useNationalStore';
import { toJalaliDateTime, toPersianDigits } from '@/utils/persianFormat';
import { getAuditActionLabel, getAuditEntityLabel, getAuditActionColor } from '@/entities/audit';

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const logs = useNationalStore(s => s.auditLogs);

  const filtered = useMemo(() => {
    let list = [...logs];
    if (entityFilter) list = list.filter(l => l.entityType === entityFilter);
    if (actionFilter) list = list.filter(l => l.action === actionFilter);
    if (search) list = list.filter(l => (l.actorName + l.entityId).toLowerCase().includes(search.toLowerCase()));
    return list.slice(0, 200);
  }, [logs, entityFilter, actionFilter, search]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit-logs.json'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">گزارش‌های حسابرسی</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportJson}><FileJson className="w-4 h-4 ml-1" /> JSON</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="جستجو..." className="w-56" value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={entityFilter || "all"} onValueChange={v => setEntityFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="موجودیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {['zone', 'company', 'user', 'certificate', 'waybill', 'financial_invoice', 'bascule'].map(e => <SelectItem key={e} value={e}>{getAuditEntityLabel(e as any)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter || "all"} onValueChange={v => setActionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="عملیات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            {['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT'].map(a => <SelectItem key={a} value={a}>{getAuditActionLabel(a as any)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>زمان</TableHead><TableHead>بازیگر</TableHead><TableHead>عملیات</TableHead>
            <TableHead>موجودیت</TableHead><TableHead>شناسه</TableHead><TableHead>IP</TableHead><TableHead>وضعیت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(log => (
            <TableRow key={log.id}>
              <TableCell className="text-xs whitespace-nowrap">{toJalaliDateTime(log.timestamp)}</TableCell>
              <TableCell><span className="font-medium">{log.actorName}</span> <span className="text-xs text-slate-400">({log.actorRole})</span></TableCell>
              <TableCell><Badge className={`${getAuditActionColor(log.action).bg} ${getAuditActionColor(log.action).text}`}>{getAuditActionLabel(log.action)}</Badge></TableCell>
              <TableCell>{getAuditEntityLabel(log.entityType)}</TableCell>
              <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
              <TableCell className="text-xs text-slate-400">{log.ipAddress}</TableCell>
              <TableCell>{log.success ? <Badge className="bg-emerald-50 text-emerald-700">موفق</Badge> : <Badge className="bg-red-50 text-red-700">ناموفق</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
