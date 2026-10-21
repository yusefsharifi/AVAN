import { toast } from 'sonner';
import { ApiClientError } from '@/shared/api/client';
import { PERSISTENCE_MESSAGES, reportMutationError } from '@/shared/lib/mockMode';

// ═══════════════════════════════════════════════════════════════════════════════
// Optimistic mutation → server reconcile → rollback — BUG-PERSIST-001 (Step 2.A.2)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Every module store follows the SAME 4-phase contract:
//   1. optimistic — apply the change locally so the UI reacts instantly
//   2. request    — call the module's *Api method
//   3. reconcile  — replace the local (client-generated) entity with the SERVER
//                   response, so the server ID becomes the source of truth
//   4. rollback   — undo the optimistic change and surface a Persian toast
//
// The store actions keep their existing synchronous signatures (constraint 7:
// dashboards/reports keep consuming them unchanged) — the network call runs in
// the background and reconciles state when it resolves.

export interface PersistMutationOptions<TLocal extends { id: string }, TServer = TLocal> {
  /** Runs immediately — write the optimistic entity into the store. */
  optimistic: () => void;
  /** API call. Returns the server-persisted entity (or void). */
  request: () => Promise<TServer | void>;
  /** Undo the optimistic write (usually: remove the temp entity). */
  rollback: () => void;
  /** Replace the optimistic entity with the server one (id swap + extra fields). */
  reconcile?: (server: TServer) => void;
  /** Persian, user-facing failure message. */
  messageFa?: string;
  /** Skip the network call entirely (demo mode). */
  skip?: boolean;
}

/**
 * Runs one optimistic mutation with server persistence. Never throws — callers
 * that need the local entity already have it from `optimistic()`.
 * Returns the server entity when available.
 */
export async function persistMutation<TLocal extends { id: string }, TServer = TLocal>(
  options: PersistMutationOptions<TLocal, TServer>,
): Promise<TServer | undefined> {
  const { optimistic, request, rollback, reconcile, messageFa, skip } = options;

  if (skip) return undefined;

  optimistic();

  try {
    const server = await request();
    if (server && reconcile) {
      reconcile(server);
    }
    return server ?? undefined;
  } catch (error) {
    rollback();
    reportMutationError({
      messageFa: messageFa ?? PERSISTENCE_MESSAGES.updateFailed,
      error,
    });
    return undefined;
  }
}

/**
 * Replace an optimistic entity in a collection with the server-persisted one.
 * Falls back to a client-id match when the server echoes no `id`.
 */
export function reconcileEntity<T extends { id: string }>(
  list: T[],
  localId: string,
  server: Partial<T> | null | undefined,
): T[] {
  if (!server) return list.filter((item) => item.id !== localId);
  const merged = { ...list.find((item) => item.id === localId), ...server } as T;
  return list.map((item) => (item.id === localId ? merged : item));
}

/**
 * Load helper used by every `loadFromApi`: fetches a list, and on success
 * REPLACES the local collection (empty server list ⇒ empty store, never the
 * seed data). On failure it reports once and leaves the store untouched.
 */
export async function loadCollection<T>(
  fetcher: () => Promise<T[]>,
  apply: (rows: T[]) => void,
  messageFa: string = PERSISTENCE_MESSAGES.loadFailed,
): Promise<boolean> {
  try {
    const rows = await fetcher();
    apply(Array.isArray(rows) ? rows : []);
    return true;
  } catch (error) {
    // A missing/unreachable endpoint must be visible — not a silent mock.
    reportMutationError({ messageFa, error });
    return false;
  }
}

/** True when the failure means "backend not reached" (proxy down / offline). */
export function isTransportError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.code === 'NETWORK_ERROR' || error.httpStatus === 0 || error.httpStatus === 404)
  );
}

/** Show a single toast for a background persistence failure. */
export function notifyPersistFailed(messageFa: string, error: unknown): void {
  toast.error(messageFa, {
    description: error instanceof ApiClientError ? error.message : undefined,
  });
}
