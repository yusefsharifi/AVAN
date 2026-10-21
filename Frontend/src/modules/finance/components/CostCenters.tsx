// src/modules/finance/components/CostCenters.tsx — Phase 3+5: Full CRUD
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { formatPersianNumber, toPersianDigits, jalaliToday } from '../utils/persianUtils';
import type { CostCenter, CostCenterType, CostCenterStatus } from '../types';

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<CostCenterType, string> = {
  production_line: 'خط تولید',
  warehouse:       'انبار',
  admin:           'اداری',
  sales:           'فروش',
  maintenance:     'تعمیر و نگهداری',
};

const STATUS_CFG: Record<CostCenterStatus, { label: string; cls: string }> = {
  active:   { label: 'فعال',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'غیرفعال',  cls: 'bg-amber-50   text-amber-700   border-amber-200' },
  closed:   { label: 'بسته‌شده', cls: 'bg-red-50      text-red-700     border-red-200' },
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: Omit<CostCenter, 'id'>[] = [
  { code:'CC-001', name:'Production Line A', nameFa:'خط تولید A', type:'production_line', companyId:'C-001', managerId:'U-001', managerName:'احمد کریمی', budget:{ annual:2_400_000_000, ytdActual:800_000_000, ytdCommitted:150_000_000, remaining:1_450_000_000 }, status:'active', description:'خط تولید اصلی پلاستیک', createdAt:'1403/01/01', updatedAt:jalaliToday() },
  { code:'CC-002', name:'Warehouse',        nameFa:'انبار مرکزی',   type:'warehouse',       companyId:'C-001', managerId:'U-002', managerName:'نادر قاسمی',  budget:{ annual:800_000_000,   ytdActual:200_000_000, ytdCommitted:50_000_000,  remaining:550_000_000  }, status:'active', description:'انبار مواد اولیه',   createdAt:'1403/01/01', updatedAt:jalaliToday() },
  { code:'CC-003', name:'Admin',            nameFa:'واحد اداری',    type:'admin',           companyId:'C-001', managerId:'U-003', managerName:'مریم رضایی',  budget:{ annual:1_200_000_000, ytdActual:400_000_000, ytdCommitted:0,           remaining:800_000_000  }, status:'active', description:'واحد اداری و پشتیبانی', createdAt:'1403/01/01', updatedAt:jalaliToday() },
  { code:'CC-004', name:'Maintenance',      nameFa:'تعمیر و نگهداری', type:'maintenance',  companyId:'C-001', managerId:'U-004', managerName:'کمال صادقی',  budget:{ annual:600_000_000,   ytdActual:245_000_000, ytdCommitted:80_000_000,  remaining:275_000_000  }, status:'active', description:'تعمیرات دوره‌ای',    createdAt:'1403/01/01', updatedAt:jalaliToday() },
  { code:'CC-005', name:'Sales',            nameFa:'واحد فروش',     type:'sales',           companyId:'C-001', managerId:'U-005', managerName:'زهرا امینی',  budget:{ annual:400_000_000,   ytdActual:180_000_000, ytdCommitted:20_000_000,  remaining:200_000_000  }, status:'active', description:'واحد فروش و بازاریابی', createdAt:'1403/01/01', updatedAt:jalaliToday() },
];

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  code:        z.string().min(1, 'کد مرکز الزامی است'),
  nameFa:      z.string().min(2, 'نام فارسی الزامی است'),
  type:        z.enum(['production_line','warehouse','admin','sales','maintenance']),
  managerName: z.string().min(2, 'نام مدیر الزامی است'),
  annualBudget: z.coerce.number().min(0, 'بودجه نمی‌تواند منفی باشد'),
  status:      z.enum(['active','inactive','closed']),
  description: z.string().optional(),
});
type CCForm = z.infer<typeof schema>;

// ── local hook (until store extended) ─────────────────────────────────────────
function useCostCenters() {
  const { vouchers } = useFinanceStore();
  const [items, setItems] = useState<CostCenter[]>(() =>
    SEED.map((s, i) => ({ ...s, id: `CC-${String(i+1).padStart(3,'0')}` }))
  );

  // Compute actuals from GL voucher entries tagged with costCenterId
  const actuals = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vouchers) {
      if (v.status !== 'posted') continue;
      for (const e of v.entries) {
        if ((e as any).costCenterId)
          map.set((e as any).costCenterId, (map.get((e as any).costCenterId) ?? 0) + e.debit);
      }
    }
    return map;
  }, [vouchers]);

  const create = (data: CCForm) => {
    const now = jalaliToday();
    const cc: CostCenter = {
      id: `CC-${Date.now()}`,
      code: data.code, name: data.nameFa, nameFa: data.nameFa,
      type: data.type, companyId: 'C-001', managerId: '',
      managerName: data.managerName,
      budget: { annual: data.annualBudget, ytdActual: 0, ytdCommitted: 0, remaining: data.annualBudget },
      status: data.status, description: data.description ?? '',
      createdAt: now, updatedAt: now,
    };
    setItems(prev => [cc, ...prev]);
    return cc;
  };

  const update = (id: string, data: CCForm) => {
    setItems(prev => prev.map(c => c.id !== id ? c : {
      ...c,
      code: data.code, nameFa: data.nameFa, name: data.nameFa,
      type: data.type, managerName: data.managerName,
      budget: { ...c.budget, annual: data.annualBudget, remaining: data.annualBudget - c.budget.ytdActual - c.budget.ytdCommitted },
      status: data.status, description: data.description ?? '',
      updatedAt: jalaliToday(),
    }));
  };

  const remove = (id: string) => setItems(prev => prev.filter(c => c.id !== id));

  return { items, actuals, create, update, remove };
}

// ── Form Modal ────────────────────────────────────────────────────────────────
function CCFormModal({ open, editing, existingCodes, onSave, onClose }: {
  open: boolean; editing: CostCenter | null;
  existingCodes: string[]; onSave: (d: CCForm) => void; onClose: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<CCForm>({
    resolver: zodResolver(schema), mode: 'onChange',
    defaultValues: editing
      ? { code: editing.code, nameFa: editing.nameFa, type: editing.type, managerName: editing.managerName, annualBudget: editing.budget.annual, status: editing.status, description: editing.description ?? '' }
      : { code: `CC-${Date.now().toString().slice(-3)}`, nameFa: '', type: 'production_line', managerName: '', annualBudget: 0, status: 'active', description: '' },
  });

  const onSubmit = (data: CCForm) => {
    const dup = existingCodes.includes(data.code) && (!editing || editing.code !== data.code);
    if (dup) { toast.error('کد مرکز هزینه تکراری است'); return; }
    onSave(data);
  };

  if (!open) return null;
  const cls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const lbl = 'block text-xs font-medium text-muted-foreground mb-1';
  const err = 'mt-0.5 text-[10px] text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">{editing ? 'ویرایش مرکز هزینه' : 'مرکز هزینه جدید'}</h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>کد مرکز <span className="text-red-500">*</span></label>
              <input {...register('code')} className={cls} placeholder="CC-010" />
              {errors.code && <p className={err}>{errors.code.message}</p>}
            </div>
            <div>
              <label className={lbl}>وضعیت</label>
              <select {...register('status')} className={cls}>
                {Object.entries(STATUS_CFG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>نام مرکز هزینه <span className="text-red-500">*</span></label>
            <input {...register('nameFa')} className={cls} placeholder="مثال: خط تولید B" />
            {errors.nameFa && <p className={err}>{errors.nameFa.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>نوع <span className="text-red-500">*</span></label>
              <select {...register('type')} className={cls}>
                {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>مدیر مسئول <span className="text-red-500">*</span></label>
              <input {...register('managerName')} className={cls} placeholder="نام و نام خانوادگی" />
              {errors.managerName && <p className={err}>{errors.managerName.message}</p>}
            </div>
          </div>
          <div>
            <label className={lbl}>بودجه سالانه (ریال) <span className="text-red-500">*</span></label>
            <input type="number" min={0} step={1_000_000} {...register('annualBudget')} className={`${cls} text-left`} dir="ltr" />
            {errors.annualBudget && <p className={err}>{errors.annualBudget.message}</p>}
          </div>
          <div>
            <label className={lbl}>توضیحات</label>
            <textarea {...register('description')} rows={2} className={`${cls} resize-none`} placeholder="اختیاری" />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button type="submit" disabled={!isValid}
              className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent/90">
              {editing ? 'ذخیره تغییرات' : 'ایجاد مرکز هزینه'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function CostCenters() {
  const { items, actuals, create, update, remove } = useCostCenters();
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<CostCenter|null>(null);
  const [deleteId, setDeleteId]   = useState<string|null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch]       = useState('');

  const filtered = items.filter(c =>
    (filterType === 'all' || c.type === filterType) &&
    (!search || c.nameFa.includes(search) || c.code.includes(search))
  );

  const totals = useMemo(() => ({
    budget:  items.reduce((s,c) => s + c.budget.annual, 0),
    actual:  items.reduce((s,c) => s + (actuals.get(c.id) ?? c.budget.ytdActual), 0),
    committed: items.reduce((s,c) => s + c.budget.ytdCommitted, 0),
  }), [items, actuals]);

  const handleSave = (data: CCForm) => {
    try {
      if (editing) { update(editing.id, data); toast.success('مرکز هزینه ویرایش شد'); }
      else          { create(data);             toast.success('مرکز هزینه جدید ایجاد شد'); }
      setFormOpen(false); setEditing(null);
    } catch { toast.error('خطا در ذخیره'); }
  };

  const handleDelete = (id: string) => {
    try { remove(id); toast.success('مرکز هزینه حذف شد'); }
    catch { toast.error('خطا در حذف'); }
    finally { setDeleteId(null); }
  };

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">مراکز هزینه</h1>
          <p className="text-xs text-muted-foreground mt-0.5">مدیریت و پایش بودجه مراکز هزینه</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
          <Plus size={14} />مرکز هزینه جدید
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'بودجه کل سالانه', value: formatPersianNumber(totals.budget), icon: Layers, color: 'text-foreground' },
          { label: 'هزینه واقعی YTD',  value: formatPersianNumber(totals.actual), icon: TrendingDown, color: 'text-amber-600' },
          { label: 'نرخ بهره‌برداری',  value: `${Math.round(totals.budget > 0 ? (totals.actual / totals.budget) * 100 : 0)}٪`,
            icon: TrendingUp, color: totals.actual > totals.budget * 0.9 ? 'text-red-600' : 'text-emerald-600' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg"><Icon size={18} className={k.color} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..."
          className="border border-border rounded-lg px-3 py-2 text-xs bg-secondary focus:outline-none w-44" />
        <div className="flex gap-1">
          <button onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-accent text-white' : 'border border-border text-muted-foreground hover:bg-secondary'}`}>
            همه
          </button>
          {Object.entries(TYPE_LABELS).map(([v,l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === v ? 'bg-accent text-white' : 'border border-border text-muted-foreground hover:bg-secondary'}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground mr-auto">{toPersianDigits(filtered.length)} مرکز</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 border-b border-border">
            <tr>
              {['کد','نام مرکز','نوع','مدیر','بودجه سالانه','واقعی YTD','مانده','بهره‌برداری','وضعیت','عملیات'].map(h => (
                <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">مرکز هزینه‌ای یافت نشد</td></tr>
            ) : filtered.map(cc => {
              const actual = actuals.get(cc.id) ?? cc.budget.ytdActual;
              const pct    = cc.budget.annual > 0 ? Math.min((actual / cc.budget.annual) * 100, 100) : 0;
              const over   = actual > cc.budget.annual;
              const cfg    = STATUS_CFG[cc.status];
              return (
                <tr key={cc.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3 font-mono text-primary font-semibold">{cc.code}</td>
                  <td className="py-3 px-3 font-medium text-foreground">{cc.nameFa}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border">
                      {TYPE_LABELS[cc.type]}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">{cc.managerName}</td>
                  <td className="py-3 px-3 font-mono" dir="ltr">{formatPersianNumber(cc.budget.annual)}</td>
                  <td className={`py-3 px-3 font-mono ${over ? 'text-red-600 font-bold' : 'text-amber-600'}`} dir="ltr">
                    {formatPersianNumber(actual)}
                  </td>
                  <td className="py-3 px-3 font-mono text-muted-foreground" dir="ltr">
                    {formatPersianNumber(Math.max(0, cc.budget.annual - actual))}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-secondary rounded-full h-2 w-20 overflow-hidden">
                        <div className={`h-2 rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-semibold ${over ? 'text-red-600' : pct > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {toPersianDigits(Math.round(pct))}٪
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(cc); setFormOpen(true); }}
                        title="ویرایش" className="p-1.5 rounded border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteId(cc.id)}
                        title="حذف" className="p-1.5 rounded border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <CCFormModal
        open={formOpen} editing={editing}
        existingCodes={items.filter(c => c.id !== editing?.id).map(c => c.code)}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-card rounded-xl border border-red-200 p-5 w-full max-w-sm">
            <p className="text-sm text-foreground mb-4">آیا از حذف این مرکز هزینه اطمینان دارید؟</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500">
                حذف
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostCenters;
