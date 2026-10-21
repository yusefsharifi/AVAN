import { api } from './client';

export interface ZoneDto {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  province: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const zonesApi = {
  list: async (params?: Record<string, unknown>): Promise<ZoneDto[]> => {
    const data = await api.get<unknown>('/zones', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as ZoneDto[] : [];
  },

  get: async (id: string): Promise<ZoneDto> => {
    return api.get<ZoneDto>(`/zones/${id}`);
  },

  create: async (data: Partial<ZoneDto>): Promise<ZoneDto> => {
    return api.post<ZoneDto>('/zones', data);
  },

  update: async (id: string, data: Partial<ZoneDto>): Promise<ZoneDto> => {
    return api.patch<ZoneDto>(`/zones/${id}`, data);
  },

  remove: async (id: string): Promise<void> => {
    return api.delete<void>(`/zones/${id}`);
  },

  getStatistics: async (id: string): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>(`/zones/${id}/statistics`);
  },
};
