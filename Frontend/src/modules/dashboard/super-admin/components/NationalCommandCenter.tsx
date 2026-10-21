import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ShieldAlert, CheckCircle2, Send, ArrowUpCircle, Siren, Activity,
  AlertTriangle, Radio, Clock, UserCheck, FileText, Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAlertStore, type AlertItem, type AlertStatus, type AlertSeverity, type AlertType } from '../store/useAlertStore';
import { useNationalStore } from '../store/useNationalStore';
import { useCertificateStore } from '../store/useCertificateStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { toJalaliStr, toJalaliDateTime, toPersianDigits } from '@/utils/persianFormat';

const resolveSchema = z.object({ notes: z.string().min(20, 'حداقل ۲۰ کاراکتر') });

const severityOrder: Record<AlertSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const severityColors: Record<AlertSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};
const statusLabels: Record<AlertStatus, string> = {
  NEW: 'جدید', ACKNOWLEDGED: 'مشاهده شده', DISPATCHED: 'ارجاع شده', RESOLVED: 'حل شده'
};
const typeLabels: Record<AlertType, string> = {
  INCIDENT: 'حادثه', MAINTENANCE: 'تعمیرات', HSE_ALERT: 'HSE', SECURITY: 'امنیتی',
  FINANCE_DISPUTE: 'مالی', DEVICE_OFFLINE: 'آفلاین', CERTIFICATE_EXPIRY: 'انقضاء'
};

export default function NationalCommandCenter() {
  const alertStore = useAlertStore();
  const national = useNationalStore();
  const certStore = useCertificateStore();
  const finStore = useFinancialStore();
  const [tab, setTab] = useState('feed');
  const [selAlert, setSelAlert] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<'resolve' | 'dispatch' | null>(null);

  useEffect(() => { if (alertStore.alerts.length === 0 && !alertStore.isLoading) alertStore.loadFromApi(); }, [alertStore]);

  const stats = alertStore.getAlertStats();
  const crisis = alertStore.isCrisisMode;

  const sortedAlerts = useMemo(() => {
    return [...alertStore.alerts].sort((a, b) => {
      if (crisis && a.severity !== b.severity) return severityOrder[b.severity] - severityOrder[a.severity];
      if (a.status !== b.status) return (a.status === 'NEW' ? -1 : 1);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alertStore.alerts, crisis]);

  const form = useForm({ resolver: zodResolver(resolveSchema), defaultValues: { notes: '' } });

  const onResolve = (data: { notes: string }) => {
    if (!selAlert) return;
    alertStore.resolveAlert(selAlert, data.notes);
    toast.success('هشدار حل شد');
    setSelAlert(null); setActionKind(null); form.reset();
  };

  const onDispatch = () => {
    if (!selAlert) return;
    alertStore.dispatchAlert(selAlert, 'current-user', 'مدیر سیستم');
    toast.success('ارجاع شد');
    setSelAlert(null); setActionKind(null);
  };

  // Morning briefing
  const briefing = useMemo(() => {
    const needsAction = alertStore.alerts.filter(a => a.status === 'NEW' || a.status === 'ACKNOWLEDGED').length;
    const criticalParks = national.parks.filter(p => {
      const occ = p.infrastructure?.totalPlots ? (p.plots?.filter(pl => pl.status === 'occupied').length ?? 0) / p.infrastructure.totalPlots : 0;
      return occ > 0.9;
    }).length;
    const expiringCerts = certStore.getExpiringCertificates?.(30).length ?? 0;
    const overdueInv = finStore.getOverdueInvoices?.().length ?? 0;
    const openHse = alertStore.alerts.filter(a => a.type === 'HSE_ALERT' && a.status !== 'RESOLVED').length;
    return `امروز، ${toPersianDigits(needsAction)} مورد نیاز به اقدام ملی دارد: ${toPersianDigits(criticalParks)} شهرک دارای هشدار بحرانی، ${toPersianDigits(expiringCerts)} گواهینامه ظرف ۳۰ روز آینده منقضی می‌شود، ${toPersianDigits(overdueInv)} صورت‌حساب معوقه داریم و ${toPersianDigits(openHse)} حادثه HSE همچنان باز است.`;
  }, [alertStore.alerts, national.parks, certStore, finStore]);

  if (crisis) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="bg-red-600 text-white rounded-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Siren className="w-8 h-8 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">حالت بحرانی فعال است</h2>
              <p className="text-red-100 text-sm">تنها هشدارهای بحرانی نمایش داده می‌شوند. اقدامات غیرضروری مسدود است.</p>
            </div>
          </div>
          <Button variant="secondary" className="text-red-700" onClick={() => alertStore.toggleCrisisMode(false)}>خروج از حالت بحرانی</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedAlerts.filter(a => a.severity === 'critical').map(a => (
            <Card key={a.id} className="border-red-300 bg-red-50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-800">{a.title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-red-700">{a.message}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white" onClick={() => { alertStore.acknowledgeAlert(a.id, 'user', 'مدیر'); }}>مشاهده</Button>
                  <Button size="sm" variant="outline" onClick={() => { setSelAlert(a.id); setActionKind('resolve'); }}>حل</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مرکز فرماندهی ملی</h2>
          <p className="text-sm text-slate-500 mt-1">{briefing}</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => alertStore.toggleCrisisMode(true)}>
          <Siren className="w-4 h-4 ml-2" /> فعال‌سازی حالت بحرانی
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">جدید</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{toPersianDigits(stats.NEW)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">مشاهده‌شده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{toPersianDigits(stats.ACKNOWLEDGED)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">ارجاع‌شده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{toPersianDigits(stats.DISPATCHED)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">حل‌شده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{toPersianDigits(stats.RESOLVED)}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed">جریان هشدارها</TabsTrigger>
          <TabsTrigger value="critical">بحرانی‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead><TableHead>نوع</TableHead><TableHead>شدت</TableHead><TableHead>وضعیت</TableHead>
                <TableHead>ارجاع‌شده به</TableHead><TableHead>تاریخ</TableHead><TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAlerts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{typeLabels[a.type]}</TableCell>
                  <TableCell><Badge className={severityColors[a.severity]}>{a.severity}</Badge></TableCell>
                  <TableCell>{statusLabels[a.status]}</TableCell>
                  <TableCell>{a.assignedOwnerName ?? '—'}</TableCell>
                  <TableCell>{toJalaliDateTime(a.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status === 'NEW' && (
                        <Button size="sm" variant="outline" onClick={() => alertStore.acknowledgeAlert(a.id, 'user', 'مدیر سیستم')}>
                          <CheckCircle2 className="w-3 h-3 ml-1" /> مشاهده
                        </Button>
                      )}
                      {a.status === 'ACKNOWLEDGED' && (
                        <Button size="sm" variant="outline" onClick={() => { setSelAlert(a.id); setActionKind('dispatch'); }}>
                          <Send className="w-3 h-3 ml-1" /> ارجاع
                        </Button>
                      )}
                      {a.status !== 'RESOLVED' && (
                        <Button size="sm" variant="outline" onClick={() => { setSelAlert(a.id); setActionKind('resolve'); }}>
                          <CheckCircle2 className="w-3 h-3 ml-1" /> حل
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => alertStore.escalateAlert(a.id)}>
                        <ArrowUpCircle className="w-3 h-3 ml-1" /> تشدید
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="critical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAlerts.filter(a => a.severity === 'critical').map(a => (
              <Card key={a.id} className="border-red-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-sm">{a.title}</CardTitle>
                    <Badge className={severityColors[a.severity]}>بحرانی</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-2">{toJalaliDateTime(a.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dispatch / Resolve Dialog */}
      <Dialog open={!!actionKind} onOpenChange={() => { setActionKind(null); setSelAlert(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionKind === 'resolve' ? 'حل هشدار' : 'ارجاع هشدار'}</DialogTitle>
          </DialogHeader>
          {actionKind === 'resolve' ? (
            <form onSubmit={form.handleSubmit(onResolve)} className="space-y-4">
              <div className="space-y-2">
                <Label>یادداشت حل (حداقل ۲۰ کاراکتر)</Label>
                <Input {...form.register('notes')} />
                {form.formState.errors.notes && <p className="text-xs text-red-500">{form.formState.errors.notes.message}</p>}
              </div>
              <DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">تأیید حل</Button></DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <p>این هشدار به مدیر سیستم ارجاع می‌شود.</p>
              <DialogFooter><Button onClick={onDispatch} className="bg-blue-600 hover:bg-blue-700 text-white">تأیید ارجاع</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
