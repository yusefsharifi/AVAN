// ═══════════════════════════════════════════════════════════════════════════════
// Permissions & Roles API — RBAC Management Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

import { api } from './client';

export type RoleScope = 'GLOBAL' | 'ZONE' | 'COMPANY';

export interface PermissionPage {
  key: string;
  nameFa: string;
  path: string;
  actions: string[];
}

export interface PermissionSubsystem {
  key: string;
  nameFa: string;
  pages: PermissionPage[];
}

export interface PermissionModule {
  module: string;
  nameFa: string;
  subsystems: PermissionSubsystem[];
}

export interface Role {
  id: string;
  name: string;
  nameFa: string;
  description?: string | null;
  scopeType: RoleScope;
  zoneId?: string | null;
  companyId?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    permissions?: number;
    assignments?: number;
  };
}

export interface RoleWithPermissions extends Role {
  permissions: { permission: string }[];
}

export interface CreateRoleDto {
  name: string;
  nameFa: string;
  description?: string;
  scopeType?: RoleScope;
  zoneId?: string;
  companyId?: string;
}

export interface UpdateRoleDto {
  name?: string;
  nameFa?: string;
  description?: string;
}

export interface RoleUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  zoneId?: string | null;
  companyId?: string | null;
  status: string;
  avatarKey?: string | null;
}

export interface RolePermissionsResponse {
  roleId: string;
  permissions: string[];
}

export const permissionsApi = {
  /**
   * Get the full catalog tree of modules, subsystems, pages, and actions
   */
  getCatalog: (): Promise<PermissionModule[]> =>
    api.get<PermissionModule[]>('/permissions/catalog'),

  /**
   * List all roles scoped to the caller's authority
   */
  listRoles: (): Promise<Role[]> =>
    api.get<Role[]>('/roles'),

  /**
   * Get a single role by ID with permissions
   */
  getRole: (id: string): Promise<RoleWithPermissions> =>
    api.get<RoleWithPermissions>(`/roles/${id}`),

  /**
   * Create a new custom role
   */
  createRole: (dto: CreateRoleDto): Promise<Role> =>
    api.post<Role>('/roles', dto),

  /**
   * Update role metadata (name, nameFa, description)
   */
  updateRole: (id: string, dto: UpdateRoleDto): Promise<Role> =>
    api.patch<Role>(`/roles/${id}`, dto),

  /**
   * Delete a custom role (fails for system roles)
   */
  deleteRole: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/roles/${id}`),

  /**
   * Get string array of permissions assigned to a role
   */
  getRolePermissions: (id: string): Promise<string[]> =>
    api.get<string[]>(`/roles/${id}/permissions`),

  /**
   * Replace all permissions assigned to a role
   */
  setRolePermissions: (id: string, permissions: string[]): Promise<RolePermissionsResponse> =>
    api.put<RolePermissionsResponse>(`/roles/${id}/permissions`, { permissions }),

  /**
   * Get list of users assigned to a role
   */
  getRoleUsers: (id: string): Promise<RoleUser[]> =>
    api.get<RoleUser[]>(`/roles/${id}/users`),

  /**
   * Assign a role to a user
   */
  assignRole: (roleId: string, userId: string): Promise<any> =>
    api.post<any>(`/roles/${roleId}/assign`, { userId }),

  /**
   * Unassign a role from a user
   */
  unassignRole: (roleId: string, userId: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/roles/${roleId}/assign/${userId}`),

  /**
   * Get current user's effective permissions
   */
  getMyPermissions: (): Promise<{ permissions: string[] }> =>
    api.get<{ permissions: string[] }>('/users/me/permissions'),
};

export default permissionsApi;
