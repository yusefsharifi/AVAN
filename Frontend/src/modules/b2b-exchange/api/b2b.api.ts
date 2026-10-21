// ═══════════════════════════════════════════════════════════════════════════════
// B2B Exchange API — COMP-004: Typed API for B2B backend endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '@/shared/api/client';

// ── Suppliers ─────────────────────────────────────────────────────────────
export const b2bSupplierApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/suppliers', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/b2b/suppliers/${id}`),
  create: (data: any) => api.post<any>('/b2b/suppliers', data),
};

// ── RFQs ──────────────────────────────────────────────────────────────────
export const b2bRfqApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/rfq', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/b2b/rfq/${id}`),
  create: (data: any) => api.post<any>('/b2b/rfq', data),
};

// ── Bids ──────────────────────────────────────────────────────────────────
export const b2bBidApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/bids', { params: params as Record<string, string | number | boolean | undefined> }),
  submit: (data: any) => api.post<any>('/b2b/bids', data),
};

// ── Evaluation ────────────────────────────────────────────────────────────
export const b2bEvaluationApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/evaluation', { params: params as Record<string, string | number | boolean | undefined> }),
};

// ── Award ─────────────────────────────────────────────────────────────────
export const b2bAwardApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/award', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/b2b/award', data),
};

// ── Catalog ───────────────────────────────────────────────────────────────
export const b2bCatalogApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/b2b/catalog', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/b2b/catalog', data),
};
