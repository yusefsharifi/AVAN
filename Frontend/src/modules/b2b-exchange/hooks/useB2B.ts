import { useEffect } from 'react';
import { useB2BStore } from '../store/useB2BStore';

export function useB2B() {
  const store = useB2BStore();

  useEffect(() => {
    if (store.rfqs.length === 0 && !store.isLoading) {
      store.loadFromApi();
    }
  }, [store]);

  return {
    currentCompany: store.currentCompany,
    rfqs: store.rfqs,
    bids: store.bids,
    stats: store.getStats(),
    myRFQs: store.getMyRFQs(),
    availableRFQs: store.getAvailableRFQs(),
    myBids: store.getMyBids(),
    isLoading: store.isLoading,
  };
}
