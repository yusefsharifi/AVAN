import { CheckCircle, Clock, Circle, XCircle, RotateCcw } from 'lucide-react';

interface WorkflowStep {
  name: string;
  assignee: string;
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'returned';
  date?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
}

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2" dir="rtl">
      {steps.map((step, i) => {
        const Icon = step.status === 'approved' ? CheckCircle : step.status === 'active' ? Clock : step.status === 'rejected' ? XCircle : step.status === 'returned' ? RotateCcw : Circle;
        const color = step.status === 'approved' ? 'text-emerald-600 bg-emerald-50 border-emerald-300' : step.status === 'active' ? 'text-blue-600 bg-blue-50 border-blue-400 shadow-sm' : step.status === 'rejected' ? 'text-red-600 bg-red-50 border-red-300' : 'text-slate-400 bg-slate-50 border-slate-200';
        const lineColor = i < steps.length - 1 ? (steps[i + 1]?.status === 'approved' || step.status === 'approved' ? 'bg-emerald-400' : 'bg-slate-200') : '';
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-center">
                <span className={`text-[10px] font-semibold block leading-tight ${step.status === 'active' ? 'text-blue-700' : 'text-muted-foreground'}`}>{step.name}</span>
                <span className="text-[9px] text-muted-foreground/70 block mt-0.5">{step.assignee}</span>
                {step.date && <span className="text-[9px] text-muted-foreground/50 block" dir="ltr">{step.date}</span>}
              </div>
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-8 mb-6 ${lineColor}`} />}
          </div>
        );
      })}
    </div>
  );
}
