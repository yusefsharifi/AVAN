import { useState } from 'react';
import { useFinanceStore } from '../../store';
import { CheckCircle2 } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const STATUS_LABELS: Record<string, { fa: string; color: string; bg: string }> = {
  open: { fa: 'باز', color: 'text-slate-600', bg: 'bg-slate-100' },
  partially_applied: { fa: 'تسویه جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  fully_applied: { fa: 'تسویه‌شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { fa: 'ابطال‌شده', color: 'text-red-700', bg: 'bg-red-50' },
};

export default function ParentDocumentsTab() {
  const { parentDocuments, receiptPaymentDocs } = useFinanceStore();
  const [selectedId, setSelectedId] = useState<string | null>(parentDocuments[0]?.id ?? null);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const list = onlyOpen ? parentDocuments.filter((p) => p.remainingAmount > 0) : parentDocuments;
  const selected = parentDocuments.find((p) => p.id === selectedId);
  const children = receiptPaymentDocs.filter((d) => selected?.childDocumentIds.includes(d.id));

  return (
    <div className="grid grid-cols-2 gap-4" dir="rtl">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-foreground"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />فقط مانده‌دار</label>
          <h3 className="text-sm font-bold text-foreground">اسناد والد (فاکتورها)</h3>
        </div>
        <div className="bg-card border border-border rounded-lg overflow-auto max-h-[480px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-100"><tr>{['مانده', 'تسویه‌شده', 'مبلغ کل', 'شخص', 'شماره سند'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border">{h}</th>)}</tr></thead>
            <tbody>
              {list.map((p) => {
                const isSel = p.id === selectedId;
                const pct = p.totalAmount ? Math.round((p.settledAmount / p.totalAmount) * 100) : 0;
                return (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)} className={`cursor-pointer border-b border-border/30 ${isSel ? 'bg-blue-600 text-white' : 'hover:bg-secondary/30'}`}>
                    <td className="py-2 px-2">
                      <span className="font-mono" dir="ltr">{fmt(p.remainingAmount)}</span>
                      <div className="w-full bg-secondary rounded-full h-1 mt-1"><div className={`h-1 rounded-full ${isSel ? 'bg-white' : 'bg-accent'}`} style={{ width: `${pct}%` }} /></div>
                    </td>
                    <td className="py-2 px-2 font-mono" dir="ltr">{fmt(p.settledAmount)}</td>
                    <td className="py-2 px-2 font-mono" dir="ltr">{fmt(p.totalAmount)}</td>
                    <td className="py-2 px-2">{p.entityName}</td>
                    <td className="py-2 px-2 font-mono" dir="ltr">{p.documentNumber}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">رکوردی یافت نشد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">اسناد فرزند (تسویه‌ها)</h3>
        {selected ? (
          <>
            <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{selected.description}</p>
              <p className="text-muted-foreground" dir="ltr">{selected.documentNumber} — {selected.date}</p>
              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_LABELS[selected.status].color} ${STATUS_LABELS[selected.status].bg}`}>{STATUS_LABELS[selected.status].fa}</span>
            </div>
            <div className="bg-card border border-border rounded-lg overflow-auto max-h-[380px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-100"><tr>{['وضعیت', 'شماره چک', 'نوع', 'مبلغ', 'تاریخ', 'شماره سند'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border">{h}</th>)}</tr></thead>
                <tbody>
                  {children.map((c) => (
                    <tr key={c.id} className="border-b border-border/30">
                      <td className="py-2 px-2">{c.status === 'posted' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : c.status}</td>
                      <td className="py-2 px-2 font-mono" dir="ltr">{c.checkNumber ?? '—'}</td>
                      <td className="py-2 px-2">{c.type === 'receipt' ? 'دریافت' : 'پرداخت'}</td>
                      <td className="py-2 px-2 font-mono" dir="ltr">{fmt(c.totalAmount)}</td>
                      <td className="py-2 px-2 font-mono" dir="ltr">{c.date}</td>
                      <td className="py-2 px-2 font-mono" dir="ltr">{c.documentNumber}</td>
                    </tr>
                  ))}
                  {children.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">هنوز تسویه‌ای ثبت نشده</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="text-sm text-muted-foreground text-center py-10">یک سند والد انتخاب کنید</p>}
      </div>
    </div>
  );
}
