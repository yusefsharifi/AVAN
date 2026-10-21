import { useMemo } from 'react';
import { useFinanceStore } from '../store';

export function useChartOfAccounts() {
  const { accounts, getAccountTree } = useFinanceStore();
  
  const tree = useMemo(() => getAccountTree(), [accounts]);
  const flatAccounts = useMemo(() => accounts.filter(a => a.level === 3 || a.level === 4), [accounts]);
  const accountsByType = useMemo(() => {
    const grouped: Record<string, typeof accounts> = {};
    accounts.forEach(a => { grouped[a.type] = grouped[a.type] || []; grouped[a.type].push(a); });
    return grouped;
  }, [accounts]);
  
  return { tree, flatAccounts, accountsByType, totalAccounts: accounts.length };
}
