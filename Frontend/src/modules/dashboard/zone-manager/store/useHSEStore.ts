import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { Risk, Incident, PermitToWork, CAPA, Inspection, EmergencyDrill, HazmatMaterial } from '../types';
import { api } from '@/shared/api/client';

const uid = () => `hse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SEED_RISKS: Risk[] = [
    { id: 'risk-001', riskNumber: 'RSK-۰۰۱', category: 'chemical', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', location: 'انبار مواد شیمیایی بلوک C', hazard: 'نگهداری حلال‌های قابل اشتعال در مجاورت منبع حرارت', likelihood: 4, impact: 5, riskScore: 20, existingControls: 'نصب سیستم اطفاء حریق، تابلوی هشدار', mitigationAction: 'نصب سنسور دمای اضافی، آموزش اضطراری کارکنان', owner: 'مسئول HSE', dueDate: '۱۴۰۳/۰۶/۱۵', status: 'mitigating', severity: 'critical', createdAt: '2024-06-01T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'risk-002', riskNumber: 'RSK-۰۰۲', category: 'safety', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', location: 'خط تولید فولاد - بلوک A', hazard: 'تردد کارکنان بدون تجهیزات حفاظت فردی در منطقه عملیاتی', likelihood: 3, impact: 4, riskScore: 12, existingControls: 'آموزش دوره‌ای، تابلوی اخطار', mitigationAction: 'نصب دوربین نظارتی، سیستم قفل هوشمند', owner: 'مدیر ایمنی', dueDate: '۱۴۰۳/۰۷/۰۱', status: 'identified', severity: 'high', createdAt: '2024-06-15T08:00:00.000Z', updatedAt: '2024-06-15T08:00:00.000Z' },
    { id: 'risk-003', riskNumber: 'RSK-۰۰۳', category: 'environment', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', location: 'ایستگاه تصفیه فاضلاب بلوک B', hazard: 'آلودگی فاضلاب صنعتی بالاتر از حد استاندارد', likelihood: 3, impact: 3, riskScore: 9, existingControls: 'فیلتر اولیه، آزمایش ماهانه', mitigationAction: 'نصب سیستم تصفیه پیشرفته', owner: 'مسئول محیط زیست', dueDate: '۱۴۰۳/۰۸/۰۱', status: 'assessed', severity: 'medium', createdAt: '2024-07-01T08:00:00.000Z', updatedAt: '2024-07-01T08:00:00.000Z' },
    { id: 'risk-004', riskNumber: 'RSK-۰۰۴', category: 'mechanical', companyId: 'comp-009', companyName: 'ماشین‌سازی الوند صنعت', location: 'سالن تراشکاری - بلوک A', hazard: 'احتمال شکستن تیغه‌های دوار در سرعت بالا', likelihood: 2, impact: 5, riskScore: 10, existingControls: 'بازرسی دوره‌ای هفتگی، عایق‌بندی', mitigationAction: 'برنامه نگهداری پیشگیرانه هوشمند', owner: 'مهندس نگهداری', dueDate: '۱۴۰۳/۰۶/۳۰', status: 'controlled', severity: 'high', createdAt: '2024-05-10T08:00:00.000Z', updatedAt: '2024-06-01T08:00:00.000Z' },
    { id: 'risk-005', riskNumber: 'RSK-۰۰۵', category: 'fire', companyId: 'comp-001', companyName: 'تجهیزات صنعتی آریا', location: 'انبار محصولات - بلوک F', hazard: 'انبارش بی‌رویه مواد قابل اشتعال', likelihood: 2, impact: 4, riskScore: 8, existingControls: 'کپسول آتش‌نشانی، تابلو', owner: 'مسئول انبار', status: 'identified', severity: 'medium', createdAt: '2024-07-10T08:00:00.000Z', updatedAt: '2024-07-10T08:00:00.000Z' },
];

const SEED_INCIDENTS: Incident[] = [
    { id: 'inc-001', incidentNumber: 'INC-۱۴۰۳-۰۰۱', type: 'near_miss', severity: 'moderate', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', location: 'خط تولید - بلوک A', dateTime: '۱۴۰۳/۰۴/۱۵ ۱۰:۳۰', reporter: 'حسین علوی', description: 'اپراتور بدون کلاه ایمنی وارد منطقه عملیاتی شد، اخطار داده شد.', immediateAction: 'خروج فوری، صدور اخطار کتبی', humanInjury: false, status: 'closed', owner: 'مدیر ایمنی', attachments: [], createdAt: '2024-07-05T10:30:00.000Z' },
    { id: 'inc-002', incidentNumber: 'INC-۱۴۰۳-۰۰۲', type: 'chemical_spill', severity: 'serious', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', location: 'انبار مواد شیمیایی', dateTime: '۱۴۰۳/۰۵/۰۲ ۱۴:۲۰', reporter: 'فاطمه حسینی', description: 'ریزش حدود ۱۵ لیتر حلال آلی در انبار بلوک C. تخلیه اضطراری انجام شد.', immediateAction: 'تخلیه انبار، نصب نوار قرنطینه، خنثی‌سازی با ماسه', rootCause: 'خوردگی اتصالات مخزن قدیمی', humanInjury: false, financialLoss: 15000000, capaId: 'capa-001', status: 'corrective_action', owner: 'مسئول HSE', attachments: [], createdAt: '2024-07-22T14:20:00.000Z' },
    { id: 'inc-003', incidentNumber: 'INC-۱۴۰۳-۰۰۳', type: 'injury', severity: 'minor', companyId: 'comp-009', companyName: 'ماشین‌سازی الوند صنعت', location: 'سالن تراشکاری', dateTime: '۱۴۰۳/۰۵/۱۰ ۰۹:۱۵', reporter: 'امیرحسین رحیمی', description: 'بریدگی خفیف کف دست کارگر در حین نصب قطعه. کمک‌های اولیه انجام شد.', immediateAction: 'پانسمان، ارجاع به بهداری', humanInjury: true, injuryDetails: 'بریدگی خفیف کف دست چپ - درجه ۱', status: 'investigating', owner: 'مسئول ایمنی', attachments: [], createdAt: '2024-07-30T09:15:00.000Z' },
];

const SEED_PTWS: PermitToWork[] = [
    { id: 'ptw-001', ptwNumber: 'PTW-۱۴۰۳-۰۰۱', workType: 'hot_work', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', location: 'محوطه جوشکاری بلوک A', requester: 'مهندس رضوی', supervisor: 'علی محمدی', startDate: '۱۴۰۳/۰۵/۲۰', endDate: '۱۴۰۳/۰۵/۲۲', riskAssessment: 'ارزیابی انجام شده - خطر متوسط', ppeRequirements: ['ماسک جوشکاری', 'دستکش مقاوم حرارتی', 'کفش ایمنی'], safetyChecklist: [{ item: 'بررسی عدم حضور مواد قابل اشتعال', checked: true }, { item: 'آماده بودن وسایل اطفاء حریق', checked: true }, { item: 'نظارت مستمر آتشبان', checked: false }], lotoRequired: false, gasTestRequired: false, fireWatchRequired: true, fireWatchPerson: 'حسن امیری', hseApproval: { approved: true, by: 'مسئول HSE', at: '۱۴۰۳/۰۵/۱۹', note: 'تأیید مشروط به حضور آتشبان' }, status: 'approved', createdAt: '2024-08-08T08:00:00.000Z' },
    { id: 'ptw-002', ptwNumber: 'PTW-۱۴۰۳-۰۰۲', workType: 'confined_space', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', location: 'مخزن ذخیره مواد اولیه', requester: 'محمد کاظمی', supervisor: 'مریم رضایی', startDate: '۱۴۰۳/۰۵/۲۵', endDate: '۱۴۰۳/۰۵/۲۵', ppeRequirements: ['ماسک ایزوله تنفسی', 'طناب نجات', 'چراغ ایمن ضدانفجار'], safetyChecklist: [{ item: 'آزمایش گاز انجام شده', checked: false }, { item: 'خروج مطمئن تعریف شده', checked: true }], lotoRequired: true, gasTestRequired: true, fireWatchRequired: false, status: 'hse_review', createdAt: '2024-08-12T08:00:00.000Z' },
];

const SEED_CAPAS: CAPA[] = [
    { id: 'capa-001', capaNumber: 'CAPA-۱۴۰۳-۰۰۱', source: 'incident', sourceId: 'inc-002', sourceRef: 'INC-۱۴۰۳-۰۰۲', correctiveAction: 'تعویض فوری تمام اتصالات قدیمی مخازن حلال', preventiveAction: 'برنامه بازرسی دوره‌ای ۳ ماهه برای تمام مخازن شیمیایی', owner: 'مهندس نگهداری', dueDate: '۱۴۰۳/۰۶/۰۱', status: 'in_progress', createdAt: '2024-07-22T16:00:00.000Z', updatedAt: '2024-07-22T16:00:00.000Z' },
    { id: 'capa-002', capaNumber: 'CAPA-۱۴۰۳-۰۰۲', source: 'risk', sourceId: 'risk-002', sourceRef: 'RSK-۰۰۲', correctiveAction: 'نصب سیستم قفل الکترونیکی ورود به منطقه عملیاتی', preventiveAction: 'آموزش ماهانه کارکنان درباره الزامات PPE', owner: 'مدیر ایمنی', dueDate: '۱۴۰۳/۰۷/۱۵', status: 'open', createdAt: '2024-07-01T08:00:00.000Z', updatedAt: '2024-07-01T08:00:00.000Z' },
];

const SEED_INSPECTIONS: Inspection[] = [
    { id: 'insp-001', title: 'بازرسی دوره‌ای HSE فولاد کاوه', type: 'hse_compliance', companyId: 'comp-002', companyName: 'فولاد آلیاژی کاوه', inspector: 'حسین کاظمی', scheduledDate: '۱۴۰۳/۰۵/۲۸', completedDate: '۱۴۰۳/۰۵/۲۸', findings: [{ item: 'تجهیزات PPE کارکنان', result: 'pass' }, { item: 'طراحی مسیر خروج اضطراری', result: 'fail', note: 'تابلوی خروج اضطراری محو شده' }, { item: 'کپسول آتش‌نشانی', result: 'pass' }], overallResult: 'conditional', severity: 'medium', reinspectionRequired: true, reinspectionDate: '۱۴۰۳/۰۶/۱۵', status: 'completed', createdAt: '2024-07-15T08:00:00.000Z' },
    { id: 'insp-002', title: 'بازرسی آتش‌نشانی پتروشیمی پارس', type: 'fire', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', inspector: 'رضا فرهانی', scheduledDate: '۱۴۰۳/۰۶/۰۵', findings: [], reinspectionRequired: false, status: 'scheduled', createdAt: '2024-07-20T08:00:00.000Z' },
];

const SEED_DRILLS: EmergencyDrill[] = [
    { id: 'drill-001', title: 'مانور آتش‌سوزی شهرک صنعتی کاوه - فصل تابستان', scenario: 'آتش‌سوزی ناشی از اتصال برقی در انبار بلوک C', type: 'fire', zoneId: 'zone-kaveh', date: '۱۴۰۳/۰۵/۱۵', participants: 120, durationMinutes: 45, result: 'تخلیه کامل ظرف ۳ دقیقه و ۴۵ ثانیه', improvementActions: ['افزایش تعداد تمرینات سالانه به ۴ بار', 'رفع اشکال در سیستم آژیر بلوک D'], drillScore: 82, status: 'completed', createdAt: '2024-07-15T08:00:00.000Z' },
];

const SEED_HAZMAT: HazmatMaterial[] = [
    { id: 'hazmat-001', materialName: 'تولوئن (حلال آلی)', unClass: 'UN1294', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', location: 'انبار شیمیایی بلوک C - قفسه R3', maxStorageLimit: 500, currentQuantity: 340, unit: 'لیتر', emergencyProcedure: 'MSDS-PTW-001 - در صورت نشت، تخلیه ۵۰ متری، اطلاع به HSE', status: 'active', createdAt: '2024-06-01T08:00:00.000Z' },
    { id: 'hazmat-002', materialName: 'سودکاستیک محلول ۵۰٪', unClass: 'UN1824', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', location: 'انبار مواد اولیه بلوک B', maxStorageLimit: 1000, currentQuantity: 420, unit: 'کیلوگرم', emergencyProcedure: 'استفاده از لباس ضدشیمیایی، آبکشی فوری', status: 'active', createdAt: '2024-06-10T08:00:00.000Z' },
    { id: 'hazmat-003', materialName: 'اسید کلریدریک ۳۵٪', unClass: 'UN1789', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', location: 'انبار شیمیایی بلوک C - قفسه R7', maxStorageLimit: 200, currentQuantity: 215, unit: 'لیتر', emergencyProcedure: 'تخلیه فوری، خنثی‌سازی با آهک', status: 'quarantine', createdAt: '2024-07-01T08:00:00.000Z' },
];

interface HSEState {
    risks: Risk[];
    incidents: Incident[];
    permits: PermitToWork[];
    capas: CAPA[];
    inspections: Inspection[];
    drills: EmergencyDrill[];
    hazmat: HazmatMaterial[];
    addRisk: (risk: Omit<Risk, 'id' | 'riskNumber' | 'riskScore' | 'createdAt' | 'updatedAt'>) => string;
    updateRisk: (id: string, updates: Partial<Risk>) => void;
    addIncident: (incident: Omit<Incident, 'id' | 'incidentNumber' | 'createdAt'>) => string;
    updateIncident: (id: string, updates: Partial<Incident>) => void;
    addPermit: (permit: Omit<PermitToWork, 'id' | 'ptwNumber' | 'createdAt'>) => string;
    updatePermit: (id: string, updates: Partial<PermitToWork>) => void;
    addCAPA: (capa: Omit<CAPA, 'id' | 'capaNumber' | 'createdAt' | 'updatedAt'>) => string;
    updateCAPA: (id: string, updates: Partial<CAPA>) => void;
    addInspection: (insp: Omit<Inspection, 'id' | 'createdAt'>) => string;
    updateInspection: (id: string, updates: Partial<Inspection>) => void;
    addDrill: (drill: Omit<EmergencyDrill, 'id' | 'createdAt'>) => string;
    addHazmat: (haz: Omit<HazmatMaterial, 'id' | 'createdAt'>) => string;
    updateHazmat: (id: string, updates: Partial<HazmatMaterial>) => void;
    loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

let riskCounter = 6;
let incCounter = 4;
let ptwCounter = 3;
let capaCounter = 3;
let inspCounter = 3;
let drillCounter = 2;
let hazCounter = 4;

export const useHSEStore = create<HSEState>()(
    persist(
        (set) => ({
            risks: SEED_RISKS,
            incidents: SEED_INCIDENTS,
            permits: SEED_PTWS,
            capas: SEED_CAPAS,
            inspections: SEED_INSPECTIONS,
            drills: SEED_DRILLS,

            // ── API Integration (COMP-004): Load from backend with seed fallback ──
            loadFromApi: async () => {
                try {
                    const [risksResult, incidentsResult] = await Promise.allSettled([
                        api.get<any[]>('/hse/risks'),
                        api.get<any[]>('/hse/incidents'),
                    ]);
                    const updates: Partial<HSEState> = {};
                    if (risksResult.status === 'fulfilled' && Array.isArray(risksResult.value) && risksResult.value.length > 0) {
                        updates.risks = risksResult.value as Risk[];
                    }
                    if (incidentsResult.status === 'fulfilled' && Array.isArray(incidentsResult.value) && incidentsResult.value.length > 0) {
                        updates.incidents = incidentsResult.value as Incident[];
                    }
                    set(updates as any);
                } catch (err) {
                    console.warn('HSE API unavailable, using seed data:', err);
                }
            },
            hazmat: SEED_HAZMAT,
            addRisk: (risk) => {
                const id = uid();
                const n = String(riskCounter++).padStart(3, '0');
                set((s) => ({
                    risks: [{ ...risk, id, riskNumber: `RSK-۰${n}`, riskScore: risk.likelihood * risk.impact, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...s.risks],
                }));
                return id;
            },
            updateRisk: (id, updates) =>
                set((s) => ({ risks: s.risks.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)) })),
            addIncident: (incident) => {
                const id = uid();
                const n = String(incCounter++).padStart(3, '0');
                set((s) => ({
                    incidents: [{ ...incident, id, incidentNumber: `INC-۱۴۰۳-۰${n}`, createdAt: new Date().toISOString() }, ...s.incidents],
                }));
                return id;
            },
            updateIncident: (id, updates) =>
                set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
            addPermit: (permit) => {
                const id = uid();
                const n = String(ptwCounter++).padStart(3, '0');
                set((s) => ({
                    permits: [{ ...permit, id, ptwNumber: `PTW-۱۴۰۳-۰${n}`, createdAt: new Date().toISOString() }, ...s.permits],
                }));
                return id;
            },
            updatePermit: (id, updates) =>
                set((s) => ({ permits: s.permits.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
            addCAPA: (capa) => {
                const id = uid();
                const n = String(capaCounter++).padStart(3, '0');
                set((s) => ({
                    capas: [{ ...capa, id, capaNumber: `CAPA-۱۴۰۳-۰${n}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...s.capas],
                }));
                return id;
            },
            updateCAPA: (id, updates) =>
                set((s) => ({ capas: s.capas.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)) })),
            addInspection: (insp) => {
                const id = uid();
                inspCounter++;
                set((s) => ({ inspections: [{ ...insp, id, createdAt: new Date().toISOString() }, ...s.inspections] }));
                return id;
            },
            updateInspection: (id, updates) =>
                set((s) => ({ inspections: s.inspections.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
            addDrill: (drill) => {
                const id = uid();
                drillCounter++;
                set((s) => ({ drills: [{ ...drill, id, createdAt: new Date().toISOString() }, ...s.drills] }));
                return id;
            },
            addHazmat: (haz) => {
                const id = uid();
                hazCounter++;
                set((s) => ({ hazmat: [{ ...haz, id, createdAt: new Date().toISOString() }, ...s.hazmat] }));
                return id;
            },
            updateHazmat: (id, updates) =>
                set((s) => ({ hazmat: s.hazmat.map((h) => (h.id === id ? { ...h, ...updates } : h)) })),
        }),
        { name: 'zone-hse-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
