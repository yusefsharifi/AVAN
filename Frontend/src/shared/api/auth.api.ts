// ═══════════════════════════════════════════════════════════════════════════════
// Auth API — Authentication endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from './client';

export interface LoginRequest {
  identifier: string; // email or phone
  password: string;
  otpCode?: string;
  deviceInfo?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** Double-submit CSRF token issued with the refresh cookie (BUG-PERSIST-001). */
  csrfToken?: string;
  user: UserProfile;
  requiresOtp: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  zoneId?: string;
  companyId?: string;
  status: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  zoneId?: string;
  companyId?: string;
}

export interface SendOtpRequest {
  phone: string;
  purpose: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  purpose: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<{ message: string }>('/auth/register', data),

  logout: () =>
    api.post<void>('/auth/logout'),

  logoutAll: () =>
    api.post<void>('/auth/logout-all'),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  sendOtp: (data: SendOtpRequest) =>
    api.post<void>('/auth/send-otp', data),

  verifyOtp: (data: VerifyOtpRequest) =>
    api.post<{ verified: boolean }>('/auth/verify-otp', data),

  verifyPhone: (otpCode: string) =>
    api.post<void>('/auth/verify-phone', { otpCode }),

  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot-password', { email }),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post<void>('/auth/reset-password', data),

  getProfile: () =>
    api.get<UserProfile>('/auth/me'),

  updateProfile: (data: Partial<UserProfile>) =>
    api.patch<UserProfile>('/auth/me', data),

  changePassword: (data: ChangePasswordRequest) =>
    api.post<void>('/auth/me/password', data),

  enable2FA: () =>
    api.post<{ qrCodeUrl: string; secret: string }>('/auth/me/2fa/enable'),

  confirm2FA: (otpCode: string) =>
    api.post<void>('/auth/me/2fa/confirm', { otpCode }),

  disable2FA: (password: string) =>
    api.delete<void>('/auth/me/2fa', { body: { password } }),

  getSessions: () =>
    api.get<Session[]>('/auth/me/sessions'),

  revokeSession: (sessionId: string) =>
    api.delete<void>(`/auth/me/sessions/${sessionId}`),
};
