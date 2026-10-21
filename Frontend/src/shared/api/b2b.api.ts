import { api } from './client';

export interface B2BRfqDto {
  id: string;
  rfqNumber: string;
  title: string;
  status: string;
  companyId?: string;
  zoneId?: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  items?: Array<Record<string, unknown>>;
  deliveryLocation?: string;
  notes?: string;
  categoryId?: string;
  criteriaWeights?: Array<Record<string, unknown>>;
  publishedAt?: string;
  closedAt?: string;
  awardedBidId?: string;
}

export interface B2BBidDto {
  id: string;
  bidNumber: string;
  rfqId: string;
  status: string;
  companyId?: string;
  totalAmount: number;
  deliveryDays?: number;
  createdAt: string;
  updatedAt: string;
  items?: Array<Record<string, unknown>>;
  notes?: string;
  isValid?: boolean;
}

export interface B2BCategoryDto {
  id: string;
  name: string;
  parentId?: string;
  children?: B2BCategoryDto[];
}

export interface B2BAwardDto {
  id: string;
  rfqId: string;
  bidId: string;
  reason?: string;
  createdAt: string;
}

export const b2bApi = {
  listRfqs: async (params?: Record<string, unknown>): Promise<B2BRfqDto[]> => {
    const data = await api.get<unknown>('/b2b/rfqs', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as B2BRfqDto[] : [];
  },

  getRfq: async (id: string): Promise<B2BRfqDto> => {
    return api.get<B2BRfqDto>(`/b2b/rfqs/${id}`);
  },

  createRfq: async (data: Record<string, unknown>): Promise<B2BRfqDto> => {
    return api.post<B2BRfqDto>('/b2b/rfqs', data);
  },

  updateRfq: async (id: string, data: Record<string, unknown>): Promise<B2BRfqDto> => {
    return api.patch<B2BRfqDto>(`/b2b/rfqs/${id}`, data);
  },

  publishRfq: async (id: string): Promise<B2BRfqDto> => {
    return api.post<B2BRfqDto>(`/b2b/rfqs/${id}/publish`, {});
  },

  cancelRfq: async (id: string): Promise<B2BRfqDto> => {
    return api.post<B2BRfqDto>(`/b2b/rfqs/${id}/cancel`, {});
  },

  deleteRfq: async (id: string): Promise<void> => {
    return api.delete<void>(`/b2b/rfqs/${id}`);
  },

  listBids: async (params?: Record<string, unknown>): Promise<B2BBidDto[]> => {
    const data = await api.get<unknown>('/b2b/bids', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as B2BBidDto[] : [];
  },

  getBid: async (id: string): Promise<B2BBidDto> => {
    return api.get<B2BBidDto>(`/b2b/bids/${id}`);
  },

  createBid: async (data: Record<string, unknown>): Promise<B2BBidDto> => {
    return api.post<B2BBidDto>('/b2b/bids', data);
  },

  listCategories: async (): Promise<B2BCategoryDto[]> => {
    const data = await api.get<unknown>('/b2b/categories');
    return Array.isArray(data) ? data as B2BCategoryDto[] : [];
  },

  awardBid: async (rfqId: string, bidId: string, reason: string, autoConvertToPO?: boolean): Promise<B2BAwardDto> => {
    return api.post<B2BAwardDto>(`/b2b/awards`, { rfqId, bidId, reason, autoConvertToPO });
  },

  listAwards: async (params?: Record<string, unknown>): Promise<B2BAwardDto[]> => {
    const data = await api.get<unknown>('/b2b/awards', { params: params as Record<string, string | number | boolean | undefined> });
    return Array.isArray(data) ? data as B2BAwardDto[] : [];
  },
};
