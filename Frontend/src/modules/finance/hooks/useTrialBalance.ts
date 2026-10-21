import { useMemo } from 'react';
import { useFinanceStore } from '../store';

export function useTrialBalance() {
  const { getTrialBalance } = useFinanceStore();
  const data = useMemo(() => getTrialBalance(), []);
  
  const totals = useMemo(() => {
    const totalDebit = data.reduce((s, r) => s + Math.max(0, r.closingBalance), 0);
    const totalCredit = data.reduce((s, r) => s + Math.max(0, -r.closingBalance), 0);
    return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  }, [data]);
  
  return { data, totals };
}
