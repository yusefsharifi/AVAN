import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { LeaseContract } from '../types';
import { api } from '@/shared/api/client';

const uid = () => `lease-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SEED_LEASES: LeaseContract[] = [
    { id: 'lease-001', contractNumber: 'LC-۱۴۰۱-۰۰۱', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', contractType: 'lease', status: 'active', startDate: '۱۴۰۱/۰۳/۱۵', endDate: '۱۴۰۴/۰۳/۱۵', renewalPeriodMonths: 36, block: 'A', unit: '۱۲', areaSqM: 8500, usageType: 'manufacturing', monthlyRent: 85000000, serviceCharge: 12000000, maintenanceFee: 5000000, deposit: 250000000, escalationClause: '۱۵٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', fireInsuranceExpiry: '۱۴۰۳/۱۲/۲۹', liabilityInsuranceExpiry: '۱۴۰۳/۰۸/۳۰', documents: [], workflowSteps: [], createdAt: '2022-06-15T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'lease-002', contractNumber: 'LC-۱۴۰۱-۰۰۲', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', contractType: 'lease', status: 'active', startDate: '۱۴۰۱/۰۸/۲۰', endDate: '۱۴۰۳/۰۸/۲۰', block: 'B', unit: '۶', areaSqM: 3200, usageType: 'manufacturing', monthlyRent: 32000000, serviceCharge: 4500000, maintenanceFee: 2000000, deposit: 95000000, escalationClause: '۱۲٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', fireInsuranceExpiry: '۱۴۰۳/۱۰/۳۰', documents: [], workflowSteps: [], createdAt: '2022-11-20T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'lease-003', contractNumber: 'LC-۱۴۰۲-۰۰۳', companyId: 'comp-001', companyName: 'تجهیزات صنعتی آریا', contractType: 'lease', status: 'active', startDate: '۱۴۰۲/۰۱/۱۰', endDate: '۱۴۰۵/۰۱/۱۰', block: 'F', unit: '۳', areaSqM: 2400, usageType: 'manufacturing', monthlyRent: 24000000, serviceCharge: 3500000, maintenanceFee: 1500000, deposit: 72000000, escalationClause: '۱۵٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', fireInsuranceExpiry: '۱۴۰۴/۰۳/۲۹', documents: [], workflowSteps: [], createdAt: '2023-03-10T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'lease-004', contractNumber: 'LC-۱۴۰۲-۰۰۴', companyId: 'comp-005', companyName: 'الکترونیک پیشرو ایران', contractType: 'lease', status: 'active', startDate: '۱۴۰۲/۰۶/۰۵', endDate: '۱۴۰۵/۰۶/۰۵', block: 'D', unit: '۸', areaSqM: 4100, usageType: 'manufacturing', monthlyRent: 41000000, serviceCharge: 5800000, maintenanceFee: 2500000, deposit: 123000000, escalationClause: '۱۵٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', documents: [], workflowSteps: [], createdAt: '2023-08-05T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'lease-005', contractNumber: 'LC-۱۴۰۲-۰۰۵', companyId: 'comp-007', companyName: 'نساجی گلستان بافت', contractType: 'lease', status: 'active', startDate: '۱۴۰۲/۰۳/۲۰', endDate: '۱۴۰۳/۰۹/۲۰', block: 'G', unit: '۵', areaSqM: 1800, usageType: 'manufacturing', monthlyRent: 18000000, serviceCharge: 2500000, maintenanceFee: 1200000, deposit: 54000000, taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', documents: [], workflowSteps: [], createdAt: '2023-06-20T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'lease-006', contractNumber: 'LC-۱۴۰۳-۰۰۶', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', contractType: 'lease', status: 'pending_hse', startDate: '۱۴۰۳/۰۶/۰۱', endDate: '۱۴۰۶/۰۶/۰۱', block: 'C', unit: '۲', areaSqM: 12000, usageType: 'manufacturing', monthlyRent: 120000000, serviceCharge: 18000000, maintenanceFee: 8000000, deposit: 360000000, escalationClause: '۲۰٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 3, billingCycle: 'monthly', documents: [], workflowSteps: [], createdAt: '2024-07-01T08:00:00.000Z', updatedAt: '2024-07-01T08:00:00.000Z' },
];

interface LeaseState {
    contracts: LeaseContract[];
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    addContract: (contract: Omit<LeaseContract, 'id' | 'contractNumber' | 'createdAt' | 'updatedAt'>) => string;
    updateContract: (id: string, updates: Partial<LeaseContract>) => void;
    updateStatus: (id: string, status: LeaseContract['status']) => void;
    deleteContract: (id: string) => void;
    getById: (id: string) => LeaseContract | undefined;
    getByCompany: (companyId: string) => LeaseContract[];
    loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

let contractCounter = 7;

export const useLeaseStore = create<LeaseState>()(
    persist(
        (set, get) => ({
            contracts: SEED_LEASES,
            selectedId: null,

            // ── API Integration (COMP-004): Load from backend with seed fallback ──
            loadFromApi: async () => {
                try {
                    const result = await api.get<any[]>('/finance/leases');
                    if (Array.isArray(result) && result.length > 0) {
                        set({ contracts: result as LeaseContract[] });
                    }
                } catch (err) {
                    console.warn('Lease API unavailable, using seed data:', err);
                }
            },

            setSelectedId: (id) => set({ selectedId: id }),
            addContract: (contract) => {
                const id = uid();
                const n = String(contractCounter++).padStart(3, '0');
                const now = new Date().toISOString();
                set((s) => ({
                    contracts: [{ ...contract, id, contractNumber: `LC-۱۴۰۳-۰${n}`, createdAt: now, updatedAt: now }, ...s.contracts],
                }));
                return id;
            },
            updateContract: (id, updates) =>
                set((s) => ({
                    contracts: s.contracts.map((c) =>
                        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
                    ),
                })),
            updateStatus: (id, status) =>
                set((s) => ({
                    contracts: s.contracts.map((c) =>
                        c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
                    ),
                })),
            deleteContract: (id) => set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) })),
            getById: (id) => get().contracts.find((c) => c.id === id),
            getByCompany: (companyId) => get().contracts.filter((c) => c.companyId === companyId),
        }),
        { name: 'zone-lease-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
