/* ------------------------------------------------------------------ */
/*  ZoneOnboardingWizard.tsx                                           */
/*  7 Steps: Identity / Location / Infra / HSE / Financial /          */
/*           Management / Attachments / Review & Submit               */
/* ------------------------------------------------------------------ */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useNationalStore } from '../../store/useNationalStore';
import { useActionAudit } from '../../hooks/useActionAudit';
import { useTenantStore } from '@/core/stores/useTenantStore';
import type { IndustrialZone, ZoneInfrastructure, ZoneHSEProfile, ZoneFinancialProfile, ZoneDocument, ZoneManagerAssignment } from '@/entities/zone';
import { ZONE_CODE_PATTERN, NATIONAL_ZONE_ID_PATTERN } from '@/entities/zone';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

const DRAFT_KEY = 'draft_zone_onboarding';

type WizardStep =
  | 'identity'
  | 'location'
  | 'infrastructure'
  | 'hse'
  | 'financial'
  | 'management'
  | 'attachments'
  | 'review';

const STEP_ORDER: WizardStep[] = [
  'identity',
  'location',
  'infrastructure',
  'hse',
  'financial',
  'management',
  'attachments',
  'review',
];

function stepIndex(s: WizardStep) {
  return STEP_ORDER.indexOf(s);
}

const defaultForm = (): Partial<IndustrialZone> => ({
  id: crypto.randomUUID(),
  status: 'draft',
  name: '',
  code: '',
  nationalZoneId: '',
  province: '',
  city: '',
  address: '',
  latitude: undefined as any,
  longitude: undefined as any,
  totalArea: 0,
  ownershipType: 'governmental',
  zoneClass: 'class1',
  riskLevel: 'low',
  infrastructure: {} as ZoneInfrastructure,
  hseProfile: {} as ZoneHSEProfile,
  financialProfile: {} as ZoneFinancialProfile,
  documents: [] as ZoneDocument[],
  managers: [] as ZoneManagerAssignment[],
  description: '',
});

export default function ZoneOnboardingWizard() {
  const navigate = useNavigate();
  const user = useTenantStore((s) => (s as any).currentUser);
  const { addPark } = useNationalStore();
  const { logCreate } = useActionAudit();

  const [step, setStep] = useState<WizardStep>('identity');
  const [form, setForm] = useState<Partial<IndustrialZone>>(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...defaultForm(), ...JSON.parse(raw) } : defaultForm();
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /* Draft auto-save */
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const setField = <K extends keyof IndustrialZone>(key: K, value: IndustrialZone[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const validateStep = (s: WizardStep): boolean => {
    const e: Record<string, string> = {};
    if (s === 'identity') {
      if (!form.name?.trim()) e.name = 'نام منطقه الزامی است.';
      if (!form.code?.trim()) e.code = 'کد منطقه الزامی است.';
      else if (!ZONE_CODE_PATTERN.test(form.code)) e.code = 'فرمت کد صحیح نیست (مثلاً AB-001).';
      if (form.nationalZoneId && !NATIONAL_ZONE_ID_PATTERN.test(form.nationalZoneId))
        e.nationalZoneId = 'فرمت شناسه ملی صحیح نیست (مثلاً NZ-000001).';
    }
    if (s === 'location') {
      if (!form.province) e.province = 'استان الزامی است.';
      if (!form.city) e.city = 'شهر الزامی است.';
      if (form.latitude == null || form.latitude < 25 || form.latitude > 40)
        e.latitude = 'عرض جغرافیایی باید بین ۲۵ تا ۴۰ باشد.';
      if (form.longitude == null || form.longitude < 44 || form.longitude > 63)
        e.longitude = 'طول جغرافیایی باید بین ۴۴ تا ۶۳ باشد.';
    }
    if (s === 'infrastructure') {
      if (!form.totalArea || form.totalArea <= 0) e.totalArea = 'مساحت کل باید بزرگ‌تر از صفر باشد.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canNext = validateStep(step);
  const next = () => {
    if (!validateStep(step)) return;
    const idx = stepIndex(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const back = () => {
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const submit = async () => {
    for (const s of STEP_ORDER) {
      if (s === 'review') continue;
      if (!validateStep(s)) {
        setStep(s);
        toast.error('لطفاً خطاهای مرحله ' + s + ' را برطرف کنید.');
        return;
      }
    }
    setSubmitting(true);
    const result = addPark(form as IndustrialZone, user?.id ?? 'unknown', user?.name ?? 'ناشناس');
    if (result.success) {
      localStorage.removeItem(DRAFT_KEY);
      logCreate('zone', form.id!, form as Record<string, unknown>, { zoneId: form.id });
      toast.success('منطقه صنعتی با موفقیت ثبت شد.');
      navigate('/super-admin/zones');
    } else {
      toast.error(result.error ?? 'خطا در ثبت منطقه.');
    }
    setSubmitting(false);
  };

  const stepProgress = useMemo(() => {
    const idx = stepIndex(step);
    return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
  }, [step]);

  /* ------------------------------------------------------------------ */
  /*  Render Helpers                                                    */
  /* ------------------------------------------------------------------ */
  const renderIdentity = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>نام منطقه صنعتی</Label>
        <Input value={form.name ?? ''} onChange={(e) => setField('name', e.target.value)} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <Label>کد منطقه</Label>
        <Input value={form.code ?? ''} onChange={(e) => setField('code', e.target.value)} placeholder="مثلاً AB-001" />
        {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
      </div>
      <div>
        <Label>شناسه ملی منطقه (اختیاری)</Label>
        <Input value={form.nationalZoneId ?? ''} onChange={(e) => setField('nationalZoneId', e.target.value)} placeholder="NZ-000001" />
        {errors.nationalZoneId && <p className="text-red-500 text-xs mt-1">{errors.nationalZoneId}</p>}
      </div>
      <div>
        <Label>نوع مالکیت</Label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.ownershipType ?? 'governmental'}
          onChange={(e) => setField('ownershipType', e.target.value as any)}
        >
          <option value="governmental">دولتی</option>
          <option value="private">خصوصی</option>
          <option value="mixed">مختلط</option>
        </select>
      </div>
      <div>
        <Label>رده‌بندی</Label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.zoneClass ?? 'class1'}
          onChange={(e) => setField('zoneClass', e.target.value as any)}
        >
          <option value="class1">کلاس یک</option>
          <option value="class2">کلاس دو</option>
          <option value="class3">کلاس سه</option>
        </select>
      </div>
      <div>
        <Label>سطح ریسک</Label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.riskLevel ?? 'low'}
          onChange={(e) => setField('riskLevel', e.target.value as any)}
        >
          <option value="low">کم</option>
          <option value="medium">متوسط</option>
          <option value="high">زیاد</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <Label>توضیحات</Label>
        <Input value={form.description ?? ''} onChange={(e) => setField('description', e.target.value)} />
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>استان</Label>
        <Input value={form.province ?? ''} onChange={(e) => setField('province', e.target.value)} />
        {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
      </div>
      <div>
        <Label>شهر</Label>
        <Input value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} />
        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
      </div>
      <div className="md:col-span-2">
        <Label>آدرس دقیق</Label>
        <Input value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} />
      </div>
      <div>
        <Label>عرض جغرافیایی</Label>
        <Input type="number" value={form.latitude ?? ''} onChange={(e) => setField('latitude', parseFloat(e.target.value))} />
        {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
      </div>
      <div>
        <Label>طول جغرافیایی</Label>
        <Input type="number" value={form.longitude ?? ''} onChange={(e) => setField('longitude', parseFloat(e.target.value))} />
        {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
      </div>
    </div>
  );

  const renderInfra = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label>مساحت کل (هکتار)</Label>
        <Input type="number" value={form.totalArea ?? ''} onChange={(e) => setField('totalArea', parseFloat(e.target.value))} />
        {errors.totalArea && <p className="text-red-500 text-xs mt-1">{errors.totalArea}</p>}
      </div>
      {(['power', 'water', 'gas', 'telecom', 'waste', 'fireSafety', 'medical', 'security'] as const).map((k) => (
        <div key={k}>
          <Label>{k === 'power' ? 'برق' : k === 'water' ? 'آب' : k === 'gas' ? 'گاز' : k === 'telecom' ? 'مخابرات' : k === 'waste' ? 'پسماند' : k === 'fireSafety' ? 'ایمنی آتش‌نشانی' : k === 'medical' ? 'درمان' : 'نگهبانی'}</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={(form.infrastructure as any)?.[k]?.status ?? 'available'}
            onChange={(e) =>
              setField('infrastructure', {
                ...(form.infrastructure as any),
                [k]: { status: e.target.value, capacity: (form.infrastructure as any)?.[k]?.capacity ?? 0 },
              } as ZoneInfrastructure)
            }
          >
            <option value="available">موجود</option>
            <option value="limited">محدود</option>
            <option value="unavailable">ناموجود</option>
          </select>
        </div>
      ))}
    </div>
  );

  const renderHSE = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(['environmentalApproval', 'safetyCertificate', 'fireFightingPlan', 'emergencyResponsePlan', 'wasteManagementPlan'] as const).map((k) => (
        <div key={k} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(form.hseProfile as any)?.[k] ?? false}
            onChange={(e) =>
              setField('hseProfile', {
                ...(form.hseProfile as any),
                [k]: e.target.checked,
              } as ZoneHSEProfile)
            }
          />
          <Label className="mb-0">
            {k === 'environmentalApproval'
              ? 'تأییدیه محیط‌زیست'
              : k === 'safetyCertificate'
              ? 'گواهی ایمنی'
              : k === 'fireFightingPlan'
              ? 'طرح آتش‌نشانی'
              : k === 'emergencyResponsePlan'
              ? 'طرح اضطراری'
              : 'طرح مدیریت پسماند'}
          </Label>
        </div>
      ))}
    </div>
  );

  const renderFinancial = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>شماره حساب بانکی (شبا)</Label>
        <Input value={(form.financialProfile as any)?.shaba ?? ''} onChange={(e) => setField('financialProfile', { ...(form.financialProfile as any), shaba: e.target.value } as ZoneFinancialProfile)} placeholder="IRXXXXXXXXXXXXXXXXXXXXXXXX" />
      </div>
      <div>
        <Label>کد اقتصادی</Label>
        <Input value={(form.financialProfile as any)?.taxCode ?? ''} onChange={(e) => setField('financialProfile', { ...(form.financialProfile as any), taxCode: e.target.value } as ZoneFinancialProfile)} />
      </div>
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-3">
      <Label>مدیران منطقه</Label>
      {(form.managers || []).map((m: ZoneManagerAssignment, i: number) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="نام مدیر" value={m.name} onChange={(e) => {
            const next = [...(form.managers || [])];
            next[i] = { ...m, name: e.target.value };
            setField('managers', next);
          }} />
          <Input placeholder="نقش" value={m.role} onChange={(e) => {
            const next = [...(form.managers || [])];
            next[i] = { ...m, role: e.target.value };
            setField('managers', next);
          }} />
          <Button variant="destructive" size="sm" onClick={() => {
            const next = [...(form.managers || [])];
            next.splice(i, 1);
            setField('managers', next);
          }}>حذف</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setField('managers', [...(form.managers || []), { name: '', role: '', assignedAt: new Date().toISOString() } as ZoneManagerAssignment])}>
        + افزودن مدیر
      </Button>
    </div>
  );

  const renderAttachments = () => (
    <div className="space-y-3">
      <Label>مدارک پیوست</Label>
      {(form.documents || []).map((d: ZoneDocument, i: number) => (
        <div key={d.id ?? i} className="grid grid-cols-4 gap-2 border rounded-lg p-2">
          <Input placeholder="عنوان مدرک" value={d.title}
            onChange={(e) => {
              const next = [...(form.documents || [])];
              next[i] = { ...d, title: e.target.value };
              setField('documents', next);
            }} />
          <Input placeholder="شماره سند" value={d.documentNumber ?? ''}
            onChange={(e) => {
              const next = [...(form.documents || [])];
              next[i] = { ...d, documentNumber: e.target.value };
              setField('documents', next);
            }} />
          <Input type="date" placeholder="تاریخ انقضا" value={d.expiryDate ?? ''}
            onChange={(e) => {
              const next = [...(form.documents || [])];
              next[i] = { ...d, expiryDate: e.target.value };
              setField('documents', next);
            }} />
          <Button variant="destructive" size="sm" onClick={() => {
            const next = [...(form.documents || [])];
            next.splice(i, 1);
            setField('documents', next);
          }}>حذف</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() =>
        setField('documents', [...(form.documents || []), {
          id: crypto.randomUUID(), title: '', type: 'license',
          documentNumber: '', issueDate: new Date().toISOString().slice(0, 10),
          expiryDate: '', fileUrl: '',
        } as ZoneDocument])
      }>
        + افزودن مدرک
      </Button>
      <p className="text-xs text-slate-500">بارگذاری فایل واقعی در نسخه بعدی؛ فعلاً متادیتای مدرک ثبت می‌شود.</p>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <h4 className="font-bold text-slate-800">مرور نهایی اطلاعات</h4>
      <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
        <div>نام: <b>{form.name}</b></div>
        <div>کد: <b>{form.code}</b></div>
        <div>شناسه ملی: <b>{form.nationalZoneId || '—'}</b></div>
        <div>موقعیت: <b>{form.province}، {form.city}</b></div>
        <div>مساحت: <b>{form.totalArea} هکتار</b></div>
        <div>مالکیت: <b>{form.ownershipType}</b></div>
        <div>مدیران: <b>{(form.managers || []).length}</b></div>
        <div>مدارک: <b>{(form.documents || []).length}</b></div>
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="text-red-500 text-sm">لطفاً خطاها را قبل از ارسال برطرف کنید.</p>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'identity': return renderIdentity();
      case 'location': return renderLocation();
      case 'infrastructure': return renderInfra();
      case 'hse': return renderHSE();
      case 'financial': return renderFinancial();
      case 'management': return renderManagement();
      case 'attachments': return renderAttachments();
      case 'review': return renderReview();
    }
  };

  const STEP_LABELS: Record<WizardStep, string> = {
    identity: 'شناسنامه',
    location: 'موقعیت مکانی',
    infrastructure: 'زیرساخت‌ها',
    hse: 'ایمنی و محیط‌زیست',
    financial: 'مالی',
    management: 'مدیریت و کاربران',
    attachments: 'پیوست‌ها',
    review: 'مرور و ثبت',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-amber-500 to-amber-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">ثبت منطقه صنعتی جدید</h2>
        <p className="text-amber-100 text-sm mt-1">مرحله {stepIndex(step) + 1} از {STEP_ORDER.length} — {STEP_LABELS[step]}</p>
        <div className="w-full bg-amber-400/40 rounded-full h-2 mt-3">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${stepProgress}%` }} />
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex flex-wrap gap-1">
        {STEP_ORDER.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= stepIndex(step) && setStep(s)}
            className={`px-3 py-1.5 rounded-md text-xs transition ${
              s === step
                ? 'bg-amber-500 text-white'
                : i < stepIndex(step)
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {i + 1}. {STEP_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="bg-white rounded-xl border p-6">{renderStep()}</div>

      {/* Footer */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={back} disabled={stepIndex(step) === 0}>
          مرحله قبل
        </Button>
        {step !== 'review' ? (
          <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={next} disabled={!canNext && stepIndex(step) <= 2}>
            مرحله بعد
          </Button>
        ) : (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'در حال ثبت…' : 'ثبت نهایی منطقه صنعتی'}
          </Button>
        )}
      </div>
    </div>
  );
}
