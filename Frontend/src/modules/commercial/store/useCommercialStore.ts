// src/modules/commercial/store/useCommercialStore.ts
import { create } from 'zustand';
import { api } from '@/shared/api/client';
import { proformaApi, commercialOrderApi, commercialContractApi } from '../api';
import { USE_MOCKS, seedFromMock, PERSISTENCE_MESSAGES } from '@/shared/lib/mockMode';
import { persistMutation, reconcileEntity, loadCollection } from '@/shared/lib/serverSync';
import { useTenantStore } from '@/core/stores/useTenantStore';

interface Proforma {
  id: string;
  proformaNumber: string;
  direction: 'sales' | 'purchase';
  status: string;
  partyId: string;
  partyName: string;
  partyCode: string;
  issueDate: string;
  validUntil: string;
  paymentTerms: string;
  deliveryDate?: string;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  lines: any[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  grandTotalBaseCurrency: number;
  approvalChain: any[];
  currentApproverIndex: number;
  versions: any[];
  currentVersion: number;
  attachments: any[];
  tags: string[];
  rfqId?: string;
  bidId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CommercialOrder {
  id: string;
  orderNumber: string;
  direction: 'sales' | 'purchase';
  proformaId?: string;
  rfqId?: string;
  bidId?: string;
  partyId: string;
  partyName: string;
  status: string;
  lines: any[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  exchangeRate: number;
  paymentTerms: string;
  deliveryDate: string;
  deliveryLocation: string;
  milestones: any[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CommercialContract {
  id: string;
  contractNumber: string;
  title: string;
  direction: 'sales' | 'purchase';
  partyId: string;
  partyName: string;
  startDate: string;
  endDate: string;
  value: number;
  currencyCode: 'IRR' | 'USD' | 'EUR';
  status: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  paymentSchedule: any[];
  deliverables: any[];
  signatories: any[];
  addenda: any[];
  linkedOrderIds: string[];
}

// ── Mock seed data ────────────────────────────────────────────────────────────

const MOCK_PROFORMAS: Proforma[] = [
  {
    id: 'pf-1', proformaNumber: 'PF-SALES-1403-0001', direction: 'sales',
    status: 'pending_internal_approval', partyId: 'p1', partyName: 'شرکت فولاد مبارکه',
    partyCode: 'C-001', issueDate: '۱۴۰۳/۰۴/۱۰', validUntil: '۱۴۰۳/۰۵/۱۰',
    paymentTerms: 'چک ۳۰ روزه', currencyCode: 'IRR', exchangeRate: 1,
    lines: [{ id: 'l1', itemName: 'محصول پلاستیکی', quantity: 100, unitPrice: 1_200_000, discount: 0, taxRate: 9, lineTotal: 120_000_000 }],
    totalBeforeDiscount: 120_000_000, totalDiscount: 0, totalTax: 10_800_000,
    grandTotal: 130_800_000, grandTotalBaseCurrency: 130_800_000,
    approvalChain: [{ id: 'step-1', order: 1, roleFa: 'مدیر فروش', status: 'active' }],
    currentApproverIndex: 0, versions: [], currentVersion: 1, attachments: [], tags: [],
    createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۱۰', updatedAt: '۱۴۰۳/۰۴/۱۰',
  },
  {
    id: 'pf-2', proformaNumber: 'PF-SALES-1403-0002', direction: 'sales',
    status: 'party_accepted', partyId: 'p3', partyName: 'گروه صنعتی ایران خودرو',
    partyCode: 'C-002', issueDate: '۱۴۰۳/۰۴/۰۵', validUntil: '۱۴۰۳/۰۵/۰۵',
    paymentTerms: 'اعتبار اسنادی', currencyCode: 'IRR', exchangeRate: 1,
    lines: [{ id: 'l2', itemName: 'قطعات پلاستیکی', quantity: 500, unitPrice: 700_000, discount: 5, taxRate: 9, lineTotal: 332_500_000 }],
    totalBeforeDiscount: 350_000_000, totalDiscount: 17_500_000, totalTax: 29_925_000,
    grandTotal: 362_425_000, grandTotalBaseCurrency: 362_425_000,
    approvalChain: [], currentApproverIndex: 0, versions: [], currentVersion: 1,
    attachments: [], tags: ['vip'],
    createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۰۵', updatedAt: '۱۴۰۳/۰۴/۰۸',
  },
  {
    id: 'pf-3', proformaNumber: 'PF-PUR-1403-0001', direction: 'purchase',
    status: 'draft', partyId: 'p2', partyName: 'تأمین‌کننده مواد اولیه پارس',
    partyCode: 'S-001', issueDate: '۱۴۰۳/۰۴/۱۲', validUntil: '۱۴۰۳/۰۴/۲۵',
    paymentTerms: 'نقدی', currencyCode: 'IRR', exchangeRate: 1,
    lines: [{ id: 'l3', itemName: 'مواد اولیه پلیمر', quantity: 1000, unitPrice: 85_000, discount: 0, taxRate: 9, lineTotal: 85_000_000 }],
    totalBeforeDiscount: 85_000_000, totalDiscount: 0, totalTax: 7_650_000,
    grandTotal: 92_650_000, grandTotalBaseCurrency: 92_650_000,
    approvalChain: [], currentApproverIndex: 0, versions: [], currentVersion: 1,
    attachments: [], tags: [],
    createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۱۲', updatedAt: '۱۴۰۳/۰۴/۱۲',
  },
];

const MOCK_ORDERS: CommercialOrder[] = [
  {
    id: 'ord-1', orderNumber: 'SO-1403-0001', direction: 'sales',
    proformaId: 'pf-2', partyId: 'p3', partyName: 'گروه صنعتی ایران خودرو',
    status: 'confirmed',
    lines: [{ id: 'l2', itemName: 'قطعات پلاستیکی', quantity: 500, unitPrice: 700_000 }],
    totalBeforeDiscount: 350_000_000, totalDiscount: 17_500_000, totalTax: 29_925_000,
    grandTotal: 362_425_000, currencyCode: 'IRR', exchangeRate: 1,
    paymentTerms: 'اعتبار اسنادی', deliveryDate: '۱۴۰۳/۰۵/۱۵',
    deliveryLocation: 'تهران - انبار مرکزی', milestones: [],
    createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۰۹', updatedAt: '۱۴۰۳/۰۴/۰۹',
  },
  {
    id: 'ord-2', orderNumber: 'PO-1403-0001', direction: 'purchase',
    partyId: 'p2', partyName: 'تأمین‌کننده مواد اولیه پارس',
    status: 'in_production',
    lines: [],
    totalBeforeDiscount: 85_000_000, totalDiscount: 0, totalTax: 7_650_000,
    grandTotal: 92_650_000, currencyCode: 'IRR', exchangeRate: 1,
    paymentTerms: 'نقدی', deliveryDate: '۱۴۰۳/۰۵/۰۱',
    deliveryLocation: 'شهرک صنعتی - انبار ورودی', milestones: [],
    createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۱۰', updatedAt: '۱۴۰۳/۰۴/۱۰',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

const now = () => new Date().toLocaleDateString('fa-IR');
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ── Server persistence helpers (BUG-PERSIST-001) ─────────────────────────────
//
// The backend ValidationPipe runs with `whitelist: true` +
// `forbidNonWhitelisted: true` (backend/src/main.ts), so every payload must
// contain ONLY the whitelisted DTO fields (backend dto/create-dtos.ts), and
// backend enums are UPPER_SNAKE (backend dto/enums.ts).

/** Demo mode keeps everything local — never touch the network. */
const whenLive = async <T>(call: () => Promise<T>): Promise<T | undefined> =>
  USE_MOCKS ? undefined : call();

/** zoneId/companyId required by the commercial create DTOs. */
const tenantIds = () => {
  const { zoneId, companyId } = useTenantStore.getState().tenant;
  return { zoneId: zoneId ?? '', companyId: companyId ?? '' };
};

const toServerDirection = (direction: 'sales' | 'purchase'): string =>
  direction === 'sales' ? 'SALES' : 'PURCHASE';

interface DocumentLineLike {
  itemName?: unknown;
  itemCode?: unknown;
  description?: unknown;
  quantity?: unknown;
  unit?: unknown;
  unitPrice?: unknown;
  discount?: unknown;
  taxRate?: unknown;
  notes?: unknown;
}

const toServerProformaLines = (lines: DocumentLineLike[]): Record<string, unknown>[] =>
  lines.map((line, index) => ({
    lineNumber: index + 1,
    itemName: String(line.itemName ?? ''),
    quantity: Number(line.quantity ?? 0),
    unit: String(line.unit ?? 'unit'),
    unitPrice: Number(line.unitPrice ?? 0),
    ...(line.itemCode ? { itemCode: String(line.itemCode) } : {}),
    ...(line.description ? { description: String(line.description) } : {}),
    ...(line.discount !== undefined && line.discount !== null ? { discount: Number(line.discount) } : {}),
    ...(line.taxRate !== undefined && line.taxRate !== null ? { taxRate: Number(line.taxRate) } : {}),
    ...(line.notes ? { notes: String(line.notes) } : {}),
  }));

const toServerOrderLines = (lines: DocumentLineLike[]): Record<string, unknown>[] =>
  lines.map((line, index) => ({
    lineNumber: index + 1,
    itemName: String(line.itemName ?? ''),
    quantity: Number(line.quantity ?? 0),
    unitPrice: Number(line.unitPrice ?? 0),
    ...(line.itemCode ? { itemCode: String(line.itemCode) } : {}),
    ...(line.discount !== undefined && line.discount !== null ? { discount: Number(line.discount) } : {}),
    ...(line.taxRate !== undefined && line.taxRate !== null ? { taxRate: Number(line.taxRate) } : {}),
    ...(line.unit ? { unit: String(line.unit) } : {}),
  }));

interface MilestoneLike {
  label?: unknown;
  type?: unknown;
  dueDate?: unknown;
  amount?: unknown;
  notes?: unknown;
}

const toServerMilestones = (milestones: MilestoneLike[]): Record<string, unknown>[] =>
  milestones
    .filter((m) => m.label && m.dueDate)
    .map((m) => ({
      label: String(m.label),
      type: String(m.type ?? 'PAYMENT'),
      dueDate: String(m.dueDate),
      ...(m.amount !== undefined && m.amount !== null ? { amount: Number(m.amount) } : {}),
      ...(m.notes ? { notes: String(m.notes) } : {}),
    }));

/** Local proforma → CreateProformaDto (only whitelisted fields). */
const toServerProforma = (pf: Proforma): Record<string, unknown> => {
  const { zoneId, companyId } = tenantIds();
  return {
    zoneId,
    companyId,
    direction: toServerDirection(pf.direction),
    partyName: pf.partyName,
    issueDate: pf.issueDate,
    validUntil: pf.validUntil,
    paymentTerms: pf.paymentTerms,
    lines: toServerProformaLines(pf.lines),
    ...(pf.partyId ? { partyId: pf.partyId } : {}),
    ...(pf.partyCode ? { partyCode: pf.partyCode } : {}),
    ...(pf.currencyCode ? { currencyCode: pf.currencyCode } : {}),
    ...(pf.exchangeRate ? { exchangeRate: pf.exchangeRate } : {}),
    ...(pf.deliveryDate ? { deliveryDate: pf.deliveryDate } : {}),
    ...(pf.rfqId ? { rfqId: pf.rfqId } : {}),
    ...(pf.bidId ? { bidId: pf.bidId } : {}),
    ...(pf.tags && pf.tags.length > 0 ? { tags: pf.tags } : {}),
  };
};

/** Local order → CreateOrderDto (only whitelisted fields). */
const toServerOrder = (order: CommercialOrder): Record<string, unknown> => {
  const { zoneId, companyId } = tenantIds();
  return {
    zoneId,
    companyId,
    direction: toServerDirection(order.direction),
    partyName: order.partyName,
    paymentTerms: order.paymentTerms,
    deliveryDate: order.deliveryDate,
    deliveryLocation: order.deliveryLocation,
    lines: toServerOrderLines(order.lines),
    ...(order.proformaId ? { proformaId: order.proformaId } : {}),
    ...(order.rfqId ? { rfqId: order.rfqId } : {}),
    ...(order.bidId ? { bidId: order.bidId } : {}),
    ...(order.partyId ? { partyId: order.partyId } : {}),
    ...(order.milestones && order.milestones.length > 0 ? { milestones: toServerMilestones(order.milestones) } : {}),
    ...(order.currencyCode ? { currencyCode: order.currencyCode } : {}),
    ...(order.exchangeRate ? { exchangeRate: order.exchangeRate } : {}),
  };
};

/** Local contract → CreateCommercialContractDto (only whitelisted fields). */
const toServerContract = (contract: CommercialContract): Record<string, unknown> => {
  const { zoneId, companyId } = tenantIds();
  return {
    zoneId,
    companyId,
    title: contract.title,
    direction: toServerDirection(contract.direction),
    partyName: contract.partyName,
    startDate: contract.startDate,
    endDate: contract.endDate,
    value: contract.value,
    autoRenew: contract.autoRenew,
    renewalNoticeDays: contract.renewalNoticeDays,
    ...(contract.partyId ? { partyId: contract.partyId } : {}),
    ...(contract.currencyCode ? { currencyCode: contract.currencyCode } : {}),
    ...(contract.paymentSchedule && contract.paymentSchedule.length > 0 ? { paymentSchedule: contract.paymentSchedule } : {}),
    ...(contract.deliverables && contract.deliverables.length > 0 ? { deliverables: contract.deliverables } : {}),
    ...(contract.signatories && contract.signatories.length > 0 ? { signatories: contract.signatories } : {}),
    ...(contract.tags && contract.tags.length > 0 ? { tags: contract.tags } : {}),
  };
};

interface CommercialState {
  proformas: Proforma[];
  orders: CommercialOrder[];
  contracts: CommercialContract[];

  createProforma: (data: Omit<Proforma, 'id' | 'proformaNumber' | 'createdAt' | 'updatedAt' | 'versions' | 'currentVersion' | 'currentApproverIndex'>) => Proforma;
  updateProforma: (id: string, patch: Partial<Proforma>) => void;
  submitForApproval: (id: string) => void;
  approveProformaStep: (id: string, stepId: string, comment?: string) => void;
  rejectProformaStep: (id: string, stepId: string, comment: string) => void;
  markAsSentToParty: (id: string) => void;
  recordPartyResponse: (id: string, accepted: boolean, note?: string) => void;
  reviseProforma: (id: string, changeNote: string) => void;
  convertToOrder: (id: string) => CommercialOrder | null;
  cancelProforma: (id: string, reason: string) => void;

  createOrder: (data: Omit<CommercialOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => CommercialOrder;
  updateOrderStatus: (id: string, status: string) => void;
  completeMilestone: (orderId: string, milestoneId: string) => void;
  convertOrderToInvoice: (id: string) => void;

  createContract: (data: Omit<CommercialContract, 'id' | 'contractNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateContract: (id: string, patch: Partial<CommercialContract>) => void;
  getExpiringContracts: (withinDays: number) => CommercialContract[];
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API
}

export const useCommercialStore = create<CommercialState>((set, get) => ({
  proformas: seedFromMock(MOCK_PROFORMAS),
  orders: seedFromMock(MOCK_ORDERS),
  contracts: [],

  // ── API Integration (COMP-004 / BUG-PERSIST-001): hydrate from backend ──
  // Server data REPLACES the local collection — an empty server list yields an
  // empty store (never the demo seed data).
  loadFromApi: async () => {
    if (USE_MOCKS) return;
    await Promise.all([
      loadCollection<Proforma>(
        () => proformaApi.list() as Promise<Proforma[]>,
        (rows) => set({ proformas: rows }),
      ),
      loadCollection<CommercialOrder>(
        () => commercialOrderApi.list() as Promise<CommercialOrder[]>,
        (rows) => set({ orders: rows }),
      ),
      loadCollection<CommercialContract>(
        () => commercialContractApi.list() as Promise<CommercialContract[]>,
        (rows) => set({ contracts: rows }),
      ),
    ]);
  },

  // ── Proformas ─────────────────────────────────────────────────────────
  // Every mutation: optimistic write → server request → reconcile (server ID
  // wins) → rollback + Persian toast on failure (BUG-PERSIST-001).
  createProforma: (data) => {
    const seq = get().proformas.filter(p => p.direction === data.direction).length + 1;
    const newPF: Proforma = {
      ...data,
      id: uid('pf'),
      proformaNumber: `PF-${data.direction === 'sales' ? 'SALES' : 'PUR'}-1403-${String(seq).padStart(4, '0')}`,
      versions: [],
      currentVersion: 1,
      currentApproverIndex: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: [newPF, ...s.proformas] })),
      request: () => whenLive(() => proformaApi.create(toServerProforma(newPF))),
      rollback: () => set(s => ({ proformas: s.proformas.filter(p => p.id !== newPF.id) })),
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, newPF.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی پروفرما؛ رکورد ایجاد نشد',
    });
    return newPF;
  },

  updateProforma: (id, patch) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: s.proformas.map(p => p.id === id ? { ...p, ...patch, updatedAt: now() } : p) })),
      // CreateProformaDto requires the full whitelisted set → merge patch over the current entity.
      request: () => whenLive(() => proformaApi.update(id, toServerProforma({ ...current, ...patch } as Proforma))),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: PERSISTENCE_MESSAGES.updateFailed,
    });
  },

  submitForApproval: (id) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: s.proformas.map(p => p.id === id ? { ...p, status: 'pending_internal_approval', updatedAt: now() } : p) })),
      // TODO(api): proformaApi in ../api has no submit-approval method — call the
      // verified backend route directly (POST /commercial/proformas/:id/submit-approval).
      request: () => whenLive(() => api.post<Proforma>(`/commercial/proformas/${id}/submit-approval`)),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ارسال پروفرما برای تأیید؛ تغییرات ذخیره نشد',
    });
  },

  approveProformaStep: (id, stepId, comment) => {
    const current = get().proformas.find(p => p.id === id);
    const stepOrder = current ? Math.max(1, current.approvalChain.findIndex(step => step.id === stepId) + 1) : 1;
    void persistMutation<Proforma>({
      optimistic: () =>
        set(s => ({
          proformas: s.proformas.map(p => {
            if (p.id !== id) return p;
            const chain = p.approvalChain.map(step =>
              step.id === stepId ? { ...step, status: 'approved', approvedAt: now(), comment } : step
            );
            const allApproved = chain.every(step => step.status === 'approved' || step.status === 'skipped');
            return { ...p, approvalChain: chain, status: allApproved ? 'internally_approved' : p.status, updatedAt: now() };
          }),
        })),
      // TODO(api): ../api's proformaApi.approve posts with no body to a route the
      // backend exposes as PATCH — call the verified endpoint with ApproveProformaStepDto.
      request: () => whenLive(() => api.patch<Proforma>(`/commercial/proformas/${id}/approve`, {
        stepOrder,
        status: 'APPROVED',
        ...(comment ? { comment } : {}),
      })),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ثبت تأیید مرحله؛ تغییرات ذخیره نشد',
    });
  },

  rejectProformaStep: (id, stepId, comment) => {
    const current = get().proformas.find(p => p.id === id);
    const stepOrder = current ? Math.max(1, current.approvalChain.findIndex(step => step.id === stepId) + 1) : 1;
    void persistMutation<Proforma>({
      optimistic: () =>
        set(s => ({
          proformas: s.proformas.map(p =>
            p.id !== id ? p : {
              ...p,
              status: 'party_rejected',
              approvalChain: p.approvalChain.map(step =>
                step.id === stepId ? { ...step, status: 'rejected', comment } : step
              ),
              updatedAt: now(),
            }
          ),
        })),
      // TODO(api): no reject-step method in ../api — PATCH /commercial/proformas/:id/approve.
      request: () => whenLive(() => api.patch<Proforma>(`/commercial/proformas/${id}/approve`, {
        stepOrder,
        status: 'REJECTED',
        comment,
      })),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ثبت رد مرحله؛ تغییرات ذخیره نشد',
    });
  },

  markAsSentToParty: (id) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: s.proformas.map(p => p.id === id ? { ...p, status: 'sent_to_party', updatedAt: now() } : p) })),
      // TODO(api): no send-to-party method in ../api — POST /commercial/proformas/:id/send-to-party.
      request: () => whenLive(() => api.post<Proforma>(`/commercial/proformas/${id}/send-to-party`)),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ثبت ارسال به طرف مقابل؛ تغییرات ذخیره نشد',
    });
  },

  recordPartyResponse: (id, accepted, note) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: s.proformas.map(p => p.id === id ? { ...p, status: accepted ? 'party_accepted' : 'party_rejected', updatedAt: now() } : p) })),
      // TODO(api): no party-response method in ../api — POST /commercial/proformas/:id/party-response.
      request: () => whenLive(() => api.post<Proforma>(`/commercial/proformas/${id}/party-response`, {
        accepted,
        ...(note ? { note } : {}),
      })),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ثبت پاسخ طرف مقابل؛ تغییرات ذخیره نشد',
    });
  },

  reviseProforma: (id, changeNote) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () =>
        set(s => ({
          proformas: s.proformas.map(p => {
            if (p.id !== id) return p;
            const newVersion = { versionNumber: p.currentVersion, createdAt: now(), createdBy: 'admin', changeNote, snapshot: { ...p } };
            return { ...p, versions: [...p.versions, newVersion], currentVersion: p.currentVersion + 1, status: 'draft', updatedAt: now() };
          }),
        })),
      // TODO(api): no revise method in ../api — POST /commercial/proformas/:id/revise.
      request: () => whenLive(() => api.post<Proforma>(`/commercial/proformas/${id}/revise`, { changeNote })),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در ایجاد نسخه جدید پروفرما؛ تغییرات ذخیره نشد',
    });
  },

  convertToOrder: (id) => {
    const pf = get().proformas.find(p => p.id === id);
    if (!pf) return null;
    const seq = get().orders.length + 1;
    const order: CommercialOrder = {
      id: uid('ord'),
      orderNumber: `${pf.direction === 'sales' ? 'SO' : 'PO'}-1403-${String(seq).padStart(4, '0')}`,
      direction: pf.direction, proformaId: id,
      rfqId: pf.rfqId, bidId: pf.bidId,
      partyId: pf.partyId, partyName: pf.partyName,
      status: 'confirmed', lines: pf.lines,
      totalBeforeDiscount: pf.totalBeforeDiscount,
      totalDiscount: pf.totalDiscount, totalTax: pf.totalTax, grandTotal: pf.grandTotal,
      currencyCode: pf.currencyCode, exchangeRate: pf.exchangeRate,
      paymentTerms: pf.paymentTerms, deliveryDate: pf.deliveryDate ?? '',
      deliveryLocation: '', milestones: [],
      createdBy: 'admin', createdAt: now(), updatedAt: now(),
    };
    void persistMutation<CommercialOrder>({
      optimistic: () => set(s => ({
        proformas: s.proformas.map(p => p.id === id ? { ...p, status: 'converted', convertedToOrderId: order.id } : p),
        orders: [order, ...s.orders],
      })),
      // TODO(api): ../api's proformaApi.convert posts to /convert but the backend
      // route is POST /commercial/proformas/:id/convert-to-order — call it directly.
      request: () => whenLive(() => api.post<CommercialOrder>(`/commercial/proformas/${id}/convert-to-order`)),
      rollback: () => set(s => ({
        proformas: s.proformas.map(p => p.id === id ? pf : p),
        orders: s.orders.filter(o => o.id !== order.id),
      })),
      // Server order ID wins, and the proforma points at the persisted order.
      reconcile: (server) => set(s => ({
        orders: reconcileEntity(s.orders, order.id, server),
        proformas: s.proformas.map(p => p.id === id ? { ...p, status: 'converted', convertedToOrderId: server.id } : p),
      })),
      messageFa: 'خطا در تبدیل پروفرما به سفارش؛ سفارش ایجاد نشد',
    });
    return order;
  },

  cancelProforma: (id, reason) => {
    const current = get().proformas.find(p => p.id === id);
    void persistMutation<Proforma>({
      optimistic: () => set(s => ({ proformas: s.proformas.map(p => p.id === id ? { ...p, status: 'cancelled', updatedAt: now() } : p) })),
      // TODO(api): no cancel method in ../api — POST /commercial/proformas/:id/cancel.
      request: () => whenLive(() => api.post<Proforma>(`/commercial/proformas/${id}/cancel`, { reason })),
      rollback: () => {
        if (current) set(s => ({ proformas: s.proformas.map(p => p.id === id ? current : p) }));
      },
      reconcile: (server) => set(s => ({ proformas: reconcileEntity(s.proformas, id, server) })),
      messageFa: 'خطا در لغو پروفرما؛ تغییرات ذخیره نشد',
    });
  },

  // ── Orders ────────────────────────────────────────────────────────────
  createOrder: (data) => {
    const seq = get().orders.length + 1;
    const order: CommercialOrder = {
      ...data,
      id: uid('ord'),
      orderNumber: `${data.direction === 'sales' ? 'SO' : 'PO'}-1403-${String(seq).padStart(4, '0')}`,
      createdAt: now(), updatedAt: now(),
    };
    void persistMutation<CommercialOrder>({
      optimistic: () => set(s => ({ orders: [order, ...s.orders] })),
      request: () => whenLive(() => commercialOrderApi.create(toServerOrder(order))),
      rollback: () => set(s => ({ orders: s.orders.filter(o => o.id !== order.id) })),
      reconcile: (server) => set(s => ({ orders: reconcileEntity(s.orders, order.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی سفارش؛ رکورد ایجاد نشد',
    });
    return order;
  },

  updateOrderStatus: (id, status) => {
    const current = get().orders.find(o => o.id === id);
    void persistMutation<CommercialOrder>({
      optimistic: () => set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status, updatedAt: now() } : o) })),
      // Backend OrderStatus enum is UPPER_SNAKE (DRAFT / CONFIRMED / INVOICED / …).
      request: () => whenLive(() => commercialOrderApi.updateStatus(id, status.toUpperCase())),
      rollback: () => {
        if (current) set(s => ({ orders: s.orders.map(o => o.id === id ? current : o) }));
      },
      reconcile: (server) => set(s => ({ orders: reconcileEntity(s.orders, id, server) })),
      messageFa: PERSISTENCE_MESSAGES.updateFailed,
    });
  },

  completeMilestone: (orderId, milestoneId) => {
    const current = get().orders.find(o => o.id === orderId);
    void persistMutation<CommercialOrder>({
      optimistic: () =>
        set(s => ({
          orders: s.orders.map(o =>
            o.id !== orderId ? o : {
              ...o,
              milestones: o.milestones.map((m: any) =>
                m.id === milestoneId ? { ...m, status: 'completed', completedAt: now() } : m
              ),
            }
          ),
        })),
      // TODO(api): no milestone method in ../api — POST /commercial/orders/:id/milestones/:mid/complete.
      request: () => whenLive(() => api.post<CommercialOrder>(`/commercial/orders/${orderId}/milestones/${milestoneId}/complete`)),
      rollback: () => {
        if (current) set(s => ({ orders: s.orders.map(o => o.id === orderId ? current : o) }));
      },
      reconcile: (server) => set(s => ({ orders: reconcileEntity(s.orders, orderId, server) })),
      messageFa: 'خطا در ثبت تکمیل نقطه عطف؛ تغییرات ذخیره نشد',
    });
  },

  convertOrderToInvoice: (id) => {
    const current = get().orders.find(o => o.id === id);
    void persistMutation<CommercialOrder>({
      optimistic: () => set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status: 'invoiced', updatedAt: now() } : o) })),
      // TODO(api): no convert-to-invoice method in ../api — POST /commercial/orders/:id/convert-to-invoice.
      request: () => whenLive(() => api.post<CommercialOrder>(`/commercial/orders/${id}/convert-to-invoice`)),
      rollback: () => {
        if (current) set(s => ({ orders: s.orders.map(o => o.id === id ? current : o) }));
      },
      reconcile: (server) => set(s => ({ orders: reconcileEntity(s.orders, id, server) })),
      messageFa: 'خطا در تبدیل سفارش به فاکتور؛ تغییرات ذخیره نشد',
    });
  },

  // ── Contracts ─────────────────────────────────────────────────────────
  createContract: (data) => {
    const seq = get().contracts.length + 1;
    const contract: CommercialContract = {
      ...data,
      id: uid('ct'),
      contractNumber: `CT-1403-${String(seq).padStart(4, '0')}`,
      createdAt: now(), updatedAt: now(),
    };
    void persistMutation<CommercialContract>({
      optimistic: () => set(s => ({ contracts: [contract, ...s.contracts] })),
      request: () => whenLive(() => commercialContractApi.create(toServerContract(contract))),
      rollback: () => set(s => ({ contracts: s.contracts.filter(c => c.id !== contract.id) })),
      reconcile: (server) => set(s => ({ contracts: reconcileEntity(s.contracts, contract.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی قرارداد؛ رکورد ایجاد نشد',
    });
  },

  updateContract: (id, patch) => {
    const current = get().contracts.find(c => c.id === id);
    void persistMutation<CommercialContract>({
      optimistic: () => set(s => ({ contracts: s.contracts.map(c => c.id === id ? { ...c, ...patch, updatedAt: now() } : c) })),
      request: () => whenLive(() => commercialContractApi.update(id, toServerContract({ ...current, ...patch } as CommercialContract))),
      rollback: () => {
        if (current) set(s => ({ contracts: s.contracts.map(c => c.id === id ? current : c) }));
      },
      reconcile: (server) => set(s => ({ contracts: reconcileEntity(s.contracts, id, server) })),
      messageFa: PERSISTENCE_MESSAGES.updateFailed,
    });
  },

  getExpiringContracts: (withinDays) => {
    const threshold = Date.now() + withinDays * 86_400_000;
    return get().contracts.filter(c => new Date(c.endDate).getTime() <= threshold && c.status !== 'expired');
  },
}));
