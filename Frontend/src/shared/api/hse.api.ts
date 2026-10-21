import { api } from './client';

export interface HseIncidentDto {
  id: string;
  zoneId?: string;
  incidentNumber: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  location?: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HseRiskDto {
  id: string;
  zoneId?: string;
  riskNumber: string;
  title: string;
  severity: string;
  likelihood: string;
  riskScore: number;
  status: string;
  mitigation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HseCapaDto {
  id: string;
  zoneId?: string;
  capaNumber: string;
  title: string;
  status: string;
  dueDate: string;
  responsible?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HseInspectionDto {
  id: string;
  zoneId?: string;
  title: string;
  status: string;
  type: string;
  scheduledAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface HsePermitDto {
  id: string;
  zoneId?: string;
  ptwNumber: string;
  type: string;
  status: string;
  holder: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
}

export interface HseDrillDto {
  id: string;
  zoneId?: string;
  title: string;
  type: string;
  status: string;
  scheduledAt: string;
  participants?: number;
  createdAt: string;
}

export interface HazmatMaterialDto {
  id: string;
  zoneId?: string;
  name: string;
  unNumber: string;
  hazardClass: string;
  msdsUrl?: string;
  createdAt: string;
}

export const hseApi = {
  listIncidents: async (params?: Record<string, unknown>): Promise<HseIncidentDto[]> => {
    const data = await api.get<unknown>('/hse/incidents', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HseIncidentDto[] : [];
  },

  createIncident: async (data: Partial<HseIncidentDto>): Promise<HseIncidentDto> => {
    return api.post<HseIncidentDto>('/hse/incidents', data);
  },

  updateIncident: async (id: string, data: Partial<HseIncidentDto>): Promise<HseIncidentDto> => {
    return api.patch<HseIncidentDto>(`/hse/incidents/${id}`, data);
  },

  listRisks: async (params?: Record<string, unknown>): Promise<HseRiskDto[]> => {
    const data = await api.get<unknown>('/hse/risks', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HseRiskDto[] : [];
  },

  createRisk: async (data: Partial<HseRiskDto>): Promise<HseRiskDto> => {
    return api.post<HseRiskDto>('/hse/risks', data);
  },

  updateRisk: async (id: string, data: Partial<HseRiskDto>): Promise<HseRiskDto> => {
    return api.patch<HseRiskDto>(`/hse/risks/${id}`, data);
  },

  listCapas: async (params?: Record<string, unknown>): Promise<HseCapaDto[]> => {
    const data = await api.get<unknown>('/hse/capas', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HseCapaDto[] : [];
  },

  createCapa: async (data: Partial<HseCapaDto>): Promise<HseCapaDto> => {
    return api.post<HseCapaDto>('/hse/capas', data);
  },

  updateCapa: async (id: string, data: Partial<HseCapaDto>): Promise<HseCapaDto> => {
    return api.patch<HseCapaDto>(`/hse/capas/${id}`, data);
  },

  listInspections: async (params?: Record<string, unknown>): Promise<HseInspectionDto[]> => {
    const data = await api.get<unknown>('/hse/inspections', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HseInspectionDto[] : [];
  },

  listPermits: async (params?: Record<string, unknown>): Promise<HsePermitDto[]> => {
    const data = await api.get<unknown>('/hse/permits', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HsePermitDto[] : [];
  },

  listDrills: async (params?: Record<string, unknown>): Promise<HseDrillDto[]> => {
    const data = await api.get<unknown>('/hse/drills', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HseDrillDto[] : [];
  },

  listHazmat: async (params?: Record<string, unknown>): Promise<HazmatMaterialDto[]> => {
    const data = await api.get<unknown>('/hse/hazmat', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as HazmatMaterialDto[] : [];
  },
};
