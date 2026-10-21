import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role, Permission, AuditLog, SecurityEvent, Session } from '../types';
import { usersApi } from '@/shared/api/users.api';
import { auditApi } from '@/shared/api/audit.api';

interface GovernanceState {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  auditLogs: AuditLog[];
  securityEvents: SecurityEvent[];
  sessions: Session[];
  userFilters: {
    roleId?: string;
    lifecycleStatus?: string;
    parkScope?: string;
    searchQuery?: string;
  };
  selectedUserId: string | null;
  selectedRoleId: string | null;
  isLoading: boolean;
  error: string | null;

  loadFromApi: () => Promise<void>;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  deactivateUser: (id: string) => void;
  terminateUser: (id: string) => void;
  lockUser: (id: string) => void;
  unlockUser: (id: string) => void;
  resetPassword: (id: string) => void;
  forcePasswordChange: (id: string) => void;
  forceMFA: (id: string) => void;
  revokeAllSessions: (id: string) => void;
  setRoles: (roles: Role[]) => void;
  addRole: (role: Role) => void;
  updateRole: (id: string, data: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  addAuditLog: (log: AuditLog) => void;
  addSecurityEvent: (event: SecurityEvent) => void;
  revokeSession: (id: string) => void;
  setUserFilters: (filters: GovernanceState['userFilters']) => void;
  clearUserFilters: () => void;
  setSelectedUser: (id: string | null) => void;
  setSelectedRole: (id: string | null) => void;
  getFilteredUsers: () => User[];
  getUserById: (id: string) => User | undefined;
  getRoleById: (id: string) => Role | undefined;
}

export const useGovernanceStore = create<GovernanceState>()(
  persist(
    (set, get) => ({
      users: [],
      roles: [],
      permissions: [],
      auditLogs: [],
      securityEvents: [],
      sessions: [],
      userFilters: {},
      selectedUserId: null,
      selectedRoleId: null,
      isLoading: false,
      error: null,

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const [usersRes, auditRes] = await Promise.allSettled([
            usersApi.list({ limit: 100 }),
            auditApi.listLogs({ limit: 100 }),
          ]);
          const users = usersRes.status === 'fulfilled' ? usersRes.value.items : [];
          const auditLogs = auditRes.status === 'fulfilled' ? auditRes.value : [];
          set({
            users: users as unknown as User[],
            auditLogs: auditLogs as unknown as AuditLog[],
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت داده‌ها' });
        }
      },
      
      // Initial Filters
      userFilters: {},
      
      // Selection
      selectedUserId: null,
      selectedRoleId: null,
      
      // User Actions
      setUsers: (users) => set({ users }),
      
      addUser: (user) => set((state) => ({
        users: [...state.users, user]
      })),
      
      updateUser: (id, data) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      suspendUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, lifecycleStatus: 'suspended' as const, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      activateUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, lifecycleStatus: 'active' as const, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      deactivateUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, lifecycleStatus: 'deactivated' as const, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      terminateUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, lifecycleStatus: 'terminated' as const, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      lockUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, isLocked: true, lockedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : u
        )
      })),
      
      unlockUser: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, isLocked: false, lockedAt: undefined, failedLoginAttempts: 0, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      resetPassword: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, updatedAt: new Date().toISOString() } : u
        ),
        auditLogs: [...state.auditLogs, {
          id: `audit-${Date.now()}`,
          userId: id,
          userName: state.users.find(u => u.id === id)?.firstName + ' ' + state.users.find(u => u.id === id)?.lastName || '',
          action: 'password_reset',
          module: 'auth',
          resource: 'user',
          resourceId: id,
          details: {},
          ipAddress: 'system',
          userAgent: 'system',
          status: 'success' as const,
          createdAt: new Date().toISOString()
        }]
      })),
      
      forcePasswordChange: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      forceMFA: (id) => set((state) => ({
        users: state.users.map(u => 
          u.id === id ? { ...u, mfaRequired: true, updatedAt: new Date().toISOString() } : u
        )
      })),
      
      revokeAllSessions: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.userId !== id)
      })),
      
      // Role Actions
      setRoles: (roles) => set({ roles }),
      
      addRole: (role) => set((state) => ({
        roles: [...state.roles, role]
      })),
      
      updateRole: (id, data) => set((state) => ({
        roles: state.roles.map(r => 
          r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
        )
      })),
      
      deleteRole: (id) => set((state) => ({
        roles: state.roles.filter(r => r.id !== id && !r.isSystem)
      })),
      
      // Audit Actions
      addAuditLog: (log) => set((state) => ({
        auditLogs: [log, ...state.auditLogs]
      })),
      
      addSecurityEvent: (event) => set((state) => ({
        securityEvents: [event, ...state.securityEvents]
      })),
      
      // Session Actions
      revokeSession: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id)
      })),
      
      // Filter Actions
      setUserFilters: (filters) => set({ userFilters: filters }),
      clearUserFilters: () => set({ userFilters: {} }),
      
      // Selection
      setSelectedUser: (id) => set({ selectedUserId: id }),
      setSelectedRole: (id) => set({ selectedRoleId: id }),
      
      // Computed
      getFilteredUsers: () => {
        const state = get();
        let result = [...state.users];
        
        if (state.userFilters.searchQuery) {
          const query = state.userFilters.searchQuery.toLowerCase();
          result = result.filter(u => 
            u.firstName.toLowerCase().includes(query) ||
            u.lastName.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
          );
        }
        
        if (state.userFilters.roleId) {
          result = result.filter(u => u.roleId === state.userFilters.roleId);
        }
        
        if (state.userFilters.lifecycleStatus) {
          result = result.filter(u => u.lifecycleStatus === state.userFilters.lifecycleStatus);
        }
        
        if (state.userFilters.parkScope) {
          result = result.filter(u => u.parkScope?.includes(state.userFilters.parkScope!));
        }
        
        return result;
      },
      
      getUserById: (id) => get().users.find(u => u.id === id),
      getRoleById: (id) => get().roles.find(r => r.id === id),
    }),
    {
      name: 'governance-store',
      partialize: () => ({}),
    }
  )
);
