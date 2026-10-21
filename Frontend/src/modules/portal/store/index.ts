import { create } from 'zustand';
import type { Company, Shipment, Contractor } from '../types/portal.types';

// Mock data
const MOCK_COMPANIES: Company[] = [
  { id: 'C-001', code: 'IPC-2024-001', name: 'شرکت پلاستیک ایران', nameEn: 'Iran Plastic Co.', type: 'manufacturing', status: 'active', ceoName: 'علیرضا صادقی', ceoPhone: '۰۹۱۲۱۱۱۲۲۳۳', adminContact: { name: 'محمد حسینی', phone: '۰۹۱۲۳۴۵۶۷۸۹', email: 'admin@iranplastic.co', role: 'مدیر اداری' }, technicalContact: { name: 'رضا کریمی', phone: '۰۹۱۳۴۵۶۷۸۹۰', email: 'tech@iranplastic.co', role: 'مدیر فنی' }, unitNumber: 'A-12', areaSqm: 1200, contractStartDate: '۱۴۰۱/۰۱/۰۱', contractEndDate: '۱۴۰۴/۱۲/۲۹', monthlyRent: 48000000, depositAmount: 480000000, paymentTerms: 'monthly', bankAccount: { bankName: 'ملت', accountNumber: '۱۲۳۴۵۶۷۸۹۰', cardNumber: '۶۱۰۴-۳۳۷۸-۱۲۳۴-۵۶۷۸', shaba: 'IR۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰۱۲۳۴' }, permits: [], hseRating: 85, complianceScore: 92, totalShipmentsYTD: 142, avgProcessingTime: 38, outstandingBalance: 96000000, activeContractorsCount: 3, createdAt: '۱۴۰۱/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶', createdBy: 'admin', version: 1 },
  { id: 'C-002', code: 'IPC-2024-002', name: 'صنایع فولاد البرز', nameEn: 'Alborz Steel Industries', type: 'manufacturing', status: 'active', ceoName: 'احمد کریمی', ceoPhone: '۰۹۱۲۲۲۲۳۳۴۴', adminContact: { name: 'علی نجفی', phone: '۰۹۱۲۴۵۶۷۸۹۰', email: 'admin@alborzsteel.ir', role: 'مدیر اداری' }, technicalContact: { name: 'کمال صادقی', phone: '۰۹۱۳۵۶۷۸۹۰۱', email: 'tech@alborzsteel.ir', role: 'مدیر فنی' }, unitNumber: 'B-03', areaSqm: 2400, contractStartDate: '۱۴۰۰/۰۷/۱۵', contractEndDate: '۱۴۰۳/۰۷/۱۵', monthlyRent: 68000000, depositAmount: 680000000, paymentTerms: 'monthly', bankAccount: { bankName: 'صادرات', accountNumber: '۹۸۷۶۵۴۳۲۱۰', cardNumber: '۶۲۲۱-۰۶۱۲-۳۴۵۶-۷۸۹۰', shaba: 'IR۹۸۷۶۵۴۳۲۱۰۹۸۷۶۵۴۳۲۱۰۹۸۷۶۵' }, permits: [], hseRating: 78, complianceScore: 85, totalShipmentsYTD: 268, avgProcessingTime: 42, outstandingBalance: 136000000, activeContractorsCount: 5, createdAt: '۱۴۰۰/۰۷/۱۵', updatedAt: '۱۴۰۳/۰۴/۱۶', createdBy: 'admin', version: 1 },
  { id: 'C-003', code: 'IPC-2024-003', name: 'پتروشیمی پارس', nameEn: 'Pars Petrochemical', type: 'manufacturing', status: 'active', ceoName: 'فرید نجفی', ceoPhone: '۰۹۱۳۳۳۳۴۴۵۵', adminContact: { name: 'مریم رضایی', phone: '۰۹۱۴۴۵۶۷۸۹۰', email: 'admin@parspetro.co', role: 'مدیر اداری' }, technicalContact: { name: 'حسین کاظمی', phone: '۰۹۱۵۵۶۷۸۹۰۱', email: 'tech@parspetro.co', role: 'مدیر فنی' }, unitNumber: 'C-07', areaSqm: 800, contractStartDate: '۱۴۰۲/۰۱/۰۱', contractEndDate: '۱۴۰۵/۱۲/۲۹', monthlyRent: 32000000, depositAmount: 320000000, paymentTerms: 'quarterly', bankAccount: { bankName: 'پاسارگاد', accountNumber: '۵۶۷۸۹۰۱۲۳۴', cardNumber: '۶۲۷۷-۶۰۱۲-۳۴۵۶-۷۸۹۰', shaba: 'IR۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷' }, permits: [], hseRating: 92, complianceScore: 88, totalShipmentsYTD: 97, avgProcessingTime: 35, outstandingBalance: 64000000, activeContractorsCount: 2, createdAt: '۱۴۰۲/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶', createdBy: 'admin', version: 1 },
];

const MOCK_SHIPMENTS: Shipment[] = [
  { id: 'S-001', waybillNumber: 'BN-2024-00101', companyId: 'C-001', plateNumber: '۱۲ب-۳۴۵-۴۵', plateNumberEn: '12B-345-45', vehicleType: 'truck', driverName: 'علی محمدی', driverPhone: '۰۹۱۲۱۲۳۴۵۶۷', driverNationalCode: '۱۲۳۴۵۶۷۸۹۰', cargoType: 'مواد اولیه', cargoDescription: 'گرانول پلاستیک PE', weightDeclared: 12500, packagesCount: 40, unitType: 'pallet', handlingRequirements: [], dockId: 'dock-1', scheduledDate: '۱۴۰۳/۰۴/۱۶', scheduledTimeSlot: '۰۸:۰۰-۰۸:۳۰', freightCurrency: 'IRR', status: 'completed', direction: 'inbound', documents: [], createdAt: '۱۴۰۳/۰۴/۱۵', createdBy: 'admin', history: [] },
  { id: 'S-002', waybillNumber: 'BN-2024-00102', companyId: 'C-002', plateNumber: '۷۸پ-۹۱۲-۴۵', plateNumberEn: '78P-912-45', vehicleType: 'truck', driverName: 'رضا کریمی', driverPhone: '۰۹۱۳۲۳۴۵۶۷۸', driverNationalCode: '۲۳۴۵۶۷۸۹۰۱', cargoType: 'محصول نهایی', cargoDescription: 'ورق فولادی', weightDeclared: 8200, packagesCount: 22, unitType: 'pallet', handlingRequirements: [], dockId: 'dock-2', scheduledDate: '۱۴۰۳/۰۴/۱۶', scheduledTimeSlot: '۰۹:۰۰-۰۹:۳۰', freightCurrency: 'IRR', status: 'scheduled', direction: 'outbound', documents: [], createdAt: '۱۴۰۳/۰۴/۱۵', createdBy: 'admin', history: [] },
];

// Store
import { api } from '@/shared/api';

interface PortalStore {
  activeCompanyId: string | null;
  activeTab: string;
  sidebarCollapsed: boolean;
  splitViewRatio: number;
  companies: Company[];
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  selectedShipments: string[];
  companyFilters: Record<string, any>;
  shipmentFilters: Record<string, any>;
  setActiveCompany: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  toggleShipmentSelection: (id: string) => void;
  clearShipmentSelection: () => void;
  setCompanyFilters: (filters: Record<string, any>) => void;
  setShipmentFilters: (filters: Record<string, any>) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
  filteredCompanies: () => Company[];
  filteredShipments: () => Shipment[];
  getCompanyById: (id: string) => Company | undefined;
  getCompanyStats: () => { total: number; active: number; suspended: number; expiringPermits: number; totalRevenue: number };
}

export const usePortalStore = create<PortalStore>((set, get) => ({
  activeCompanyId: null,
  activeTab: 'overview',
  sidebarCollapsed: false,
  splitViewRatio: 0.4,
  companies: MOCK_COMPANIES,
  shipments: MOCK_SHIPMENTS,
  loading: false,
  error: null,
  selectedShipments: [],
  companyFilters: {},
  shipmentFilters: {},

  setActiveCompany: (id) => set({ activeCompanyId: id, activeTab: 'overview' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleShipmentSelection: (id) => set(state => ({
    selectedShipments: state.selectedShipments.includes(id)
      ? state.selectedShipments.filter(s => s !== id)
      : [...state.selectedShipments, id],
  })),
  clearShipmentSelection: () => set({ selectedShipments: [] }),
  setCompanyFilters: (filters) => set(state => ({ companyFilters: { ...state.companyFilters, ...filters } })),
  setShipmentFilters: (filters) => set(state => ({ shipmentFilters: { ...state.shipmentFilters, ...filters } })),

  loadFromApi: async () => {
    try {
      set({ loading: true, error: null });
      const [companiesRes, shipmentsRes] = await Promise.allSettled([
        api.get('/zones/companies'),
        api.get('/zones/operations/shipments'),
      ]);
      const companies = companiesRes.status === 'fulfilled' ? (companiesRes.value.data || []) : [];
      const shipments = shipmentsRes.status === 'fulfilled' ? (shipmentsRes.value.data || []) : [];
      set({ companies, shipments, loading: false });
    } catch (error) {
      set({ error: 'Failed to load portal data', loading: false });
    }
  },

  filteredCompanies: () => {
    const { companies, companyFilters } = get();
    let result = [...companies];
    if (companyFilters.search) {
      const q = companyFilters.search.toLowerCase();
      result = result.filter(c => c.name.includes(q) || c.code.includes(q) || c.unitNumber.includes(q));
    }
    if (companyFilters.type) result = result.filter(c => c.type === companyFilters.type);
    if (companyFilters.status) result = result.filter(c => c.status === companyFilters.status);
    return result;
  },

  filteredShipments: () => {
    const { shipments, shipmentFilters, activeCompanyId } = get();
    let result = [...shipments];
    if (activeCompanyId) result = result.filter(s => s.companyId === activeCompanyId);
    if (shipmentFilters.search) {
      const q = shipmentFilters.search.toLowerCase();
      result = result.filter(s => s.waybillNumber.includes(q) || s.driverName.includes(q) || s.plateNumber.includes(q));
    }
    if (shipmentFilters.status) result = result.filter(s => s.status === shipmentFilters.status);
    return result;
  },

  getCompanyById: (id) => get().companies.find(c => c.id === id),

  getCompanyStats: () => {
    const companies = get().companies;
    return {
      total: companies.length,
      active: companies.filter(c => c.status === 'active').length,
      suspended: companies.filter(c => c.status === 'suspended').length,
      expiringPermits: companies.reduce((sum, c) => sum + c.permits.filter(p => p.status === 'expiring_soon').length, 0),
      totalRevenue: companies.reduce((sum, c) => sum + c.monthlyRent, 0),
    };
  },
}));
