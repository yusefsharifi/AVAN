export type UserRole =
  | 'SUPER_ADMIN'
  | 'NATIONAL_AUDITOR'
  | 'ZONE_MANAGER'
  | 'COMPANY_ADMIN'
  | 'OPERATOR';

export type UserStatus = 'active' | 'inactive' | 'locked';
export type UserScopeType = 'national' | 'zone' | 'company';

export interface UserEntity {
  id: string;
  nationalId: string;       // ۱۰ رقم
  firstName: string;
  lastName: string;
  displayName: string;
  mobile: string;           // ۰۹XXXXXXXXX
  email: string;
  scopeType: UserScopeType;
  zoneId?: string;          // الزامی اگر scopeType === 'zone'
  companyId?: string;       // الزامی اگر scopeType === 'company'
  role: UserRole;
  status: UserStatus;
  createdAt: string;        // ISO
  updatedAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  avatarUrl?: string;
}

export interface UserFilters {
  searchQuery?: string;
  role?: UserRole;
  status?: UserStatus;
  scopeType?: UserScopeType;
  zoneId?: string;
  companyId?: string;
}

export function validateIranianNationalId(id: string): boolean {
  if (!/^\d{10}$/.test(id)) return false;
  const check = +id[9];
  const sum = Array.from({ length: 9 }, (_, i) => +id[i] * (10 - i)).reduce((a, b) => a + b, 0);
  const r = sum % 11;
  return (r < 2 && check === r) || (r >= 2 && check === 11 - r);
}

export function validateMobile(m: string) {
  return /^09\d{9}$/.test(m);
}

export const EMPLOYEES: UserEntity[] = [
  { id: 'U001', nationalId: '0012345678', firstName: 'علی', lastName: 'محمدی', displayName: 'علی محمدی', mobile: '09121234567', email: 'ali@example.com', scopeType: 'zone', zoneId: 'Z001', role: 'ZONE_MANAGER', status: 'active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', failedLoginAttempts: 0 },
  { id: 'U002', nationalId: '0023456789', firstName: 'فاطمه', lastName: 'احمدی', displayName: 'فاطمه احمدی', mobile: '09132345678', email: 'fateme@example.com', scopeType: 'company', companyId: 'C001', role: 'COMPANY_ADMIN', status: 'active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', failedLoginAttempts: 0 },
  { id: 'U003', nationalId: '0034567890', firstName: 'حسن', lastName: 'رضایی', displayName: 'حسن رضایی', mobile: '09143456789', email: 'hasan@example.com', scopeType: 'national', role: 'NATIONAL_AUDITOR', status: 'active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', failedLoginAttempts: 0 },
];
