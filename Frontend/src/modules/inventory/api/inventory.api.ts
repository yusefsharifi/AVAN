// ═══════════════════════════════════════════════════════════════════════════════
// Inventory API — COMP-004: Typed API for inventory backend endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from '@/shared/api/client';
import type {
  Warehouse,
  InventoryItem,
  GoodsReceiptNote,
  MaterialRequisition,
  CycleCountSession,
  InventoryTransaction,
  StorageLocation,
} from '../types';

// ── Warehouses ───────────────────────────────────────────────────────────────

export const warehouseApi = {
  list: () => api.get<Warehouse[]>('/inventory/warehouses'),
  get: (id: string) => api.get<Warehouse>(`/inventory/warehouses/${id}`),
  create: (data: Partial<Warehouse>) => api.post<Warehouse>('/inventory/warehouses', data),
  update: (id: string, data: Partial<Warehouse>) => api.patch<Warehouse>(`/inventory/warehouses/${id}`, data),
  getCapacity: (id: string) => api.get<any>(`/inventory/warehouses/${id}/capacity`),
  getLocations: (id: string) => api.get<StorageLocation[]>(`/inventory/warehouses/${id}/locations`),
  addLocation: (id: string, data: Partial<StorageLocation>) =>
    api.post<StorageLocation>(`/inventory/warehouses/${id}/locations`, data),
};

// ── Items ────────────────────────────────────────────────────────────────────

export const itemApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<InventoryItem[]>('/inventory/items', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<InventoryItem>(`/inventory/items/${id}`),
  create: (data: Partial<InventoryItem>) => api.post<InventoryItem>('/inventory/items', data),
  update: (id: string, data: Partial<InventoryItem>) => api.patch<InventoryItem>(`/inventory/items/${id}`, data),
  getLowStock: () => api.get<InventoryItem[]>('/inventory/items/low-stock'),
  getExpiring: () => api.get<InventoryItem[]>('/inventory/items/expiring'),
  getValuation: () => api.get<any[]>('/inventory/items/valuation'),
  getStock: (id: string) => api.get<any>(`/inventory/items/${id}/stock`),
};

// ── Goods Receipt Notes ──────────────────────────────────────────────────────

export const grnApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<GoodsReceiptNote[]>('/inventory/goods-receipt', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<GoodsReceiptNote>(`/inventory/goods-receipt/${id}`),
  create: (data: Partial<GoodsReceiptNote>) => api.post<GoodsReceiptNote>('/inventory/goods-receipt', data),
  confirm: (id: string) => api.post<GoodsReceiptNote>(`/inventory/goods-receipt/${id}/confirm`),
};

// ── Material Requisitions ────────────────────────────────────────────────────

export const requisitionApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<MaterialRequisition[]>('/inventory/requisitions', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<MaterialRequisition>(`/inventory/requisitions/${id}`),
  create: (data: Partial<MaterialRequisition>) => api.post<MaterialRequisition>('/inventory/requisitions', data),
  submit: (id: string) => api.post<MaterialRequisition>(`/inventory/requisitions/${id}/submit`),
  approve: (id: string) => api.patch<MaterialRequisition>(`/inventory/requisitions/${id}/approve`),
  issue: (id: string) => api.post<MaterialRequisition>(`/inventory/requisitions/${id}/issue`),
  cancel: (id: string) => api.post<void>(`/inventory/requisitions/${id}/cancel`),
  getPendingApproval: () => api.get<MaterialRequisition[]>('/inventory/requisitions/pending-approval'),
  getStats: () => api.get<any>('/inventory/requisitions/stats'),
};

// ── Stock ────────────────────────────────────────────────────────────────────

export const stockApi = {
  getLevels: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/stock', { params: params as Record<string, string | number | boolean | undefined> }),
  getTransactions: (params?: Record<string, unknown>) =>
    api.get<InventoryTransaction[]>('/inventory/stock/transactions', { params: params as Record<string, string | number | boolean | undefined> }),
  adjust: (data: any) => api.post<any>('/inventory/stock/adjust', data),
  transfer: (data: any) => api.post<any>('/inventory/stock/transfer', data),
  checkAvailability: (data: any) => api.post<any>('/inventory/stock/check-availability', data),
};

// ── Purchase Requests ────────────────────────────────────────────────────────

export const purchaseRequestApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/purchase-requests', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/purchase-requests/${id}`),
  create: (data: any) => api.post<any>('/inventory/purchase-requests', data),
  approve: (id: string) => api.post<any>(`/inventory/purchase-requests/${id}/approve`),
  reject: (id: string) => api.post<any>(`/inventory/purchase-requests/${id}/reject`),
  getPendingApproval: () => api.get<any[]>('/inventory/purchase-requests/pending-approval'),
};

// ── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrderApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/purchase-orders', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/purchase-orders/${id}`),
  create: (data: any) => api.post<any>('/inventory/purchase-orders', data),
  approve: (id: string) => api.post<any>(`/inventory/purchase-orders/${id}/approve`),
  sendToVendor: (id: string) => api.post<any>(`/inventory/purchase-orders/${id}/send-to-vendor`),
  cancel: (id: string) => api.post<void>(`/inventory/purchase-orders/${id}/cancel`),
  getStats: () => api.get<any>('/inventory/purchase-orders/stats'),
};

// ── Vendors ──────────────────────────────────────────────────────────────────

export const vendorApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/vendors', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<any>(`/inventory/vendors/${id}`),
  create: (data: any) => api.post<any>('/inventory/vendors', data),
  update: (id: string, data: any) => api.patch<any>(`/inventory/vendors/${id}`, data),
  blacklist: (id: string) => api.post<void>(`/inventory/vendors/${id}/blacklist`),
};

// ── Physical Counts ──────────────────────────────────────────────────────────

export const countApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<CycleCountSession[]>('/inventory/counts', { params: params as Record<string, string | number | boolean | undefined> }),
  get: (id: string) => api.get<CycleCountSession>(`/inventory/counts/${id}`),
  create: (data: Partial<CycleCountSession>) => api.post<CycleCountSession>('/inventory/counts', data),
  start: (id: string) => api.post<CycleCountSession>(`/inventory/counts/${id}/start`),
  recordResults: (id: string, data: any) => api.post<any>(`/inventory/counts/${id}/results`, data),
  getVariances: (id: string) => api.get<any[]>(`/inventory/counts/${id}/variances`),
  approve: (id: string) => api.post<CycleCountSession>(`/inventory/counts/${id}/approve`),
};
