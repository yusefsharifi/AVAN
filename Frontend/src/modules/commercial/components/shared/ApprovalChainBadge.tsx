import { ProformaApprovalStep } from '@/modules/commercial/types';

export interface ApprovalChainBadgeProps {
  steps: ProformaApprovalStep[];
  showCurrentOnly?: boolean;
}

export function ApprovalChainBadge({ steps, showCurrentOnly = false }: ApprovalChainBadgeProps) {
  const currentIndex = steps.findIndex((s) => s.status === 'active') + 1 || 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs text-muted-foreground">سلسله approval</span>
        <span className="text-xs font-medium">
          {currentIndex} از {steps.length}
        </span>
      </div>
      <div className="space-y-1">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentIndex - 1;
          const isCompleted = idx < currentIndex && step.status === 'approved';
          const isNext = idx === currentIndex;

          const statusClass = isCompleted
            ? 'bg-green-100 text-green-800'
            : isCurrent
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600';

          return (
            <div
              key={step.id}
              className="flex items-center gap-2"
            >
              <span
                className={`w-2 h-2 rounded-full ${statusClass}`}
                style={{ transition: 'all 0.2s' }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: isCompleted ? '#22c55e' : isCurrent ? '#10b981' : '#6b7280' }}
              >
                {step.roleFa}
              </span>
              {isNext && (
                <span className="text-xs text-gray-400">▶</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}