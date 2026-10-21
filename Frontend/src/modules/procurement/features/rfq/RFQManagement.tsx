import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { PriceComparisonTable } from '../../components';
import { RFQ_STATUS_CONFIG } from '../../constants';
import { Plus, Search, ChevronLeft, X, Trophy } from 'lucide-react';
import type { RFQStatus, QuotationLine, PaymentTerms } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function RFQManagement() {
  const { rfqs, vendors, purchaseRequests, receiveQuotation, awardRFQ } = useProcurementStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RFQStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteModal, setQuoteModal] = useState<{ rfqId: string; vendorId: string } | null>(null);

  const [quoteForm, setQuoteForm] = useState<{ quotationNumber: string; validUntil: string; paymentTerms: PaymentTerms; deliveryTerms: string; discount: string; lines: QuotationLine[] }>({
    quotationNumber: '', validUntil: '', paymentTerms: 'net30', deliveryTerms: '', discount: '0', lines: [],
  });

  const filtered = rfqs.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) return r.rfqNumber.includes(search) || r.title.includes(search);
    return true;
  });

  const openQuoteModal = (rfqId: string, vendorId: string) => {
    const rfq = rfqs.find((r) => r.id === rfqId);
    const pr = purchaseRequests.find((p) => p.id === rfq?.prId);
    setQuoteForm({
      quotationNumber: '', validUntil: '', paymentTerms: 'net30', deliveryTerms: '', discount: '0',
      lines: (pr?.lines ?? []).map((l) => ({ prLineId: l.id, itemId: l.itemId, itemNameFa: l.itemNameFa, itemSku: l.itemSku, requestedQuantity: l.requestedQuantity, offeredQuantity: l.requestedQuantity, unitPrice: 0, totalPrice: 0, deliveryDays: 7, notes: '' })),
    });
    setQuoteModal({ rfqId, vendorId });
  };

  const submitQuote = () => {
    if (!quoteModal) return;
    const lines = quoteForm.lines.map((l) => ({ ...l, totalPrice: l.offeredQuantity * l.unitPrice }));
    receiveQuotation(quoteModal.rfqId, quoteModal.vendorId, { quotationNumber: quoteForm.quotationNumber, validUntil: quoteForm.validUntil, paymentTerms: quoteForm.paymentTerms, deliveryTerms: quoteForm.deliveryTerms, discount: Number(quoteForm.discount || 0), lines });
    setQuoteModal(null);
  };

  const handleAward = (rfqId: string, quotationId: string) => {
    if (!confirm('آیا از انتخاب این پیشنهاد به‌عنوان برنده مطمئن هستید؟ سفارش خرید به‌طور خودکار ایجاد خواهد شد.')) return;
    awardRFQ(rfqId, quotationId, 'مدیر خرید');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">استعلام قیمت‌ها (RFQ)</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RFQStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(RFQ_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{['وضعیت', 'دریافت‌شده', 'مهلت پاسخ', 'تعداد تأمین‌کننده', 'شماره PR', 'عنوان', 'شماره RFQ'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((rfq) => {
              const cfg = RFQ_STATUS_CONFIG[rfq.status];
              const isExp = expandedId === rfq.id;
              const receivedCount = rfq.quotations.filter((q) => q.status === 'received' || q.status === 'awarded').length;
              return (
                <Fragment key={rfq.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExp ? null : rfq.id)}>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{receivedCount}/{rfq.sentToVendors.length}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{rfq.responseDeadline}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{rfq.sentToVendors.length}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{rfq.prNumber}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{rfq.title}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{rfq.rfqNumber}</td>
                  </tr>
                  {isExp && (
                    <tr><td colSpan={7} className="bg-secondary/20 p-4 space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rfq.sentToVendors.map((vId) => {
                          const vendor = vendors.find((v) => v.id === vId);
                          const q = rfq.quotations.find((qq) => qq.vendorId === vId);
                          return (
                            <button key={vId} onClick={() => openQuoteModal(rfq.id, vId)} disabled={q?.status === 'received' || q?.status === 'awarded'}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed">
                              <Plus className="w-3 h-3" />ثبت پیشنهاد {vendor?.nameFa}
                              {(q?.status === 'received' || q?.status === 'awarded') && ' ✓'}
                            </button>
                          );
                        })}
                      </div>

                      <PriceComparisonTable rfq={rfq} vendors={vendors} onAward={(qId) => handleAward(rfq.id, qId)} />

                      {rfq.status === 'awarded' && (
                        <p className="text-[11px] text-emerald-700 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />برنده: {rfq.quotations.find((q) => q.id === rfq.awardedQuotationId)?.vendorName} — تأییدشده توسط {rfq.awardedBy} در {rfq.awardedAt}</p>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">استعلامی یافت نشد</div>}
      </div>

      {/* Quotation receipt modal */}
      {quoteModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setQuoteModal(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setQuoteModal(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت پیشنهاد قیمت</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>شماره پیشنهاد تأمین‌کننده</label><input value={quoteForm.quotationNumber} onChange={(e) => setQuoteForm((f) => ({ ...f, quotationNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>اعتبار تا تاریخ</label><input value={quoteForm.validUntil} onChange={(e) => setQuoteForm((f) => ({ ...f, validUntil: e.target.value }))} placeholder="۱۴۰۳/۰۵/۳۰" className={inputCls} dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>شرایط پرداخت</label>
                  <select value={quoteForm.paymentTerms} onChange={(e) => setQuoteForm((f) => ({ ...f, paymentTerms: e.target.value as PaymentTerms }))} className={inputCls} dir="rtl">
                    <option value="cod">نقدی</option><option value="net15">۱۵ روزه</option><option value="net30">۳۰ روزه</option><option value="net45">۴۵ روزه</option><option value="net60">۶۰ روزه</option><option value="prepaid">پیش‌پرداخت</option><option value="lc">اعتبار اسنادی</option>
                  </select>
                </div>
                <div><label className={labelCls}>تخفیف (٪)</label><input type="number" value={quoteForm.discount} onChange={(e) => setQuoteForm((f) => ({ ...f, discount: e.target.value }))} className={inputCls} dir="ltr" /></div>
              </div>
              <div><label className={labelCls}>شرایط تحویل</label><input value={quoteForm.deliveryTerms} onChange={(e) => setQuoteForm((f) => ({ ...f, deliveryTerms: e.target.value }))} placeholder="DAP انبار مشتری" className={inputCls} dir="rtl" /></div>
              <p className={labelCls}>اقلام</p>
              {quoteForm.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center border-b border-border/30 pb-2">
                  <span className="text-[10px] text-foreground col-span-1">{line.itemNameFa}</span>
                  <input type="number" placeholder="مقدار پیشنهادی" value={line.offeredQuantity} onChange={(e) => setQuoteForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, offeredQuantity: Number(e.target.value) } : l) }))} className={inputCls} dir="ltr" />
                  <input type="number" placeholder="قیمت واحد" value={line.unitPrice || ''} onChange={(e) => setQuoteForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, unitPrice: Number(e.target.value) } : l) }))} className={inputCls} dir="ltr" />
                  <input type="number" placeholder="مدت تحویل (روز)" value={line.deliveryDays} onChange={(e) => setQuoteForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, deliveryDays: Number(e.target.value) } : l) }))} className={inputCls} dir="ltr" />
                </div>
              ))}
              <div className="bg-secondary/30 rounded-lg p-2 text-xs flex justify-between">
                <span className="font-mono font-bold text-foreground" dir="ltr">{quoteForm.lines.reduce((s, l) => s + l.offeredQuantity * l.unitPrice, 0).toLocaleString('fa-IR')}</span>
                <span className="text-muted-foreground">جمع (قبل تخفیف و مالیات)</span>
              </div>
              <button onClick={submitQuote} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت پیشنهاد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
