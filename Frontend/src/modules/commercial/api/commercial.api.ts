// ═══════════════════════════════════════════════════════════════════════════════
// Commercial API — COMP-004: Typed API for commercial backend endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '@/shared/api/client';

// ── Proformas ─────────────────────────────────────────────────────────────
export const proformaApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/commercial/proformas', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/commercial/proformas/${id}`),
  create: (data: any) => api.post<any>('/commercial/proformas', data),
  update: (id: string, data: any) => api.patch<any>(`/commercial/proformas/${id}`, data),
  approve: (id: string) => api.post<any>(`/commercial/proformas/${id}/approve`),
  convert: (id: string) => api.post<any>(`/commercial/proformas/${id}/convert`),
};

// ── Commercial Orders ─────────────────────────────────────────────────────
export const commercialOrderApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/commercial/orders', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/commercial/orders/${id}`),
  create: (data: any) => api.post<any>('/commercial/orders', data),
  update: (id: string, data: any) => api.patch<any>(`/commercial/orders/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch<any>(`/commercial/orders/${id}/status`, { status }),
};

// ── Contracts ─────────────────────────────────────────────────────────────
export const commercialContractApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/commercial/contracts', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/commercial/contracts/${id}`),
  create: (data: any) => api.post<any>('/commercial/contracts', data),
  update: (id: string, data: any) => api.patch<any>(`/commercial/contracts/${id}`, data),
};

// ── Collection ────────────────────────────────────────────────────────────
export const collectionApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/commercial/collection', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/commercial/collection', data),
};
