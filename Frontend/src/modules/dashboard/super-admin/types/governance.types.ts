// Governance and Security Types

export type PermissionScope = 'national' | 'province' | 'park' | 'company' | 'department' | 'assigned_only';
export type PermissionLevel = 'read' | 'read_write' | 'approve' | 'admin';
export type MFAMethod = 'sms' | 'email' | 'authenticator' | 'none';
export type SessionPolicy = 'standard' | 'strict' | 'paranoid';

export interface Permission {
  id: string;
  module: string;
  action: string;
  scope: PermissionScope;
  resource?: string;
  field?: string;
  condition?: string;
}

export interface Role {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  description: string;
  permissions: Permission[];
  scope: PermissionScope;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays: number;
  preventReuse: number;
}

export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  rememberMeDays: number;
  requireReauthForSensitive: boolean;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  mfaRequired: boolean;
  mfaMethods: MFAMethod[];
  passwordPolicy: PasswordPolicy;
  sessionConfig: SessionConfig;
  allowedIPRanges: string[];
  deviceTrustEnabled: boolean;
  failedLoginLockout: number;
  lockoutDurationMinutes: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  mobile: string;
  roleId: string;
  roleName: string;
  provinceScope?: string[];
  parkScope?: string[];
  companyScope?: string[];
  departmentScope?: string[];
  lifecycleStatus: 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated' | 'terminated';
  mfaRequired: boolean;
  mfaMethod?: MFAMethod;
  accountExpiryDate?: string;
  allowedIPRange?: string[];
  sessionPolicy: SessionPolicy;
  mobileAccess: boolean;
  notes?: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  userName: string;
  device: string;
  browser: string;
  ipAddress: string;
  location?: string;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login_success' | 'login_failed' | 'password_changed' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled' | 'session_revoked' | 'account_locked' | 'account_unlocked' | 'permission_changed' | 'suspicious_activity';
  userId?: string;
  userName?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}
