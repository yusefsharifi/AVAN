import { CheckCircle, Clock, XCircle, RotateCcw, UserCheck, Circle } from 'lucide-react';
import type { ApprovalStep } from '@/entities/letter';

interface WorkflowStepperProps {
  steps: ApprovalStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function WorkflowStepper({ steps, currentStep, onStepClick }: WorkflowStepperProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2" dir="rtl">
      {steps.map((step, i) => {
        const Icon = step.state === 'done' ? CheckCircle : step.state === 'current' ? Clock : Circle;
        const color = step.state === 'done' ? 'text-emerald-600 bg-emerald-50 border-emerald-300'
          : step.state === 'current' ? 'text-blue-600 bg-blue-50 border-blue-400 shadow-sm'
          : 'text-slate-400 bg-slate-50 border-slate-200';
        const lineColor = i < steps.length - 1 ? (steps[i + 1]?.state === 'done' || step.state === 'done' ? 'bg-emerald-400' : 'bg-slate-200') : '';

        return (
          <div key={i} className="flex items-center">
            <button onClick={() => onStepClick?.(i)} className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-center">
                <span className={`text-[10px] font-semibold block leading-tight ${step.state === 'current' ? 'text-blue-700' : 'text-muted-foreground'}`}>{step.name}</span>
                {step.person && <span className="text-[9px] text-muted-foreground/70 block mt-0.5">{step.person}</span>}
                {step.date && <span className="text-[9px] text-muted-foreground/50 block" dir="ltr">{step.date}</span>}
              </div>
            </button>
            {i < steps.length - 1 && <div className={`h-0.5 w-8 mb-6 ${lineColor}`} />}
          </div>
        );
      })}
    </div>
  );
}
