import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, Printer, Filter, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNationalStore } from '../store/useNationalStore';
import { useNationalCompanyStore } from '../store/useNationalCompanyStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { useCertificateStore } from '../store/useCertificateStore';
import { toJalaliStr, toPersianDigits, formatRial } from '@/utils/persianFormat';

const reports = [
  { id: 1, name: 'گزارش ثبت شرکت‌ها', filters: 'zone,date,status', chart: 'table' },
  { id: 2, name: 'گزارش اشغال شهرک', filters: 'province,zoneType', chart: 'bar+pie' },
  { id: 3, name: 'گزارش وصول مالی', filters: 'zone,month,status', chart: 'line+bar' },
  { id: 4, name: 'گزارش انقضاء گواهینامه', filters: 'zone,company,expiry', chart: 'table' },
  { id: 5, name: 'خلاصه حوادث HSE', filters: 'zone,severity,date', chart: 'bar+donut' },
  { id: 6, name: 'وضعیت کالیبراسیون باسکول', filters: 'zone,expiry', chart: 'table' },
  { id: 7, name: 'ترافیک بارنامه', filters: 'date,origin,status', chart: 'line+table' },
  { id: 8, name: 'فعالیت کاربران', filters: 'role,zone,date', chart: 'bar' },
  { id: 9, name: 'خلاصه حسابرسی', filters: 'entity,action,date', chart: 'table' },
  { id: 10, name: 'عملکرد گردش کار', filters: 'entityType,date', chart: 'bar' },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const report = reports.find(r => r.id === Number(selectedReport));

  const nat = useNationalStore();
  const fin = useFinancialStore();
  const cert = useCertificateStore();

  const data = useMemo(() => {
    if (!report) return [];
    if (report.id === 1) return nat.companies.filter(c => !zoneId || c.zoneId === zoneId).map(c => ({ name: c.nameFa, nationalId: c.nationalId, status: c.status }));
    if (report.id === 3) return fin.getMonthlyCollectionTrend().map(m => ({ month: m.month, collected: m.collected, issued: m.issued }));
    if (report.id === 4) return cert.certificates.filter(c => !zoneId || c.zoneId === zoneId).map(c => ({ company: c.companyId, type: c.typeCode, expiry: c.expiryDate, status: c.status }));
    if (report.id === 8) {
      const map = new Map<string, number>();
      nat.users.forEach(u => { const r = u.role ?? 'unknown'; map.set(r, (map.get(r) ?? 0) + 1); });
      return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }
    return [];
  }, [report, zoneId, nat, fin, cert]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">موتور گزارش‌گیری</h2>
        <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 ml-1" /> چاپ</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="w-64">
            <label className="text-xs text-slate-500">نوع گزارش</label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger><SelectValue placeholder="انتخاب گزارش" /></SelectTrigger>
              <SelectContent>{reports.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <label className="text-xs text-slate-500">شهرک</label>
            <Select value={zoneId || "all"} onValueChange={v => setZoneId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="همه" /></SelectTrigger>
              <SelectContent><SelectItem value="all">همه</SelectItem>{nat.parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-40"><label className="text-xs text-slate-500">از تاریخ (شمسی)</label><Input value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="1403/01/01" /></div>
          <div className="w-40"><label className="text-xs text-slate-500">تا تاریخ (شمسی)</label><Input value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="1403/12/29" /></div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader><CardTitle>{report.name}</CardTitle></CardHeader>
          <CardContent>
            {report.chart.includes('bar') && (
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data as any[]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => toPersianDigits(Number(v))} />
                    <Tooltip />
                    {report.id === 3 ? (
                      <><Bar dataKey="collected" name="وصول" fill="#059669" /><Bar dataKey="issued" name="صدور" fill="#2563eb" /></>
                    ) : (
                      <Bar dataKey="count" fill="#d97706" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys((data[0] ?? {})).map(k => <TableHead key={k}>{k}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as any[]).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <TableCell key={j}>{typeof val === 'number' && val > 1000 ? formatRial(val) : String(val)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
