import { api } from './client';

export interface IotDeviceDto {
  id: string;
  zoneId?: string;
  name: string;
  type: string;
  status: string;
  model?: string;
  manufacturer?: string;
  location?: { lat?: number; lng?: number; description?: string };
  lastSeenAt?: string;
  config?: Record<string, unknown>;
  health?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IotAlertDto {
  id: string;
  zoneId?: string;
  deviceId?: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message?: string;
  sourceModule?: string;
  escalationLevel?: number;
  createdAt: string;
  resolvedAt?: string;
}

export const iotApi = {
  listDevices: async (params?: Record<string, unknown>): Promise<IotDeviceDto[]> => {
    const data = await api.get<unknown>('/iot/devices', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as IotDeviceDto[] : [];
  },

  getDevice: async (id: string): Promise<IotDeviceDto> => {
    return api.get<IotDeviceDto>(`/iot/devices/${id}`);
  },

  createDevice: async (data: Partial<IotDeviceDto>): Promise<IotDeviceDto> => {
    return api.post<IotDeviceDto>('/iot/devices', data);
  },

  updateDevice: async (id: string, data: Partial<IotDeviceDto>): Promise<IotDeviceDto> => {
    return api.patch<IotDeviceDto>(`/iot/devices/${id}`, data);
  },

  restartDevice: async (id: string): Promise<void> => {
    return api.post<void>(`/iot/devices/${id}/restart`, {});
  },

  decommissionDevice: async (id: string): Promise<void> => {
    return api.post<void>(`/iot/devices/${id}/decommission`, {});
  },

  getDeviceHealth: async (id: string): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>(`/iot/devices/${id}/health`);
  },

  getDashboard: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/iot/devices/dashboard');
  },

  getMap: async (): Promise<IotDeviceDto[]> => {
    const data = await api.get<unknown>('/iot/devices/map');
    return Array.isArray(data) ? data as IotDeviceDto[] : [];
  },

  listAlerts: async (params?: Record<string, unknown>): Promise<IotAlertDto[]> => {
    const data = await api.get<unknown>('/iot/alerts', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as IotAlertDto[] : [];
  },

  listActiveAlerts: async (): Promise<IotAlertDto[]> => {
    const data = await api.get<unknown>('/iot/alerts/active');
    return Array.isArray(data) ? data as IotAlertDto[] : [];
  },

  resolveAlert: async (id: string): Promise<void> => {
    return api.post<void>(`/iot/alerts/${id}/resolve`, {});
  },
};
