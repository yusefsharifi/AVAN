// ═══════════════════════════════════════════════════════════════════════════════
// Mock-mode gate + shared store persistence helpers — BUG-PERSIST-001 (Step 2.A)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Demo datasets (mockData.ts, MOCK_* / SEED_* arrays) must only ever be seeded
// when the app is explicitly started in demo mode. In every other build the
// stores start EMPTY and are hydrated from the backend.

import { toast } from 'sonner';
import { ApiClientError } from '@/shared/api/client';

/** Demo mode is opt-in; production/default = real API with empty defaults. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/**
 * Use as the initial value of a store collection:
 *   accounts: seedFromMock(MOCK_ACCOUNTS),
 * Returns [] unless VITE_USE_MOCKS === 'true'.
 */
export function seedFromMock<T>(mock: readonly T[]): T[] {
  return USE_MOCKS ? [...mock] : [];
}

/** True when a server list may replace the current local collection. */
export function isServerList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export interface MutationErrorInput {
  /** Persian, user-facing message shown in the toast. */
  messageFa: string;
  error: unknown;
}

/**
 * Single place that turns a failed API mutation into a visible Persian toast
 * (replaces the silent `catch {}` / `console.warn` fallbacks). Returns the
 * original error so callers can rethrow or roll back.
 */
export function reportMutationError({ messageFa, error }: MutationErrorInput): Error {
  const detail =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : '';

  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.httpStatus === 0)) {
    toast.error('ارتباط با سرور برقرار نشد', {
      description: 'تغییرات ذخیره نشدند؛ لطفاً اتصال شبکه را بررسی کنید.',
    });
  } else {
    toast.error(messageFa, detail ? { description: detail } : undefined);
  }

  // eslint-disable-next-line no-console
  console.warn(`[store] ${messageFa}`, detail || error);
  return error instanceof Error ? error : new Error(String(error));
}

/** Persian, generic fallbacks reused across modules. */
export const PERSISTENCE_MESSAGES = {
  createFailed: 'خطا در ذخیره‌سازی؛ رکورد ایجاد نشد',
  updateFailed: 'خطا در به‌روزرسانی؛ تغییرات ذخیره نشد',
  deleteFailed: 'خطا در حذف؛ رکورد حذف نشد',
  loadFailed: 'خطا در دریافت اطلاعات از سرور',
} as const;
