import { api } from './client';

export interface WaybillDto {
  id: string;
  waybillNumber: string;
  zoneId?: string;
  companyId?: string;
  status: string;
  origin?: string;
  destination?: string;
  plate?: string;
  driverName?: string;
  cargoType?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  issueDate: string;
  rejectionReason?: string;
  auditFlagReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScaleDto {
  id: string;
  zoneId?: string;
  name: string;
  model?: string;
  manufacturer?: string;
  status: string;
  capacity?: number;
  unit?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaybillStatsDto {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  flagged: number;
  byStatus: Record<string, number>;
}

export const logisticsApi = {
  listWaybills: async (params?: Record<string, unknown>): Promise<WaybillDto[]> => {
    const data = await api.get<unknown>('/waybills', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as WaybillDto[] : [];
  },

  getWaybill: async (id: string): Promise<WaybillDto> => {
    return api.get<WaybillDto>(`/waybills/${id}`);
  },

  createWaybill: async (data: Partial<WaybillDto>): Promise<WaybillDto> => {
    return api.post<WaybillDto>('/waybills', data);
  },

  approveWaybill: async (id: string): Promise<WaybillDto> => {
    return api.patch<WaybillDto>(`/waybills/${id}/approve`, {});
  },

  cancelWaybill: async (id: string): Promise<WaybillDto> => {
    return api.post<WaybillDto>(`/waybills/${id}/cancel`, {});
  },

  getWaybillStats: async (): Promise<WaybillStatsDto> => {
    return api.get<WaybillStatsDto>('/waybills/stats');
  },

  listScales: async (): Promise<ScaleDto[]> => {
    const data = await api.get<unknown>('/weigh/scales');
    return Array.isArray(data) ? data as ScaleDto[] : [];
  },

  createScale: async (data: Partial<ScaleDto>): Promise<ScaleDto> => {
    return api.post<ScaleDto>('/weigh/scales', data);
  },

  updateScale: async (id: string, data: Partial<ScaleDto>): Promise<ScaleDto> => {
    return api.patch<ScaleDto>(`/weigh/scales/${id}`, data);
  },

  calibrateScale: async (id: string, data?: Record<string, unknown>): Promise<void> => {
    return api.post<void>(`/weigh/scales/${id}/calibrate`, data || {});
  },

  listWeighRecords: async (params?: Record<string, unknown>): Promise<any[]> => {
    const data = await api.get<unknown>('/weigh/records', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data : [];
  },

  getOperatorDashboard: async (): Promise<Record<string, unknown>> => {
    return api.get<Record<string, unknown>>('/weigh/operator-dashboard');
  },
};
