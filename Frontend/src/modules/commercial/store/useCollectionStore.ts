import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/shared/api';
import { persistMutation, loadCollection } from '@/shared/lib/serverSync';
import { USE_MOCKS, PERSISTENCE_MESSAGES } from '@/shared/lib/mockMode';
import { useTenantStore } from '@/core/stores/useTenantStore';
import type {
  CollectionCase,
  CollectionAction,
  CollectionActionType,
  InstallmentPlan,
} from '@/modules/commercial/types';
import type { SalesInvoice } from '@/modules/finance/types/ar.types';

// ── Types ─────────────────────────────────────────────────────────────────────
// CollectionCase / CollectionAction / InstallmentPlan are the SHARED shapes from
// @/modules/commercial/types (previously this file re-declared them locally and
// also imported itself, which made the module unresolvable — Step-1 finding).
export type { CollectionCase, CollectionAction, InstallmentPlan } from '@/modules/commercial/types';

/** Buckets mirror the backend `AgingBucket` Prisma enum (CURRENT, DAYS_1_30, …). */
export type AgingBucketKey = 'current' | 'days_1_30' | 'days_31_60' | 'days_61_90' | 'over_90';

export interface AgingSnapshot {
  byBucket: Record<AgingBucketKey, { count: number; totalAmount: number }>;
  byParty: { partyId: string; partyName: string; buckets: Record<AgingBucketKey, number> }[];
  totalReceivable: number;
  collectionRate: number;
}

export interface CollectionState {
  cases: CollectionCase[];
  isLoaded: boolean;
  openCollectionCase: (invoice: SalesInvoice, overrides?: { partyName?: string; zoneId?: string }) => void;
  addAction: (caseId: string, action: Omit<CollectionAction, 'id'>) => void;
  setInstallmentPlan: (caseId: string, plan: Omit<InstallmentPlan, 'id'>) => void;
  recordInstallmentPayment: (caseId: string, installmentIdx: number, checkNumber?: string) => void;
  escalateCases: () => void;
  computeAgingSnapshot: () => AgingSnapshot;
  loadFromApi: () => Promise<void>;
}

// ── Wire-format bridge ────────────────────────────────────────────────────────
// The backend uses Prisma enums (REMINDER_CALL, NO_RESPONSE, NORMAL, …) while the
// shared frontend types/screens use lowercase snake_case (reminder_call,
// no_response, normal). The two families are exact case-insensitive counterparts,
// so a single case conversion covers every value — no per-value lookup tables.

/** View-model → API payload (lowercase → UPPER_SNAKE). */
const toWire = (value: string): string => value.toUpperCase();

/** API payload → view-model (UPPER_SNAKE → lowercase). */
const fromWire = (value: unknown): string => (typeof value === 'string' ? value.toLowerCase() : '');

const emptyBuckets = (): Record<AgingBucketKey, { count: number; totalAmount: number }> => ({
  current: { count: 0, totalAmount: 0 },
  days_1_30: { count: 0, totalAmount: 0 },
  days_31_60: { count: 0, totalAmount: 0 },
  days_61_90: { count: 0, totalAmount: 0 },
  over_90: { count: 0, totalAmount: 0 },
});

/**
 * Normalise one server CollectionCase into the view model. Amounts arrive as
 * numbers (the backend JSON-replacer serialises BigInt → number) but are coerced
 * defensively so a raw BigInt never reaches the UI.
 */
function toViewCase(raw: Record<string, unknown> & { id: string }): CollectionCase {
  const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
  const plan = raw.installmentPlan as Record<string, unknown> | null | undefined;

  return {
    id: raw.id,
    invoiceId: String(raw.invoiceId ?? ''),
    partyId: String(raw.partyId ?? ''),
    partyName: String(raw.partyName ?? ''),
    originalAmount: num(raw.originalAmount),
    paidAmount: num(raw.paidAmount),
    remainingAmount: num(raw.remainingAmount),
    daysOverdue: num(raw.daysOverdue),
    agingBucket: fromWire(raw.agingBucket),
    collectionStatus: fromWire(raw.collectionStatus),
    assignedTo: raw.assignedTo ? String(raw.assignedTo) : undefined,
    actions: Array.isArray(raw.actions)
      ? (raw.actions as Record<string, unknown>[]).map((a) => ({
          id: String(a.id ?? ''),
          type: fromWire(a.type) as CollectionActionType,
          performedAt: String(a.performedAt ?? ''),
          performedBy: String(a.performedBy ?? ''),
          notes: String(a.notes ?? ''),
          outcome: fromWire(a.outcome) as CollectionAction['outcome'],
          correspondenceLetterId: a.correspondenceLetterId
            ? String(a.correspondenceLetterId)
            : undefined,
        }))
      : [],
    installmentPlan: plan
      ? {
          id: String(plan.id ?? ''),
          agreedAt: String(plan.agreedAt ?? ''),
          installments: Array.isArray(plan.installments)
            ? (plan.installments as Record<string, unknown>[]).map((i) => ({
                dueDate: String(i.dueDate ?? ''),
                amount: num(i.amount),
                status: fromWire(i.status) as InstallmentPlan['installments'][number]['status'],
                paidAt: i.paidAt ? String(i.paidAt) : undefined,
                checkNumber: i.checkNumber ? String(i.checkNumber) : undefined,
              }))
            : [],
          totalAmount: num(plan.totalAmount),
          notes: String(plan.notes ?? ''),
        }
      : undefined,
    notes: String(raw.notes ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

const scope = () => {
  const tenant = useTenantStore.getState().tenant;
  return { zoneId: tenant.zoneId ?? undefined, companyId: tenant.companyId ?? undefined };
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useCollectionStore = create<CollectionState>()(
  immer((set, get) => ({
    cases: [],
    isLoaded: false,

    /**
     * Open a collection case for an overdue invoice. Persists via
     * POST /commercial/collection/cases; the server id replaces the optimistic
     * row on reconcile.
     */
    openCollectionCase: (invoice, overrides) => {
      const { zoneId, companyId } = scope();
      const resolvedZone = overrides?.zoneId ?? zoneId;
      const partyName = overrides?.partyName ?? invoice.invoiceNumber;

      if (!resolvedZone) {
        // Never silently pick a zone for a write (see Step-4 TASK 3).
        return;
      }

      const tempId = `tmp-case-${Date.now()}`;
      const optimistic: CollectionCase = {
        id: tempId,
        invoiceId: invoice.id,
        partyId: invoice.customerId,
        partyName,
        originalAmount: invoice.remainingAmount || invoice.totalAmount,
        paidAmount: 0,
        remainingAmount: invoice.remainingAmount || invoice.totalAmount,
        daysOverdue: invoice.daysOverdue ?? 0,
        agingBucket: invoice.agingBucket ? fromWire(invoice.agingBucket) : 'current',
        collectionStatus: 'normal',
        actions: [],
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      void persistMutation<CollectionCase, Record<string, unknown>>({
        optimistic: () => set((d) => void d.cases.unshift(optimistic)),
        rollback: () => set((d) => void (d.cases = d.cases.filter((c) => c.id !== tempId))),
        reconcile: (server) =>
          set((d) => {
            const idx = d.cases.findIndex((c) => c.id === tempId);
            const mapped = toViewCase(server as Record<string, unknown> & { id: string });
            if (idx >= 0) d.cases[idx] = mapped;
            else d.cases.unshift(mapped);
          }),
        messageFa: PERSISTENCE_MESSAGES.createFailed,
        skip: USE_MOCKS,
        request: () =>
          api.post<Record<string, unknown>>('/commercial/collection/cases', {
            invoiceId: invoice.id,
            zoneId: resolvedZone,
            companyId: companyId ?? invoice.companyId,
            partyId: invoice.customerId,
            partyName,
            originalAmount: Math.round(invoice.remainingAmount || invoice.totalAmount),
          }),
      });
    },

    /** Record a collection action (call/SMS/letter/notice…) against a case. */
    addAction: (caseId, action) => {
      const tempId = `tmp-action-${Date.now()}`;
      const optimistic: CollectionAction = { ...action, id: tempId };

      void persistMutation<CollectionAction, Record<string, unknown>>({
        optimistic: () =>
          set((d) => {
            const target = d.cases.find((c) => c.id === caseId);
            target?.actions.push(optimistic);
          }),
        rollback: () =>
          set((d) => {
            const target = d.cases.find((c) => c.id === caseId);
            if (target) target.actions = target.actions.filter((a) => a.id !== tempId);
          }),
        reconcile: (server) => {
          const serverId = String((server as { id?: unknown } | undefined)?.id ?? '');
          set((d) => {
            const target = d.cases.find((c) => c.id === caseId);
            if (!target) return;
            const idx = target.actions.findIndex((a) => a.id === tempId);
            const mapped: CollectionAction = {
              ...optimistic,
              id: serverId || tempId,
              performedAt: String((server as Record<string, unknown>)?.performedAt) || optimistic.performedAt,
            };
            if (idx >= 0) target.actions[idx] = mapped;
          });
        },
        messageFa: PERSISTENCE_MESSAGES.createFailed,
        skip: USE_MOCKS,
        request: () =>
          api.post<Record<string, unknown>>(`/commercial/collection/cases/${caseId}/action`, {
            caseId,
            type: toWire(action.type),
            notes: action.notes,
            outcome: toWire(action.outcome),
          }),
      });
    },

    /**
     * Attach an installment plan. The backend generates the schedule itself
     * (count + frequency), so the local preview array supplies the count and the
     * plan notes; the generated schedule replaces it on reconcile.
     */
    setInstallmentPlan: (caseId, plan) => {
      const count = Math.max(1, plan.installments.length);

      void persistMutation<CollectionCase, Record<string, unknown>>({
        optimistic: () => void 0,
        rollback: () => void 0,
        reconcile: (server) =>
          set((d) => {
            const idx = d.cases.findIndex((c) => c.id === caseId);
            const mapped = toViewCase(server as Record<string, unknown> & { id: string });
            if (idx >= 0) {
              d.cases[idx].installmentPlan = mapped.installmentPlan;
              d.cases[idx].collectionStatus = mapped.collectionStatus || 'installment_agreed';
            }
          }),
        messageFa: PERSISTENCE_MESSAGES.updateFailed,
        skip: USE_MOCKS,
        request: () =>
          api.post<Record<string, unknown>>(`/commercial/collection/cases/${caseId}/installments`, {
            caseId,
            installmentCount: count,
            frequency: 'monthly',
            notes: plan.notes,
          }),
      });
    },

    /** Mark one installment of a case as paid. */
    recordInstallmentPayment: (caseId, installmentIdx, checkNumber) => {
      const target = get().cases.find((c) => c.id === caseId);
      const installment = target?.installmentPlan?.installments[installmentIdx];
      if (!target || !installment) return;

      const serverId =
        (target.installmentPlan as { installments?: { id?: string }[] } | undefined)
          ?.installments?.[installmentIdx]?.id ?? '';

      // Optimistic: flip the row to paid so the UI updates immediately.
      set((d) => {
        const c = d.cases.find((x) => x.id === caseId);
        const inst = c?.installmentPlan?.installments[installmentIdx];
        if (!c || !inst) return;
        inst.status = 'paid';
        inst.paidAt = new Date().toISOString();
        inst.checkNumber = checkNumber;
        c.paidAmount += installment.amount;
        c.remainingAmount = Math.max(0, c.remainingAmount - installment.amount);
      });

      const rollback = () =>
        set((d) => {
          const c = d.cases.find((x) => x.id === caseId);
          const inst = c?.installmentPlan?.installments[installmentIdx];
          if (!c || !inst) return;
          inst.status = 'pending';
          inst.paidAt = undefined;
          inst.checkNumber = undefined;
          c.paidAmount -= installment.amount;
          c.remainingAmount += installment.amount;
        });

      if (USE_MOCKS) return;
      if (!serverId) {
        rollback();
        return;
      }

      void persistMutation<{ id: string }, Record<string, unknown>>({
        optimistic: () => void 0,
        rollback,
        messageFa: PERSISTENCE_MESSAGES.updateFailed,
        request: () =>
          api.patch<Record<string, unknown>>(
            `/commercial/collection/cases/${caseId}/installments/${serverId}/pay`,
            { amount: installment.amount, ...(checkNumber ? { checkNumber } : {}) },
          ),
      });
    },

    /** Run the backend escalation rules for the current zone. */
    escalateCases: () => {
      if (USE_MOCKS) return;
      void persistMutation<{ id: string }, { escalated?: number }>({
        optimistic: () => void 0,
        rollback: () => void 0,
        messageFa: PERSISTENCE_MESSAGES.updateFailed,
        request: () => api.post<{ escalated?: number }>('/commercial/collection/cases/escalate', {}),
      });
    },

    /** Aging analysis, derived from whatever is currently loaded. */
    computeAgingSnapshot: (): AgingSnapshot => {
      const byBucket = emptyBuckets();
      const byPartyMap = new Map<string, { partyId: string; partyName: string; buckets: Record<AgingBucketKey, number> }>();
      let totalReceivable = 0;

      for (const c of get().cases) {
        const key = (c.agingBucket || 'current') as AgingBucketKey;
        const bucket = byBucket[key] ?? byBucket.current;
        bucket.count += 1;
        bucket.totalAmount += c.remainingAmount;
        totalReceivable += c.remainingAmount;

        if (c.partyId) {
          const entry =
            byPartyMap.get(c.partyId) ??
            { partyId: c.partyId, partyName: c.partyName, buckets: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 } };
          entry.buckets[key] = (entry.buckets[key] ?? 0) + c.remainingAmount;
          byPartyMap.set(c.partyId, entry);
        }
      }

      return {
        byBucket,
        byParty: [...byPartyMap.values()],
        totalReceivable,
        collectionRate: 0,
      };
    },

    loadFromApi: async () => {
      const ok = await loadCollection(
        async () => {
          const rows = await api.get<Record<string, unknown>[]>('/commercial/collection/cases');
          return (Array.isArray(rows) ? rows : []).map((r) => toViewCase(r as Record<string, unknown> & { id: string }));
        },
        (rows) => set((d) => void (d.cases = rows)),
        'خطا در دریافت پرونده‌های وصول مطالبات',
      );
      if (ok) set((d) => void (d.isLoaded = true));
    },
  })),
);
