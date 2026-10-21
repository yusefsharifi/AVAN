// ═══════════════════════════════════════════════════════════════════════════════
// Base API — Typed CRUD operations for any resource
// ═══════════════════════════════════════════════════════════════════════════════
//
// Provides generic CRUD helpers that each module can use to communicate
// with the backend. Modules can extend or override these as needed.
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from './client';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create a typed API resource with standard CRUD operations.
 *
 * Usage:
 * ```ts
 * const inventoryApi = createResourceApi<InventoryItem>('/inventory');
 * const items = await inventoryApi.list({ page: 1, limit: 20 });
 * const item = await inventoryApi.get('item-001');
 * const created = await inventoryApi.create({ name: 'New Item' });
 * ```
 */
export function createResourceApi<T extends { id: string }>(basePath: string) {
  return {
    /** List items with pagination and filtering */
    list: async (params?: PaginationParams & Record<string, unknown>): Promise<PaginatedResponse<T>> => {
      const data = await api.get<T[]>(basePath, { params: params as Record<string, string | number | boolean | undefined> });
      // The backend may return the array directly or wrapped in a paginated response
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: params?.page || 1,
          limit: params?.limit || 50,
          totalPages: Math.ceil(data.length / (params?.limit || 50)),
        };
      }
      return data as unknown as PaginatedResponse<T>;
    },

    /** Get a single item by ID */
    get: async (id: string): Promise<T> => {
      return api.get<T>(`${basePath}/${id}`);
    },

    /** Create a new item */
    create: async (data: Partial<T>): Promise<T> => {
      return api.post<T>(basePath, data);
    },

    /** Update an item by ID */
    update: async (id: string, data: Partial<T>): Promise<T> => {
      return api.patch<T>(`${basePath}/${id}`, data);
    },

    /** Replace an item by ID */
    replace: async (id: string, data: Partial<T>): Promise<T> => {
      return api.put<T>(`${basePath}/${id}`, data);
    },

    /** Delete an item by ID */
    remove: async (id: string): Promise<void> => {
      return api.delete<void>(`${basePath}/${id}`);
    },
  };
}

// ── Module-specific APIs ─────────────────────────────────────────────────────

import type { UserProfile } from './auth.api';

export const usersApi = createResourceApi<UserProfile>('/users');

// Inventory API (extends base with module-specific methods)
export const inventoryApi = {
  ...createResourceApi<any>('/inventory'),

  // Warehouses
  listWarehouses: () => api.get<any[]>('/inventory/warehouses'),
  createWarehouse: (data: any) => api.post<any>('/inventory/warehouses', data),
  getWarehouse: (id: string) => api.get<any>(`/inventory/warehouses/${id}`),

  // Items
  listItems: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/items', { params: params as Record<string, string | number | boolean | undefined> }),
  createItem: (data: any) => api.post<any>('/inventory/items', data),

  // GRNs
  listGrns: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/grns', { params: params as Record<string, string | number | boolean | undefined> }),
  createGrn: (data: any) => api.post<any>('/inventory/grns', data),
  acceptGrn: (id: string) => api.post<any>(`/inventory/grns/${id}/accept`),
  rejectGrn: (id: string, reason: string) => api.post<any>(`/inventory/grns/${id}/reject`, { reason }),

  // Material Requisitions
  listRequisitions: (params?: Record<string, unknown>) =>
    api.get<any[]>('/inventory/requisitions', { params: params as Record<string, string | number | boolean | undefined> }),
  createRequisition: (data: any) => api.post<any>('/inventory/requisitions', data),

  // Dashboard
  getDashboard: () => api.get<any>('/inventory/dashboard'),
};

// Finance API
export const financeApi = {
  ...createResourceApi<any>('/finance'),

  getDashboard: () => api.get<any>('/finance/dashboard'),
  listAccounts: () => api.get<any[]>('/finance/accounts'),
  listJournalVouchers: (params?: Record<string, unknown>) =>
    api.get<any[]>('/finance/journal-vouchers', { params: params as Record<string, string | number | boolean | undefined> }),
  createJournalVoucher: (data: any) => api.post<any>('/finance/journal-vouchers', data),
};

// HR API
export const hrApi = {
  ...createResourceApi<any>('/hr'),

  listEmployees: (params?: Record<string, unknown>) =>
    api.get<Record<string, unknown>[]>('/hr/employees', { params: params as Record<string, string | number | boolean | undefined> }),
  /**
   * POST /hr/employees — backend CreateEmployeeDto is validated with
   * `whitelist: true`; callers must send only the accepted fields.
   */
  createEmployee: (data: Record<string, unknown>) =>
    api.post<Record<string, unknown>>('/hr/employees', data),
  /** PATCH /hr/employees/:id — Partial<CreateEmployeeDto> (whitelisted fields only). */
  updateEmployee: (id: string, data: Record<string, unknown>) =>
    api.patch<Record<string, unknown>>(`/hr/employees/${id}`, data),
  /** POST /hr/employees/:id/terminate — body: { reason, terminationDate }. */
  terminateEmployee: (id: string, body: { reason: string; terminationDate: string }) =>
    api.post<Record<string, unknown>>(`/hr/employees/${id}/terminate`, body),
  getDashboard: () => api.get<any>('/hr/dashboard'),
};

// Workflow API
export const workflowApi = {
  ...createResourceApi<any>('/workflow'),

  listDefinitions: (params?: Record<string, unknown>) =>
    api.get<any[]>('/workflow-definitions', { params: params as Record<string, string | number | boolean | undefined> }),
  listInstances: (params?: Record<string, unknown>) =>
    api.get<any[]>('/workflow-instances', { params: params as Record<string, string | number | boolean | undefined> }),
  startInstance: (data: any) => api.post<any>('/workflow-instances/start', data),
  getDashboard: (zoneId: string) =>
    api.get<any>(`/workflow-instances/dashboard`, { params: { zoneId } }),
};

// IoT API
export const iotApi = {
  listDevices: (params?: Record<string, unknown>) =>
    api.get<any[]>('/iot/devices', { params: params as Record<string, string | number | boolean | undefined> }),
  getDevice: (id: string) => api.get<any>(`/iot/devices/${id}`),
  getDashboard: (zoneId: string) =>
    api.get<any>('/iot/dashboard', { params: { zoneId } }),
};

// Super Admin API
export const superAdminApi = {
  listZones: () => api.get<any[]>('/super/zones'),
  getZoneOverview: (id: string) => api.get<any>(`/super/zones/${id}/overview`),
  getSystemHealth: () => api.get<any>('/super/health'),
  getPlatformKpis: () => api.get<any>('/super/metrics/kpis'),
  listUsers: (params?: Record<string, unknown>) =>
    api.get<any[]>('/super/users', { params: params as Record<string, string | number | boolean | undefined> }),
};

// Notifications API
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<any[]>('/notifications', { params: params as Record<string, string | number | boolean | undefined> }),
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<void>('/notifications/read-all'),
};
