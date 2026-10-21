import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { toast } from 'sonner';
import {
  API_REACHABLE_EVENT,
  API_UNREACHABLE_EVENT,
  isBackendReachable,
} from '@/shared/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// Global "backend not reached" signal — BUG-PERSIST-001 (Step 2.A.4)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Instead of every store failing silently on its own, the API client emits a
// single pair of window events when it detects a broken /api proxy (non-JSON
// response or network failure). This hook surfaces ONE clear banner (and one
// toast) instead of N silent per-store fallbacks.

interface ApiHealthState {
  reachable: boolean;
  checked: boolean;
  lastCheckedAt: number | null;
}

const HEALTH_ENDPOINT = `${import.meta.env.VITE_API_URL || '/api/v1'}/health`;

let inflight: AbortController | null = null;

/** Probe /health directly (bypasses auth) and publish the result. */
export async function checkApiHealth(): Promise<boolean> {
  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;
  try {
    const response = await fetch(HEALTH_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
      cache: 'no-store',
    });
    const contentType = response.headers.get('content-type') || '';
    // A proxy misconfiguration returns the SPA's index.html (text/html) with a
    // 200 — that must count as "backend not reached".
    const ok = response.ok && contentType.includes('application/json');
    publish(ok);
    return ok;
  } catch {
    publish(false);
    return false;
  }
}

function publish(reachable: boolean): void {
  useApiHealthStore.setState({
    reachable,
    checked: true,
    lastCheckedAt: Date.now(),
  });
}

export const useApiHealthStore = create<ApiHealthState>(() => ({
  reachable: isBackendReachable(),
  checked: false,
  lastCheckedAt: null,
}));

/**
 * Subscribes to the API client's reachability events and kicks off an initial
 * /health probe. Mount once, at the app root.
 */
export function useApiHealth(): ApiHealthState {
  const state = useApiHealthStore();

  useEffect(() => {
    const onUnreachable = () => {
      publish(false);
      toast.error('ارتباط با سرور برقرار نشد', {
        id: 'api-unreachable',
        description: 'لطفاً وضعیت سرور و اتصال شبکه را بررسی کنید.',
        duration: 8000,
      });
    };
    const onReachable = () => {
      const wasDown = !useApiHealthStore.getState().reachable;
      publish(true);
      if (wasDown) toast.success('ارتباط با سرور برقرار شد', { id: 'api-unreachable' });
    };

    window.addEventListener(API_UNREACHABLE_EVENT, onUnreachable);
    window.addEventListener(API_REACHABLE_EVENT, onReachable);
    void checkApiHealth();

    return () => {
      window.removeEventListener(API_UNREACHABLE_EVENT, onUnreachable);
      window.removeEventListener(API_REACHABLE_EVENT, onReachable);
    };
  }, []);

  return state;
}

/** Full-width Persian banner rendered above the app when the API is down. */
export function ApiStatusBanner({ reachable, checked }: ApiHealthState): React.ReactElement | null {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Re-show automatically once the backend comes back and goes down again.
    if (reachable) setDismissed(false);
  }, [reachable]);

  if (!checked || reachable || dismissed) return null;

  return (
    <div
      role="alert"
      dir="rtl"
      className="sticky top-0 z-[9999] flex items-center justify-between gap-4 bg-red-600 px-4 py-2 text-sm font-medium text-white"
    >
      <span>
        ارتباط با سرور برقرار نشد. داده‌های جدید ذخیره نخواهند شد؛ لطفاً وضعیت سرویس‌های پشتیبان را بررسی کنید.
      </span>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          void checkApiHealth();
        }}
        className="shrink-0 rounded bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
