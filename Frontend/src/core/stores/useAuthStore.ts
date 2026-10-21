// ═══════════════════════════════════════════════════════════════════════════════
// Auth Store — COMP-003, COMP-004: Real API integration for authentication
// ═══════════════════════════════════════════════════════════════════════════════
//
// Manages:
// - Login/logout state
// - JWT tokens (in-memory via API client)
// - User profile
// - Auth loading states
// - Automatic token refresh listener
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { authApi, type UserProfile, type LoginRequest } from '@/shared/api/auth.api';
import { setTokens, clearTokens, setCsrfToken } from '@/shared/api/client';

interface AuthState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  requiresOtp: boolean;
  pendingPhone: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  register: (data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    nationalId?: string;
    zoneId?: string;
    companyId?: string;
  }) => Promise<void>;
  verifyPhone: (otpCode: string) => Promise<void>;
  sendOtp: (phone: string, purpose: string) => Promise<void>;
  verifyOtp: (phone: string, code: string, purpose: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  loadProfile: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  setOtpRequired: (required: boolean, phone?: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: false,
  error: null,
  requiresOtp: false,
  pendingPhone: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.login(data);

      if (result.requiresOtp) {
        set({
          isLoading: false,
          requiresOtp: true,
          pendingPhone: result.user.phone,
          user: result.user,
        });
        return;
      }

      // Store tokens in memory (API client handles this). The refresh token is
      // ALSO set as an HttpOnly cookie by the backend (BUG-PERSIST-001).
      setTokens(result.accessToken, result.refreshToken);
      if (result.csrfToken) setCsrfToken(result.csrfToken);

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        requiresOtp: false,
        pendingPhone: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Login failed',
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Logout should succeed even if API call fails
    } finally {
      clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        requiresOtp: false,
        pendingPhone: null,
      });
    }
  },

  logoutAll: async () => {
    set({ isLoading: true });
    try {
      await authApi.logoutAll();
    } catch {
      // Continue with local logout
    } finally {
      clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        requiresOtp: false,
        pendingPhone: null,
      });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.register(data);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      throw error;
    }
  },

  verifyPhone: async (otpCode: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.verifyPhone(otpCode);
      // Reload profile to get updated status
      await get().loadProfile();
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Phone verification failed',
      });
      throw error;
    }
  },

  sendOtp: async (phone: string, purpose: string) => {
    set({ error: null });
    try {
      await authApi.sendOtp({ phone, purpose });
    } catch (error: any) {
      set({ error: error.message || 'Failed to send OTP' });
      throw error;
    }
  },

  verifyOtp: async (phone: string, code: string, purpose: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.verifyOtp({ phone, code, purpose });
      set({ isLoading: false });
      return result.verified;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'OTP verification failed',
      });
      return false;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.forgotPassword(email);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to send reset email',
      });
      throw error;
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.resetPassword({ token, newPassword });
      set({ isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Password reset failed',
      });
      throw error;
    }
  },

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const profile = await authApi.getProfile();
      set({
        user: profile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const isAuthError =
        error?.httpStatus === 401 ||
        error?.code === 'AUTH_TOKEN_EXPIRED' ||
        error?.code === 'AUTH_REQUIRED';
      clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: isAuthError ? null : error?.message || 'بازیابی نشست ناموفق بود',
      });
    }
  },

  initialize: async () => {
    set({ isInitializing: true });
    try {
      await get().loadProfile();
    } finally {
      set({ isInitializing: false });
    }
  },

  clearError: () => set({ error: null }),

  setOtpRequired: (required: boolean, phone?: string) =>
    set({
      requiresOtp: required,
      pendingPhone: phone || get().pendingPhone,
    }),
}));

// ── Auto-logout on unauthorized ──────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout();
  });
}
