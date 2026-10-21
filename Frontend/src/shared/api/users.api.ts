import { api } from './client';

export interface UserDto {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  zoneId?: string | null;
  companyId?: string | null;
  avatarKey?: string | null;
  createdAt: string;
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ZONE_MANAGER'
  | 'ZONE_OPERATOR'
  | 'COMPANY_ADMIN'
  | 'COMPANY_MANAGER'
  | 'COMPANY_STAFF'
  | 'GUARD'
  | 'DRIVER';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'LOCKED';

export interface CreateUserPayload {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  zoneId?: string;
  companyId?: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  role?: UserRole;
  zoneId?: string;
  companyId?: string;
}

export interface UserFilters {
  zoneId?: string;
  companyId?: string;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

function unwrap<T>(data: unknown): T {
  return data as T;
}

export const usersApi = {
  list: async (params?: UserFilters): Promise<PaginatedUsers> => {
    const data = await api.get<unknown>('/users', { params: params as Record<string, string | number | boolean | undefined> });
    if (Array.isArray(data)) {
      return { items: data as UserDto[], total: data.length, page: params?.page || 1, limit: params?.limit || 50 };
    }
    return unwrap<PaginatedUsers>(data);
  },

  get: async (id: string): Promise<UserDto> => {
    return api.get<UserDto>(`/users/${id}`);
  },

  create: async (payload: CreateUserPayload): Promise<UserDto> => {
    return api.post<UserDto>('/users', payload);
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<UserDto> => {
    return api.patch<UserDto>(`/users/${id}`, payload);
  },

  remove: async (id: string): Promise<void> => {
    return api.delete<void>(`/users/${id}`);
  },

  setStatus: async (id: string, status: UserStatus): Promise<void> => {
    await api.patch<void>(`/users/${id}/status`, { status });
  },

  suspend: async (id: string, reason?: string): Promise<void> => {
    await api.post<void>(`/users/${id}/suspend`, { reason: reason || '' });
  },

  reactivate: async (id: string): Promise<void> => {
    await api.post<void>(`/users/${id}/reactivate`);
  },

  resetPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    return api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
  },
};
