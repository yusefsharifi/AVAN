import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Bell, Send, Users, Building2, MapPin, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNationalStore } from '../store/useNationalStore';
import { toJalaliDateTime, toPersianDigits } from '@/utils/persianFormat';

const schema = z.object({
  audienceType: z.enum(['ALL_NATIONAL', 'ALL_ZONE_MANAGERS', 'SPECIFIC_ZONES', 'SPECIFIC_COMPANIES', 'SPECIFIC_USERS']),
  zoneIds: z.array(z.string()).optional(),
  companyIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  deepLink: z.string().optional(),
  scheduleType: z.enum(['SEND_NOW', 'SCHEDULED']),
  scheduleJalali: z.string().optional(),
});

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  audienceSummary: string;
  status: 'SENT' | 'FAILED' | 'SCHEDULED' | 'CANCELLED';
  sentAt?: string;
  createdAt: string;
}

export default function PushNotifications() {
  const national = useNationalStore();
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [sending, setSending] = useState(false);

  // The type argument matters: without it react-hook-form infers its field map
  // from `defaultValues` alone, which omits zoneIds/companyIds/userIds, so
  // `field.value` came out as `string` (hence `.filter` failing to exist on it)
  // and `handleSubmit` demanded a `SubmitHandler` over only the five defaulted
  // keys. Typing it from the zod schema is what the resolver already assumed.
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { audienceType: 'ALL_NATIONAL', title: '', body: '', deepLink: '', scheduleType: 'SEND_NOW' } });
  const audience = form.watch('audienceType');

  const recipientCount = useMemo(() => {
    if (audience === 'ALL_NATIONAL') return national.users.length;
    if (audience === 'ALL_ZONE_MANAGERS') return national.users.filter(u => u.role === 'ZONE_MANAGER').length;
    if (audience === 'SPECIFIC_ZONES') {
      const zids = form.watch('zoneIds') ?? [];
      return national.users.filter(u => zids.includes(u.zoneId ?? '')).length;
    }
    if (audience === 'SPECIFIC_COMPANIES') {
      const cids = form.watch('companyIds') ?? [];
      return national.users.filter(u => cids.includes(u.companyId ?? '')).length;
    }
    if (audience === 'SPECIFIC_USERS') return (form.watch('userIds') ?? []).length;
    return 0;
  }, [audience, form, national.users]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setSending(true);
    await new Promise(r => setTimeout(r, 2000));
    const success = Math.random() > 0.1;
    const newRecord: NotificationRecord = {
      id: `notif-${Date.now()}`,
      title: data.title,
      body: data.body,
      audienceSummary: data.audienceType === 'ALL_NATIONAL' ? 'همه' : data.audienceType,
      status: success ? (data.scheduleType === 'SEND_NOW' ? 'SENT' : 'SCHEDULED') : 'FAILED',
      sentAt: data.scheduleType === 'SEND_NOW' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };
    setHistory(prev => [newRecord, ...prev]);
    toast[success ? 'success' : 'error'](success ? 'اعلان ارسال شد' : 'ارسال ناموفق بود');
    setSending(false);
    if (success) form.reset();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold text-slate-800">مدیریت اعلان‌ها</h2>

      <Card>
        <CardHeader><CardTitle>تنظیمات اعلان</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>مخاطبان</Label>
                <Controller control={form.control} name="audienceType" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_NATIONAL">همه کاربران کشور</SelectItem>
                      <SelectItem value="ALL_ZONE_MANAGERS">مدیران شهرک‌ها</SelectItem>
                      <SelectItem value="SPECIFIC_ZONES">شهرک‌های خاص</SelectItem>
                      <SelectItem value="SPECIFIC_COMPANIES">شرکت‌های خاص</SelectItem>
                      <SelectItem value="SPECIFIC_USERS">کاربران خاص</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              {audience === 'SPECIFIC_ZONES' && (
                <div className="space-y-2">
                  <Label>انتخاب شهرک‌ها</Label>
                  <Controller control={form.control} name="zoneIds" render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {national.parks.map(p => (
                        <label key={p.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                          <input type="checkbox" checked={field.value?.includes(p.id)} onChange={e => {
                            const vals = field.value ?? [];
                            field.onChange(e.target.checked ? [...vals, p.id] : vals.filter((v: string) => v !== p.id));
                          }} />
                          {p.nameFa ?? p.zoneCode}
                        </label>
                      ))}
                    </div>
                  )} />
                </div>
              )}

              {(audience === 'SPECIFIC_COMPANIES' || audience === 'SPECIFIC_USERS') && (
                <div className="space-y-2">
                  <Label>{audience === 'SPECIFIC_COMPANIES' ? 'شرکت‌ها' : 'کاربران'}</Label>
                  <Controller control={form.control} name={audience === 'SPECIFIC_COMPANIES' ? 'companyIds' : 'userIds'} render={({ field }) => (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                      {(audience === 'SPECIFIC_COMPANIES' ? national.companies : national.users).map((item: any) => (
                        <label key={item.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                          <input type="checkbox" checked={field.value?.includes(item.id)} onChange={e => {
                            const vals = field.value ?? [];
                            field.onChange(e.target.checked ? [...vals, item.id] : vals.filter((v: string) => v !== item.id));
                          }} />
                          {'firstName' in item ? `${item.firstName} ${item.lastName}` : item.nameFa}
                        </label>
                      ))}
                    </div>
                  )} />
                </div>
              )}

              <div className="space-y-2"><Label>عنوان (حداکثر ۱۰۰)</Label><Input {...form.register('title')} /></div>
              <div className="space-y-2"><Label>متن (حداکثر ۵۰۰)</Label><Input {...form.register('body')} /></div>
              <div className="space-y-2"><Label>لینک مستقیم</Label><Input placeholder="/super-admin/companies/123" {...form.register('deepLink')} /></div>
              <div className="space-y-2">
                <Label>زمان‌بندی</Label>
                <Controller control={form.control} name="scheduleType" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="SEND_NOW">فوری</SelectItem><SelectItem value="SCHEDULED">زمان‌بندی‌شده</SelectItem></SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">تعداد دریافت‌کنندگان: <span className="font-bold">{toPersianDigits(recipientCount)}</span></p>
              <Button type="submit" disabled={sending || recipientCount === 0} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Send className="w-4 h-4 ml-2" /> {sending ? 'در حال ارسال...' : 'ارسال'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>تاریخچه اعلان‌ها</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>عنوان</TableHead><TableHead>مخاطبان</TableHead><TableHead>زمان</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.title}</TableCell>
                  <TableCell>{h.audienceSummary}</TableCell>
                  <TableCell>{h.sentAt ? toJalaliDateTime(h.sentAt) : '—'}</TableCell>
                  <TableCell><Badge className={h.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : h.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}>{h.status}</Badge></TableCell>
                  <TableCell>
                    {h.status === 'SCHEDULED' && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setHistory(prev => prev.map(x => x.id === h.id ? { ...x, status: 'CANCELLED' as const } : x))}><XCircle className="w-4 h-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
