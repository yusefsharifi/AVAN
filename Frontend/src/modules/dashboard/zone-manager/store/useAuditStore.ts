import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { AuditLog } from '../types';

const uid = () => `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface AuditState {
    logs: AuditLog[];
    addLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
}

export const useAuditStore = create<AuditState>()(
    persist(
        (set) => ({
            logs: [],
            addLog: (log) =>
                set((state) => ({
                    logs: [{ ...log, id: uid(), timestamp: new Date().toISOString() }, ...state.logs].slice(0, 500),
                })),
            clearLogs: () => set({ logs: [] }),
        }),
        { name: 'zone-audit-store', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
