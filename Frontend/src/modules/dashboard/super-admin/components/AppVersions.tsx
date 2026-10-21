import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Smartphone, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toJalaliStr, toPersianDigits } from '@/utils/persianFormat';

const versionSchema = z.object({
  platform: z.enum(['Android', 'iOS', 'Web']),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'فرمت: major.minor.patch'),
  releaseType: z.enum(['FORCE_UPDATE', 'OPTIONAL', 'BETA']),
  releaseDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  releaseNotes: z.string().min(1),
  minOSVersion: z.string().min(1),
  downloadUrl: z.string().url().optional().or(z.literal('')),
});

interface AppVersion {
  id: string;
  platform: 'Android' | 'iOS' | 'Web';
  version: string;
  releaseType: 'FORCE_UPDATE' | 'OPTIONAL' | 'BETA';
  releaseDate: string;
  releaseNotes: string;
  minOSVersion: string;
  downloadUrl?: string;
}

export default function AppVersions() {
  const [versions, setVersions] = useState<AppVersion[]>([
    { id: '1', platform: 'Android', version: '2.4.1', releaseType: 'FORCE_UPDATE', releaseDate: '2024-05-01T00:00:00Z', releaseNotes: 'رفع باگ‌های بحرانی', minOSVersion: 'Android 8', downloadUrl: 'https://example.com/app.apk' },
    { id: '2', platform: 'iOS', version: '2.4.0', releaseType: 'OPTIONAL', releaseDate: '2024-04-15T00:00:00Z', releaseNotes: 'بهبود عملکرد', minOSVersion: 'iOS 14', downloadUrl: 'https://example.com/ios' },
    { id: '3', platform: 'Web', version: '3.0.0', releaseType: 'OPTIONAL', releaseDate: '2024-06-01T00:00:00Z', releaseNotes: 'رابط کاربری جدید', minOSVersion: 'Chrome 100+', downloadUrl: '' },
  ]);
  const [showForm, setShowForm] = useState(false);

  // Typed from the zod schema rather than inferred from `defaultValues`, so
  // handleSubmit accepts `onSubmit: (data: z.infer<typeof versionSchema>) => void`.
  const form = useForm<z.infer<typeof versionSchema>>({ resolver: zodResolver(versionSchema), defaultValues: { platform: 'Android', version: '', releaseType: 'OPTIONAL', releaseDateJalali: '', releaseNotes: '', minOSVersion: '', downloadUrl: '' } });

  const forceUpdateActive = versions.some(v => v.releaseType === 'FORCE_UPDATE');

  const onSubmit = (data: z.infer<typeof versionSchema>) => {
    const newVer: AppVersion = {
      id: `ver-${Date.now()}`,
      platform: data.platform,
      version: data.version,
      releaseType: data.releaseType,
      releaseDate: new Date().toISOString(),
      releaseNotes: data.releaseNotes,
      minOSVersion: data.minOSVersion,
      downloadUrl: data.downloadUrl || undefined,
    };
    setVersions(prev => [...prev, newVer]);
    toast.success('نسخه ثبت شد');
    setShowForm(false); form.reset();
  };

  return (
    <div className="space-y-6" dir="rtl">
      {forceUpdateActive && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">هشدار: یک نسخه FORCE_UPDATE فعال است. کاربران باید اپلیکیشن را به‌روزرسانی کنند.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">مدیریت نسخه‌ها</h2>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 ml-1" /> نسخه جدید</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>ثبت نسخه جدید</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>پلتفرم</Label>
                <Select onValueChange={v => form.setValue('platform', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Android">Android</SelectItem><SelectItem value="iOS">iOS</SelectItem><SelectItem value="Web">Web</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>شماره نسخه</Label><Input placeholder="2.5.0" {...form.register('version')} /></div>
              <div className="space-y-2"><Label>نوع انتشار</Label>
                <Select onValueChange={v => form.setValue('releaseType', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FORCE_UPDATE">اجباری</SelectItem><SelectItem value="OPTIONAL">اختیاری</SelectItem><SelectItem value="BETA">بتا</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>تاریخ انتشار (شمسی)</Label><Input {...form.register('releaseDateJalali')} /></div>
              <div className="space-y-2"><Label>حداقل نسخه OS</Label><Input {...form.register('minOSVersion')} /></div>
              <div className="space-y-2"><Label>لینک دانلود</Label><Input {...form.register('downloadUrl')} /></div>
              <div className="md:col-span-3 space-y-2"><Label>یادداشت انتشار</Label><Input {...form.register('releaseNotes')} /></div>
              <div className="md:col-span-3"><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">ثبت</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow><TableHead>پلتفرم</TableHead><TableHead>نسخه</TableHead><TableHead>نوع</TableHead><TableHead>تاریخ</TableHead><TableHead>یادداشت</TableHead><TableHead>عملیات</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {versions.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()).map(v => (
            <TableRow key={v.id}>
              <TableCell>{v.platform}</TableCell>
              <TableCell className="font-mono">{v.version}</TableCell>
              <TableCell><Badge className={v.releaseType === 'FORCE_UPDATE' ? 'bg-red-100 text-red-700' : v.releaseType === 'BETA' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}>{v.releaseType}</Badge></TableCell>
              <TableCell>{toJalaliStr(v.releaseDate)}</TableCell>
              <TableCell className="text-sm text-slate-600">{v.releaseNotes}</TableCell>
              <TableCell><Button size="icon" variant="ghost" className="text-red-500" onClick={() => setVersions(prev => prev.filter(x => x.id !== v.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
