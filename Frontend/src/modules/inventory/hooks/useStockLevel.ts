import { useMemo } from 'react';
import { useInventoryStore } from '../store';

export function useStockLevel() {
  const { items, lots } = useInventoryStore();
  const stockSummary = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + i.totalQuantity * i.movingAverageCost, 0);
    const lowStockItems = items.filter(i => i.totalQuantity <= i.reorderPoint && i.totalQuantity > 0).length;
    const outOfStock = items.filter(i => i.totalQuantity === 0).length;
    const expiredLots = lots.filter(l => l.status === 'expired').length;
    return { totalItems: items.length, totalValue, lowStockItems, outOfStock, expiredLots };
  }, [items, lots]);
  return stockSummary;
}
