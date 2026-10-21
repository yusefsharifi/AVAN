import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNationalStore } from '../store/useNationalStore';
import { useNationalCompanyStore } from '../store/useNationalCompanyStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { useAlertStore } from '../store/useAlertStore';
import { toPersianDigits, formatRial, toJalaliStr } from '@/utils/persianFormat';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

export default function DashboardOverview() {
  const nat = useNationalStore();
  const comp = useNationalCompanyStore();
  const fin = useFinancialStore();
  const alerts = useAlertStore();

  // Companies by zone
  const companiesByZone = useMemo(() => {
    const map = new Map<string, number>();
    nat.parks.forEach(p => map.set(p.nameFa ?? p.zoneCode, 0));
    nat.companies.forEach(c => {
      const park = nat.parks.find(p => p.id === c.zoneId);
      const key = park?.nameFa ?? park?.zoneCode ?? 'نامشخص';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [nat.parks, nat.companies]);

  // Occupancy Pie
  const occupancyData = useMemo(() => {
    let occupied = 0, vacant = 0;
    nat.parks.forEach(p => {
      const plots = p.plots ?? [];
      occupied += plots.filter(pl => pl.status === 'occupied' || pl.status === 'under_construction').length;
      vacant += plots.filter(pl => pl.status === 'vacant').length;
    });
    return [
      { name: 'اشغال‌شده', value: occupied },
      { name: 'خالی', value: vacant },
    ];
  }, [nat.parks]);

  // Monthly revenue
  const revTrend = fin.getMonthlyCollectionTrend();

  // Alert severity distribution
  const alertDist = useMemo(() => {
    const sev: Record<string, number> = {};
    alerts.alerts.forEach(a => { sev[a.severity] = (sev[a.severity] ?? 0) + 1; });
    return Object.entries(sev).map(([name, value]) => ({ name, value }));
  }, [alerts.alerts]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">شهرک‌های فعال</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{toPersianDigits(nat.parks.filter(p => p.status === 'active').length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">شرکت‌ها</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{toPersianDigits(nat.companies.length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">کاربران</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-indigo-600">{toPersianDigits(nat.users.length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">هشدار باز</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{toPersianDigits(alerts.alerts.filter(a => a.status !== 'RESOLVED').length)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>تعداد شرکت‌ها بر شهرک</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companiesByZone}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => toPersianDigits(Number(v))} />
                <Tooltip formatter={(v: number) => [toPersianDigits(v), 'شرکت']} />
                <Bar dataKey="count" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>وضعیت زمین</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {occupancyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [toPersianDigits(v), n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>روند ماهانه درآمد</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revTrend.map(m => ({ ...m, label: toPersianDigits(m.month.split('-')[1]) + '/' + toPersianDigits(m.month.split('-')[0]) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={v => formatRial(Number(v), false)} />
                <Tooltip formatter={(v: number) => [formatRial(v), '']} />
                <Legend />
                <Line type="monotone" dataKey="collected" name="وصول‌شده" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="issued" name="صدور شده" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>توزیع شدت هشدارها</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={alertDist} innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {alertDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [toPersianDigits(v), n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
