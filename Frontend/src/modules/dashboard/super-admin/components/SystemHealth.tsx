import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, RefreshCw, Database, Wifi, Server, Cloud, Shield,
  HardDrive, Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { toPersianDigits } from '@/utils/persianFormat';

type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

interface ServiceState {
  name: string;
  status: ServiceStatus;
  lastChecked: string;
  uptimePercent: number;
  responseTimeMs: number;
}

function seedServices(): ServiceState[] {
  return [
    { name: 'API Gateway', status: 'HEALTHY', lastChecked: new Date().toISOString(), uptimePercent: 99.98, responseTimeMs: 45 },
    { name: 'Authentication Service', status: 'HEALTHY', lastChecked: new Date().toISOString(), uptimePercent: 99.95, responseTimeMs: 62 },
    { name: 'File Storage', status: 'DEGRADED', lastChecked: new Date().toISOString(), uptimePercent: 98.50, responseTimeMs: 340 },
    { name: 'Notification Queue', status: 'HEALTHY', lastChecked: new Date().toISOString(), uptimePercent: 99.99, responseTimeMs: 28 },
    { name: 'Database Connection', status: 'HEALTHY', lastChecked: new Date().toISOString(), uptimePercent: 99.97, responseTimeMs: 12 },
    { name: 'External Integrations', status: 'HEALTHY', lastChecked: new Date().toISOString(), uptimePercent: 99.80, responseTimeMs: 180 },
  ];
}

function generateLatencyData() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    latency: 20 + Math.random() * 100 + (i > 18 ? 50 : 0),
  }));
}

export default function SystemHealth() {
  const [services, setServices] = useState<ServiceState[]>(seedServices());
  const [latencyData, setLatencyData] = useState(generateLatencyData());
  const [cacheUsed, setCacheUsed] = useState(67);

  const statusColors: Record<ServiceStatus, string> = {
    HEALTHY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DEGRADED: 'bg-amber-50 text-amber-700 border-amber-200',
    DOWN: 'bg-red-50 text-red-700 border-red-200',
  };

  const refresh = () => {
    setServices(prev => prev.map(s => ({
      ...s,
      status: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'DEGRADED' : 'DOWN') : 'HEALTHY' as ServiceStatus,
      responseTimeMs: Math.max(10, Math.floor(s.responseTimeMs + (Math.random() - 0.5) * 40)),
      uptimePercent: Math.min(100, Math.max(95, s.uptimePercent + (Math.random() - 0.5) * 0.1)),
      lastChecked: new Date().toISOString(),
    })));
    setLatencyData(generateLatencyData());
    toast.success('وضعیت به‌روزرسانی شد');
  };

  const clearCache = () => { setCacheUsed(0); toast.success('کش پاک شد'); };

  const downloadDiag = () => {
    const blob = new Blob([JSON.stringify({ services, latencyData, cacheUsed }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'diagnostics.json'; a.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">سلامت سیستم</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4 ml-1" /> به‌روزرسانی</Button>
          <Button variant="outline" onClick={clearCache}><HardDrive className="w-4 h-4 ml-1" /> پاکسازی کش</Button>
          <Button variant="outline" onClick={downloadDiag}><Download className="w-4 h-4 ml-1" /> دانلود diagnostics</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(s => (
          <Card key={s.name} className={`border ${statusColors[s.status]}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{s.name}</CardTitle>
              <Badge className={statusColors[s.status]}>{s.status === 'HEALTHY' ? 'سالم' : s.status === 'DEGRADED' ? 'کاهش کارایی' : 'قطع'}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>آپتایم:</span><span>{toPersianDigits(s.uptimePercent.toFixed(2))}%</span></div>
              <div className="flex justify-between text-sm"><span>زمان پاسخ:</span><span>{toPersianDigits(s.responseTimeMs)} ms</span></div>
              <div className="text-xs text-slate-400">آخرین بررسی: {toPersianDigits(new Date(s.lastChecked).toLocaleTimeString('fa-IR'))}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>نمودار تأخیر ۲۴ ساعت گذشته</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => toPersianDigits(Number(v))} />
              <Tooltip formatter={(v: number) => [toPersianDigits(Math.round(v)) + ' ms', 'تأخیر']} />
              <Line type="monotone" dataKey="latency" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>مصرف Storage</CardTitle></CardHeader>
        <CardContent>
          <Progress value={cacheUsed} className="h-3" />
          <p className="text-sm mt-2 text-slate-600">{toPersianDigits(cacheUsed)}% مصرف شده</p>
        </CardContent>
      </Card>
    </div>
  );
}
