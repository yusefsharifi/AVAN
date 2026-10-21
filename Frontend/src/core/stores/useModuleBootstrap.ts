import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { useFinanceStore } from '@/modules/finance';
import { useHRStore } from '@/modules/hr/store/useHRStore';
import { useInventoryStore } from '@/modules/inventory';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { useProcurementStore } from '@/modules/procurement/store/useProcurementStore';
import { useProductionStore } from '@/modules/production/store/useProductionStore';
import { useB2BStore } from '@/modules/b2b-exchange/store/useB2BStore';
import { fetchLetters } from '@/modules/correspondence/store';

// ═══════════════════════════════════════════════════════════════════════════════
// Module store bootstrap — BUG-PERSIST-001 (Step 2.A.1)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Root cause RC-3: every module store defines a load action (loadFromApi /
// loadAll / fetchLetters) but NONE of them were ever invoked, so screens
// rendered the hardcoded MOCK_* arrays forever — even when the backend had
// real rows. This hook runs each load exactly once per authenticated session,
// after the JWT (memory or refresh cookie) is available.
//
// Kept central on purpose: per-screen useEffect wiring would miss lazy routes
// and duplicated effects across ~30 screens.

interface BootstrapEntry {
  key: string;
  label: string;
  run: () => Promise<unknown> | void;
}

const LOADERS: BootstrapEntry[] = [
  { key: 'finance', label: 'مالی', run: () => useFinanceStore.getState().loadFromApi() },
  { key: 'hr', label: 'منابع انسانی', run: () => useHRStore.getState().loadFromApi() },
  { key: 'inventory', label: 'انبار', run: () => useInventoryStore.getState().loadAll() },
  { key: 'commercial', label: 'بازرگانی', run: () => useCommercialStore.getState().loadFromApi() },
  { key: 'procurement', label: 'تدارکات', run: () => useProcurementStore.getState().loadFromApi() },
  { key: 'production', label: 'تولید', run: () => useProductionStore.getState().loadFromApi() },
  { key: 'b2b', label: 'تبادل B2B', run: () => useB2BStore.getState().loadFromApi() },
  { key: 'correspondence', label: 'مکاتبات', run: () => fetchLetters() },
];

export function useModuleBootstrap(): void {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    // Wait until the auth handshake finished (access token restored either
    // from memory or via the HttpOnly refresh cookie).
    const auth = useAuthStore.getState();
    if (auth.isInitializing || (!auth.isAuthenticated && !auth.user)) {
      const unsubscribe = useAuthStore.subscribe((state, prev) => {
        if (state === prev) return;
        if (state.isInitializing || initialized.current) return;
        unsubscribe();
        initialized.current = true;
        void runLoaders();
      });
      return unsubscribe;
    }

    initialized.current = true;
    void runLoaders();
  }, []);
}

async function runLoaders(): Promise<void> {
  await Promise.allSettled(
    LOADERS.map(async ({ run }) => {
      try {
        await run();
      } catch (error) {
        // Individual stores already surface their own errors; this guard only
        // keeps one failing module from aborting the whole bootstrap.
        // eslint-disable-next-line no-console
        console.warn('[bootstrap] module load failed', error);
      }
    }),
  );
}
