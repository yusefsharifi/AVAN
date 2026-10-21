import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { CompanyOnboardingRecord, CompanyLifecycleStatus } from '../types';
import { superAdminApi } from '@/shared/api';

const uid = () => `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SEED_COMPANIES: CompanyOnboardingRecord[] = [
    {
        id: 'comp-001', companyName: 'تجهیزات صنعتی آریا', companyType: 'private_joint_stock',
        registrationNumber: '۴۲۸۷۱', nationalId: '۱۴۰۰۹۸۷۶۵۴۳', taxNumber: '۴۱۱۲۳۴۵۶۷۸۹۰',
        industry: 'تجهیزات صنعتی', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'F', unit: '۳' },
        employees: 42, areaSqM: 2400, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: true, needsIndustrialGas: false, needsWastewater: false,
        contacts: [{ name: 'محسن رستمی', role: 'مدیرعامل', email: 'rostami@arya.ir', isPrimary: true }],
        hseContact: 'محسن رستمی', financialContact: 'بهاره احمدی',
        requestedServices: ['security', 'utility', 'logistics'],
        documents: [], workflowHistory: [],
        createdAt: '2024-01-15T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-002', companyName: 'فولاد آلیاژی کاوه', companyType: 'private_joint_stock',
        registrationNumber: '۱۵۳۲۰', nationalId: '۱۴۰۰۱۲۳۴۵۶۷', taxNumber: '۴۱۹۸۷۶۵۴۳۲۱۰',
        industry: 'فلزات', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'A', unit: '۱۲' },
        employees: 185, areaSqM: 8500, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: true, needsIndustrialGas: true, needsWastewater: true,
        contacts: [{ name: 'علی محمدی', role: 'مدیرعامل', email: 'ali@kaveh-steel.ir', isPrimary: true }],
        hseContact: 'رضا احمدی', financialContact: 'سارا کریمی',
        requestedServices: ['security', 'utility', 'logistics', 'wastewater'],
        documents: [], workflowHistory: [],
        createdAt: '2023-03-10T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-003', companyName: 'پلاستیک ایران نوین', companyType: 'limited_liability',
        registrationNumber: '۸۷۶۵۴', nationalId: '۱۴۰۰۵۵۵۵۵۵۵', taxNumber: '۴۱۵۵۵۵۵۵۵۵۵۵',
        industry: 'شیمیایی و پلاستیک', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'B', unit: '۶' },
        employees: 67, areaSqM: 3200, needsWarehouse: true, needsHazmatStorage: true,
        needsHighVoltage: false, needsIndustrialGas: false, needsWastewater: true,
        contacts: [{ name: 'مریم رضایی', role: 'مدیرعامل', email: 'rezaei@plasticiran.ir', isPrimary: true }],
        hseContact: 'حسین کاظمی', financialContact: 'مریم رضایی',
        requestedServices: ['security', 'utility'],
        documents: [], workflowHistory: [],
        createdAt: '2023-06-20T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-004', companyName: 'پتروشیمی پارس البرز', companyType: 'private_joint_stock',
        registrationNumber: '۳۳۱۲۰', nationalId: '۱۴۰۰۷۷۷۷۷۷۷', taxNumber: '۴۱۷۷۷۷۷۷۷۷۷۷',
        industry: 'پتروشیمی', lifecycleStatus: 'under_review',
        address: { zoneId: 'zone-kaveh', block: 'C', unit: '۲' },
        employees: 210, areaSqM: 12000, needsWarehouse: true, needsHazmatStorage: true,
        needsHighVoltage: true, needsIndustrialGas: true, needsWastewater: true,
        contacts: [{ name: 'کامبیز نوری', role: 'مدیرعامل', email: 'nouri@parsalborz.ir', isPrimary: true }],
        hseContact: 'فاطمه حسینی', financialContact: 'احمد قاسمی',
        requestedServices: ['security', 'utility', 'logistics', 'hazmat', 'wastewater'],
        documents: [], workflowHistory: [],
        createdAt: '2024-04-05T08:00:00.000Z', updatedAt: '2024-07-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-005', companyName: 'الکترونیک پیشرو ایران', companyType: 'limited_liability',
        registrationNumber: '۶۶۴۳۲', nationalId: '۱۴۰۰۸۸۸۸۸۸۸', taxNumber: '۴۱۸۸۸۸۸۸۸۸۸۸',
        industry: 'الکترونیک', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'D', unit: '۸' },
        employees: 93, areaSqM: 4100, needsWarehouse: false, needsHazmatStorage: false,
        needsHighVoltage: false, needsIndustrialGas: false, needsWastewater: false,
        contacts: [{ name: 'نیلوفر یزدی', role: 'مدیرعامل', email: 'yazdi@pioneer-elec.ir', isPrimary: true }],
        hseContact: 'داریوش منصور', financialContact: 'نیلوفر یزدی',
        requestedServices: ['security', 'utility'],
        documents: [], workflowHistory: [],
        createdAt: '2023-09-12T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-006', companyName: 'خودروسازی صبا قطعه', companyType: 'cooperative',
        registrationNumber: '۲۱۴۵۶', nationalId: '۱۴۰۰۹۹۹۹۹۹۹', taxNumber: '۴۱۹۹۹۹۹۹۹۹۹۹',
        industry: 'خودروسازی', lifecycleStatus: 'suspended',
        address: { zoneId: 'zone-kaveh', block: 'E', unit: '۱۴' },
        employees: 128, areaSqM: 6000, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: true, needsIndustrialGas: true, needsWastewater: false,
        contacts: [{ name: 'بهزاد شریفی', role: 'مدیرعامل', email: 'sharifi@saba-part.ir', isPrimary: true }],
        hseContact: 'شیرین مرادی', financialContact: 'بهزاد شریفی',
        requestedServices: ['security', 'utility', 'logistics'],
        documents: [], workflowHistory: [],
        createdAt: '2022-11-08T08:00:00.000Z', updatedAt: '2024-05-15T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-007', companyName: 'نساجی گلستان بافت', companyType: 'limited_liability',
        registrationNumber: '۴۵۶۷۸', nationalId: '۱۴۰۰۱۱۱۱۱۱۱', taxNumber: '۴۱۱۱۱۱۱۱۱۱۱۱',
        industry: 'نساجی', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'G', unit: '۵' },
        employees: 54, areaSqM: 1800, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: false, needsIndustrialGas: false, needsWastewater: true,
        contacts: [{ name: 'زینب ابراهیمی', role: 'مدیرعامل', email: 'ebrahimi@golestan-baft.ir', isPrimary: true }],
        hseContact: 'جواد اکبری', financialContact: 'زینب ابراهیمی',
        requestedServices: ['security', 'utility'],
        documents: [], workflowHistory: [],
        createdAt: '2023-02-14T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-008', companyName: 'مواد غذایی سحر', companyType: 'private_joint_stock',
        registrationNumber: '۷۸۹۰۱', nationalId: '۱۴۰۰۲۲۲۲۲۲۲', taxNumber: '۴۱۲۲۲۲۲۲۲۲۲۲',
        industry: 'غذایی', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'H', unit: '۳' },
        employees: 76, areaSqM: 2800, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: false, needsIndustrialGas: false, needsWastewater: true,
        contacts: [{ name: 'ساناز طاهری', role: 'مدیرعامل', email: 'taheri@sahar-foods.ir', isPrimary: true }],
        hseContact: 'پوریا حسنی', financialContact: 'ساناز طاهری',
        requestedServices: ['security', 'utility'],
        documents: [], workflowHistory: [],
        createdAt: '2023-07-30T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-009', companyName: 'ماشین‌سازی الوند صنعت', companyType: 'private_joint_stock',
        registrationNumber: '۵۵۱۲۳', nationalId: '۱۴۰۰۳۳۳۳۳۳۳', taxNumber: '۴۱۳۳۳۳۳۳۳۳۳۳',
        industry: 'ماشین‌سازی', lifecycleStatus: 'active',
        address: { zoneId: 'zone-kaveh', block: 'A', unit: '۷' },
        employees: 112, areaSqM: 5200, needsWarehouse: true, needsHazmatStorage: false,
        needsHighVoltage: true, needsIndustrialGas: true, needsWastewater: false,
        contacts: [{ name: 'محمدرضا پور', role: 'مدیرعامل', email: 'pour@alvand-machine.ir', isPrimary: true }],
        hseContact: 'الهام صادقی', financialContact: 'محمدرضا پور',
        requestedServices: ['security', 'utility', 'logistics'],
        documents: [], workflowHistory: [],
        createdAt: '2023-05-20T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z', createdBy: 'admin',
    },
    {
        id: 'comp-010', companyName: 'رنگ و رزین ایران رنگ', companyType: 'limited_liability',
        registrationNumber: '۹۹۰۰۱', nationalId: '۱۴۰۰۴۴۴۴۴۴۴', taxNumber: '۴۱۴۴۴۴۴۴۴۴۴۴',
        industry: 'شیمیایی و رنگ', lifecycleStatus: 'applicant',
        address: { zoneId: 'zone-kaveh', block: 'B', unit: '۱۰' },
        employees: 38, areaSqM: 1500, needsWarehouse: false, needsHazmatStorage: true,
        needsHighVoltage: false, needsIndustrialGas: false, needsWastewater: true,
        contacts: [{ name: 'گلنار فتحی', role: 'مدیرعامل', email: 'fathi@iranrang.ir', isPrimary: true }],
        hseContact: 'امیر مظفری', financialContact: 'گلنار فتحی',
        requestedServices: ['security', 'utility'],
        documents: [], workflowHistory: [],
        createdAt: '2024-06-10T08:00:00.000Z', updatedAt: '2024-07-01T08:00:00.000Z', createdBy: 'admin',
    },
];

interface CompanyState {
    companies: CompanyOnboardingRecord[];
    selectedId: string | null;
    searchQuery: string;
    statusFilter: CompanyLifecycleStatus | 'all';
    industryFilter: string;
    isLoading: boolean;
    setSelectedId: (id: string | null) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: CompanyLifecycleStatus | 'all') => void;
    setIndustryFilter: (i: string) => void;
    addCompany: (company: Omit<CompanyOnboardingRecord, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateCompany: (id: string, updates: Partial<CompanyOnboardingRecord>) => void;
    updateLifecycle: (id: string, status: CompanyLifecycleStatus) => void;
    deleteCompany: (id: string) => void;
    getById: (id: string) => CompanyOnboardingRecord | undefined;
    getFiltered: () => CompanyOnboardingRecord[];
    loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

export const useCompanyStore = create<CompanyState>()(
    persist(
        (set, get) => ({
            companies: [],
            selectedId: null,
            searchQuery: '',
            statusFilter: 'all',
            industryFilter: 'all',
            isLoading: false,

            loadFromApi: async () => {
                try {
                    const { useAuthStore } = await import('@/core/stores/useAuthStore');
                    const zoneId = useAuthStore.getState().user?.zoneId;
                    if (zoneId) {
                        const { companiesApi } = await import('@/shared/api/companies.api');
                        const result = await companiesApi.listByZone(zoneId);
                        if (Array.isArray(result) && result.length > 0) {
                            set({ companies: result as unknown as CompanyOnboardingRecord[] });
                        }
                    }
                } catch (err) {
                    console.warn('Company API unavailable:', err);
                }
            },

            setSelectedId: (id) => set({ selectedId: id }),
            setSearchQuery: (q) => set({ searchQuery: q }),
            setStatusFilter: (s) => set({ statusFilter: s }),
            setIndustryFilter: (i) => set({ industryFilter: i }),
            addCompany: (company) => {
                const id = uid();
                const now = new Date().toISOString();
                set((state) => ({
                    companies: [{
                        ...company,
                        id,
                        lifecycleStatus: 'under_review',
                        workflowHistory: company.workflowHistory?.length ? company.workflowHistory : [
                            { id: `${id}-wf-1`, order: 1, name: 'بررسی مدارک', role: 'کارشناس پذیرش', status: 'in_progress' },
                            { id: `${id}-wf-2`, order: 2, name: 'بررسی مالی', role: 'کارشناس مالی', status: 'pending' },
                            { id: `${id}-wf-3`, order: 3, name: 'بررسی HSE', role: 'کارشناس HSE', status: 'pending' },
                            { id: `${id}-wf-4`, order: 4, name: 'تأیید مدیر شهرک', role: 'مدیر شهرک', status: 'pending' },
                        ],
                        createdAt: now,
                        updatedAt: now,
                    }, ...state.companies],
                }));
                return id;
            },
            updateCompany: (id, updates) =>
                set((state) => ({
                    companies: state.companies.map((c) =>
                        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
                    ),
                })),
            updateLifecycle: (id, status) =>
                set((state) => ({
                    companies: state.companies.map((company) => {
                        if (company.id !== id) return company;
                        const current = company.workflowHistory ?? [];
                        const completed = current.map((step) => step.status === 'in_progress' ? { ...step, status: 'completed' as const, actor: 'مدیر شهرک', completedAt: new Date().toISOString() } : step);
                        const nextStep = completed.find((step) => step.status === 'pending');
                        const workflowHistory = nextStep ? completed.map((step) => step.id === nextStep.id ? { ...step, status: 'in_progress' as const } : step) : completed;
                        return { ...company, lifecycleStatus: status, workflowHistory, updatedAt: new Date().toISOString() };
                    }),
                })), 
            deleteCompany: (id) =>
                set((state) => ({ companies: state.companies.filter((c) => c.id !== id) })),
            getById: (id) => get().companies.find((c) => c.id === id),
            getFiltered: () => {
                const { companies, searchQuery, statusFilter, industryFilter } = get();
                return companies.filter((c) => {
                    if (searchQuery && !(c.companyName || '').includes(searchQuery)) return false;
                    if (statusFilter !== 'all' && c.lifecycleStatus !== statusFilter) return false;
                    if (industryFilter !== 'all' && !(c.industry || '').includes(industryFilter)) return false;
                    return true;
                });
            },
        }),
        { name: 'zone-company-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
