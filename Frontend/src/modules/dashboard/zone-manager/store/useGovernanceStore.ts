import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { ZoneRole, ZoneUser, NotificationRule } from '../types';
import { usersApi } from '@/shared/api/users.api';

const uid = () => `gov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface GovernanceState {
    roles: ZoneRole[];
    users: ZoneUser[];
    notificationRules: NotificationRule[];
    isLoading: boolean;
    addRole: (role: Omit<ZoneRole, 'id' | 'createdAt'>) => string;
    updateRole: (id: string, updates: Partial<ZoneRole>) => void;
    deleteRole: (id: string) => void;
    addUser: (user: Omit<ZoneUser, 'id' | 'createdAt'>) => string;
    updateUser: (id: string, updates: Partial<ZoneUser>) => void;
    toggleUserActive: (id: string) => void;
    updateNotificationRule: (id: string, updates: Partial<NotificationRule>) => void;
    loadFromApi: () => Promise<void>;
}

export const useGovernanceStore = create<GovernanceState>()(
    persist(
        (set) => ({
            roles: [],
            users: [],
            notificationRules: [],
            isLoading: false,

            loadFromApi: async () => {
                set({ isLoading: true } as any);
                try {
                    const result = await usersApi.list({ limit: 100 });
                    set({ users: result.items as unknown as ZoneUser[], isLoading: false } as any);
                } catch (err) {
                    set({ isLoading: false } as any);
                    console.warn('Governance API unavailable:', err);
                }
            },
            addRole: (role) => {
                const id = uid();
                set((s) => ({ roles: [...s.roles, { ...role, id, createdAt: new Date().toISOString() }] }));
                return id;
            },
            updateRole: (id, updates) =>
                set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
            deleteRole: (id) =>
                set((s) => ({ roles: s.roles.filter((r) => r.id !== id || r.isSystem) })),
            addUser: (user) => {
                const id = uid();
                set((s) => ({ users: [...s.users, { ...user, id, createdAt: new Date().toISOString() }] }));
                return id;
            },
            updateUser: (id, updates) =>
                set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)) })),
            toggleUserActive: (id) =>
                set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)) })),
            updateNotificationRule: (id, updates) =>
                set((s) => ({ notificationRules: s.notificationRules.map((r) => (r.id === id ? { ...r, ...updates } : r)) })),
        }),
        { name: 'zone-governance-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
