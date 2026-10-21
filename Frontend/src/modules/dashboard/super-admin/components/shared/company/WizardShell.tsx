// src/modules/dashboard/super-admin/components/shared/company/WizardShell.tsx
import React from 'react';
import { Button } from '@/app/components/ui/button';

export interface WizardStepDef {
  key: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string;
  steps: WizardStepDef[];
  activeStep: number;
  onStepClick?: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isLastStep: boolean;
  submitting?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
  accentClass?: string; // e.g. 'bg-amber-500'
}

export default function WizardShell({
  title, subtitle, steps, activeStep, onStepClick, onBack, onNext, onSubmit,
  isLastStep, submitting, submitLabel = 'ثبت نهایی', children,
  accentClass = 'bg-amber-500 hover:bg-amber-600',
}: Props) {
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div className="bg-gradient-to-l from-amber-500 to-amber-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-amber-100 text-sm mt-1">{subtitle}</p>}
        <p className="text-amber-100 text-xs mt-1">
          مرحله {activeStep + 1} از {steps.length} — {steps[activeStep].label}
        </p>
        <div className="w-full bg-white/30 rounded-full h-2 mt-3">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {steps.map((s, i) => (
          <button key={s.key} type="button"
            onClick={() => onStepClick && i <= activeStep && onStepClick(i)}
            className={`px-3 py-1.5 rounded-md text-xs transition ${
              i === activeStep ? 'bg-amber-500 text-white'
              : i < activeStep ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-400'
            }`}>
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">{children}</div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={activeStep === 0}>مرحله قبل</Button>
        {!isLastStep ? (
          <Button className={`${accentClass} text-white`} onClick={onNext}>مرحله بعد</Button>
        ) : (
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={onSubmit} disabled={submitting}>
            {submitting ? 'در حال ثبت…' : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
