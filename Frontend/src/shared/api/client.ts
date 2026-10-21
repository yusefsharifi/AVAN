// ═══════════════════════════════════════════════════════════════════════════════
// IDOP API Client — COMP-003, CONFIG-002
// ═══════════════════════════════════════════════════════════════════════════════
//
// Robust API client with:
// - Base URL from environment (VITE_API_URL or proxy)
// - Automatic JWT access token injection
// - Automatic token refresh on 401
// - Centralized error handling
// - Request/response interceptors
// - Timeout handling
// - Typed responses
// - Retry policy for transient errors
//
// SECURITY: Tokens are stored in memory (not localStorage) to prevent XSS
// access. The Zustand auth store manages token lifecycle.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

// ── Token Management (in-memory) ────────────────────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
}

/**
 * BUG-PERSIST-001: the CSRF token is issued by the backend alongside the
 * HttpOnly refresh cookie (double-submit pattern) and echoed back in the
 * `X-CSRF-Token` header on cookie-authenticated requests.
 */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

// ── Backend reachability (single global signal) ─────────────────────────────

export const API_UNREACHABLE_EVENT = 'api:unreachable';
export const API_REACHABLE_EVENT = 'api:reachable';

let apiReachable = true;

function reportUnreachable(): void {
  if (!apiReachable) return;
  apiReachable = false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_UNREACHABLE_EVENT));
  }
}

function reportReachable(): void {
  if (apiReachable) return;
  apiReachable = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_REACHABLE_EVENT));
  }
}

/** True when the backend answered with a well-formed JSON API response. */
export function isBackendReachable(): boolean {
  return apiReachable;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  httpStatus: number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
  silent?: boolean; // Don't show error toasts
}

// ── Error Handling ───────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.details = error.details;
  }
}

// ── Token Refresh ────────────────────────────────────────────────────────────

// BUG-PERSIST-001: `auth:unauthorized` listeners perform logout themselves, and
// that logout goes back through this same 401 handler. Without a latch, a single
// expiry cascades into an unbounded refresh→logout→refresh loop (observed as
// 1000+ requests on boot). Fire the event once per expiry; the next successful
// response re-arms it.
let unauthorizedDispatched = false;

// Auth lifecycle endpoints whose 401 is a definitive answer rather than a stale
// access token. Refreshing on /auth/refresh or /auth/logout is self-referential
// (it re-enters the handler that is already running), and a 401 from
// /auth/login means bad credentials, not an expired session.
const AUTH_LIFECYCLE_ENDPOINTS = ['/auth/refresh', '/auth/logout', '/auth/login'];

function isAuthLifecycleEndpoint(endpoint: string): boolean {
  return AUTH_LIFECYCLE_ENDPOINTS.some((p) => endpoint === p || endpoint.startsWith(`${p}?`));
}

async function refreshAccessToken(): Promise<string | null> {
  // BUG-PERSIST-001: the refresh token may now live in the HttpOnly
  // `idop_refresh` cookie (Path=/api/v1/auth) instead of memory, so we must
  // still attempt the call when `refreshToken` is null — the cookie rides
  // along thanks to credentials:'include'.
  try {
    // BUG-PERSIST-001: this call is the ONLY thing that can resurrect a session
    // after F5, but the backend's CSRF middleware rejects /auth/refresh without
    // an X-CSRF-Token header (403). Echo the readable `idop_csrf` cookie here,
    // or a page reload can never recover and the user is bounced to /login.
    const csrf = getCsrfToken();
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const result = await response.json();
    if (result.success && result.data) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      if (result.data.csrfToken) setCsrfToken(result.data.csrfToken);
      reportReachable();
      return result.data.accessToken;
    }

    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

async function ensureValidToken(): Promise<string | null> {
  if (accessToken) return accessToken;

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ── Request Interceptor ──────────────────────────────────────────────────────

function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(base, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.pathname + url.search;
}

function readCsrfCookie(): string | null {
  // The backend sets `idop_csrf` as a JS-readable cookie (Path=/) precisely so
  // the SPA can echo it back — that IS the double-submit half of the contract.
  // Without this, any request made after a page reload has no in-memory token
  // and no <meta> tag, so POSTs like /auth/refresh are rejected with 403.
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith('idop_csrf='));
  return match ? decodeURIComponent(match.slice('idop_csrf='.length)) : null;
}

function getCsrfToken(): string | null {
  // Priority: token issued by the backend at login/refresh (held in memory for
  // the current tab), then the readable `idop_csrf` cookie, then the legacy SSR
  // <meta name="csrf-token"> tag.
  return csrfToken || readCsrfCookie() || (typeof document !== 'undefined'
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null
    : null);
}

// ── Core Request Function ────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    timeout = REQUEST_TIMEOUT_MS,
    retries = MAX_RETRIES,
    silent = false,
    headers: customHeaders,
    ...rest
  } = options;

  // Build URL
  const url = buildUrl(`${API_BASE_URL}${endpoint}`, params);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  // Add auth token if available
  const token = await ensureValidToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add CSRF token if present
  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  // Build request config
  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    // BUG-PERSIST-001: send/receive the HttpOnly refresh cookie so the session
    // survives a full page refresh. Same-origin in both dev (Vite proxy) and
    // prod (nginx /api proxy), so this is safe with the CORS whitelist intact.
    credentials: 'include',
    ...rest,
  };

  // Timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  config.signal = controller.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (response.ok) {
        // BUG-PERSIST-001: a successful response re-arms the unauthorized
        // guard below, so a later, genuine session expiry is still reported.
        unauthorizedDispatched = false;
      }

      // Handle 401 — try token refresh once.
      // BUG-PERSIST-001 (RC-1): this gate used to require `&& accessToken`, but
      // the access token only lives in module memory, so immediately after a
      // page reload it is null and the refresh was skipped entirely — every
      // request 401'd and the user was bounced to the login screen despite a
      // valid HttpOnly refresh cookie. Attempt the refresh on ANY 401 (except
      // the auth lifecycle endpoints, where a 401 is a definitive answer, not a
      // stale token) — the cookie carries the credential.
      if (response.status === 401 && attempt === 0 && !isAuthLifecycleEndpoint(endpoint)) {
        clearTokens();
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          continue; // Retry with new token
        }
        // Token refresh failed — emit event for auth store to handle logout.
        // Guarded: the listener calls logout(), whose own /auth/logout request
        // can itself 401 and re-enter this path, producing an unbounded
        // refresh→logout→refresh loop. Fire once per expiry instead.
        if (!unauthorizedDispatched) {
          unauthorizedDispatched = true;
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        throw new ApiClientError({
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Session expired. Please log in again.',
          httpStatus: 401,
        });
      }

      // Handle non-JSON responses — this is the "backend not reached" signal
      // (nginx/vite proxy returning index.html, or a plain-text 404/502).
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        reportUnreachable();
        if (!response.ok) {
          throw new ApiClientError({
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            httpStatus: response.status,
          });
        }
        return undefined as T;
      }

      reportReachable();

      const result = await response.json();

      // Handle API errors
      if (!response.ok || result.success === false) {
        const apiError: ApiError = {
          code: result.code || 'UNKNOWN_ERROR',
          message: result.message || 'An unexpected error occurred',
          httpStatus: response.status,
          details: result.details,
        };

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new ApiClientError(apiError);
        }

        // Retry on server errors (5xx) if retries remain
        if (attempt < retries) {
          lastError = new ApiClientError(apiError);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }

        throw new ApiClientError(apiError);
      }

      // TASK 4 — strict envelope unwrap.
      // The platform contract is { success, data, message?, meta? }. The Step-2
      // "fall back to the raw body" tolerance existed ONLY because ten routes
      // emitted bare payloads:
      //   /physical-archive/{shelves,shelves/map,report,missing-physical,receive,move,dispatch,letter/:id}
      //   /iot/devices/map
      //   /super/{zones,health,metrics/kpis,audit/logs/super-actions,audit/suspicious}
      //   /workflow-definitions, /workflow-instances
      // All of them now wrap at the source (swept: 0 bare bodies across every
      // GET the frontend calls, under company/zone/super users). Paginated
      // results ({ data, meta }) still satisfy `data`, so those are unaffected.
      // A body with neither shape is a contract violation and now throws a
      // Persian-visible error instead of silently yielding `undefined` data.
      // GET /health deliberately stays bare (docker healthcheck contract) but is
      // probed with raw fetch in ApiStatus.tsx — never through api.*.
      if (result !== null && typeof result === 'object' && 'data' in result) {
        return (result as { data: T }).data;
      }
      if (result !== null && typeof result === 'object' && result.success === true) {
        return undefined as T;
      }
      throw new ApiClientError({
        code: 'MALFORMED_ENVELOPE',
        message: 'پاسخ نامعتبر از سرور دریافت شد',
        httpStatus: response.status,
        details: { path: url },
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError({
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out. Please try again.',
          httpStatus: 408,
        });
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        reportUnreachable();
        if (attempt < retries) {
          lastError = error;
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          httpStatus: 0,
        });
      }

      lastError = error as Error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }

      throw new ApiClientError({
        code: 'UNKNOWN_ERROR',
        message: lastError?.message || 'An unexpected error occurred',
        httpStatus: 0,
      });
    }
  }

  throw lastError || new ApiClientError({
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    httpStatus: 0,
  });
}

// ── Convenience Methods ──────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
