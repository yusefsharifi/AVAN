import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Plus, X, CheckCircle2, RotateCcw, Ban, Printer } from 'lucide-react';
import type { Check } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const STATUS_CFG: Record<Check['status'], { fa: string; color: string; bg: string }> = {
  issued: { fa: 'صادرشده', color: 'text-blue-700', bg: 'bg-blue-50' },
  pending_clearance: { fa: 'در انتظار وصول', color: 'text-amber-700', bg: 'bg-amber-50' },
  cleared: { fa: 'وصول‌شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  bounced: { fa: 'برگشت‌خورده', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { fa: 'ابطال‌شده', color: 'text-gray-500', bg: 'bg-gray-100' },
  returned: { fa: 'مرجوع‌شده', color: 'text-gray-500', bg: 'bg-gray-100' },
};

function numberToWordsIRR(n: number): string {
  // Simplified formal placeholder — full Persian number-to-words spelling is out of scope here.
  return `${fmt(n)} ریال`;
}

export default function ChecksView() {
  const { checks, checkbooks, buyers, createCheckbook, issueCheck, clearCheck, bounceCheck, cancelCheck } = useFinanceStore();
  const [subTab, setSubTab] = useState<'checks' | 'checkbooks'>('checks');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [cbModalOpen, setCbModalOpen] = useState(false);
  const [clearModalId, setClearModalId] = useState<string | null>(null);
  const [bounceModalId, setBounceModalId] = useState<string | null>(null);
  const [printCheck, setPrintCheck] = useState<Check | null>(null);
  const [reason, setReason] = useState('');
  const [penalty, setPenalty] = useState('0');
  const [clearanceDate, setClearanceDate] = useState('');

  const [issueForm, setIssueForm] = useState({ checkbookId: checkbooks[0]?.id ?? '', direction: 'outgoing' as Check['direction'], payeeName: '', amount: '', dueDate: '', notes: '' });
  const [cbForm, setCbForm] = useState({ bankAccountId: '', bankName: '', accountNumber: '', series: '', startNumber: '', endNumber: '', totalLeaves: '' });

  const activeCheckbooks = checkbooks.filter((c) => c.status === 'active');

  const submitIssue = () => {
    if (!issueForm.checkbookId || !issueForm.amount || !issueForm.dueDate) { toast.error('دسته چک، مبلغ و تاریخ سررسید الزامی است'); return; }
    issueCheck(issueForm.checkbookId, { direction: issueForm.direction, payeeName: issueForm.direction === 'outgoing' ? issueForm.payeeName : undefined, payerName: issueForm.direction === 'incoming' ? issueForm.payeeName : undefined, amount: Number(issueForm.amount), dueDate: issueForm.dueDate, notes: issueForm.notes });
    toast.success('چک جدید صادر شد');
    setIssueModalOpen(false);
    setIssueForm({ checkbookId: checkbooks[0]?.id ?? '', direction: 'outgoing', payeeName: '', amount: '', dueDate: '', notes: '' });
  };

  const submitCheckbook = () => {
    if (!cbForm.bankName.trim() || !cbForm.startNumber || !cbForm.totalLeaves) { toast.error('اطلاعات دسته چک را کامل کنید'); return; }
    createCheckbook({ ...cbForm, totalLeaves: Number(cbForm.totalLeaves) });
    toast.success('دسته چک جدید ثبت شد');
    setCbModalOpen(false);
    setCbForm({ bankAccountId: '', bankName: '', accountNumber: '', series: '', startNumber: '', endNumber: '', totalLeaves: '' });
  };

  const handleClear = () => {
    if (!clearModalId) return;
    clearCheck(clearModalId, clearanceDate || new Date().toISOString().slice(0, 10));
    toast.success('وصول چک ثبت و سند حسابداری صادر شد');
    setClearModalId(null); setClearanceDate('');
  };
  const handleBounce = () => {
    if (!bounceModalId) return;
    bounceCheck(bounceModalId, reason || 'نامشخص', Number(penalty || 0));
    toast.success('برگشت چک ثبت شد');
    setBounceModalId(null); setReason(''); setPenalty('0');
  };
  const handleCancel = (id: string) => {
    const r = prompt('دلیل ابطال چک:');
    if (r === null) return;
    cancelCheck(id, r || 'نامشخص');
    toast.success('چک ابطال شد');
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        <button onClick={() => setSubTab('checks')} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${subTab === 'checks' ? 'bg-primary text-white' : 'text-muted-foreground'}`}>چک‌ها</button>
        <button onClick={() => setSubTab('checkbooks')} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${subTab === 'checkbooks' ? 'bg-primary text-white' : 'text-muted-foreground'}`}>دسته چک‌ها</button>
      </div>

      {subTab === 'checks' && (
        <>
          <div className="bg-card border border-border rounded-lg overflow-auto max-h-[440px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-100">
                <tr>{['عملیات', 'ملاحظات', 'تاریخ وصول', 'وضعیت', 'دریافت/پرداخت‌کننده', 'مبلغ', 'تاریخ سررسید', 'تاریخ صدور', 'بانک', 'شماره چک'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {checks.map((c, i) => {
                  const cfg = STATUS_CFG[c.status];
                  return (
                    <tr key={c.id} className={`border-b border-border/30 ${i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          {(c.status === 'issued' || c.status === 'pending_clearance') && <button onClick={() => setClearModalId(c.id)} className="text-emerald-700 hover:underline flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />وصول</button>}
                          {c.status === 'cleared' && <button onClick={() => setBounceModalId(c.id)} className="text-red-700 hover:underline flex items-center gap-0.5"><RotateCcw className="w-3 h-3" />برگشت</button>}
                          {c.status === 'issued' && <button onClick={() => handleCancel(c.id)} className="text-gray-600 hover:underline flex items-center gap-0.5"><Ban className="w-3 h-3" />ابطال</button>}
                          <button onClick={() => setPrintCheck(c)} className="text-accent hover:underline flex items-center gap-0.5"><Printer className="w-3 h-3" />چاپ</button>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">{c.notes}</td>
                      <td className="py-1.5 px-2 font-mono" dir="ltr">{c.clearanceDate ?? '—'}</td>
                      <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                      <td className="py-1.5 px-2">{c.direction === 'outgoing' ? c.payeeName : c.payerName}</td>
                      <td className="py-1.5 px-2 font-mono" dir="ltr">{fmt(c.amount)}</td>
                      <td className="py-1.5 px-2 font-mono" dir="ltr">{c.dueDate}</td>
                      <td className="py-1.5 px-2 font-mono" dir="ltr">{c.issueDate}</td>
                      <td className="py-1.5 px-2">{c.bankName}</td>
                      <td className="py-1.5 px-2 font-mono" dir="ltr">{c.checkNumber}</td>
                    </tr>
                  );
                })}
                {checks.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">چکی ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-border rounded-lg p-2">
            <button onClick={() => setIssueModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[80px]">
              <Plus className="w-4 h-4" /><span>صدور چک جدید</span>
            </button>
            <span className="mr-auto text-[11px] text-muted-foreground">تعداد = {checks.length}</span>
          </div>
        </>
      )}

      {subTab === 'checkbooks' && (
        <>
          <div className="bg-card border border-border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100"><tr>{['وضعیت', 'باقی‌مانده', 'مصرف‌شده', 'کل برگ', 'شماره جاری', 'شماره آخر', 'شماره اول', 'بانک', 'کد دسته چک'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border">{h}</th>)}</tr></thead>
              <tbody>
                {checkbooks.map((cb, i) => (
                  <tr key={cb.id} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cb.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{cb.status === 'active' ? 'فعال' : cb.status === 'exhausted' ? 'اتمام یافته' : 'باطل‌شده'}</span></td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.remainingLeaves}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.usedLeaves}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.totalLeaves}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.currentNumber}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.endNumber}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.startNumber}</td>
                    <td className="py-1.5 px-2">{cb.bankName}</td>
                    <td className="py-1.5 px-2 font-mono" dir="ltr">{cb.bookNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 border border-border rounded-lg p-2">
            <button onClick={() => setCbModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px]">
              <Plus className="w-4 h-4" /><span>دسته چک جدید</span>
            </button>
          </div>
        </>
      )}

      {/* Issue check modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setIssueModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setIssueModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">صدور چک جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>دسته چک</label>
                <select value={issueForm.checkbookId} onChange={(e) => setIssueForm((f) => ({ ...f, checkbookId: e.target.value }))} className={inputCls} dir="rtl">
                  {activeCheckbooks.map((cb) => <option key={cb.id} value={cb.id}>{cb.bookNumber} — {cb.bankName} ({cb.remainingLeaves} برگ باقی)</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>نوع</label>
                <select value={issueForm.direction} onChange={(e) => setIssueForm((f) => ({ ...f, direction: e.target.value as Check['direction'] }))} className={inputCls} dir="rtl">
                  <option value="outgoing">پرداختی (صادره)</option><option value="incoming">دریافتی</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{issueForm.direction === 'outgoing' ? 'دریافت‌کننده' : 'صادرکننده'}</label>
                <select value={issueForm.payeeName} onChange={(e) => setIssueForm((f) => ({ ...f, payeeName: e.target.value }))} className={inputCls} dir="rtl">
                  <option value="">انتخاب کنید</option>
                  {buyers.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>مبلغ</label><input type="number" value={issueForm.amount} onChange={(e) => setIssueForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>تاریخ سررسید</label><input value={issueForm.dueDate} onChange={(e) => setIssueForm((f) => ({ ...f, dueDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
              </div>
              <button onClick={submitIssue} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">صدور چک</button>
            </div>
          </div>
        </div>
      )}

      {/* New checkbook modal */}
      {cbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setCbModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCbModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">دسته چک جدید</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>نام بانک</label><input value={cbForm.bankName} onChange={(e) => setCbForm((f) => ({ ...f, bankName: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>شماره حساب</label><input value={cbForm.accountNumber} onChange={(e) => setCbForm((f) => ({ ...f, accountNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>شماره اول</label><input value={cbForm.startNumber} onChange={(e) => setCbForm((f) => ({ ...f, startNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>شماره آخر</label><input value={cbForm.endNumber} onChange={(e) => setCbForm((f) => ({ ...f, endNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
              </div>
              <div><label className={labelCls}>تعداد برگ</label><input type="number" value={cbForm.totalLeaves} onChange={(e) => setCbForm((f) => ({ ...f, totalLeaves: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <button onClick={submitCheckbook} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ثبت دسته چک</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear check modal */}
      {clearModalId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setClearModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-foreground mb-3">ثبت وصول چک</p>
            <label className={labelCls}>تاریخ وصول</label>
            <input value={clearanceDate} onChange={(e) => setClearanceDate(e.target.value)} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" />
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setClearModalId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleClear} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs">ثبت وصول</button>
            </div>
          </div>
        </div>
      )}

      {/* Bounce check modal */}
      {bounceModalId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setBounceModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-foreground mb-3">ثبت برگشت چک</p>
            <label className={labelCls}>دلیل برگشت</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} rows={2} dir="rtl" />
            <label className={labelCls}>جریمه برگشت</label>
            <input type="number" value={penalty} onChange={(e) => setPenalty(e.target.value)} className={inputCls} dir="ltr" />
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setBounceModalId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleBounce} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">ثبت برگشت</button>
            </div>
          </div>
        </div>
      )}

      {/* Print check */}
      {printCheck && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setPrintCheck(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[28rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="border-2 border-gray-300 rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground">{printCheck.bankName}</p>
              <p className="text-sm">در وجه: <span className="font-semibold">{printCheck.direction === 'outgoing' ? printCheck.payeeName : printCheck.payerName}</span></p>
              <p className="text-sm">مبلغ: <span className="font-semibold">{numberToWordsIRR(printCheck.amount)}</span></p>
              <p className="text-xs text-muted-foreground" dir="ltr">تاریخ: {printCheck.dueDate} — شماره: {printCheck.checkNumber}</p>
            </div>
            <button onClick={() => window.print()} className="w-full mt-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">چاپ</button>
          </div>
        </div>
      )}
    </div>
  );
}
