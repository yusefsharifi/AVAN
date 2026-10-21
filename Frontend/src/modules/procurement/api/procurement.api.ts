// ═══════════════════════════════════════════════════════════════════════════════
// Procurement API — COMP-004: Typed API for procurement backend endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '@/shared/api/client';

// ── Vendors ───────────────────────────────────────────────────────────────
export const vendorApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/vendors', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/vendors/${id}`),
  create: (data: any) => api.post<any>('/inventory/vendors', data),
  update: (id: string, data: any) => api.patch<any>(`/inventory/vendors/${id}`, data),
};

// ── Purchase Requests ─────────────────────────────────────────────────────
export const purchaseRequestApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/purchase-requests', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/purchase-requests/${id}`),
  create: (data: any) => api.post<any>('/inventory/purchase-requests', data),
  approve: (id: string) => api.post<any>(`/inventory/purchase-requests/${id}/approve`),
  reject: (id: string, reason: string) => api.post<any>(`/inventory/purchase-requests/${id}/reject`, { reason }),
};

// ── Purchase Orders ───────────────────────────────────────────────────────
export const purchaseOrderApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/purchase-orders', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/purchase-orders/${id}`),
  create: (data: any) => api.post<any>('/inventory/purchase-orders', data),
  approve: (id: string) => api.post<any>(`/inventory/purchase-orders/${id}/approve`),
  receive: (id: string, data: any) => api.post<any>(`/inventory/purchase-orders/${id}/receive`, data),
};

// ── RFQs ──────────────────────────────────────────────────────────────────
export const rfqApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/rfqs', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/inventory/rfqs', data),
};

// ── Contracts ─────────────────────────────────────────────────────────────
export const vendorContractApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/contracts', { params: params as Record<string, string | number | boolean | undefined> }),
  create: (data: any) => api.post<any>('/inventory/contracts', data),
};
