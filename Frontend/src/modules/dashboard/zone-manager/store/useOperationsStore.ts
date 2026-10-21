import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandLocalStorage } from '@/shared/lib/persist';
import type { OperationalAlert, OperationsTask } from '../types';
import { api } from '@/shared/api/client';

const uid = () => `ops-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SEED_ALERTS: OperationalAlert[] = [
    { id: 'alert-001', alertNumber: 'ALT-۱۴۰۳-۰۰۱', type: 'utility', severity: 'high', title: 'مصرف غیرعادی آب بلوک B', description: 'مصرف آب کنتور W-B06 ۳۵٪ بالاتر از میانگین ماهانه است. احتمال نشت وجود دارد.', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', zone: 'بلوک B', owner: 'تیم تأسیسات', team: 'تیم تأسیسات', status: 'open', dueDate: '۱۴۰۳/۰۵/۰۳', escalationLevel: 1, createdAt: '2024-07-22T08:30:00.000Z', notes: [] },
    { id: 'alert-002', alertNumber: 'ALT-۱۴۰۳-۰۰۲', type: 'device', severity: 'medium', title: 'دوربین ورودی جنوبی آفلاین', description: 'دوربین CAM-S04 بیش از ۴۵ دقیقه ارتباط ندارد. ممکن است خرابی سخت‌افزاری باشد.', zone: 'ورودی جنوبی', owner: 'تیم IoT', team: 'تیم IoT', status: 'investigating', escalationLevel: 1, createdAt: '2024-07-22T11:00:00.000Z', notes: [{ text: 'تیم IoT برای بررسی فیزیکی اعزام شد.', by: 'احمد کریمی', at: '۱۴۰۳/۰۵/۰۱ ۱۱:۳۰' }] },
    { id: 'alert-003', alertNumber: 'ALT-۱۴۰۳-۰۰۳', type: 'finance', severity: 'high', title: 'صورتحساب معوق پلاستیک ایران', description: 'صورتحساب ماه تیر ۱۴۰۳ به مبلغ ۱,۴۸۶,۷۶۰ ریال پس از تاریخ سررسید پرداخت نشده است.', companyId: 'comp-003', companyName: 'پلاستیک ایران نوین', owner: 'تیم مالی', team: 'مالی', status: 'open', escalationLevel: 1, createdAt: '2024-07-15T08:00:00.000Z', notes: [] },
    { id: 'alert-004', alertNumber: 'ALT-۱۴۰۳-۰۰۴', type: 'hse', severity: 'critical', title: 'ریزش مواد شیمیایی - پتروشیمی پارس', description: 'ریزش حلال آلی در انبار بلوک C. تیم اورژانس اعزام شد. قرنطینه منطقه اجرایی است.', companyId: 'comp-004', companyName: 'پتروشیمی پارس البرز', zone: 'بلوک C', owner: 'مسئول HSE', team: 'HSE', status: 'investigating', escalationLevel: 2, createdAt: '2024-07-22T14:20:00.000Z', notes: [{ text: 'تیم HSE در محل حاضر است. تخلیه انجام شد.', by: 'فاطمه حسینی', at: '۱۴۰۳/۰۵/۰۱ ۱۴:۳۵' }, { text: 'منطقه قرنطینه شد. خنثی‌سازی در حال انجام است.', by: 'احمد کریمی', at: '۱۴۰۳/۰۵/۰۱ ۱۵:۰۰' }] },
    { id: 'alert-005', alertNumber: 'ALT-۱۴۰۳-۰۰۵', type: 'contract', severity: 'medium', title: 'قرارداد نساجی گلستان در آستانه انقضا', description: 'قرارداد اجاره شماره LC-۱۴۰۲-۰۰۵ تا ۳۵ روز دیگر منقضی می‌شود. تمدید لازم است.', companyId: 'comp-007', companyName: 'نساجی گلستان بافت', owner: 'تیم قراردادها', team: 'مالی', status: 'open', escalationLevel: 0, createdAt: '2024-07-20T08:00:00.000Z', notes: [] },
    { id: 'alert-006', alertNumber: 'ALT-۱۴۰۳-۰۰۶', type: 'security', severity: 'medium', title: 'ورود غیرمجاز - دروازه شرقی', description: 'سیستم RFID وسیله نقلیه با پلاک ناشناس در دروازه شرقی را شناسایی کرد.', zone: 'دروازه شرقی', owner: 'تیم امنیت', team: 'امنیت', status: 'resolved', resolvedAt: '2024-07-22T10:15:00.000Z', escalationLevel: 0, createdAt: '2024-07-22T09:45:00.000Z', notes: [] },
];

const SEED_TASKS: OperationsTask[] = [
    { id: 'task-001', taskNumber: 'TSK-۰۰۱', title: 'بررسی نشت آب کنتور W-B06', alertId: 'alert-001', taskType: 'inspection', priority: 'high', assignedTeam: 'تیم تأسیسات', assignedUser: 'حسین کاظمی', status: 'in_progress', startDate: '۱۴۰۳/۰۵/۰۱', dueDate: '۱۴۰۳/۰۵/۰۳', checklist: [{ id: 'cl-1', text: 'بررسی فیزیکی لوله‌ها', completed: true, completedAt: '۱۴۰۳/۰۵/۰۱', completedBy: 'حسین کاظمی' }, { id: 'cl-2', text: 'آزمایش فشار خط', completed: false }, { id: 'cl-3', text: 'ارائه گزارش یافته‌ها', completed: false }], notes: [], createdAt: '2024-07-22T09:00:00.000Z' },
    { id: 'task-002', taskNumber: 'TSK-۰۰۲', title: 'پیگیری پرداخت صورتحساب معوق', alertId: 'alert-003', taskType: 'follow_up', priority: 'high', assignedTeam: 'تیم مالی', assignedUser: 'سارا کریمی', status: 'pending', dueDate: '۱۴۰۳/۰۵/۰۵', checklist: [{ id: 'cl-4', text: 'ارسال اخطار رسمی', completed: false }, { id: 'cl-5', text: 'تماس با مدیر مالی شرکت', completed: false }], notes: [], createdAt: '2024-07-15T08:00:00.000Z' },
    { id: 'task-003', taskNumber: 'TSK-۰۰۳', title: 'بررسی و تعمیر دوربین CAM-S04', alertId: 'alert-002', taskType: 'maintenance', priority: 'medium', assignedTeam: 'تیم IoT', assignedUser: 'محمد رضاپور', status: 'in_progress', startDate: '۱۴۰۳/۰۵/۰۱', dueDate: '۱۴۰۳/۰۵/۰۲', checklist: [{ id: 'cl-6', text: 'بررسی اتصال شبکه', completed: true, completedAt: '۱۴۰۳/۰۵/۰۱ ۱۲:۰۰' }, { id: 'cl-7', text: 'بررسی منبع تغذیه', completed: false }], notes: [], createdAt: '2024-07-22T11:30:00.000Z' },
    { id: 'task-004', taskNumber: 'TSK-۰۰۴', title: 'مذاکره تمدید قرارداد نساجی گلستان', alertId: 'alert-005', taskType: 'contract', priority: 'medium', assignedTeam: 'تیم قراردادها', status: 'pending', dueDate: '۱۴۰۳/۰۶/۱۰', checklist: [{ id: 'cl-8', text: 'ارسال پیش‌نویس قرارداد', completed: false }, { id: 'cl-9', text: 'جلسه مذاکره', completed: false }, { id: 'cl-10', text: 'امضای قرارداد', completed: false }], notes: [], createdAt: '2024-07-20T08:30:00.000Z' },
];

interface OperationsState {
    alerts: OperationalAlert[];
    tasks: OperationsTask[];
    addAlert: (alert: Omit<OperationalAlert, 'id' | 'alertNumber' | 'createdAt' | 'escalationLevel' | 'notes'>) => string;
    updateAlert: (id: string, updates: Partial<OperationalAlert>) => void;
    addNoteToAlert: (alertId: string, note: { text: string; by: string; at: string }) => void;
    addTask: (task: Omit<OperationsTask, 'id' | 'taskNumber' | 'createdAt' | 'notes'>) => string;
    updateTask: (id: string, updates: Partial<OperationsTask>) => void;
    toggleChecklistItem: (taskId: string, itemId: string, by: string) => void;
    loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

let alertCounter = 7;
let taskCounter = 5;

export const useOperationsStore = create<OperationsState>()(
    persist(
        (set) => ({
            alerts: SEED_ALERTS,
            tasks: SEED_TASKS,

            // ── API Integration (COMP-004): Load from backend with seed fallback ──
            loadFromApi: async () => {
                try {
                    const result = await api.get<any[]>('/zones/operations/alerts');
                    if (Array.isArray(result) && result.length > 0) {
                        set({ alerts: result as OperationalAlert[] });
                    }
                } catch (err) {
                    console.warn('Operations API unavailable, using seed data:', err);
                }
            },
            addAlert: (alert) => {
                const id = uid();
                const n = String(alertCounter++).padStart(3, '0');
                set((s) => ({
                    alerts: [{ ...alert, id, alertNumber: `ALT-۱۴۰۳-۰${n}`, escalationLevel: 0, notes: [], createdAt: new Date().toISOString() }, ...s.alerts],
                }));
                return id;
            },
            updateAlert: (id, updates) =>
                set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
            addNoteToAlert: (alertId, note) =>
                set((s) => ({
                    alerts: s.alerts.map((a) =>
                        a.id === alertId ? { ...a, notes: [...a.notes, note] } : a,
                    ),
                })),
            addTask: (task) => {
                const id = uid();
                const n = String(taskCounter++).padStart(3, '0');
                set((s) => ({
                    tasks: [{ ...task, id, taskNumber: `TSK-۰${n}`, notes: [], createdAt: new Date().toISOString() }, ...s.tasks],
                }));
                return id;
            },
            updateTask: (id, updates) =>
                set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
            toggleChecklistItem: (taskId, itemId, by) =>
                set((s) => ({
                    tasks: s.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                checklist: t.checklist.map((item) =>
                                    item.id === itemId
                                        ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined, completedBy: !item.completed ? by : undefined }
                                        : item,
                                ),
                            }
                            : t,
                    ),
                })),
        }),
        { name: 'zone-operations-store-v2', storage: createJSONStorage(() => zustandLocalStorage) },
    ),
);
