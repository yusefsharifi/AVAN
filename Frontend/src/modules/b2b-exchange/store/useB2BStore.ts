import { create } from 'zustand';
import { toast } from 'sonner';
import type { Bid, CategoryNode, CompanyMarketplaceProfile, RFQ } from '../types';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { persistMutation, loadCollection } from '@/shared/lib/serverSync';
import { USE_MOCKS, PERSISTENCE_MESSAGES } from '@/shared/lib/mockMode';
 
const now = () => '۱۴۰۳/۰۴/۲۰ ۱۰:۰۰';
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ── نگاشت به DTOهای بک‌اند ────────────────────────────────────────────────────
// سراسر بک‌اند با ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
// اجرا می‌شود؛ هر فیلد اضافی در body باعث خطای 400 می‌شود. بنابراین payloadها
// فیلدبه‌فیلد و فقط با فیلدهای پذیرفته‌شده DTO ساخته می‌شوند.

const toCreateRfqDto = (rfq: Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt'>) => ({
  // CreateRfqDto
  zoneId: useAuthStore.getState().user?.zoneId,
  companyId: rfq.requesterCompanyId,
  title: rfq.title,
  description: rfq.description,
  categoryId: rfq.categoryId,
  categoryPath: rfq.categoryPath,
  quantity: rfq.quantity,
  unit: rfq.uom,
  deliveryLocation: rfq.deliveryLocation,
  // TODO(BACKEND-FRONT): رشته‌های تاریخ فرانت جلالی هستند ولی DTO انتظار ISO دارد؛
  // تا افزودن مبدل تاریخ، همین مقدار ارسال و خطای احتمالی سرور با rollback گزارش می‌شود.
  submissionDeadline: rfq.deadlineDate,
  deliveryDeadline: rfq.deliveryDeadline,
  incoterm: rfq.incoterm,
  currencyCode: 'IRR',
  maxBudget: rfq.maxBudget,
  technicalSpecs: rfq.specifications.map((s) => `${s.parameter}: ${s.value}`).join('\n'),
  // 'sealed_bid' فرانت ⇒ SEALED در BiddingModeEnum بک‌اند
  biddingMode: 'SEALED',
  autoConvertToPO: rfq.autoConvertToPO,
  evaluationCriteria: rfq.evaluationCriteria.map((c) => ({
    criterion: c.name,
    weight: c.weight,
    description: c.name,
  })),
});

const toUpdateRfqDto = (updates: Partial<RFQ>) => ({
  title: updates.title,
  description: updates.description,
  quantity: updates.quantity,
  unit: updates.uom,
  submissionDeadline: updates.deadlineDate,
  deliveryLocation: updates.deliveryLocation,
  maxBudget: updates.maxBudget,
});

const toCreateBidDto = (bid: Omit<Bid, 'id' | 'bidNumber' | 'createdAt'>) => ({
  // CreateBidDto — قیمت‌ها باید عدد صحیح باشند (IsInt)
  rfqId: bid.rfqId,
  supplierId: bid.supplierId,
  unitPrice: Math.round(bid.unitPrice),
  totalPrice: Math.round(bid.totalPrice),
  deliveryDays: bid.deliveryDays,
  paymentTerms: bid.paymentTerms,
  validityDays: bid.validityDays,
  warrantyMonths: bid.warrantyMonths,
  technicalCompliance: bid.technicalCompliance,
  technicalResponse: bid.technicalResponse,
  sampleAttached: bid.sampleOffered,
  notes: bid.deliverySchedule,
});

interface B2BStore {
  rfqs: RFQ[];
  bids: Bid[];
  currentCompany: CompanyMarketplaceProfile;
  categories: CategoryNode[];
  selectedRFQId: string | null;
  selectedBidId: string | null;
  isLoading: boolean;
  createRFQ: (rfq: Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt'>) => void;
  updateRFQ: (id: string, updates: Partial<RFQ>) => void;
  publishRFQ: (id: string) => void;
  cancelRFQ: (id: string) => void;
  deleteRFQ: (id: string) => void;
  extendRFQDeadline: (id: string, deadlineDate: string) => void;
  submitBid: (bid: Omit<Bid, 'id' | 'bidNumber' | 'createdAt'>) => void;
  deleteBid: (bidId: string) => void;
  awardBid: (rfqId: string, bidId: string, reason: string, autoConvertToPO?: boolean) => void;
  getMyRFQs: () => RFQ[];
  getAvailableRFQs: () => RFQ[];
  getMyBids: () => Bid[];
  getBidsForRFQ: (rfqId: string) => Bid[];
  getRFQById: (id: string) => RFQ | undefined;
  getBidById: (bidId: string) => Bid | undefined;
  getStats: () => { activeRFQs:number; activeBids:number; totalSavings:number; winRate:number };
  getParkAggregateStats: () => { totalRFQs:number; activeRFQs:number; totalBids:number; awardedRFQs:number; totalValue:number };
  updateRFQPoId: (rfqId: string, orderId: string) => void;  // New action
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
};
 
export const useB2BStore = create<B2BStore>((set, get) => ({
  rfqs: [],
  bids: [],
  currentCompany: { companyId: '', companyName: '', totalSavings: 0, winRate: 0 } as CompanyMarketplaceProfile,
  categories: [],
  selectedRFQId: null,
  selectedBidId: null,
  isLoading: false,

  // ── بارگذاری اولیه (BUG-PERSIST-001): REPLACE کامل در موفقیت، toast فارسی در شکست ──
  loadFromApi: async () => {
    set({ isLoading: true });
    await Promise.all([
      loadCollection<RFQ>(
        () => api.get<RFQ[]>('/b2b/rfq'),
        (rows) => set({ rfqs: rows }),
      ),
      loadCollection<Bid>(
        () => api.get<Bid[]>('/b2b/bids'),
        (rows) => set({ bids: rows }),
      ),
    ]);
    set({ isLoading: false });
  },

  // ── استعلام (RFQ) ─────────────────────────────────────────────────────────
  createRFQ: (rfq) => {
    const local: RFQ = {
      ...rfq,
      id: id('rfq'),
      rfqNumber: `RFQ-1403-${String(get().rfqs.length + 123).padStart(5, '0')}`,
      createdAt: now(),
      updatedAt: now(),
    };
    // افزودن خوش‌بینانه بیرون از persistMutation انجام می‌شود تا entity محلی
    // همزمان برگردد و در حالت دمو (skip) هم رفتار قبلی حفظ شود.
    set((s) => ({ rfqs: [local, ...s.rfqs] }));
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      request: () => api.post<RFQ>('/b2b/rfq', toCreateRfqDto(rfq)),
      rollback: () => set((s) => ({ rfqs: s.rfqs.filter((r) => r.id !== local.id) })),
      // فقط شناسه سرور adopt می‌شود تا اعمال بعدی (publish/cancel/award) به ردیف
      // واقعی سرور بخورند؛ ساختار فیلدها فرانت‌اند باقی می‌ماند.
      reconcile: (server) =>
        set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === local.id && server.id ? { ...r, id: server.id } : r)) })),
      messageFa: PERSISTENCE_MESSAGES.createFailed,
      skip: USE_MOCKS,
    });
  },
  updateRFQ: (rfqId, updates) => {
    const prev = get().rfqs;
    set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, ...updates, updatedAt: now() } : r)) }));
    // TODO(BACKEND): PATCH /b2b/rfq/:id فعلاً stub است و body را نادیده می‌گیرد؛
    // به همین دلیل reconcile نمی‌شود تا ویرایش کاربر با پاسخ قدیمی سرور بازنویسی نشود.
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      request: async () => {
        await api.patch(`/b2b/rfq/${rfqId}`, toUpdateRfqDto(updates));
      },
      rollback: () => set({ rfqs: prev }),
      messageFa: PERSISTENCE_MESSAGES.updateFailed,
      skip: USE_MOCKS,
    });
  },
  publishRFQ: (rfqId) => {
    const prev = get().rfqs;
    set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'bidding', publishDate: '۱۴۰۳/۰۴/۲۰', updatedAt: now() } : r)) }));
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      // PublishRfqDto همه فیلدهایش اختیاری است و کنترلر rfqId را خودش ست می‌کند
      request: () => api.post<RFQ>(`/b2b/rfq/${rfqId}/publish`, {}),
      rollback: () => set({ rfqs: prev }),
      reconcile: (server) =>
        set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId && server.id ? { ...r, id: server.id } : r)) })),
      messageFa: 'خطا در انتشار استعلام؛ استعلام منتشر نشد',
      skip: USE_MOCKS,
    });
  },
  cancelRFQ: (rfqId) => {
    const prev = get().rfqs;
    set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, status: 'cancelled', updatedAt: now() } : r)) }));
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      request: () => api.post<RFQ>(`/b2b/rfq/${rfqId}/cancel`, { reason: 'لغو استعلام توسط کاربر' }),
      rollback: () => set({ rfqs: prev }),
      messageFa: 'خطا در لغو استعلام؛ استعلام لغو نشد',
      skip: USE_MOCKS,
    });
  },
  deleteRFQ: (rfqId) => {
    // TODO(BACKEND): endpoint حذف استعلام (DELETE /b2b/rfq/:id) وجود ندارد؛
    // پیش‌نویس‌ها فقط محلی حذف می‌شوند و چون هرگز به سرور ارسال نشده‌اند داده‌ای گم نمی‌شود.
    set((s) => ({ rfqs: s.rfqs.filter(r => r.id !== rfqId || r.status !== 'draft') }));
  },
  extendRFQDeadline: (rfqId, deadlineDate) => {
    const prev = get().rfqs;
    set((s) => ({ rfqs: s.rfqs.map((r) => (r.id === rfqId ? { ...r, deadlineDate, status: 'bidding', updatedAt: now() } : r)) }));
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      // TODO(BACKEND-FRONT): سرویس reopen تاریخ را new Date(newDeadline) می‌کند؛
      // چون مقدار فرانت جلالی است ممکن است سرور خطا بدهد و rollback انجام شود.
      request: () =>
        api.post<RFQ>(`/b2b/rfq/${rfqId}/reopen`, {
          newDeadline: deadlineDate,
          reason: 'تمدید مهلت ارسال پیشنهاد',
        }),
      rollback: () => set({ rfqs: prev }),
      messageFa: 'خطا در تمدید مهلت استعلام؛ مهلت جدید اعمال نشد',
      skip: USE_MOCKS,
    });
  },

  // ── پیشنهاد (Bid) ─────────────────────────────────────────────────────────
  submitBid: (bid) => {
    const local: Bid = {
      ...bid,
      id: id('bid'),
      bidNumber: `BID-1403-${String(get().bids.length + 123).padStart(5, '0')}`,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ bids: [local, ...s.bids] }));
    void persistMutation<Bid>({
      optimistic: () => undefined,
      request: async () => {
        const created = await api.post<Bid>('/b2b/bids', toCreateBidDto(local));
        if (local.status === 'draft' || !created?.id) return created;
        // پیشنهاد ارسال‌شده باید علاوه بر ایجاد، submit هم شود
        return api.post<Bid>(`/b2b/bids/${created.id}/submit`, {});
      },
      rollback: () => set((s) => ({ bids: s.bids.filter((b) => b.id !== local.id) })),
      reconcile: (server) =>
        set((s) => ({ bids: s.bids.map((b) => (b.id === local.id && server.id ? { ...b, id: server.id } : b)) })),
      messageFa: PERSISTENCE_MESSAGES.createFailed,
      skip: USE_MOCKS,
    });
  },
  deleteBid: (bidId) => {
    if (!get().bids.some((b) => b.id === bidId && b.status === 'draft')) return;
    const prev = get().bids;
    set((s) => ({ bids: s.bids.filter(bid => bid.id !== bidId || bid.status !== 'draft') }));
    void persistMutation<Bid>({
      optimistic: () => undefined,
      request: () => api.post<Bid>(`/b2b/bids/${bidId}/withdraw`, { reason: 'انصراف از پیشنهاد توسط تأمین‌کننده' }),
      rollback: () => set({ bids: prev }),
      messageFa: PERSISTENCE_MESSAGES.deleteFailed,
      skip: USE_MOCKS,
    });
  },
  awardBid: (rfqId, bidId, reason, autoConvertToPO = false) => {
    const prevRfqs = get().rfqs;
    const prevBids = get().bids;
    set(s => { const winner=s.bids.find(b=>b.id===bidId); return { rfqs:s.rfqs.map(r=>r.id===rfqId?{...r,status:'awarded',awardedBidId:bidId,awardedSupplierId:winner?.supplierId,awardedSupplierName:winner?.supplierCompanyName,awardReason:reason,awardDate:'۱۴۰۳/۰۴/۲۰',autoConvertToPO,poId:autoConvertToPO?`PO-1403-${String(s.rfqs.length+1).padStart(5,'0')}`:undefined}:r), bids:s.bids.map(b=>b.rfqId===rfqId?{...b,status:b.id===bidId?'awarded':'rejected'}:b) }; });
    void persistMutation<RFQ>({
      optimistic: () => undefined,
      // AwardRfqDto: rfqId + winningBidId + awardNote (حداقل ۱۰ کاراکتر)
      request: async () => {
        await api.post('/b2b/award', {
          rfqId,
          winningBidId: bidId,
          awardNote: reason.trim() ? reason : 'برنده مناقصه بر اساس ارزیابی فنی و مالی تعیین شد',
          autoConvertToPO,
        });
      },
      rollback: () => set({ rfqs: prevRfqs, bids: prevBids }),
      messageFa: 'خطا در ثبت برنده مناقصه؛ تغییرات برگردانده شد',
      skip: USE_MOCKS,
    });
  },

  // ── محاسباتی ──────────────────────────────────────────────────────────────
  getMyRFQs: () => get().rfqs.filter(r => r.requesterCompanyId === get().currentCompany.companyId),
  getAvailableRFQs: () => get().rfqs.filter(r => r.requesterCompanyId !== get().currentCompany.companyId && ['published','bidding'].includes(r.status)),
  getMyBids: () => get().bids.filter(b => b.supplierId === get().currentCompany.companyId),
  getBidsForRFQ: (rfqId) => get().bids.filter(b => b.rfqId === rfqId),
  getRFQById: (rfqId) => get().rfqs.find(r => r.id === rfqId),
  getBidById: (bidId) => get().bids.find(b => b.id === bidId),
  getStats: () => ({ activeRFQs:get().getMyRFQs().filter(r=>['published','bidding'].includes(r.status)).length, activeBids:get().getMyBids().filter(b=>b.status==='submitted').length, totalSavings:get().currentCompany.totalSavings, winRate:get().currentCompany.winRate }),
  getParkAggregateStats: () => {
    const rfqs = get().rfqs;
    const bids = get().bids;
    return {
      totalRFQs: rfqs.length,
      activeRFQs: rfqs.filter(r => ['published', 'bidding', 'evaluation'].includes(r.status)).length,
      totalBids: bids.length,
      awardedRFQs: rfqs.filter(r => r.status === 'awarded').length,
      totalValue: rfqs.reduce((sum, rfq) => sum + (rfq.maxBudget || 0), 0),
    };
  },
  updateRFQPoId: (rfqId, orderId) => {
    // TODO(BACKEND): پیوند RFQ با شماره سند خرید endpoint ندارد؛ فعلاً محلی ثبت
    // می‌شود و با رفرش صفحه از بین می‌رود — بنابراین به کاربر اطلاع داده می‌شود.
    toast.info('پیوند سند خرید به‌صورت موقت ثبت شد؛ پس از پیاده‌سازی سرویس به‌صورت دائمی ذخیره می‌شود');
    set(s => {
      const rfq = s.rfqs.find(r => r.id === rfqId);
      if (rfq) {
        return {
          rfqs: s.rfqs.map(r => r.id === rfqId ? { ...r, poId: orderId } : r)
        };
      }
      return s;
    });
  },
}));
