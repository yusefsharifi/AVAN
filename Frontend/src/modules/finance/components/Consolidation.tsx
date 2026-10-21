// src/modules/finance/components/Consolidation.tsx — Phase 3: Full CRUD
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, GitBranch, CheckCircle, AlertCircle, Download, Printer, X, RefreshCw } from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { formatPersianNumber, toPersianDigits, isValidJalaliDateString, jalaliToday } from '../utils/persianUtils';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');

// ── Types ─────────────────────────────────────────────────────────────────────
type ICTxType   = 'sale' | 'purchase' | 'loan' | 'dividend' | 'service' | 'transfer';
type ICTxStatus = 'pending' | 'eliminated' | 'disputed';

interface IntercompanyTx {
  id: string;
  fromCompanyId:   string;
  fromCompanyName: string;
  toCompanyId:     string;
  toCompanyName:   string;
  transactionType: ICTxType;
  amount:          number;
  currency:        'IRR' | 'USD';
  date:            string;
  description:     string;
  referenceNo:     string;
  eliminationRequired: boolean;
  status:          ICTxStatus;
  eliminationDate?: string;
  eliminationVoucherId?: string;
  notes?:          string;
}

interface ConsolidatedEntity {
  id:   string;
  name: string;
  code: string;
  ownership: number; // percent
  currency: 'IRR';
  totalAssets:      number;
  totalLiabilities: number;
  revenue:          number;
  netIncome:        number;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_ENTITIES: ConsolidatedEntity[] = [
  { id: 'C-001', name: 'شرکت پلاستیک ایران',       code: 'PI',  ownership: 100, currency: 'IRR', totalAssets: 85_000_000_000, totalLiabilities: 35_000_000_000, revenue: 42_000_000_000, netIncome: 3_200_000_000 },
  { id: 'C-002', name: 'صنایع فولاد البرز',          code: 'SA',  ownership:  80, currency: 'IRR', totalAssets: 60_000_000_000, totalLiabilities: 28_000_000_000, revenue: 31_000_000_000, netIncome: 1_800_000_000 },
  { id: 'C-003', name: 'پتروشیمی پارس',             code: 'PP',  ownership:  60, currency: 'IRR', totalAssets: 120_000_000_000, totalLiabilities: 55_000_000_000, revenue: 78_000_000_000, netIncome: 6_400_000_000 },
  { id: 'C-004', name: 'فرآوری غذایی تهران',        code: 'FG',  ownership:  51, currency: 'IRR', totalAssets: 22_000_000_000, totalLiabilities: 12_000_000_000, revenue: 18_000_000_000, netIncome: 1_100_000_000 },
];

const SEED_IC_TXS: IntercompanyTx[] = [
  { id: 'IC-001', fromCompanyId: 'C-001', fromCompanyName: 'شرکت پلاستیک ایران', toCompanyId: 'C-002', toCompanyName: 'صنایع فولاد البرز',   transactionType: 'sale',     amount: 250_000_000, currency: 'IRR', date: '1403/04/10', description: 'فروش مواد اولیه پلاستیک',  referenceNo: 'IC-REF-001', eliminationRequired: true,  status: 'pending' },
  { id: 'IC-002', fromCompanyId: 'C-003', fromCompanyName: 'پتروشیمی پارس',      toCompanyId: 'C-001', toCompanyName: 'شرکت پلاستیک ایران', transactionType: 'sale',     amount: 180_000_000, currency: 'IRR', date: '1403/04/05', description: 'فروش مواد شیمیایی',        referenceNo: 'IC-REF-002', eliminationRequired: true,  status: 'eliminated', eliminationDate: '1403/04/15', eliminationVoucherId: 'JE-ELIM-001' },
  { id: 'IC-003', fromCompanyId: 'C-001', fromCompanyName: 'شرکت پلاستیک ایران', toCompanyId: 'C-004', toCompanyName: 'فرآوری غذایی تهران', transactionType: 'loan',     amount: 500_000_000, currency: 'IRR', date: '1403/03/01', description: 'وام کوتاه‌مدت بین‌شرکتی',   referenceNo: 'IC-REF-003', eliminationRequired: true,  status: 'pending' },
  { id: 'IC-004', fromCompanyId: 'C-002', fromCompanyName: 'صنایع فولاد البرز',   toCompanyId: 'C-001', toCompanyName: 'شرکت پلاستیک ایران', transactionType: 'service',  amount:  80_000_000, currency: 'IRR', date: '1403/04/08', description: 'خدمات مهندسی و مشاوره',    referenceNo: 'IC-REF-004', eliminationRequired: true,  status: 'pending' },
  { id: 'IC-005', fromCompanyId: 'C-003', fromCompanyName: 'پتروشیمی پارس',      toCompanyId: 'C-002', toCompanyName: 'صنایع فولاد البرز',   transactionType: 'dividend', amount: 120_000_000, currency: 'IRR', date: '1403/04/01', description: 'سود تقسیمی فصل اول',        referenceNo: 'IC-REF-005', eliminationRequired: false, status: 'pending' },
];

// ── Schema ─────────────────────────────────────────────────────────────────────
const icSchema = z.object({
  fromCompanyId:       z.string().min(1, 'شرکت مبدأ الزامی است'),
  toCompanyId:         z.string().min(1, 'شرکت مقصد الزامی است'),
  transactionType:     z.enum(['sale','purchase','loan','dividend','service','transfer']),
  amount:              z.coerce.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
  date:                z.string().refine(isValidJalaliDateString, 'تاریخ نامعتبر است'),
  description:         z.string().min(3, 'شرح الزامی است'),
  referenceNo:         z.string().min(1, 'شماره مرجع الزامی است'),
  eliminationRequired: z.boolean(),
  notes:               z.string().optional(),
}).refine(d => d.fromCompanyId !== d.toCompanyId, {
  message: 'شرکت مبدأ و مقصد نمی‌توانند یکی باشند',
  path: ['toCompanyId'],
});
type ICForm = z.infer<typeof icSchema>;

const TYPE_LABELS: Record<ICTxType, string> = {
  sale: 'فروش', purchase: 'خرید', loan: 'وام', dividend: 'سود تقسیمی', service: 'خدمات', transfer: 'انتقال',
};
const TYPE_COLORS: Record<ICTxType, string> = {
  sale: 'bg-blue-50 text-blue-700 border-blue-200',
  purchase: 'bg-purple-50 text-purple-700 border-purple-200',
  loan: 'bg-amber-50 text-amber-700 border-amber-200',
  dividend: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  service: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  transfer: 'bg-slate-50 text-slate-600 border-slate-200',
};

function exportCSV(txs: IntercompanyTx[]) {
  const header = ['شناسه','از شرکت','به شرکت','نوع','مبلغ','تاریخ','شرح','شماره مرجع','وضعیت'];
  const rows   = txs.map(t => [t.id, t.fromCompanyName, t.toCompanyName, TYPE_LABELS[t.transactionType], t.amount, t.date, t.description, t.referenceNo, t.status === 'eliminated' ? 'ادغام‌شده' : t.status === 'disputed' ? 'مورد اختلاف' : 'در انتظار']);
  const csv    = '\ufeff' + [header, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download   = 'تراکنش‌های-بین-شرکتی.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── IC Form Modal ──────────────────────────────────────────────────────────────
function ICFormModal({ open, entities, onSave, onClose }: {
  open: boolean; entities: ConsolidatedEntity[];
  onSave: (d: ICForm) => void; onClose: () => void;
}) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<ICForm>({
    resolver: zodResolver(icSchema), mode: 'onChange',
    defaultValues: { fromCompanyId: '', toCompanyId: '', transactionType: 'sale', amount: 0, date: jalaliToday(), description: '', referenceNo: `IC-REF-${Date.now().toString().slice(-4)}`, eliminationRequired: true, notes: '' },
  });

  if (!open) return null;
  const cls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const lbl = 'block text-xs font-medium text-muted-foreground mb-1';
  const err = 'mt-0.5 text-[10px] text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">تراکنش بین‌شرکتی جدید</h2>
          <button onClick={onClose}><X size={16} className="text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit(d => { onSave(d); reset(); })} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>شرکت مبدأ <span className="text-red-500">*</span></label>
              <select {...register('fromCompanyId')} className={cls}>
                <option value="">انتخاب کنید...</option>
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.fromCompanyId && <p className={err}>{errors.fromCompanyId.message}</p>}
            </div>
            <div>
              <label className={lbl}>شرکت مقصد <span className="text-red-500">*</span></label>
              <select {...register('toCompanyId')} className={cls}>
                <option value="">انتخاب کنید...</option>
                {entities.filter(e => e.id !== watch('fromCompanyId')).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.toCompanyId && <p className={err}>{errors.toCompanyId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>نوع تراکنش <span className="text-red-500">*</span></label>
              <select {...register('transactionType')} className={cls}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>مبلغ (ریال) <span className="text-red-500">*</span></label>
              <input type="number" min={1} step={1_000_000} {...register('amount')} className={`${cls} text-left`} dir="ltr" />
              {errors.amount && <p className={err}>{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <JalaliDatePicker label="تاریخ *" value={watch('date')} onChange={v => setValue('date', v, { shouldValidate: true })} error={errors.date?.message} />
            <div>
              <label className={lbl}>شماره مرجع <span className="text-red-500">*</span></label>
              <input {...register('referenceNo')} className={cls} />
              {errors.referenceNo && <p className={err}>{errors.referenceNo.message}</p>}
            </div>
          </div>

          <div>
            <label className={lbl}>شرح تراکنش <span className="text-red-500">*</span></label>
            <input {...register('description')} placeholder="شرح معامله بین‌شرکتی" className={cls} />
            {errors.description && <p className={err}>{errors.description.message}</p>}
          </div>

          <div>
            <label className={lbl}>یادداشت</label>
            <textarea {...register('notes')} rows={2} className={`${cls} resize-none`} placeholder="اختیاری" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('eliminationRequired')} className="rounded" />
            <span className="text-xs text-muted-foreground">نیاز به حذف در تلفیق دارد</span>
          </label>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button type="submit" disabled={!isValid}
              className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent/90">
              ثبت تراکنش
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

// ── Main Component ─────────────────────────────────────────────────────────────
export function Consolidation() {
  const [txs, setTxs]         = useState<IntercompanyTx[]>(SEED_IC_TXS);
  const [entities]             = useState<ConsolidatedEntity[]>(SEED_ENTITIES);
  const [formOpen, setFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | ICTxStatus>('all');
  const [filterType,   setFilterType]   = useState<'all' | ICTxType>('all');
  const [activeTab, setActiveTab]       = useState<'transactions' | 'entities' | 'preview'>('transactions');
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalIC         = txs.reduce((s, t) => s + t.amount, 0);
  const eliminated      = txs.filter(t => t.status === 'eliminated').reduce((s, t) => s + t.amount, 0);
  const pendingElim     = txs.filter(t => t.status === 'pending' && t.eliminationRequired).reduce((s, t) => s + t.amount, 0);
  const pendingCount    = txs.filter(t => t.status === 'pending' && t.eliminationRequired).length;

  // Consolidated balance sheet (sum all entities minus eliminated IC)
  const consolidated = useMemo(() => {
    const totals = entities.reduce((acc, e) => ({
      assets:      acc.assets      + e.totalAssets,
      liabilities: acc.liabilities + e.totalLiabilities,
      revenue:     acc.revenue     + e.revenue,
      netIncome:   acc.netIncome   + e.netIncome,
    }), { assets: 0, liabilities: 0, revenue: 0, netIncome: 0 });
    return {
      ...totals,
      equity:          totals.assets - totals.liabilities,
      adjustedRevenue: totals.revenue  - eliminated,
      adjustedAssets:  totals.assets   - eliminated,
    };
  }, [entities, eliminated]);

  const filteredTxs = txs.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (filterType   === 'all' || t.transactionType === filterType)
  );

  const handleEliminate = (id: string) => {
    setTxs(prev => prev.map(t => t.id !== id ? t : {
      ...t, status: 'eliminated' as ICTxStatus,
      eliminationDate: jalaliToday(),
      eliminationVoucherId: `JE-ELIM-${Date.now()}`,
    }));
    toast.success('تراکنش با موفقیت حذف/تلفیق شد و سند معکوس ایجاد شد');
    setEliminatingId(null);
  };

  const handleEliminateAll = () => {
    setTxs(prev => prev.map(t =>
      t.status === 'pending' && t.eliminationRequired
        ? { ...t, status: 'eliminated' as ICTxStatus, eliminationDate: jalaliToday(), eliminationVoucherId: `JE-ELIM-${Date.now()}` }
        : t
    ));
    toast.success(`${toPersianDigits(pendingCount)} تراکنش با موفقیت تلفیق شد`);
  };

  const handleAddTx = (data: ICForm) => {
    const fromEnt = entities.find(e => e.id === data.fromCompanyId);
    const toEnt   = entities.find(e => e.id === data.toCompanyId);
    const tx: IntercompanyTx = {
      id: `IC-${Date.now()}`,
      fromCompanyId:   data.fromCompanyId,
      fromCompanyName: fromEnt?.name ?? data.fromCompanyId,
      toCompanyId:     data.toCompanyId,
      toCompanyName:   toEnt?.name   ?? data.toCompanyId,
      transactionType: data.transactionType,
      amount:          data.amount,
      currency:        'IRR',
      date:            data.date,
      description:     data.description,
      referenceNo:     data.referenceNo,
      eliminationRequired: data.eliminationRequired,
      status:          'pending',
      notes:           data.notes,
    };
    setTxs(prev => [tx, ...prev]);
    toast.success('تراکنش بین‌شرکتی ثبت شد');
    setFormOpen(false);
  };

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">ادغام مالی چند شرکتی</h1>
          <p className="text-xs text-muted-foreground mt-0.5">تلفیق اطلاعات مالی شرکت‌های زیرمجموعه</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(txs)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Download size={13} />خروجی CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Printer size={13} />چاپ
          </button>
          {pendingCount > 0 && (
            <button onClick={handleEliminateAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500">
              <RefreshCw size={13} />تلفیق همه ({toPersianDigits(pendingCount)})
            </button>
          )}
          <button onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90">
            <Plus size={13} />تراکنش جدید
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'تعداد شرکت‌ها',          value: toPersianDigits(entities.length),   color: 'text-foreground' },
          { label: 'کل تراکنش‌های بین‌شرکتی', value: fa(totalIC) + ' ریال',              color: 'text-foreground' },
          { label: 'تلفیق‌شده',               value: fa(eliminated) + ' ریال',            color: 'text-emerald-600' },
          { label: 'در انتظار تلفیق',         value: fa(pendingElim) + ' ریال',           color: pendingCount > 0 ? 'text-amber-600' : 'text-muted-foreground' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-[10px] text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([['transactions','تراکنش‌های بین‌شرکتی'],['entities','شرکت‌های زیرمجموعه'],['preview','پیش‌نمایش تلفیق']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Transactions Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {([['all','همه'],['pending','در انتظار'],['eliminated','تلفیق‌شده'],['disputed','مورد اختلاف']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === v ? 'bg-accent text-white' : 'border border-border text-muted-foreground hover:bg-secondary'}`}>
                  {l}
                </button>
              ))}
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-secondary">
              <option value="all">همه انواع</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-xs text-muted-foreground mr-auto">
              {toPersianDigits(filteredTxs.length)} تراکنش
            </span>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  {['از شرکت','به شرکت','نوع','مبلغ','تاریخ','شرح','مرجع','تلفیق؟','وضعیت','عملیات'].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTxs.length === 0 ? (
                  <tr><td colSpan={10} className="py-10 text-center text-muted-foreground">تراکنشی یافت نشد</td></tr>
                ) : filteredTxs.map(tx => (
                  <tr key={tx.id} className={`border-b border-border/40 last:border-0 hover:bg-secondary/20 ${tx.status === 'eliminated' ? 'opacity-60' : ''}`}>
                    <td className="py-2.5 px-3 font-medium text-foreground">{tx.fromCompanyName}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{tx.toCompanyName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLORS[tx.transactionType]}`}>
                        {TYPE_LABELS[tx.transactionType]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-foreground" dir="ltr">{fa(tx.amount)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{tx.date}</td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-[140px] truncate">{tx.description}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground" dir="ltr">{tx.referenceNo}</td>
                    <td className="py-2.5 px-3 text-center">
                      {tx.eliminationRequired
                        ? <CheckCircle size={13} className="text-amber-500 mx-auto" />
                        : <span className="text-muted-foreground text-[10px]">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        tx.status === 'eliminated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        tx.status === 'disputed'   ? 'bg-red-50     text-red-700     border-red-200'     :
                                                     'bg-amber-50   text-amber-700   border-amber-200'
                      }`}>
                        {tx.status === 'eliminated' ? 'تلفیق‌شده' : tx.status === 'disputed' ? 'مورد اختلاف' : 'در انتظار'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {tx.status === 'pending' && tx.eliminationRequired && (
                        <button onClick={() => setEliminatingId(tx.id)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-500 font-medium">
                          تلفیق
                        </button>
                      )}
                      {tx.status === 'eliminated' && tx.eliminationVoucherId && (
                        <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{tx.eliminationVoucherId}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Entities Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'entities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map(e => (
            <div key={e.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{e.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">کد: {e.code} — مالکیت: {toPersianDigits(e.ownership)}٪</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">{e.code}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'دارایی‌های کل',    value: fa(e.totalAssets),      color: 'text-blue-600' },
                  { label: 'بدهی‌های کل',       value: fa(e.totalLiabilities), color: 'text-red-600' },
                  { label: 'حقوق صاحبان سهام', value: fa(e.totalAssets - e.totalLiabilities), color: 'text-foreground' },
                  { label: 'درآمد کل',           value: fa(e.revenue),          color: 'text-emerald-600' },
                  { label: 'سود خالص',           value: fa(e.netIncome),        color: e.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'حاشیه سود',          value: `${(e.revenue > 0 ? (e.netIncome / e.revenue) * 100 : 0).toFixed(1)}٪`, color: 'text-foreground' },
                ].map(k => (
                  <div key={k.label} className="bg-secondary/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{k.label}</p>
                    <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Preview Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">ترازنامه تلفیقی (پیش‌نمایش)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 pb-1 border-b border-border">دارایی‌ها</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'جمع دارایی‌های شرکت‌ها', value: entities.reduce((s,e) => s+e.totalAssets, 0), cls: '' },
                    { label: 'کسر: تراکنش‌های تلفیق‌شده', value: -eliminated, cls: 'text-red-600' },
                    { label: 'جمع دارایی‌های تلفیقی', value: consolidated.adjustedAssets, cls: 'font-bold text-foreground border-t border-border pt-2 mt-2' },
                  ].map(r => (
                    <div key={r.label} className={`flex justify-between ${r.cls}`}>
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-mono" dir="ltr">{fa(r.value)} ریال</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 pb-1 border-b border-border">درآمد و سود</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'جمع درآمد شرکت‌ها',      value: entities.reduce((s,e) => s+e.revenue, 0),    cls: '' },
                    { label: 'کسر: درآمد بین‌شرکتی',   value: -eliminated,                                  cls: 'text-red-600' },
                    { label: 'درآمد تلفیقی',            value: consolidated.adjustedRevenue,                 cls: 'font-bold text-foreground border-t border-border pt-2 mt-2' },
                    { label: '',                         value: 0,                                             cls: '' },
                    { label: 'جمع سود خالص شرکت‌ها',   value: entities.reduce((s,e) => s+e.netIncome, 0),   cls: '' },
                  ].filter(r => r.label).map(r => (
                    <div key={r.label} className={`flex justify-between ${r.cls}`}>
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={`font-mono ${r.value >= 0 ? '' : 'text-red-600'}`} dir="ltr">{fa(r.value)} ریال</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {toPersianDigits(pendingCount)} تراکنش هنوز تلفیق نشده
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  مجموع: {fa(pendingElim)} ریال — تا تلفیق کامل، اعداد بالا دقیق نیستند.
                </p>
              </div>
              <button onClick={handleEliminateAll}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-500 shrink-0">
                تلفیق همه
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <ICFormModal open={formOpen} entities={entities} onSave={handleAddTx} onClose={() => setFormOpen(false)} />

      {/* Eliminate confirm */}
      {eliminatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-card rounded-xl border border-amber-200 p-5 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <GitBranch size={20} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">تأیید تلفیق تراکنش</p>
                <p className="text-xs text-muted-foreground mt-0.5">یک سند معکوس در GL ایجاد می‌شود.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEliminate(eliminatingId)}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500">
                تلفیق شود
              </button>
              <button onClick={() => setEliminatingId(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consolidation;
