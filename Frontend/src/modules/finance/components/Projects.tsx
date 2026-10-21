// src/modules/finance/components/Projects.tsx
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, FolderOpen, X, TrendingUp, AlertTriangle, CheckCircle, Clock, PauseCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinanceStore } from '../store/useFinanceStore';
import { JalaliDatePicker } from './JalaliDatePicker';
import { formatPersianNumber, toPersianDigits, isValidJalaliDateString, jalaliToday } from '../utils/persianUtils';
import type { Project } from '../types';

// ── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  code: z.string().min(1, 'کد پروژه الزامی است'),
  nameFa: z.string().min(3, 'نام پروژه حداقل ۳ کاراکتر است'),
  description: z.string().optional(),
  startDate: z.string().refine(isValidJalaliDateString, 'تاریخ شروع معتبر نیست'),
  endDate: z.string().refine(isValidJalaliDateString, 'تاریخ پایان معتبر نیست'),
  totalBudget: z.coerce.number().positive('بودجه باید بزرگ‌تر از صفر باشد'),
  costCenterId: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  projectType: z.enum(['construction', 'manufacturing', 'maintenance', 'it', 'other']),
  managerName: z.string().min(2, 'نام مدیر الزامی است'),
}).refine((d) => !d.endDate || !d.startDate || d.endDate >= d.startDate, {
  message: 'تاریخ پایان نمی‌تواند قبل از شروع باشد',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Project['status'], { label: string; icon: React.ElementType; tone: string }> = {
  planning:  { label: 'برنامه‌ریزی', icon: Clock,         tone: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  active:    { label: 'فعال',         icon: TrendingUp,    tone: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  on_hold:   { label: 'معلق',         icon: PauseCircle,   tone: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'تکمیل‌شده',   icon: CheckCircle,   tone: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  cancelled: { label: 'لغوشده',      icon: AlertTriangle, tone: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const TYPE_LABELS: Record<Project['projectType'], string> = {
  construction:  'ساختمانی',
  manufacturing: 'تولیدی',
  maintenance:   'نگهداری',
  it:            'فناوری اطلاعات',
  other:         'سایر',
};

// ── Seed data (used only when store is empty) ──────────────────────────────────
const SEED_PROJECTS: Omit<Project, 'id'>[] = [
  {
    code: 'PRJ-1403-001', name: 'Expansion Phase 2', nameFa: 'فاز توسعه کارخانه کرج',
    companyId: 'C-001', companyName: 'شرکت پلاستیک ایران', projectType: 'construction',
    startDate: '1403/01/01', endDate: '1403/12/29', status: 'active',
    totalBudget: 5_000_000_000, actualCost: 1_800_000_000,
    estimatedCostToComplete: 3_200_000_000, variance: 0, variancePercent: 0,
    wipAccountId: '', budgetLines: [],
    milestones: [
      { id: 'M-001', name: 'Foundation', nameFa: 'زیرسازی', dueDate: '1403/03/31', completedDate: '1403/03/28', status: 'completed', budgetAllocated: 1_500_000_000, actualSpent: 1_450_000_000 },
      { id: 'M-002', name: 'Structure',  nameFa: 'اسکلت',    dueDate: '1403/06/31', status: 'in_progress',       budgetAllocated: 2_000_000_000, actualSpent: 350_000_000 },
    ],
    managerId: 'U-001', managerName: 'احمد کریمی', completionPercent: 36,
    createdAt: '1403/01/01', updatedAt: jalaliToday(),
  },
  {
    code: 'PRJ-1403-002', name: 'ERP Implementation', nameFa: 'پیاده‌سازی سیستم یکپارچه ERP',
    companyId: 'C-001', companyName: 'شرکت پلاستیک ایران', projectType: 'it',
    startDate: '1403/02/01', endDate: '1403/11/30', status: 'active',
    totalBudget: 800_000_000, actualCost: 320_000_000,
    estimatedCostToComplete: 480_000_000, variance: 0, variancePercent: 0,
    wipAccountId: '', budgetLines: [],
    milestones: [
      { id: 'M-003', name: 'Analysis', nameFa: 'تحلیل نیازمندی', dueDate: '1403/03/31', completedDate: '1403/03/25', status: 'completed', budgetAllocated: 200_000_000, actualSpent: 180_000_000 },
      { id: 'M-004', name: 'Develop',  nameFa: 'توسعه',           dueDate: '1403/08/30', status: 'in_progress',       budgetAllocated: 400_000_000, actualSpent: 140_000_000 },
    ],
    managerId: 'U-002', managerName: 'مریم رضایی', completionPercent: 40,
    createdAt: '1403/02/01', updatedAt: jalaliToday(),
  },
  {
    code: 'PRJ-1403-003', name: 'Warehouse Renovation', nameFa: 'بازسازی انبار مرکزی',
    companyId: 'C-001', companyName: 'شرکت پلاستیک ایران', projectType: 'maintenance',
    startDate: '1403/03/01', endDate: '1403/06/31', status: 'completed',
    totalBudget: 350_000_000, actualCost: 342_000_000,
    estimatedCostToComplete: 0, variance: 8_000_000, variancePercent: 2.3,
    wipAccountId: '', budgetLines: [],
    milestones: [],
    managerId: 'U-003', managerName: 'کمال صادقی', completionPercent: 100,
    createdAt: '1403/03/01', updatedAt: '1403/07/01',
  },
];

// ── useProjectStore: extend FinanceStore with local project CRUD ───────────────
// Since the upstream store does not yet have projects, we use a local useState
// seeded from SEED_PROJECTS. When the store is extended, swap this for store actions.
function useProjects() {
  const storeVouchers = useFinanceStore((s) => s.vouchers);
  const [projects, setProjects] = useState<Project[]>(() =>
    SEED_PROJECTS.map((p, i) => ({ ...p, id: `PRJ-${Date.now()}-${i}` }))
  );

  const actuals = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of storeVouchers) {
      if (v.status !== 'posted') continue;
      for (const e of v.entries) {
        if (e.projectId) map.set(e.projectId, (map.get(e.projectId) ?? 0) + (e.debit - e.credit));
      }
    }
    return map;
  }, [storeVouchers]);

  const createProject = (data: FormData) => {
    const id = `PRJ-${Date.now()}`;
    const now = jalaliToday();
    const project: Project = {
      id, code: data.code, name: data.nameFa, nameFa: data.nameFa,
      companyId: 'C-001', companyName: 'شرکت پلاستیک ایران',
      projectType: data.projectType,
      startDate: data.startDate, endDate: data.endDate,
      status: data.status, totalBudget: data.totalBudget,
      actualCost: 0, estimatedCostToComplete: data.totalBudget,
      variance: 0, variancePercent: 0,
      wipAccountId: '', budgetLines: [], milestones: [],
      managerId: '', managerName: data.managerName,
      completionPercent: 0, createdAt: now, updatedAt: now,
    };
    setProjects((prev) => [project, ...prev]);
    return project;
  };

  const updateProject = (id: string, data: Partial<FormData>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, nameFa: data.nameFa ?? p.nameFa, name: data.nameFa ?? p.name, updatedAt: jalaliToday() }
          : p
      )
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return { projects, actuals, createProject, updateProject, deleteProject };
}

// ── Sub-component: Project Ledger Modal ────────────────────────────────────────
function ProjectLedger({ project, onClose }: { project: Project; onClose: () => void }) {
  const vouchers = useFinanceStore((s) => s.vouchers);
  const projectVouchers = useMemo(
    () => vouchers.filter((v) => v.entries.some((e) => e.projectId === project.id))
          .sort((a, b) => a.date.localeCompare(b.date)),
    [project.id, vouchers]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-100">{project.nameFa}</h2>
            <p className="text-xs text-slate-400 mt-0.5">دفتر پروژه — {toPersianDigits(project.code)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {projectVouchers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              هیچ سند حسابداری برای این پروژه ثبت نشده است.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  {['تاریخ', 'شماره سند', 'شرح', 'بدهکار', 'بستانکار', 'وضعیت'].map((h) => (
                    <th key={h} className="text-right py-2 px-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectVouchers.map((v) => {
                  const projectEntries = v.entries.filter((e) => e.projectId === project.id);
                  const totalDebit  = projectEntries.reduce((s, e) => s + e.debit, 0);
                  const totalCredit = projectEntries.reduce((s, e) => s + e.credit, 0);
                  return (
                    <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-3 text-slate-300">{toPersianDigits(v.date)}</td>
                      <td className="py-2 px-3 font-mono text-amber-400" dir="ltr">{v.voucherNumber}</td>
                      <td className="py-2 px-3 text-slate-300 max-w-[200px] truncate">{v.description}</td>
                      <td className="py-2 px-3 text-emerald-400 font-mono" dir="ltr">
                        {totalDebit > 0 ? formatPersianNumber(totalDebit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-red-400 font-mono" dir="ltr">
                        {totalCredit > 0 ? formatPersianNumber(totalCredit) : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          v.status === 'posted'   ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          v.status === 'reversed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {v.status === 'posted' ? 'ثبت‌شده' : v.status === 'reversed' ? 'برگشتی' : 'پیش‌نویس'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: Project Form Modal ──────────────────────────────────────────
function ProjectFormModal({
  open,
  editingProject,
  costCenters,
  onSave,
  onClose,
  existingCodes,
}: {
  open: boolean;
  editingProject: Project | null;
  costCenters: { id: string; nameFa: string }[];
  onSave: (data: FormData) => void;
  onClose: () => void;
  existingCodes: string[];
}) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      code: '', nameFa: '', description: '', startDate: '', endDate: '',
      totalBudget: 0, costCenterId: '', status: 'active', projectType: 'construction',
      managerName: '',
    },
  });

  // Populate form when editing
  useState(() => {
    if (editingProject) {
      reset({
        code: editingProject.code,
        nameFa: editingProject.nameFa,
        description: editingProject.description ?? '',
        startDate: editingProject.startDate,
        endDate: editingProject.endDate ?? '',
        totalBudget: editingProject.totalBudget,
        costCenterId: '',
        status: editingProject.status,
        projectType: editingProject.projectType,
        managerName: editingProject.managerName,
      });
    } else {
      reset({
        code: `PRJ-${jalaliToday().slice(0, 4)}-`,
        nameFa: '', description: '', startDate: '', endDate: '',
        totalBudget: 0, costCenterId: '', status: 'active',
        projectType: 'construction', managerName: '',
      });
    }
  });

  const onSubmit = (data: FormData) => {
    const isDuplicate = existingCodes.includes(data.code) && (!editingProject || editingProject.code !== data.code);
    if (isDuplicate) { toast.error('کد پروژه تکراری است'); return; }
    onSave(data);
  };

  if (!open) return null;

  const inputCls = 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 placeholder:text-slate-500';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';
  const errorCls = 'mt-1 text-xs text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-base font-bold text-slate-100">
            {editingProject ? 'ویرایش پروژه' : 'ایجاد پروژه جدید'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Row 1: code + status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>کد پروژه <span className="text-red-400">*</span></label>
              <input {...register('code')} placeholder="PRJ-1403-004" className={inputCls} />
              {errors.code && <p className={errorCls}>{errors.code.message}</p>}
            </div>
            <div>
              <label className={labelCls}>وضعیت <span className="text-red-400">*</span></label>
              <select {...register('status')} className={inputCls}>
                {Object.entries(STATUS_CONFIG).map(([v, cfg]) => (
                  <option key={v} value={v}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: name */}
          <div>
            <label className={labelCls}>نام پروژه <span className="text-red-400">*</span></label>
            <input {...register('nameFa')} placeholder="مثال: احداث انبار مرکزی کرج" className={inputCls} />
            {errors.nameFa && <p className={errorCls}>{errors.nameFa.message}</p>}
          </div>

          {/* Row 3: type + manager */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>نوع پروژه <span className="text-red-400">*</span></label>
              <select {...register('projectType')} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>مدیر پروژه <span className="text-red-400">*</span></label>
              <input {...register('managerName')} placeholder="نام و نام خانوادگی" className={inputCls} />
              {errors.managerName && <p className={errorCls}>{errors.managerName.message}</p>}
            </div>
          </div>

          {/* Row 4: start + end date */}
          <div className="grid grid-cols-2 gap-3">
            <JalaliDatePicker
              label="تاریخ شروع *"
              value={watch('startDate')}
              onChange={(v) => setValue('startDate', v, { shouldValidate: true })}
              error={errors.startDate?.message}
            />
            <JalaliDatePicker
              label="تاریخ پایان *"
              value={watch('endDate')}
              onChange={(v) => setValue('endDate', v, { shouldValidate: true })}
              error={errors.endDate?.message}
              minDate={watch('startDate')}
            />
          </div>

          {/* Row 5: budget */}
          <div>
            <label className={labelCls}>بودجه کل (ریال) <span className="text-red-400">*</span></label>
            <input
              type="number"
              min={1}
              step={1_000_000}
              {...register('totalBudget')}
              placeholder="1000000000"
              className={`${inputCls} text-left`}
              dir="ltr"
            />
            {watch('totalBudget') > 0 && (
              <p className="mt-1 text-xs text-amber-400">
                = {formatPersianNumber(watch('totalBudget'))} ریال
              </p>
            )}
            {errors.totalBudget && <p className={errorCls}>{errors.totalBudget.message}</p>}
          </div>

          {/* Row 6: cost center */}
          <div>
            <label className={labelCls}>مرکز هزینه مرتبط</label>
            <select {...register('costCenterId')} className={inputCls}>
              <option value="">— بدون مرکز هزینه —</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.nameFa}</option>
              ))}
            </select>
          </div>

          {/* Row 7: description */}
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="توضیحات اختیاری..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {editingProject ? 'ذخیره تغییرات' : 'ایجاد پروژه'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Projects() {
  const { projects, actuals, createProject, updateProject, deleteProject } = useProjects();

  // Fake costCenters list (will come from store when extended)
  const costCenters = [
    { id: 'CC-001', nameFa: 'خط تولید A' },
    { id: 'CC-002', nameFa: 'انبار مرکزی' },
    { id: 'CC-003', nameFa: 'واحد اداری' },
    { id: 'CC-004', nameFa: 'تعمیر و نگهداری' },
  ];

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [ledgerFor, setLedgerFor] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchSearch = !searchQuery || p.nameFa.includes(searchQuery) || p.code.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const stats = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold:    projects.filter(p => p.status === 'on_hold').length,
    totalBudget: projects.reduce((s, p) => s + p.totalBudget, 0),
    totalActual: projects.reduce((s, p) => s + (actuals.get(p.id) ?? p.actualCost), 0),
  }), [projects, actuals]);

  const handleSave = (data: FormData) => {
    try {
      if (editingProject) {
        updateProject(editingProject.id, data);
        toast.success('پروژه با موفقیت ویرایش شد');
      } else {
        createProject(data);
        toast.success('پروژه جدید با موفقیت ایجاد شد');
      }
      setFormOpen(false);
      setEditingProject(null);
    } catch {
      toast.error('خطا در ذخیره پروژه');
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    try {
      deleteProject(id);
      toast.success('پروژه حذف شد');
    } catch {
      toast.error('خطا در حذف پروژه');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100">پروژه‌ها</h1>
          <p className="text-xs text-slate-400 mt-0.5">مدیریت بودجه و پیشرفت پروژه‌ها</p>
        </div>
        <button
          onClick={() => { setEditingProject(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          پروژه جدید
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'کل پروژه‌ها',    value: toPersianDigits(stats.total),         color: 'text-slate-100' },
          { label: 'فعال',            value: toPersianDigits(stats.active),         color: 'text-emerald-400' },
          { label: 'تکمیل‌شده',      value: toPersianDigits(stats.completed),      color: 'text-sky-400' },
          { label: 'معلق',            value: toPersianDigits(stats.onHold),         color: 'text-amber-400' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-xs text-slate-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Budget Summary */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">خلاصه بودجه کل</h3>
          <span className="text-xs text-slate-400">
            هزینه واقعی: <span className="text-amber-400 font-semibold">{formatPersianNumber(stats.totalActual)} ریال</span>
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${stats.totalActual > stats.totalBudget ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(stats.totalBudget > 0 ? (stats.totalActual / stats.totalBudget) * 100 : 0, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>صفر</span>
          <span>بودجه کل: {formatPersianNumber(stats.totalBudget)} ریال</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو در پروژه‌ها..."
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 w-48 placeholder:text-slate-500"
        />
        <div className="flex gap-1">
          {[
            { value: 'all',       label: 'همه' },
            { value: 'active',    label: 'فعال' },
            { value: 'planning',  label: 'برنامه‌ریزی' },
            { value: 'on_hold',   label: 'معلق' },
            { value: 'completed', label: 'تکمیل‌شده' },
            { value: 'cancelled', label: 'لغو‌شده' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f.value
                  ? 'bg-amber-500 text-slate-900'
                  : 'border border-slate-600 text-slate-300 hover:border-amber-500/50 hover:text-amber-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 mr-auto">
          {toPersianDigits(filtered.length)} پروژه
        </span>
      </div>

      {/* Project Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">پروژه‌ای یافت نشد.</p>
          <button
            onClick={() => { setEditingProject(null); setFormOpen(true); }}
            className="mt-3 text-amber-400 text-xs hover:underline"
          >
            اولین پروژه را ایجاد کنید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const actual = actuals.get(p.id) ?? p.actualCost;
            const pct = p.totalBudget > 0 ? Math.min((actual / p.totalBudget) * 100, 100) : 0;
            const overBudget = actual > p.totalBudget;
            const cfg = STATUS_CONFIG[p.status];
            const StatusIcon = cfg.icon;

            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 hover:border-slate-500 transition-colors flex flex-col gap-3"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-amber-400">{toPersianDigits(p.code)}</span>
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${cfg.tone}`}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm leading-tight">{p.nameFa}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{TYPE_LABELS[p.projectType]} · {p.managerName}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-2">
                  <span>{toPersianDigits(p.startDate)}</span>
                  <span className="mx-2 text-slate-600">←</span>
                  <span>{p.endDate ? toPersianDigits(p.endDate) : '—'}</span>
                </div>

                {/* Budget row */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">بودجه: <span className="text-slate-200 font-medium">{formatPersianNumber(p.totalBudget)}</span></span>
                    <span className={`font-medium ${overBudget ? 'text-red-400' : 'text-amber-400'}`}>
                      واقعی: {formatPersianNumber(actual)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>پیشرفت: {toPersianDigits(p.completionPercent)}٪</span>
                    <span>{overBudget ? '⚠ از بودجه تجاوز کرده' : `${toPersianDigits(Math.round(pct))}٪ مصرف`}</span>
                  </div>
                </div>

                {/* Milestones preview */}
                {p.milestones.length > 0 && (
                  <div className="space-y-1">
                    {p.milestones.slice(0, 2).map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-[11px]">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          m.status === 'completed' ? 'bg-emerald-500' :
                          m.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-600'
                        }`} />
                        <span className={m.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-300'}>
                          {m.nameFa}
                        </span>
                        <span className="text-slate-500 mr-auto">{toPersianDigits(m.dueDate)}</span>
                      </div>
                    ))}
                    {p.milestones.length > 2 && (
                      <p className="text-[10px] text-slate-500">
                        +{toPersianDigits(p.milestones.length - 2)} مایلستون دیگر
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-1 border-t border-slate-700/50">
                  <button
                    onClick={() => setLedgerFor(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-300 border border-slate-600 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    <FolderOpen size={13} />
                    دفتر پروژه
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    title="ویرایش"
                    className="p-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(p.id)}
                    title="حذف"
                    className="p-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <ProjectFormModal
        open={formOpen}
        editingProject={editingProject}
        costCenters={costCenters}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditingProject(null); }}
        existingCodes={projects.filter(p => p.id !== editingProject?.id).map(p => p.code)}
      />

      {/* Ledger Modal */}
      {ledgerFor && (
        <ProjectLedger project={ledgerFor} onClose={() => setLedgerFor(null)} />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
          <div className="bg-slate-900 rounded-xl border border-red-500/30 p-5 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-400 shrink-0" />
              <p className="text-sm text-slate-200">آیا از حذف این پروژه اطمینان دارید؟ این عمل قابل بازگشت نیست.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => confirmDelete(deleteConfirmId)}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
