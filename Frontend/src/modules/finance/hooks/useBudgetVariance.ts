// src/modules/finance/hooks/useBudgetVariance.ts — Phase 4: Live GL data
import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { BudgetVsActualItem } from '../types';

const ANNUAL_BUDGETS: Record<string, number> = {
  '5001': 2_400_000_000, '5002': 600_000_000,   '5003': 480_000_000,
  '5004': 120_000_000,   '5005': 200_000_000,   '5006': 80_000_000,
  '4001': 3_200_000_000, '4002': 500_000_000,   '4003': 150_000_000,
};

export function useBudgetVariance(fromPeriod = 1, toPeriod = 12) {
  const { accounts, vouchers, fiscalYears, activeFiscalYear } = useFinanceStore();
  const fiscalYearId = fiscalYears.find(f => f.year === activeFiscalYear)?.id ?? fiscalYears[0]?.id ?? '';

  const data = useMemo((): BudgetVsActualItem[] => {
    const posted = vouchers.filter(v => v.status === 'posted' && v.fiscalYearId === fiscalYearId);
    const actuals: Record<string, number> = {};
    posted.forEach(v =>
      v.entries.forEach(e => {
        const acc = accounts.find(a => a.id === e.accountId);
        if (!acc) return;
        const net = acc.type === 'expense' ? (e.debit - e.credit) : (e.credit - e.debit);
        actuals[acc.code] = (actuals[acc.code] ?? 0) + net;
      })
    );
    return Object.entries(ANNUAL_BUDGETS).map(([code, budget]) => {
      const acc = accounts.find(a => a.code === code);
      const actual = Math.max(0, actuals[code] ?? 0);
      const variance = actual - budget;
      const variancePercent = budget !== 0 ? (variance / budget) * 100 : 0;
      const status: BudgetVsActualItem['status'] =
        variancePercent > 10 ? 'over' : variancePercent < -10 ? 'under' : 'on_track';
      return { accountCode: code, accountName: acc?.nameFa ?? code, budgetAmount: budget, actualAmount: actual, variance, variancePercent, status };
    });
  }, [accounts, vouchers, fiscalYearId]);

  const summary = useMemo(() => ({
    totalBudget:      data.reduce((s, d) => s + d.budgetAmount, 0),
    totalActual:      data.reduce((s, d) => s + d.actualAmount, 0),
    totalVariance:    data.reduce((s, d) => s + d.variance, 0),
    overBudgetCount:  data.filter(d => d.status === 'over').length,
    underBudgetCount: data.filter(d => d.status === 'under').length,
    onTrackCount:     data.filter(d => d.status === 'on_track').length,
  }), [data]);

  return { data, summary };
}
