export interface ApprovalThresholdConfig {
  maxAmount: number;
  steps: { roleFa: string; order: number }[];
}

export const APPROVAL_TIERS: ApprovalThresholdConfig[] = [
  {
    maxAmount: 500_000_000,
    steps: [{ roleFa: 'مدیر فروش', order: 1 }],
  },
  {
    maxAmount: 2_000_000_000,
    steps: [
      { roleFa: 'مدیر فروش', order: 1 },
      { roleFa: 'مدیر مالی', order: 2 },
    ],
  },
  {
    maxAmount: Infinity,
    steps: [
      { roleFa: 'مدیر فروش', order: 1 },
      { roleFa: 'مدیر مالی', order: 2 },
      { roleFa: 'مدیرعامل', order: 3 },
    ],
  },
];

export function getApprovalSteps(grandTotal: number): ProformaApprovalStep[] {
  const tier = APPROVAL_TIERS.find((t) => grandTotal <= t.maxAmount);
  if (!tier) {
    return [
      { id: `step-1`, order: 1, roleFa: 'مدیر فروش', status: 'pending' },
      { id: `step-2`, order: 2, roleFa: 'مدیر مالی', status: 'pending' },
      { id: `step-3`, order: 3, roleFa: 'مدیرعامل', status: 'pending' },
    ];
  }
  return tier.steps.map((step, idx) => ({
    id: `step-${step.order}`,
    order: step.order,
    roleFa: step.roleFa,
    status: 'pending',
    threshold: grandTotal,
  }));
}