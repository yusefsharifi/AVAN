import React, { useState } from 'react';
import { useCompanyStore } from '../store/useCompanyStore';
import { useToastStore } from '../store/useToastStore';
import { zoneEventBus } from '../store/eventBus';
import { Stepper, Modal } from './primitives';
import { Building2, Save, X, Check, FileText } from 'lucide-react';
import type { CompanyOnboardingRecord, WorkflowStep, ZoneDocument } from '../types';

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 'legal', title: 'اطلاعات حقوقی' },
  { id: 'contacts', title: 'اطلاعات تماس' },
  { id: 'location', title: 'زمین و استقرار' },
  { id: 'operations', title: 'عملیات و پرسنل' },
  { id: 'hse', title: 'بهداشت و ایمنی' },
  { id: 'finance', title: 'مالی و خدمات' },
  { id: 'review', title: 'مدارک و تأیید' },
];

export const CompanyOnboardingWizard: React.FC<WizardProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [documents, setDocuments] = useState<ZoneDocument[]>([]);
  const [formData, setFormData] = useState<Partial<CompanyOnboardingRecord>>({
    companyType: 'private_joint_stock',
    contacts: [],
    requestedServices: [],
    documents: [],
    workflowHistory: [],
    needsWarehouse: false,
    needsHazmatStorage: false,
    needsHighVoltage: false,
    needsIndustrialGas: false,
    needsWastewater: false,
    lifecycleStatus: 'applicant',
  });

  const { addCompany } = useCompanyStore();
  const { addToast } = useToastStore();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...(prev.address || { zoneId: 'zone-kaveh', block: '', unit: '' }), [name]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const workflowHistory: WorkflowStep[] = [
        { id: `wf-${Date.now()}-1`, order: 1, name: 'بررسی مدارک', role: 'کارشناس پذیرش', status: 'pending' },
        { id: `wf-${Date.now()}-2`, order: 2, name: 'بررسی مالی', role: 'کارشناس مالی', status: 'pending' },
        { id: `wf-${Date.now()}-3`, order: 3, name: 'بررسی HSE', role: 'کارشناس HSE', status: 'pending' },
        { id: `wf-${Date.now()}-4`, order: 4, name: 'تأیید مدیر شهرک', role: 'مدیر شهرک', status: 'pending' },
      ];
      const newCompanyId = addCompany({ ...formData, documents, workflowHistory, lifecycleStatus: 'under_review' } as any);

      zoneEventBus.emit({
        type: 'COMPANY_CREATED',
        payload: { companyId: newCompanyId, companyName: formData.companyName || '' }
      });

      addToast({ type: 'success', title: 'موفقیت', message: 'پرونده شرکت با موفقیت ثبت شد' });
      onClose();
      setCurrentStep(0);
    } catch (err) {
      addToast({ type: 'error', title: 'خطا', message: 'خطا در ثبت اطلاعات شرکت' });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام شرکت *</label>
              <input type="text" name="companyName" required value={formData.companyName || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع شرکت</label>
                <select name="companyType" value={formData.companyType || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="private_joint_stock">سهامی خاص</option>
                  <option value="limited_liability">مسئولیت محدود</option>
                  <option value="cooperative">تعاونی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کد اقتصادی</label>
                <input type="text" name="taxNumber" value={formData.taxNumber || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره ثبت</label>
                <input type="text" name="registrationNumber" value={formData.registrationNumber || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شناسه ملی</label>
                <input type="text" name="nationalId" value={formData.nationalId || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صنعت / حوزه فعالیت *</label>
              <input type="text" name="industry" required value={formData.industry || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="مثال: قطعه‌سازی" />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام نماینده قانونی (مدیرعامل)</label>
              <input type="text" name="legalRepName" value={formData.legalRepName || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط امور ایمنی و HSE</label>
              <input type="text" name="hseContact" value={formData.hseContact || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط امور مالی</label>
              <input type="text" name="financialContact" value={formData.financialContact || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">مشخصات زمین و سوله درخواستی</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بلوک</label>
                <select name="block" value={formData.address?.block || ''} onChange={handleAddressChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">انتخاب بلوک</option>
                  <option value="A">بلوک A - فلزی</option>
                  <option value="B">بلوک B - شیمیایی</option>
                  <option value="C">بلوک C - سلولزی</option>
                  <option value="D">بلوک D - برق و الکترونیک</option>
                  <option value="F">بلوک F - ماشین‌سازی</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">متراژ درخواستی (مترمربع)</label>
                <input type="number" name="areaSqM" value={formData.areaSqM || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" dir="ltr" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تعداد پرسنل برآوردی</label>
                <input type="number" name="employees" value={formData.employees || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تعداد شیفت کاری</label>
                <input type="number" name="shifts" value={formData.shifts || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ظرفیت تولید پیش‌بینی شده</label>
              <textarea name="operatingCapacity" value={formData.operatingCapacity || ''} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-2">نیازسنجی ایمنی و زیرساخت</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                <input type="checkbox" name="needsHazmatStorage" checked={formData.needsHazmatStorage || false} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-gray-700 text-sm">نیاز به انبار مواد شیمیایی یا خطرناک (Hazmat)</span>
              </label>
              <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                <input type="checkbox" name="needsWarehouse" checked={formData.needsWarehouse || false} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-gray-700 text-sm">نیاز به سوله انبار محصول</span>
              </label>
              <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                <input type="checkbox" name="needsHighVoltage" checked={formData.needsHighVoltage || false} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-gray-700 text-sm">نیاز به برق فشار قوی صنعتی</span>
              </label>
              <label className="flex items-center space-x-3 space-x-reverse cursor-pointer">
                <input type="checkbox" name="needsWastewater" checked={formData.needsWastewater || false} onChange={handleChange} className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-gray-700 text-sm">نیاز به اتصال به تصفیه‌خانه فاضلاب صنعتی</span>
              </label>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره حساب / شبا (اختیاری)</label>
                <input type="text" name="bankAccount" value={formData.bankAccount || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سرمایه ثبتی (میلیون ریال)</label>
                <input type="number" name="creditLimit" value={formData.creditLimit || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" dir="ltr" />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
              <div className="flex">
                <FileText className="h-5 w-5 text-blue-400 mt-0.5 ml-3 shrink-0" />
                <p className="text-sm text-blue-700 leading-relaxed">
                  لطفاً مدارک زیر را در سیستم بارگذاری کنید (در این نسخه آزمایشی نیازی به آپلود واقعی نیست). پس از ثبت نهایی، پرونده در کارتابل "درخواست‌های متقاضی" جهت بررسی توسط واحد مالی و هماهنگی قرار خواهد گرفت.
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 text-sm text-blue-700">
              انتخاب و بارگذاری مدرک
              <input
                className="hidden"
                type="file"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setDocuments((current) => [
                    ...current,
                    ...files.map((file) => ({
                      id: `company-doc-${Date.now()}-${file.name}`,
                      type: 'company_document',
                      fileName: file.name,
                      fileUrl: URL.createObjectURL(file),
                      uploadedAt: '۱۴۰۳/۰۵/۰۱',
                      uploadedBy: 'مدیر شهرک',
                      status: 'pending' as const,
                      version: 1,
                    })),
                  ]);
                }}
              />
            </label>
            <div className="mt-4 space-y-2">
              {documents.map((document) => (
                <div className="flex items-center justify-between rounded border p-2 text-xs" key={document.id}>
                  <button onClick={() => setDocuments((current) => current.filter((item) => item.id !== document.id))} className="text-red-600">حذف</button>
                  <span>{document.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تشکیل پرونده متقاضی جدید" size="2xl">
      <div className="mb-14">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="min-h-[300px] py-4">
          {renderStepContent()}
        </div>

        <div className="mt-8 flex items-center justify-between pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
          >
            مرحله قبل
          </button>

          <div className="flex space-x-3 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              انصراف
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                مرحله بعد
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none"
              >
                <Save className="h-4 w-4 ml-2" />
                ثبت نهایی و ایجاد پرونده
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
export default CompanyOnboardingWizard;
