export { api, setTokens, clearTokens, getAccessToken, ApiClientError } from './client';
export type { ApiResponse, ApiError, RequestOptions } from './client';

export { authApi } from './auth.api';
export type {
  LoginRequest,
  LoginResponse,
  UserProfile,
  RegisterRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  Session,
} from './auth.api';

export { createResourceApi } from './base.api';
export type { PaginationParams, PaginatedResponse } from './base.api';
export {
  usersApi,
  inventoryApi,
  financeApi,
  hrApi,
  workflowApi,
  iotApi,
  superAdminApi,
  notificationsApi,
} from './base.api';

export { usersApi as usersApiTyped } from './users.api';
export type { UserDto, UserRole, UserStatus, CreateUserPayload, UpdateUserPayload, UserFilters, PaginatedUsers } from './users.api';
export { companiesApi } from './companies.api';
export type { CompanyDto } from './companies.api';
export { zonesApi } from './zones.api';
export type { ZoneDto } from './zones.api';
export { financeApiTyped } from './finance.api';
export type { InvoiceDto, FinanceKpiDto } from './finance.api';
export type { IotDeviceDto, IotAlertDto } from './iot.api';
export { logisticsApi } from './logistics.api';
export type { WaybillDto, ScaleDto, WaybillStatsDto } from './logistics.api';
export { b2bApi } from './b2b.api';
export type { B2BRfqDto, B2BBidDto, B2BCategoryDto, B2BAwardDto } from './b2b.api';
export { hseApi } from './hse.api';
export type { HseIncidentDto, HseRiskDto, HseCapaDto, HseInspectionDto, HsePermitDto, HseDrillDto, HazmatMaterialDto } from './hse.api';
export { auditApi } from './audit.api';
export type { AuditLogDto } from './audit.api';
export { permissionsApi } from './permissions.api';
export type {
  PermissionPage,
  PermissionSubsystem,
  PermissionModule,
  Role,
  RoleWithPermissions,
  CreateRoleDto,
  UpdateRoleDto,
  RoleUser,
  RoleScope,
  RolePermissionsResponse,
} from './permissions.api';
