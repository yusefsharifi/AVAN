import { useMemo } from 'react';
import { useProductionStore } from '../store/useProductionStore';
import { useInventoryStore } from '@/modules/inventory';

export function useMrpCalculation(workOrderIds: string[]) {
  const { getMRPRequirements } = useProductionStore();
  const { items } = useInventoryStore();
  return useMemo(() => getMRPRequirements(workOrderIds), [workOrderIds.join(','), items]);
}
