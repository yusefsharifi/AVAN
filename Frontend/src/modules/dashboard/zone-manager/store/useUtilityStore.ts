import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import { useFinanceStore } from '@/modules/finance/store';
import type { UtilityMeter, MeterReading, UtilityTariff, UtilityInvoice, UtilityGLMapping } from '../types';
import { api } from '@/shared/api/client';

const uid = () => `util-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SEED_METERS: UtilityMeter[] = [
    { id: 'meter-001', meterCode: 'E-A12', utilityType: 'electricity', serialNumber: 'SN-EL-001', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', address: { zoneId: 'zone-kaveh', block: 'A', unit: '۱۲' }, unit: 'kWh', installationDate: '۱۴۰۱/۰۳/۱۵', tariffGroup: 'industrial', anomalyThreshold: 4500, lastReading: 248500, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2022-06-15T08:00:00.000Z' },
    { id: 'meter-002', meterCode: 'W-A12', utilityType: 'water', serialNumber: 'SN-W-001', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', address: { zoneId: 'zone-kaveh', block: 'A', unit: '۱۲' }, unit: 'm³', installationDate: '۱۴۰۱/۰۳/۱۵', tariffGroup: 'standard', anomalyThreshold: 800, lastReading: 18900, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2022-06-15T08:00:00.000Z' },
    { id: 'meter-003', meterCode: 'G-A12', utilityType: 'gas', serialNumber: 'SN-G-001', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', address: { zoneId: 'zone-kaveh', block: 'A', unit: '۱۲' }, unit: 'm³', installationDate: '۱۴۰۱/۰۳/۱۵', tariffGroup: 'industrial', anomalyThreshold: 1200, lastReading: 55200, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2022-06-15T08:00:00.000Z' },
    { id: 'meter-004', meterCode: 'E-B06', utilityType: 'electricity', serialNumber: 'SN-EL-002', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', address: { zoneId: 'zone-kaveh', block: 'B', unit: '۶' }, unit: 'kWh', installationDate: '۱۴۰۱/۰۸/۲۰', tariffGroup: 'standard', anomalyThreshold: 2200, lastReading: 89300, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2022-11-20T08:00:00.000Z' },
    { id: 'meter-005', meterCode: 'W-B06', utilityType: 'water', serialNumber: 'SN-W-002', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', address: { zoneId: 'zone-kaveh', block: 'B', unit: '۶' }, unit: 'm³', installationDate: '۱۴۰۱/۰۸/۲۰', tariffGroup: 'standard', anomalyThreshold: 400, lastReading: 7800, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2022-11-20T08:00:00.000Z' },
    { id: 'meter-006', meterCode: 'E-F03', utilityType: 'electricity', serialNumber: 'SN-EL-003', companyId: 'comp-001', companyName: 'تجهیزات صنعتی آریا', address: { zoneId: 'zone-kaveh', block: 'F', unit: '۳' }, unit: 'kWh', installationDate: '۱۴۰۲/۰۱/۱۰', tariffGroup: 'standard', anomalyThreshold: 1800, lastReading: 41200, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2023-03-10T08:00:00.000Z' },
    { id: 'meter-007', meterCode: 'E-D08', utilityType: 'electricity', serialNumber: 'SN-EL-004', companyId: 'comp-005', companyName: 'الکترونیک پیشرو ایران', address: { zoneId: 'zone-kaveh', block: 'D', unit: '۸' }, unit: 'kWh', installationDate: '۱۴۰۲/۰۶/۰۵', tariffGroup: 'standard', anomalyThreshold: 2500, lastReading: 62100, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'active', createdAt: '2023-08-05T08:00:00.000Z' },
    { id: 'meter-008', meterCode: 'E-G05', utilityType: 'electricity', serialNumber: 'SN-EL-005', companyId: 'comp-007', companyName: 'نساجی گلستان بافت', address: { zoneId: 'zone-kaveh', block: 'G', unit: '۵' }, unit: 'kWh', installationDate: '۱۴۰۲/۰۳/۲۰', tariffGroup: 'standard', anomalyThreshold: 1500, lastReading: 31800, lastReadingDate: '۱۴۰۳/۰۵/۰۱', status: 'maintenance', createdAt: '2023-06-20T08:00:00.000Z' },
];

const SEED_READINGS: MeterReading[] = [
    { id: 'reading-001', meterId: 'meter-001', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 248500, previousValue: 244100, consumption: 4400, source: 'iot', recordedBy: 'سامانه IoT', approvalStatus: 'approved', createdAt: '2024-07-22T08:00:00.000Z' },
    { id: 'reading-002', meterId: 'meter-002', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 18900, previousValue: 18200, consumption: 700, source: 'iot', recordedBy: 'سامانه IoT', approvalStatus: 'approved', createdAt: '2024-07-22T08:00:00.000Z' },
    { id: 'reading-003', meterId: 'meter-003', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 55200, previousValue: 54010, consumption: 1190, source: 'iot', recordedBy: 'سامانه IoT', approvalStatus: 'approved', createdAt: '2024-07-22T08:00:00.000Z' },
    { id: 'reading-004', meterId: 'meter-004', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 89300, previousValue: 87100, consumption: 2200, source: 'manual', recordedBy: 'اپراتور Utility', approvalStatus: 'approved', createdAt: '2024-07-22T08:00:00.000Z' },
    { id: 'reading-005', meterId: 'meter-005', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 7800, previousValue: 7380, consumption: 420, source: 'manual', recordedBy: 'اپراتور Utility', approvalStatus: 'pending', createdAt: '2024-07-22T08:00:00.000Z' },
    { id: 'reading-006', meterId: 'meter-006', readingDate: '۱۴۰۳/۰۵/۰۱', currentValue: 41200, previousValue: 39600, consumption: 1600, source: 'manual', recordedBy: 'اپراتور Utility', approvalStatus: 'approved', createdAt: '2024-07-22T08:00:00.000Z' },
];

const SEED_TARIFFS: UtilityTariff[] = [
    { id: 'tariff-001', utilityType: 'electricity', tariffGroup: 'industrial', tariffName: 'برق صنعتی', baseRate: 850, taxPercent: 9, effectiveFrom: '۱۴۰۳/۰۱/۰۱', isActive: true },
    { id: 'tariff-002', utilityType: 'electricity', tariffGroup: 'standard', tariffName: 'برق استاندارد', baseRate: 620, taxPercent: 9, effectiveFrom: '۱۴۰۳/۰۱/۰۱', isActive: true },
    { id: 'tariff-003', utilityType: 'water', tariffGroup: 'standard', tariffName: 'آب صنعتی', baseRate: 4200, taxPercent: 0, effectiveFrom: '۱۴۰۳/۰۱/۰۱', isActive: true },
    { id: 'tariff-004', utilityType: 'gas', tariffGroup: 'industrial', tariffName: 'گاز صنعتی', baseRate: 1800, taxPercent: 9, effectiveFrom: '۱۴۰۳/۰۱/۰۱', isActive: true },
];

const SEED_INVOICES: UtilityInvoice[] = [
    { id: 'inv-001', invoiceNumber: 'UTL-۱۴۰۳-۰۰۱', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', meterId: 'meter-001', utilityType: 'electricity', billingPeriodFrom: '۱۴۰۳/۰۴/۰۱', billingPeriodTo: '۱۴۰۳/۰۴/۳۱', consumption: 4400, unit: 'kWh', baseAmount: 3740000, taxAmount: 336600, penaltyAmount: 0, discountAmount: 0, totalAmount: 4076600, dueDate: '۱۴۰۳/۰۵/۱۰', paymentStatus: 'paid', issuedAt: '2024-07-01T08:00:00.000Z', issuedBy: 'سامانه صدور', paidAt: '2024-07-05T08:00:00.000Z' },
    { id: 'inv-002', invoiceNumber: 'UTL-۱۴۰۳-۰۰۲', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', meterId: 'meter-004', utilityType: 'electricity', billingPeriodFrom: '۱۴۰۳/۰۴/۰۱', billingPeriodTo: '۱۴۰۳/۰۴/۳۱', consumption: 2200, unit: 'kWh', baseAmount: 1364000, taxAmount: 122760, penaltyAmount: 0, discountAmount: 0, totalAmount: 1486760, dueDate: '۱۴۰۳/۰۵/۱۰', paymentStatus: 'overdue', issuedAt: '2024-07-01T08:00:00.000Z', issuedBy: 'سامانه صدور' },
    { id: 'inv-003', invoiceNumber: 'UTL-۱۴۰۳-۰۰۳', companyId: 'comp-001', companyName: 'تجهیزات صنعتی آریا', meterId: 'meter-006', utilityType: 'electricity', billingPeriodFrom: '۱۴۰۳/۰۴/۰۱', billingPeriodTo: '۱۴۰۳/۰۴/۳۱', consumption: 1600, unit: 'kWh', baseAmount: 992000, taxAmount: 89280, penaltyAmount: 0, discountAmount: 0, totalAmount: 1081280, dueDate: '۱۴۰۳/۰۵/۱۰', paymentStatus: 'issued', issuedAt: '2024-07-01T08:00:00.000Z', issuedBy: 'سامانه صدور' },
    { id: 'inv-004', invoiceNumber: 'UTL-۱۴۰۳-۰۰۴', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', meterId: 'meter-002', utilityType: 'water', billingPeriodFrom: '۱۴۰۳/۰۴/۰۱', billingPeriodTo: '۱۴۰۳/۰۴/۳۱', consumption: 700, unit: 'm³', baseAmount: 2940000, taxAmount: 0, penaltyAmount: 0, discountAmount: 0, totalAmount: 2940000, dueDate: '۱۴۰۳/۰۵/۱۰', paymentStatus: 'paid', issuedAt: '2024-07-01T08:00:00.000Z', issuedBy: 'سامانه صدور', paidAt: '2024-07-08T08:00:00.000Z' },
];

interface UtilityState {
    meters: UtilityMeter[];
    readings: MeterReading[];
    tariffs: UtilityTariff[];
    invoices: UtilityInvoice[];
    glMapping: UtilityGLMapping;
    updateGLMapping: (updates: Partial<UtilityGLMapping>) => void;
    addMeter: (meter: Omit<UtilityMeter, 'id' | 'createdAt'>) => string;
    updateMeter: (id: string, updates: Partial<UtilityMeter>) => void;
    deleteMeter: (id: string) => void;
    addReading: (reading: Omit<MeterReading, 'id' | 'consumption' | 'createdAt'>) => { consumption: number; isAnomaly: boolean };
    updateReadingStatus: (id: string, status: MeterReading['approvalStatus'], note?: string) => void;
    addTariff: (tariff: Omit<UtilityTariff, 'id'>) => void;
    updateTariff: (id: string, updates: Partial<UtilityTariff>) => void;
    addInvoice: (invoice: Omit<UtilityInvoice, 'id'>) => string;
    generateInvoice: (meterId: string, periodFrom: string, periodTo: string) => string;
    updateInvoice: (id: string, updates: Partial<UtilityInvoice>) => void;
    markInvoicePaid: (id: string) => void;
    postInvoiceToFinance: (id: string) => string;
    getActiveTariff: (utilityType: string, tariffGroup: string) => UtilityTariff | undefined;
    getMeter: (id: string) => UtilityMeter | undefined;
    loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

export const useUtilityStore = create<UtilityState>()(
    persist(
        (set, get) => ({
            meters: SEED_METERS,
            readings: SEED_READINGS,
            tariffs: SEED_TARIFFS,
            invoices: SEED_INVOICES,

            // ── API Integration (COMP-004): Load from backend with seed fallback ──
            loadFromApi: async () => {
                try {
                    const result = await api.get<any[]>('/zones/utilities/meters');
                    if (Array.isArray(result) && result.length > 0) {
                        set({ meters: result as UtilityMeter[] });
                    }
                } catch (err) {
                    console.warn('Utility API unavailable, using seed data:', err);
                }
            },
            glMapping: {
                electricityRevenueAccountId: '',
                waterRevenueAccountId: '',
                gasRevenueAccountId: '',
                receivableAccountId: '',
                taxAccountId: '',
                penaltyAccountId: '',
                collectionBankAccountId: '',
            },
            updateGLMapping: (updates) => set((state) => ({ glMapping: { ...state.glMapping, ...updates } })),
            addMeter: (meter) => {
                const id = uid();
                set((state) => ({
                    meters: [{ ...meter, id, createdAt: new Date().toISOString() }, ...state.meters],
                }));
                return id;
            },
            updateMeter: (id, updates) =>
                set((state) => ({ meters: state.meters.map((m) => (m.id === id ? { ...m, ...updates } : m)) })),
            deleteMeter: (id) =>
                set((state) => ({ meters: state.meters.filter((m) => m.id !== id) })),
            addReading: (reading) => {
                const meter = get().meters.find((m) => m.id === reading.meterId);
                const consumption = Math.max(0, reading.currentValue - reading.previousValue);
                const isAnomaly = Boolean(meter && consumption > meter.anomalyThreshold);
                const id = uid();
                set((state) => ({
                    readings: [{ ...reading, id, consumption, createdAt: new Date().toISOString() }, ...state.readings],
                    meters: state.meters.map((m) =>
                        m.id === reading.meterId ? { ...m, lastReading: reading.currentValue, lastReadingDate: reading.readingDate } : m,
                    ),
                }));
                return { consumption, isAnomaly };
            },
            updateReadingStatus: (id, status, note) =>
                set((state) => ({
                    readings: state.readings.map((reading) =>
                        reading.id === id
                            ? { ...reading, approvalStatus: status, notes: note ?? reading.notes }
                            : reading,
                    ),
                })),
            addTariff: (tariff) =>
                set((state) => ({ tariffs: [{ ...tariff, id: uid() }, ...state.tariffs] })),
            updateTariff: (id, updates) =>
                set((state) => ({ tariffs: state.tariffs.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
            addInvoice: (invoice) => {
                const id = uid();
                set((state) => ({ invoices: [{ ...invoice, id }, ...state.invoices] }));
                return id;
            },
            generateInvoice: (meterId, periodFrom, periodTo) => {
                const meter = get().meters.find((item) => item.id === meterId);
                const reading = get().readings.find((item) => item.meterId === meterId && item.approvalStatus === 'approved');
                const tariff = meter ? get().getActiveTariff(meter.utilityType, meter.tariffGroup) : undefined;
                if (!meter || !reading || !tariff) throw new Error('برای صدور قبض، کنتور، قرائت تأییدشده و تعرفه فعال لازم است.');
                const peakConsumption = reading.peakConsumption ?? 0;
                const offPeakConsumption = reading.offPeakConsumption ?? 0;
                const baseConsumption = Math.max(0, reading.consumption - peakConsumption - offPeakConsumption);
                const baseAmount =
                    (baseConsumption * tariff.baseRate) +
                    (peakConsumption * (tariff.peakRate || tariff.baseRate)) +
                    (offPeakConsumption * (tariff.offPeakRate || tariff.baseRate));
                const taxAmount = Math.round(baseAmount * (tariff.taxPercent / 100));
                const id = uid();
                const invoice: UtilityInvoice = {
                    id,
                    invoiceNumber: `UTL-۱۴۰۳-${String(get().invoices.length + 1).padStart(3, '۰')}`,
                    companyId: meter.companyId,
                    companyName: meter.companyName,
                    meterId,
                    utilityType: meter.utilityType,
                    billingPeriodFrom: periodFrom,
                    billingPeriodTo: periodTo,
                    consumption: reading.consumption,
                    unit: meter.unit,
                    baseAmount,
                    taxAmount,
                    penaltyAmount: 0,
                    discountAmount: 0,
                    totalAmount: baseAmount + taxAmount,
                    dueDate: '۱۴۰۳/۰۵/۱۵',
                    paymentStatus: 'issued',
                    issuedAt: new Date().toISOString(),
                    issuedBy: 'مدیر شهرک',
                };
                set((state) => ({ invoices: [invoice, ...state.invoices] }));
                return id;
            },
            updateInvoice: (id, updates) =>
                set((state) => ({ invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
            markInvoicePaid: (id) =>
                set((state) => ({
                    invoices: state.invoices.map((invoice) =>
                        invoice.id === id
                            ? { ...invoice, paymentStatus: 'paid', paidAt: new Date().toISOString() }
                            : invoice,
                    ),
                })),
            postInvoiceToFinance: (invoiceId) => {
                const invoice = get().invoices.find((item) => item.id === invoiceId);
                const mapping = get().glMapping;
                if (!invoice) throw new Error('صورتحساب یافت نشد.');
                if (invoice.journalVoucherId) return invoice.journalVoucherId;

                const revenueId = invoice.utilityType === 'electricity'
                    ? mapping.electricityRevenueAccountId
                    : invoice.utilityType === 'water'
                        ? mapping.waterRevenueAccountId
                        : mapping.gasRevenueAccountId;

                if (!mapping.receivableAccountId || !revenueId || !mapping.taxAccountId) {
                    throw new Error('Mapping حساب‌های مالی Utility کامل نیست.');
                }

                const finance = useFinanceStore.getState();
                const receivable = finance.accounts.find((account) => account.id === mapping.receivableAccountId);
                const revenue = finance.accounts.find((account) => account.id === revenueId);
                const tax = finance.accounts.find((account) => account.id === mapping.taxAccountId);
                const entries = [
                    { id: `je-${invoice.id}-dr`, voucherId: '', accountId: mapping.receivableAccountId, accountCode: receivable?.code ?? '', description: `دریافتنی قبض ${invoice.invoiceNumber}`, debit: invoice.totalAmount, credit: 0, currency: 'IRR' as const, exchangeRate: 1, debitBaseCurrency: invoice.totalAmount, creditBaseCurrency: 0, sourceModule: 'manual' as const },
                    { id: `je-${invoice.id}-rev`, voucherId: '', accountId: revenueId, accountCode: revenue?.code ?? '', description: `درآمد Utility قبض ${invoice.invoiceNumber}`, debit: 0, credit: invoice.baseAmount + invoice.penaltyAmount - invoice.discountAmount, currency: 'IRR' as const, exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: invoice.baseAmount + invoice.penaltyAmount - invoice.discountAmount, sourceModule: 'manual' as const },
                    { id: `je-${invoice.id}-tax`, voucherId: '', accountId: mapping.taxAccountId, accountCode: tax?.code ?? '', description: `مالیات قبض ${invoice.invoiceNumber}`, debit: 0, credit: invoice.taxAmount, currency: 'IRR' as const, exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: invoice.taxAmount, sourceModule: 'manual' as const },
                ];
                const voucher = finance.createVoucher({ description: `صدور صورتحساب Utility ${invoice.invoiceNumber}`, referenceType: 'manual', referenceId: invoice.id, entries, status: 'draft' });
                finance.postVoucher(voucher.id);
                set((state) => ({ invoices: state.invoices.map((item) => item.id === invoiceId ? { ...item, journalVoucherId: voucher.id } : item) }));
                return voucher.id;
            },
            getActiveTariff: (utilityType, tariffGroup) =>
                get().tariffs.find((t) => t.utilityType === utilityType && t.tariffGroup === tariffGroup && t.isActive),
            getMeter: (id) => get().meters.find((m) => m.id === id),
        }),
        { name: 'zone-utility-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
