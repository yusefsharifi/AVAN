import { useMemo } from 'react';
import { useProcurementStore } from '../store/useProcurementStore';

export function useProcurementStats() {
  const { vendors, purchaseRequests, rfqs, purchaseOrders, contracts, getProcurementStats } = useProcurementStore();
  return useMemo(() => getProcurementStats(), [vendors, purchaseRequests, rfqs, purchaseOrders, contracts]);
}
