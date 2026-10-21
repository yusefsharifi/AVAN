import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatCurrency } from '@/modules/finance/utils/persianUtils';
import type { CommercialContract } from '@/modules/commercial/types';

type ContractDraft = Omit<CommercialContract, 'id' | 'contractNumber' | 'createdAt' | 'updatedAt'> & {
  contractNumber: string;
};

interface ContractWizardStepItem {
  label: string;
  name: string;
  required?: boolean;
  validation?: (v: string) => boolean;
}

interface ContractWizardStep {
  id: string;
  title: string;
  steps: ContractWizardStepItem[];
}

export function ContractWizard() {
  const { createContract } = useCommercialStore();
  const [step, setStep] = useState(1);
  const [contract] = useState<ContractDraft>({
    contractNumber: '',
    title: '',
    direction: 'sales',
    partyId: '',
    partyName: '',
    startDate: '',
    endDate: '',
    autoRenew: false,
    renewalNoticeDays: 30,
    value: 0,
    currencyCode: 'IRR',
    paymentSchedule: [],
    deliverables: [],
    status: 'draft',
    signatories: [],
    addenda: [],
    linkedOrderIds: [],
    tags: [],
    createdBy: '',
  });

  const steps: ContractWizardStep[] = [
    {
      id: 'step1',
      title: 'طرفین و دوره',
      steps: [
        { label: 'تایید طرفین', name: 'partyName', required: true },
        { label: 'تاریخ شروع', name: 'startDate', validation: (v) => v.length > 0 },
        { label: 'تاریخ پایان', name: 'endDate', validation: (v) => v.length > 0 },
        { label: 'خودکار بازنشستگی', name: 'autoRenew', validation: () => true },
      ],
    },
    {
      id: 'step2',
      title: 'برنامه پرداخت',
      steps: [
        { label: 'افزودن دوره پرداخت', name: 'addPayment', validation: () => true },
        { label: 'تاریخ مهلت', name: 'dueDate', validation: () => true },
        { label: 'توضیح پرداخت', name: 'description', validation: () => true },
      ],
    },
    {
      id: 'step3',
      title: 'تعهدات و امضاکنندگان',
      steps: [
        { label: 'تعهدات تحویل', name: 'deliverables', validation: (v) => v.length > 0 },
        { label: 'امضاکنندگان', name: 'signatories', validation: (v) => v.length > 0 },
      ],
    },
    {
      id: 'step4',
      title: 'تایید و ارسال',
      steps: [
        { label: 'مرور نهایی', name: 'review', validation: () => true },
        { label: 'ارسال برای امضا', name: 'sendForSignature', validation: () => true },
      ],
    },
  ];

  const currentStep = steps[step - 1];
  const [, setFormData] = useState<ContractDraft>({ ...contract });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    createContract(contract);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xl font-bold mb-4">قالب قرارداد - مرحله {step}</h2>
      
      {step <= 4 && (
        <>
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">{currentStep.title}</h3>
            <div className="flex justify-between">
              <div className="text-sm text-gray-600">{currentStep.title}</div>
              <div className="text-sm text-gray-500">
                {step}/{steps.length}
              </div>
            </div>
            
            {currentStep.steps.map((stepItem, index) => (
              <div key={index} className="mb-3">
                <div className="flex items-center mb-2">
                  <span className="w-8 h-6 rounded bg-blue-100 mr-2">{index + 1}</span>
                  <span className="text-sm">{stepItem.label}</span>
                </div>
                <input
                  type="text"
                  value={contract[stepItem.name as keyof ContractDraft] as string}
                  onChange={(e) => handleInputChange(stepItem.name, e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm mt-1"
                  disabled={step > 1}
                />
              </div>
          ))}
          </div>
          
          {step < 4 && (
            <div className="flex justify-between mt-4">
              <button
                onClick={handleBack}
                className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                بازگشت
              </button>
              <button
                onClick={handleNext}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
              >
                بعدی →
              </button>
            </div>
          )}
        </>
      )}
      
      {step === 4 && (
        <>
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">خلاصه قرارداد</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">شماره قرارداد:</span>
                <span className="text-lg">{contract.contractNumber}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">عنوان:</span>
                <span className="text-lg">{contract.title}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">طرف:</span>
                <span className="text-lg">{contract.partyName || '—'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">مبلغ:</span>
                <span className="text-lg">{formatCurrency(contract.value, contract.currencyCode)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              onClick={handleSubmit}
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 transition-colors"
            >
              ارسال برای امضا
            </button>
          </div>
        </>
      )}
    </div>
  );
}