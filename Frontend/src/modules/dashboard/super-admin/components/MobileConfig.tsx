import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Smartphone, Moon, Wifi, Camera, Bell, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { toPersianDigits } from '@/utils/persianFormat';

const defaultModules = ['داشبورد', 'شرکت‌ها', 'مالی', 'HSE', 'بارنامه‌ها', 'اعلان‌ها', 'پروفایل'];

export default function MobileConfig() {
  const [toggles, setToggles] = useState({
    enableOfflineMode: true,
    enableBiometricLogin: false,
    mandatoryPhotoForVisit: true,
    enablePushNotifications: true,
    enableDarkMode: false,
  });
  const [syncInterval, setSyncInterval] = useState(60);
  const [maxAttachment, setMaxAttachment] = useState(10);
  const [moduleOrder, setModuleOrder] = useState(defaultModules);
  const [maintenance, setMaintenance] = useState({ enabled: false, start: '', end: '', message: '' });

  const save = () => {
    localStorage.setItem('mobile-config', JSON.stringify({ toggles, syncInterval, maxAttachment, moduleOrder, maintenance }));
    toast.success('تنظیمات ذخیره شد');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold text-slate-800">تنظیمات موبایل</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>فعال‌سازی ویژگی‌ها</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(toggles).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">
                  {key === 'enableOfflineMode' ? 'حالت آفلاین' :
                   key === 'enableBiometricLogin' ? 'ورود بیومتریک' :
                   key === 'mandatoryPhotoForVisit' ? 'عکس اجباری برای بازدید' :
                   key === 'enablePushNotifications' ? 'اعلان‌ها' : 'حالت تاریک'}
                </Label>
                <Switch checked={val} onCheckedChange={v => setToggles(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>تنظیمات همگام‌سازی</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>فاصله همگام‌سازی: {toPersianDigits(syncInterval)} ثانیه</Label>
              <Slider value={[syncInterval]} onValueChange={([v]) => setSyncInterval(v)} min={30} max={300} step={10} />
            </div>
            <div className="space-y-2">
              <Label>حداکثر حجم پیوست: {toPersianDigits(maxAttachment)} مگابایت</Label>
              <Slider value={[maxAttachment]} onValueChange={([v]) => setMaxAttachment(v)} min={1} max={50} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ترتیب ماژول‌های صفحه اصلی</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {moduleOrder.map((mod, i) => (
              <div key={mod} className="flex items-center gap-2 border rounded p-2">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{mod}</span>
                <span className="mr-auto text-xs text-slate-400">{toPersianDigits(i + 1)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>پنجره تعمیرات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>حالت تعمیرات</Label>
              <Switch checked={maintenance.enabled} onCheckedChange={v => setMaintenance(p => ({ ...p, enabled: v }))} />
            </div>
            {maintenance.enabled && (
              <>
                <div className="space-y-2"><Label>تاریخ/زمان شروع</Label><Input type="datetime-local" value={maintenance.start} onChange={e => setMaintenance(p => ({ ...p, start: e.target.value }))} /></div>
                <div className="space-y-2"><Label>تاریخ/زمان پایان</Label><Input type="datetime-local" value={maintenance.end} onChange={e => setMaintenance(p => ({ ...p, end: e.target.value }))} /></div>
                <div className="space-y-2"><Label>پیام نمایشی</Label><Input value={maintenance.message} onChange={e => setMaintenance(p => ({ ...p, message: e.target.value }))} placeholder="سیستم در حال به‌روزرسانی است..." /></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={save} className="bg-amber-600 hover:bg-amber-700 text-white"><Save className="w-4 h-4 ml-2" /> ذخیره تنظیمات</Button>
    </div>
  );
}
