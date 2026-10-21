import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from '@/core/router';
import { ThemeProvider } from './providers/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { ApiStatusBanner, useApiHealth } from '@/core/components/ApiStatus';
import { useModuleBootstrap } from '@/core/stores/useModuleBootstrap';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const apiHealth = useApiHealth();
  useModuleBootstrap();

  useEffect(() => {
    // BUG-PERSIST-001: always attempt to restore the session on boot. The
    // access token lives in memory (dies on refresh) but the refresh token now
    // rides in an HttpOnly cookie, so the /auth/refresh call inside initialize()
    // is what revives the session after F5.
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      <ApiStatusBanner {...apiHealth} />
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors dir="rtl" />
    </ThemeProvider>
  );
}
