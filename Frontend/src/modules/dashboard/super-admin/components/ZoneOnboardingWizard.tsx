import { useState } from 'react';
import { useNationalStore } from '../store';
import { NationalPark, LifecycleStatus, ParkPlan } from '../types';
import { provinces } from '../data';
import { 
  ChevronLeft, ChevronRight, Check, Building2, Settings, User, 
  FileText, ToggleLeft, Upload
} from 'lucide-react';

interface WizardData {
  // Step 1 - Basic Info
  code: string;
  nameFa: string;
  nameEn: string;
  province: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  areaSqM: string;
  plan: ParkPlan;
  status: LifecycleStatus;
  
  // Step 2 - Infrastructure
  gates: string;
  parkingCapacity: string;
  electricityCapacityKw: string;
  waterCapacityM3: string;
  gasCapacityNm3: string;
  wastewaterCapacityM3: string;
  internetCapacityMbps: string;
  fireStation: boolean;
  clinic: boolean;
  warehouse: boolean;
  weighbridge: boolean;
  
  // Step 3 - Financial
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  currency: string;
  taxProfile: string;
  bankAccount: string;
  
  // Step 4 - Operations
  workingHoursStart: string;
  workingHoursEnd: string;
  zoneManagerName: string;
  zoneManagerEmail: string;
  zoneManagerPhone: string;
  
  // Step 5 - Features
  features: {
    anpr: boolean;
    weighbridge: boolean;
    visitorManagement: boolean;
    workflow: boolean;
    finance: boolean;
    inventory: boolean;
    hr: boolean;
    marketplace: boolean;
    iot: boolean;
    mobileApp: boolean;
    reports: boolean;
  };
}

const initialWizardData: WizardData = {
  code: '',
  nameFa: '',
  nameEn: '',
  province: '',
  city: '',
  address: '',
  latitude: '',
  longitude: '',
  areaSqM: '',
  plan: 'standard',
  status: 'draft',
  gates: '2',
  parkingCapacity: '500',
  electricityCapacityKw: '',
  waterCapacityM3: '',
  gasCapacityNm3: '',
  wastewaterCapacityM3: '',
  internetCapacityMbps: '',
  fireStation: false,
  clinic: false,
  warehouse: false,
  weighbridge: false,
  billingCycle: 'monthly',
  currency: 'IRR',
  taxProfile: '',
  bankAccount: '',
  workingHoursStart: '07:00',
  workingHoursEnd: '17:00',
  zoneManagerName: '',
  zoneManagerEmail: '',
  zoneManagerPhone: '',
  features: {
    anpr: true,
    weighbridge: true,
    visitorManagement: true,
    workflow: true,
    finance: true,
    inventory: false,
    hr: false,
    marketplace: true,
    iot: true,
    mobileApp: true,
    reports: true,
  },
};

const steps = [
  { id: 1, title: 'اطلاعات پایه', icon: <Building2 className="w-5 h-5" /> },
  { id: 2, title: 'زیرساخت', icon: <Settings className="w-5 h-5" /> },
  { id: 3, title: 'مالی', icon: <FileText className="w-5 h-5" /> },
  { id: 4, title: 'عملیات', icon: <User className="w-5 h-5" /> },
  { id: 5, title: 'امکانات', icon: <ToggleLeft className="w-5 h-5" /> },
  { id: 6, title: 'مستندات', icon: <Upload className="w-5 h-5" /> },
];

const plans: { id: ParkPlan; label: string; description: string }[] = [
  { id: 'basic', label: 'پایه', description: 'امکانات اولیه' },
  { id: 'standard', label: 'استاندارد', description: 'امکانات متوسط' },
  { id: 'premium', label: 'پرمیوم', description: 'امکانات کامل' },
  { id: 'national', label: 'ملی', description: 'تمام امکانات' },
];

interface ZoneOnboardingWizardProps {
  onComplete?: (park: NationalPark) => void;
  onCancel?: () => void;
}

export function ZoneOnboardingWizard({ onComplete, onCancel }: ZoneOnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const { addPark } = useNationalStore();

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const updateFeature = (feature: keyof WizardData['features'], value: boolean) => {
    setData(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: value }
    }));
  };

  const nextStep = () => {
    if (step < 6) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const newPark: NationalPark = {
      id: `park-${Date.now()}`,
      code: data.code,
      nameFa: data.nameFa,
      nameEn: data.nameEn || undefined,
      province: data.province,
      city: data.city,
      address: data.address,
      geoLocation: {
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
      },
      areaSqM: parseInt(data.areaSqM) || 0,
      maximumCompanyCapacity: 0,
      currentCompanyCount: 0,
      occupancyPercent: 0,
      lifecycleStatus: data.status,
      plan: data.plan,
      infrastructure: {
        gates: parseInt(data.gates) || 2,
        parkingCapacity: parseInt(data.parkingCapacity) || 0,
        electricityCapacityKw: parseInt(data.electricityCapacityKw) || undefined,
        waterCapacityM3: parseInt(data.waterCapacityM3) || undefined,
        gasCapacityNm3: parseInt(data.gasCapacityNm3) || undefined,
        wastewaterCapacityM3: parseInt(data.wastewaterCapacityM3) || undefined,
        internetCapacityMbps: parseInt(data.internetCapacityMbps) || undefined,
        fireStation: data.fireStation,
        clinic: data.clinic,
        warehouse: data.warehouse,
        weighbridge: data.weighbridge,
      },
      managementTeam: {},
      enabledFeatures: data.features,
      documents: [],
      healthScore: 0,
      monthlyTraffic: 0,
      onlineDevices: 0,
      totalDevices: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPark(newPark);
    onComplete?.(newPark);
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5 text-right";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-amber-500 to-amber-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">ثبت شهرک صنعتی جدید</h2>
        <p className="text-amber-100 text-sm mt-1">اطلاعات شهرک جدید را وارد کنید</p>
      </div>

      {/* Steps */}
      <div className="px-6 py-4 border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                step === s.id 
                  ? 'bg-amber-100 text-amber-700' 
                  : step > s.id 
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  step === s.id 
                    ? 'bg-amber-500 text-white' 
                    : step > s.id 
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-300 text-slate-600'
                }`}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>کد شهرک *</label>
                <input
                  type="text"
                  value={data.code}
                  onChange={(e) => updateData({ code: e.target.value })}
                  placeholder="مثال: PRK-TEH-008"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>طرح اشتراک</label>
                <select
                  value={data.plan}
                  onChange={(e) => updateData({ plan: e.target.value as ParkPlan })}
                  className={inputClass}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.label} - {p.description}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>نام فارسی *</label>
                <input
                  type="text"
                  value={data.nameFa}
                  onChange={(e) => updateData({ nameFa: e.target.value })}
                  placeholder="شهرک صنعتی..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>نام انگلیسی</label>
                <input
                  type="text"
                  value={data.nameEn}
                  onChange={(e) => updateData({ nameEn: e.target.value })}
                  placeholder="Industrial Park..."
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>استان *</label>
                <select
                  value={data.province}
                  onChange={(e) => updateData({ province: e.target.value })}
                  className={inputClass}
                >
                  <option value="">انتخاب کنید</option>
                  {provinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>شهر *</label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => updateData({ city: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>آدرس کامل</label>
              <textarea
                value={data.address}
                onChange={(e) => updateData({ address: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>عرض جغرافیایی</label>
                <input
                  type="text"
                  value={data.latitude}
                  onChange={(e) => updateData({ latitude: e.target.value })}
                  placeholder="35.6892"
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>طول جغرافیایی</label>
                <input
                  type="text"
                  value={data.longitude}
                  onChange={(e) => updateData({ longitude: e.target.value })}
                  placeholder="51.3890"
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>مساحت (متر مربع)</label>
                <input
                  type="number"
                  value={data.areaSqM}
                  onChange={(e) => updateData({ areaSqM: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Infrastructure */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>تعداد دروازه‌ها</label>
                <input
                  type="number"
                  value={data.gates}
                  onChange={(e) => updateData({ gates: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>ظرفیت پارکینگ</label>
                <input
                  type="number"
                  value={data.parkingCapacity}
                  onChange={(e) => updateData({ parkingCapacity: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ظرفیت برق (کیلووات)</label>
                <input
                  type="number"
                  value={data.electricityCapacityKw}
                  onChange={(e) => updateData({ electricityCapacityKw: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>ظرفیت آب (متر مکعب)</label>
                <input
                  type="number"
                  value={data.waterCapacityM3}
                  onChange={(e) => updateData({ waterCapacityM3: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ظرفیت گاز (Nm³)</label>
                <input
                  type="number"
                  value={data.gasCapacityNm3}
                  onChange={(e) => updateData({ gasCapacityNm3: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>ظرفیت اینترنت (Mbps)</label>
                <input
                  type="number"
                  value={data.internetCapacityMbps}
                  onChange={(e) => updateData({ internetCapacityMbps: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <label className={labelClass}>امکانات زیرساختی</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { key: 'fireStation', label: 'ایستگاه آتش‌نشانی' },
                  { key: 'clinic', label: 'درمانگاه' },
                  { key: 'warehouse', label: 'انبار مرکزی' },
                  { key: 'weighbridge', label: 'باسکول' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={data[item.key as keyof WizardData] as boolean}
                      onChange={(e) => updateData({ [item.key]: e.target.checked })}
                      className="w-5 h-5 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Financial */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>دوره صورتحساب</label>
                <select
                  value={data.billingCycle}
                  onChange={(e) => updateData({ billingCycle: e.target.value as WizardData['billingCycle'] })}
                  className={inputClass}
                >
                  <option value="monthly">ماهانه</option>
                  <option value="quarterly">سه‌ماهه</option>
                  <option value="yearly">سالانه</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>واحد پول</label>
                <select
                  value={data.currency}
                  onChange={(e) => updateData({ currency: e.target.value })}
                  className={inputClass}
                >
                  <option value="IRR">ریال ایران</option>
                  <option value="USD">دلار آمریکا</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>پروفایل مالیاتی</label>
              <input
                type="text"
                value={data.taxProfile}
                onChange={(e) => updateData({ taxProfile: e.target.value })}
                placeholder="شناسه مالیاتی"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>شماره حساب بانکی</label>
              <input
                type="text"
                value={data.bankAccount}
                onChange={(e) => updateData({ bankAccount: e.target.value })}
                placeholder="شماره شبا"
                className={inputClass}
                dir="ltr"
              />
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-amber-800 text-sm">
                <strong>توجه:</strong> تنظیمات مالی پیشرفته‌تر پس از فعال‌سازی شهرک از بخش مدیریت مالی قابل پیکربندی خواهد بود.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Operations */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>ساعت شروع فعالیت</label>
                <input
                  type="time"
                  value={data.workingHoursStart}
                  onChange={(e) => updateData({ workingHoursStart: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelClass}>ساعت پایان فعالیت</label>
                <input
                  type="time"
                  value={data.workingHoursEnd}
                  onChange={(e) => updateData({ workingHoursEnd: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-slate-800 mb-4">اطلاعات مدیر شهرک</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>نام و نام خانوادگی</label>
                  <input
                    type="text"
                    value={data.zoneManagerName}
                    onChange={(e) => updateData({ zoneManagerName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>ایمیل</label>
                    <input
                      type="email"
                      value={data.zoneManagerEmail}
                      onChange={(e) => updateData({ zoneManagerEmail: e.target.value })}
                      className={inputClass}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>شماره موبایل</label>
                    <input
                      type="tel"
                      value={data.zoneManagerPhone}
                      onChange={(e) => updateData({ zoneManagerPhone: e.target.value })}
                      className={inputClass}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Features */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm mb-4">
              ماژول‌های مورد نظر برای فعال‌سازی در این شهرک را انتخاب کنید.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'anpr', label: 'ANPR / پلاک‌خوان', description: 'شناسایی خودکار پلاک' },
                { key: 'weighbridge', label: 'باسکول', description: 'مدیریت توزین' },
                { key: 'visitorManagement', label: 'مدیریت بازدیدکنندگان', description: 'ثبت و پیگیری بازدید' },
                { key: 'workflow', label: 'گردش کار', description: 'فرایندهای تایید' },
                { key: 'finance', label: 'امور مالی', description: 'حسابداری و فاکتور' },
                { key: 'inventory', label: 'انبار', description: 'مدیریت موجودی' },
                { key: 'hr', label: 'منابع انسانی', description: 'حقوق و پرسنل' },
                { key: 'marketplace', label: 'بازار B2B', description: 'بورس کالا' },
                { key: 'iot', label: 'IoT', description: 'دستگاه‌های هوشمند' },
                { key: 'mobileApp', label: 'اپلیکیشن موبایل', description: 'دسترسی موبایلی' },
                { key: 'reports', label: 'گزارشات', description: 'گزارش‌سازی پیشرفته' },
              ].map(item => (
                <label 
                  key={item.key} 
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    data.features[item.key as keyof WizardData['features']]
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={data.features[item.key as keyof WizardData['features']]}
                    onChange={(e) => updateFeature(item.key as keyof WizardData['features'], e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="block font-medium text-slate-800">{item.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{item.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Documents */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">بارگذاری مستندات</h3>
              <p className="text-slate-500 text-sm mb-6">
                مستندات قانونی، قرارداد مدیریتی، بیمه‌نامه و سایر مدارک را بارگذاری کنید.
              </p>
              <button className="px-6 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-amber-500 hover:text-amber-600">
                انتخاب فایل‌ها
              </button>
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <p className="text-emerald-800 text-sm">
                <strong>تایید نهایی:</strong> پس از ثبت، شهرک در وضعیت «پیش‌نویس» قرار می‌گیرد و نیاز به تایید مراحل بررسی قانونی، مالی، HSE و عملیاتی دارد.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:text-slate-800"
        >
          انصراف
        </button>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
              مرحله قبل
            </button>
          )}
          {step < 6 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              مرحله بعد
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              <Check className="w-4 h-4" />
              ثبت شهرک
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
