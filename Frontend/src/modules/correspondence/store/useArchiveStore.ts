import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/shared/api';
import { loadCollection } from '@/shared/lib/serverSync';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ArchivedLetter {
  letterId: string;
  barcode: string;       // e.g. "LTR-000123"
  receivedAt: string;    // ISO
  movedAt?: string;
}

export interface ArchiveShelf {
  id: string;            // e.g. "A-3-12" (row A, col 3, slot 12)
  nameFa: string;        // "ردیف A · قفسه ۳ · جایگاه ۱۲"
  capacity: number;
  letters: ArchivedLetter[];
}

export interface PhysicalMovement {
  id: string;
  letterId: string;
  barcode: string;
  fromShelfId: string | null;   // null = arrived from outside
  toShelfId: string | null;     // null = dispatched/removed
  actor: string;
  reason: string;
  timestamp: string;
}

interface ArchiveState {
  shelves: ArchiveShelf[];
  movements: PhysicalMovement[];
  pendingScans: string[];   // letterIds awaiting physical receipt

  // Actions
  receiveBarcode: (barcode: string, shelfId: string, actor: string) => boolean;
  moveLetter: (barcode: string, toShelfId: string, actor: string, reason: string) => boolean;
  dispatchLetter: (barcode: string, actor: string, reason: string) => boolean;
  addPendingScan: (letterId: string) => void;
  removePendingScan: (letterId: string) => void;
  addShelf: (shelf: Omit<ArchiveShelf, 'letters'>) => void;
  loadFromApi: () => Promise<boolean>;  // COMP-004: Load from backend API
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const genId = () => `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Shape of a `PhysicalLetterRecord` as returned by GET /physical-archive/report
// (`recentMovements`). The backend has no standalone movements list route, so
// this is the only wire shape we need to map from.
interface ApiMovementRecord {
  id: string;
  letterId: string;
  barcode: string;
  shelfId: string;
  receivedAt: string;
  receivedBy: string;
  movedAt?: string | null;
  movedBy?: string | null;
  movedReason?: string | null;
}

// Map a server record onto the store's PhysicalMovement view model. The schema
// keeps only the record's CURRENT shelf (PhysicalLetterRecord.shelfId) — it does
// not retain the origin shelf — so fromShelfId stays null rather than inventing
// one, and the timestamp prefers the move over the initial receipt.
function toPhysicalMovement(r: ApiMovementRecord): PhysicalMovement {
  return {
    id: r.id,
    letterId: r.letterId,
    barcode: r.barcode,
    fromShelfId: null,
    toShelfId: r.shelfId,
    actor: r.movedBy ?? r.receivedBy,
    reason: r.movedReason ?? 'دریافت',
    timestamp: r.movedAt ?? r.receivedAt,
  };
}

// ── Seed shelves: rows A–D, 3 columns, 3 slots each ──────────────────────────
const ROWS = ['A', 'B', 'C', 'D'];
const INITIAL_SHELVES: ArchiveShelf[] = ROWS.flatMap(row =>
  [1, 2, 3].flatMap(col =>
    [1, 2, 3].map(slot => ({
      id: `${row}-${col}-${slot}`,
      nameFa: `ردیف ${row} · ستون ${col} · جایگاه ${slot}`,
      capacity: 50,
      letters: [],
    }))
  )
);

// Pre-populate a few shelves with seed data
INITIAL_SHELVES[0].letters = [
  { letterId: 'seed-1', barcode: 'LTR-000001', receivedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { letterId: 'seed-2', barcode: 'LTR-000002', receivedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];
INITIAL_SHELVES[3].letters = [
  { letterId: 'seed-3', barcode: 'LTR-000003', receivedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
];

// ── Store ─────────────────────────────────────────────────────────────────────
export const useArchiveStore = create<ArchiveState>()(
  immer((set, get) => ({
    shelves: INITIAL_SHELVES,
    movements: [],
    pendingScans: [],

    receiveBarcode: (barcode, shelfId, actor) => {
      const state = get();
      const shelf = state.shelves.find(s => s.id === shelfId);
      if (!shelf) return false;
      if (shelf.letters.length >= shelf.capacity) return false;
      // Barcode must start with LTR-
      if (!barcode.startsWith('LTR-')) return false;
      const alreadyArchived = state.shelves.some(s => s.letters.some(l => l.barcode === barcode));
      if (alreadyArchived) return false;

      const letterId = barcode; // in prod: look up by barcode from correspondence store
      const now = new Date().toISOString();

      set(draft => {
        const s = draft.shelves.find(s => s.id === shelfId)!;
        s.letters.push({ letterId, barcode, receivedAt: now });
        draft.movements.push({
          id: genId(),
          letterId,
          barcode,
          fromShelfId: null,
          toShelfId: shelfId,
          actor,
          reason: 'دریافت از خارج',
          timestamp: now,
        });
        draft.pendingScans = draft.pendingScans.filter(id => id !== letterId);
      });
      return true;
    },

    moveLetter: (barcode, toShelfId, actor, reason) => {
      const state = get();
      let fromShelfId: string | null = null;
      let letterId: string | null = null;

      for (const shelf of state.shelves) {
        const found = shelf.letters.find(l => l.barcode === barcode);
        if (found) { fromShelfId = shelf.id; letterId = found.letterId; break; }
      }
      if (!letterId || fromShelfId === toShelfId) return false;

      const toShelf = state.shelves.find(s => s.id === toShelfId);
      if (!toShelf || toShelf.letters.length >= toShelf.capacity) return false;

      const now = new Date().toISOString();
      set(draft => {
        const from = draft.shelves.find(s => s.id === fromShelfId)!;
        const letterEntry = from.letters.find(l => l.barcode === barcode)!;
        from.letters = from.letters.filter(l => l.barcode !== barcode);
        const to = draft.shelves.find(s => s.id === toShelfId)!;
        to.letters.push({ ...letterEntry, movedAt: now });
        draft.movements.push({ id: genId(), letterId: letterId!, barcode, fromShelfId, toShelfId, actor, reason, timestamp: now });
      });
      return true;
    },

    dispatchLetter: (barcode, actor, reason) => {
      const state = get();
      let fromShelfId: string | null = null;
      let letterId: string | null = null;
      for (const shelf of state.shelves) {
        const found = shelf.letters.find(l => l.barcode === barcode);
        if (found) { fromShelfId = shelf.id; letterId = found.letterId; break; }
      }
      if (!letterId) return false;

      const now = new Date().toISOString();
      set(draft => {
        const shelf = draft.shelves.find(s => s.id === fromShelfId)!;
        shelf.letters = shelf.letters.filter(l => l.barcode !== barcode);
        draft.movements.push({ id: genId(), letterId: letterId!, barcode, fromShelfId, toShelfId: null, actor, reason, timestamp: now });
      });
      return true;
    },

    addPendingScan: (letterId) => {
      set(draft => { if (!draft.pendingScans.includes(letterId)) draft.pendingScans.push(letterId); });
    },

    removePendingScan: (letterId) => {
      set(draft => { draft.pendingScans = draft.pendingScans.filter(id => id !== letterId); });
    },

    addShelf: (shelf) => {
      set(draft => { draft.shelves.push({ ...shelf, letters: [] }); });
    },

    // BUG-PERSIST-003 (spec §A.6): these used to hit /correspondence/archive/*,
    // which the backend never exposed (its route is /physical-archive, see
    // physical-archive.controller.ts:16), so every load 404'd and the store kept
    // showing seed data. There is also no /movements list route — the only source
    // is `recentMovements` on the archive report. Failures now raise a Persian
    // toast instead of being swallowed by an empty catch.
    loadFromApi: async () => {
      const shelvesOk = await loadCollection(
        () => api.get<ArchiveShelf[]>('/physical-archive/shelves'),
        (rows) => set(draft => {
          draft.shelves = rows.map(s => ({
            ...s,
            // The endpoint returns shelf rows without their letter records.
            letters: s.letters ?? [],
          }));
        }),
        'خطا در دریافت قفسه‌های بایگانی',
      );

      const movementsOk = await loadCollection(
        async () => {
          const report = await api.get<{ recentMovements: ApiMovementRecord[] }>('/physical-archive/report');
          return (report.recentMovements ?? []).map(toPhysicalMovement);
        },
        (rows) => set(draft => { draft.movements = rows; }),
        'خطا در دریافت جابه‌جایی‌های بایگانی',
      );

      return shelvesOk && movementsOk;
    },
  }))
);

// ── Derived selectors ─────────────────────────────────────────────────────────
export const selectShelfOccupancy = (shelf: ArchiveShelf) =>
  shelf.capacity > 0 ? Math.round((shelf.letters.length / shelf.capacity) * 100) : 0;

export const selectAllLettersWithoutPhysicalCopy = (
  archiveShelfLetterIds: Set<string>,
  allLetterIds: string[]
) => allLetterIds.filter(id => !archiveShelfLetterIds.has(id));
