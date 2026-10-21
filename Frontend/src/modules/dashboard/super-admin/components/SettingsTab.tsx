import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Settings, Download, Upload, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const settingsSchema = z.object({
  platformNameFa: z.string().min(1),
  platformNameEn: z.string().min(1),
  defaultLanguage: z.enum(['fa', 'en']),
  dateFormat: z.enum(['jalali', 'gregorian']),
  minPasswordLength: z.coerce.number().min(6).max(20),
  passwordUppercase: z.boolean(),
  passwordLowercase: z.boolean(),
  passwordNumber: z.boolean(),
  passwordSymbol: z.boolean(),
  maxFailedAttempts: z.coerce.number().min(3).max(10),
  sessionDuration: z.coerce.number().min(15).max(480),
  autoLogoutWarning: z.coerce.number().min(1).max(15),
  waybillRetentionYears: z.coerce.number().min(1).max(10),
  auditRetentionYears: z.coerce.number().min(1).max(10),
  archiveBeforeDelete: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string(),
  allowedIPs: z.string(),
});

export default function SettingsTab() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      platformNameFa: 'سامانه جامع شهرک‌های صنعتی',
      platformNameEn: 'AVAN National Portal',
      defaultLanguage: 'fa' as const,
      dateFormat: 'jalali' as const,
      minPasswordLength: 8,
      passwordUppercase: true,
      passwordLowercase: true,
      passwordNumber: true,
      passwordSymbol: false,
      maxFailedAttempts: 5,
      sessionDuration: 120,
      autoLogoutWarning: 5,
      waybillRetentionYears: 3,
      auditRetentionYears: 5,
      archiveBeforeDelete: true,
      maintenanceMode: false,
      maintenanceMessage: 'سیستم در حال به‌روزرسانی است. لطفاًlater مراجعه کنید.',
      allowedIPs: '',
    },
  });

  const maintenance = form.watch('maintenanceMode');

  const onSave = (data: any) => {
    localStorage.setItem('system-settings', JSON.stringify(data));
    toast.success('تنظیمات ذخیره شد');
  };

  const exportState = () => {
    const state = {
      national: localStorage.getItem('super-admin-national-storage'),
      company: localStorage.getItem('super-admin-company-storage'),
      financial: localStorage.getItem('super-admin-financial-storage'),
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'full-state-export.json'; a.click();
  };

  const importState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.national) localStorage.setItem('super-admin-national-storage', data.national);
        if (data.company) localStorage.setItem('super-admin-company-storage', data.company);
        toast.success('وضعیت وارد شد. صفحه را بازنشانی کنید.');
      } catch { toast.error('فایل نامعتبر'); }
    };
    reader.readAsText(file);
  };

  const resetFactory = () => {
    if (resetText !== 'بازنشانی کارخانه') {
      toast.error('عبارت صحیح وارد نشد');
      return;
    }
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('super-admin-')) localStorage.removeItem(k);
    });
    toast.success('همه داده‌ها پاک شد. صفحه را بازنشانی کنید.');
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold text-slate-800">تنظیمات سراسری</h2>

      {maintenance && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>حالت تعمیرات فعال است. فقط IPهای مجاز دسترسی دارند.</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSave)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>عمومی</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>نام فارسی سامانه</Label><Input {...form.register('platformNameFa')} /></div>
            <div className="space-y-2"><Label>نام انگلیسی سامانه</Label><Input {...form.register('platformNameEn')} /></div>
            <div className="space-y-2"><Label>تقویم</Label>
              <select className="w-full border rounded p-2" {...form.register('dateFormat')}>
                <option value="jalali">شمسی</option>
                <option value="gregorian">میلادی</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>امنیت</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>حداقل طول رمز: {form.watch('minPasswordLength')}</Label><Slider value={[form.watch('minPasswordLength')]} onValueChange={([v]) => form.setValue('minPasswordLength', v)} min={6} max={20} /></div>
            <div className="flex items-center justify-between"><Label>حروف بزرگ</Label><Switch checked={form.watch('passwordUppercase')} onCheckedChange={v => form.setValue('passwordUppercase', v)} /></div>
            <div className="flex items-center justify-between"><Label>اعداد</Label><Switch checked={form.watch('passwordNumber')} onCheckedChange={v => form.setValue('passwordNumber', v)} /></div>
            <div className="space-y-2"><Label>مدت نشست (دقیقه): {form.watch('sessionDuration')}</Label><Slider value={[form.watch('sessionDuration')]} onValueChange={([v]) => form.setValue('sessionDuration', v)} min={15} max={480} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>نگهداری داده</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>حفظ بارنامه (سال)</Label><Input type="number" {...form.register('waybillRetentionYears')} /></div>
            <div className="space-y-2"><Label>حفظ حسابرسی (سال)</Label><Input type="number" {...form.register('auditRetentionYears')} /></div>
            <div className="flex items-center justify-between"><Label>آرشیو قبل از حذف</Label><Switch checked={form.watch('archiveBeforeDelete')} onCheckedChange={v => form.setValue('archiveBeforeDelete', v)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>تعمیرات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>حالت تعمیرات</Label><Switch checked={maintenance} onCheckedChange={v => form.setValue('maintenanceMode', v)} /></div>
            <div className="space-y-2"><Label>پیام</Label><Input {...form.register('maintenanceMessage')} /></div>
            <div className="space-y-2"><Label>IPهای مجاز</Label><Input placeholder="192.168.1.1, 192.168.1.2" {...form.register('allowedIPs')} /></div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Settings className="w-4 h-4 ml-2" /> ذخیره تنظیمات</Button>
        </div>
      </form>

      <Card>
        <CardHeader><CardTitle>پشتیبان‌گیری و بازیابی</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={exportState}><Download className="w-4 h-4 ml-1" /> خروجی کامل</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 ml-1" /> ورود JSON</Button>
          <input type="file" ref={fileRef} className="hidden" accept=".json" onChange={importState} />
          <Button variant="destructive" onClick={() => setConfirmReset(true)}><RotateCcw className="w-4 h-4 ml-1" /> بازنشانی کارخانه</Button>
        </CardContent>
      </Card>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> هشدار بازنشانی</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">برای تأیید، عبارت <strong>بازنشانی کارخانه</strong> را تایپ کنید:</p>
          <Input value={resetText} onChange={e => setResetText(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={resetFactory}>تأیید پاکسازی کامل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
