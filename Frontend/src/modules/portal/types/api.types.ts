import type { PaginatedResponse, PaginationParams } from './portal.types';

// ── API Request Types ────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ── API Response Wrappers ────────────────────────────────────────────────────

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError };

// ── Real-time Events ─────────────────────────────────────────────────────────

export interface RealtimeEvent {
  type: 'shipment.created' | 'shipment.updated' | 'permit.expiring' | 'contractor.suspended' | 'workflow.step_changed' | 'invoice.overdue' | 'visitor.checked_in';
  payload: unknown;
  timestamp: string;
  module: string;
}
