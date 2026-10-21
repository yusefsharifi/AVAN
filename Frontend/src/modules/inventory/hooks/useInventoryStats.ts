import { useMemo } from 'react';
import { useInventoryStore } from '../store';
import type { InventoryStats } from '../types';

export function useInventoryStats(): InventoryStats {
  const { items, grns, requisitions, cycleCounts } = useInventoryStore();

  return useMemo(() => {
    const totalValue = items.reduce((s, i) => s + i.totalQuantity * i.movingAverageCost, 0);
    const lowStockCount = items.filter(i => i.totalQuantity <= i.reorderPoint && i.totalQuantity > 0).length;
    const overStockCount = items.filter(i => i.totalQuantity > i.maxStockLevel && i.maxStockLevel > 0).length;

    const pendingGRN = grns.filter(g => g.status === 'pending_inspection' || g.status === 'inspecting').length;
    const acceptedTodayGRN = grns.filter(g => g.status === 'accepted').length;
    const valueReceivedToday = grns
      .filter(g => g.status === 'accepted')
      .reduce((s, g) => s + (g.inventoryValueImpact || g.lineItems.reduce((ls, li) => ls + (li.acceptedQuantity || li.receivedQuantity) * li.unitCost, 0)), 0);

    const pendingApprovalMR = requisitions.filter(r => r.status === 'pending_approval').length;
    const inPickingMR = requisitions.filter(r => r.status === 'picking').length;
    const issuedTodayMR = requisitions.filter(r => r.status === 'issued').length;

    const countScheduled = cycleCounts.filter(c => c.status === 'scheduled').length;
    const countInProgress = cycleCounts.filter(c => c.status === 'in_progress').length;
    const countCompleted = cycleCounts.filter(c => c.status === 'completed').length;
    const varianceAlerts = cycleCounts.reduce((s, c) => s + (c.totalVarianceValue > 0 ? 1 : 0), 0);

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      overStockCount,
      pendingGRN,
      acceptedTodayGRN,
      valueReceivedToday,
      pendingApprovalMR,
      inPickingMR,
      issuedTodayMR,
      countScheduled,
      countInProgress,
      countCompleted,
      varianceAlerts,
    };
  }, [items, grns, requisitions, cycleCounts]);
}
