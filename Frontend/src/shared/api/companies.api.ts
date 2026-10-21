import { api } from './client';

export interface CompanyDto {
  id: string;
  zoneId: string;
  nameFa: string;
  nameEn?: string;
  registrationNumber: string;
  nationalId: string;
  status: string;
  lifecycleStatus?: string;
}

export const companiesApi = {
  listByZone: async (zoneId: string): Promise<CompanyDto[]> => {
    const data = await api.get<unknown>('/companies', { params: { zoneId } });
    if (Array.isArray(data)) return data as CompanyDto[];
    return unwrap<CompanyDto[]>(data);
  },

  get: async (id: string): Promise<CompanyDto> => {
    return api.get<CompanyDto>(`/companies/${id}`);
  },
};

function unwrap<T>(data: unknown): T {
  return data as T;
}
