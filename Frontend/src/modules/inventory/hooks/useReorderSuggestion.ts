import { useMemo } from 'react';
import { useInventoryStore } from '../store';
import type { ReorderSuggestion } from '../types';

export function useReorderSuggestion() {
  const { items } = useInventoryStore();
  const suggestions = useMemo<ReorderSuggestion[]>(() => {
    return items
      .filter(i => i.status === 'active' && i.totalQuantity <= i.reorderPoint)
      .map(item => ({
        itemId: item.id,
        itemName: item.nameFa,
        currentStock: item.totalQuantity,
        reorderPoint: item.reorderPoint,
        suggestedQuantity: item.reorderQuantity,
        leadTimeDays: 7,
        estimatedCost: item.reorderQuantity * item.movingAverageCost,
        urgency: item.totalQuantity === 0
          ? 'critical'
          : item.totalQuantity <= item.safetyStock
            ? 'high'
            : 'medium',
      }));
  }, [items]);
  return suggestions;
}
