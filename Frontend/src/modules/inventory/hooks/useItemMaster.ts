import { useMemo } from 'react';
import { useInventoryStore } from '../store';

export function useItemMaster() {
  const { items } = useInventoryStore();
  const activeItems = useMemo(() => items.filter(i => i.status === 'active'), [items]);
  const byCategory = useMemo(() => {
    const grouped: Record<string, typeof items> = {};
    items.forEach(i => {
      const cat = i.categoryName || 'سایر';
      grouped[cat] = grouped[cat] || [];
      grouped[cat].push(i);
    });
    return grouped;
  }, [items]);
  const byAbc = useMemo(() => ({
    A: items.filter(i => i.abcClass === 'A'),
    B: items.filter(i => i.abcClass === 'B'),
    C: items.filter(i => i.abcClass === 'C'),
  }), [items]);
  return { items, activeItems, byCategory, byAbc, totalItems: items.length };
}
