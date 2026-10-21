// src/modules/finance/components/ApprovalsView.tsx
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatPersianNumber, toPersianDigits } from '../utils/persianUtils';

type DocKind = 'voucher' | 'purchase' | 'payment' | 'receipt';

interface PendingDoc {
  id: string;
  kind: DocKind;
  number: string;
  date: string;
  amount: number;
  submitter: string;
  status: string;
}

const KIND_LABELS: Record<DocKind, string> = {
  voucher: 'سند حسابداری', purchase: 'سند خرید',
  payment: 'سند پرداخت', receipt: 'سند دریافت',
};

export function ApprovalsView() {
  const vouchers = useFinanceStore((s) => s.vouchers);
  const purchaseDocs = useFinanceStore((s) => s.purchaseDocuments);
  const receiptPaymentDocs = useFinanceStore((s) => s.receiptPaymentDocs);
  const postVoucher = useFinanceStore((s) => s.postVoucher);
  const updatePurchaseDocumentStatus = useFinanceStore((s) => s.updatePurchaseDocumentStatus);
  const postReceiptPaymentToGL = useFinanceStore((s) => s.postReceiptPaymentToGL);
  const cancelReceiptPaymentDoc = useFinanceStore((s) => s.cancelReceiptPaymentDoc);

  const [kindFilter, setKindFilter] = useState<DocKind | 'all'>('all');
  const [rejectTarget, setRejectTarget] = useState<PendingDoc | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pending = useMemo<PendingDoc[]>(() => [
    ...vouchers.filter((v) => v.status === 'draft').map((v) => ({
      id: v.id, kind: 'voucher' as const, number: v.voucherNumber, date: v.date,
      amount: v.entries.reduce((s, e) => s + e.debit, 0),
      submitter: v.preparedBy || 'کاربر مالی', status: v.status,
    })),
    ...purchaseDocs.filter((d) => d.status === 'draft').map((d) => ({
      id: d.id, kind: 'purchase' as const, number: d.documentNumber, date: d.date,
      amount: d.grandTotal, submitter: d.vendorName ?? '—', status: d.status,
    })),
    ...receiptPaymentDocs.filter((d) => d.status === 'draft').map((d) => ({
      id: d.id, kind: d.type as DocKind, number: d.documentNumber, date: d.date,
      amount: d.totalAmount, submitter: d.entityName ?? '—', status: d.status,
    })),
  ], [vouchers, purchaseDocs, receiptPaymentDocs]);

  const filtered = kindFilter === 'all' ? pending : pending.filter((d) => d.kind === kindFilter);

  const applyStatus = (doc: PendingDoc, approved: boolean, reason?: string) => {
    try {
      if (doc.kind === 'purchase') {
        updatePurchaseDocumentStatus(doc.id, approved ? 'approved' : 'cancelled', 'کاربر مالی');
      } else if (doc.kind === 'voucher') {
        if (approved) postVoucher(doc.id);
      } else if (approved) {
        postReceiptPaymentToGL(doc.id);
      } else {
        cancelReceiptPaymentDoc(doc.id, reason ?? '');
      }
      if (approved) toast.success(`${KIND_LABELS[doc.kind]} ${doc.number} تأیید شد`);
      else toast.warning(`${KIND_LABELS[doc.kind]} ${doc.number} رد شد${reason ? ` — دلیل: ${reason}` : ''}`);
    } catch {
      toast.error('خطا در به‌روزرسانی وضعیت سند');
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">اسناد در انتظار تأیید ({toPersianDigits(filtered.length)})</h2>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as DocKind | 'all')}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm"
        >
          <option value="all">همه انواع</option>
          {Object.entries(KIND_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50 text-slate-400">
            <th className="p-2 text-right">نوع سند</th>
            <th className="p-2 text-right">شماره</th>
            <th className="p-2 text-right">تاریخ</th>
            <th className="p-2 text-right">مبلغ</th>
            <th className="p-2 text-right">ثبت‌کننده</th>
            <th className="p-2 text-right">اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-slate-500">سندی در انتظار تأیید وجود ندارد</td></tr>
          )}
          {filtered.map((doc) => (
            <tr key={`${doc.kind}-${doc.id}`} className="border-b border-slate-800">
              <td className="p-2">{KIND_LABELS[doc.kind]}</td>
              <td className="p-2 font-mono text-xs">{toPersianDigits(doc.number)}</td>
              <td className="p-2">{toPersianDigits(doc.date)}</td>
              <td className="p-2 text-amber-400">{formatPersianNumber(doc.amount)}</td>
              <td className="p-2">{doc.submitter}</td>
              <td className="flex gap-1 p-2">
                <Button size="sm" variant="ghost" onClick={() => applyStatus(doc, true)} title="تأیید">
                  <Check size={16} className="text-emerald-400" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejectTarget(doc); setRejectReason(''); }} title="رد">
                  <X size={16} className="text-red-400" />
                </Button>
                <Button
                  size="sm" variant="ghost" title="درخواست اصلاح"
                  onClick={() => { applyStatus(doc, false, 'نیاز به اصلاح'); toast.info('درخواست اصلاح برای ثبت‌کننده ارسال شد'); }}
                >
                  <MessageSquare size={16} className="text-slate-400" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent dir="rtl" className="bg-slate-900">
          <DialogHeader><DialogTitle>دلیل رد سند {rejectTarget?.number}</DialogTitle></DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="دلیل رد را بنویسید…"
            rows={3}
          />
          <Button
            disabled={rejectReason.trim().length < 3}
            onClick={() => { if (rejectTarget) applyStatus(rejectTarget, false, rejectReason.trim()); setRejectTarget(null); }}
            className="bg-red-500 text-white hover:bg-red-400"
          >
            تأیید رد سند
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
