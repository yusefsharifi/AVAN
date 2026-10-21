import { useMemo } from 'react';
import { useProductionStore } from '../store/useProductionStore';

export function useProductionStats() {
  const { salesOrders, workOrders, productionLines, ncrs, scrapRecords, qualityChecks, getProductionStats } = useProductionStore();
  return useMemo(() => getProductionStats(), [salesOrders, workOrders, productionLines, ncrs, scrapRecords, qualityChecks]);
}
