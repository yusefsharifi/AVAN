import { create } from 'zustand';
import type {
  Letter, SearchFilters, SavedFilter, LetterStatus, LetterAnnotation, LetterDispatchRecord,
} from '../types';
import { LETTERS } from '@/entities/letter';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { persistMutation, reconcileEntity, loadCollection } from '@/shared/lib/serverSync';
import { seedFromMock, USE_MOCKS, PERSISTENCE_MESSAGES } from '@/shared/lib/mockMode';

// ── Helper: Generate mock IDs ────────────────────────────────────────────────
const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Store Types ──────────────────────────────────────────────────────────────

interface LetterStore {
  // State
  letters: Letter[];
  selectedLetter: Letter | null;
  loading: boolean;
  error: string | null;

  // Filters
  filters: SearchFilters;
  savedFilters: SavedFilter[];
  activeCategory: string;

  // UI State
  view: 'list' | 'detail' | 'compose' | 'registry' | 'stats' | 'audit' | 'reports';
  composeMode: 'new' | 'reply' | 'forward';
  replyToId?: string;

  // Actions - Letters
  fetchLetters: () => Promise<void>;
  selectLetter: (id: string | null) => void;
  createLetter: (letter: Partial<Letter>) => Promise<Letter>;
  updateLetter: (id: string, updates: Partial<Letter>) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  archiveLetter: (id: string) => Promise<void>;
  dispatchLetter: (id: string, method: string, trackingNumber?: string) => Promise<void>;
  addAnnotation: (letterId: string, text: string, color: string, isParaph: boolean) => Promise<void>;
  toggleStarred: (id: string) => void;
  markAsRead: (id: string) => void;

  // Actions - Filters
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  saveFilter: (name: string) => void;
  deleteFilter: (id: string) => void;
  setCategory: (category: string) => void;

  // Actions - UI
  setView: (view: LetterStore['view']) => void;
  setComposeMode: (mode: 'new' | 'reply' | 'forward', replyToId?: string) => void;

  // Computed
  filteredLetters: () => Letter[];
  getLetterById: (id: string) => Letter | undefined;
  getLetterStats: () => {
    total: number;
    inbox: number;
    pending: number;
    overdue: number;
    draft: number;
    archived: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

// ── Initial Data ─────────────────────────────────────────────────────────────

const mapLegacyLetter = (l: any): Letter => ({
  id: l.id || genId('LTR'),
  registryNumber: l.number || l.registryNumber || '',
  direction: l.direction || (l.status === 'inbox' ? 'incoming' : l.status === 'draft' ? 'internal' : 'outgoing'),
  type: l.type === 'درخواست' ? 'request' : l.type === 'اطلاعیه' ? 'circular' : l.type === 'رسمی' ? 'official' : l.type === 'اداری' ? 'memo' : l.type === 'حقوقی' ? 'report' : 'official',
  classification: 'unclassified',
  priority: l.priority === 'urgent' ? 'urgent' : l.priority === 'important' ? 'urgent' : l.priority === 'info' ? 'low' : 'normal',
  subject: l.subject || '',
  body: l.preview || l.body || '',
  closing: 'با احترام',
  sender: l.senderName || l.sender || '',
  senderOrg: l.senderOrg || '',
  senderRole: '',
  recipients: (l.recipients || []).map((r: string) => ({ name: r, org: '', action: 'action' as const })),
  cc: l.cc || [],
  attachments: (l.attachments || []).map((a: any) => ({ id: genId('ATT'), name: a.name || '', size: a.size || '', description: a.description || '', uploadedBy: '', uploadedAt: l.createdAt || '', mimeType: '', version: 1, checksum: '' })),
  enclosuresCount: l.enclosuresCount || 0,
  signatory: l.signatory || l.senderName || '',
  signatoryRole: l.signatoryRole || '',
  approvalChain: (l.approvalChain || l.approvalSteps || []).map((s: any, i: number) => ({
    id: genId('STEP'),
    name: s.name || `مرحله ${i + 1}`,
    nameFa: s.name || `مرحله ${i + 1}`,
    type: 'sequential' as const,
    assigneeRole: s.role || '',
    assigneeName: s.person || '',
    status: s.status === 'approved' || s.state === 'done' ? 'approved' as const : s.state === 'current' ? 'active' as const : 'pending' as const,
    slaHours: 48,
    slaWarningHours: 12,
    order: i,
    comment: s.comment,
  })),
  annotations: (l.annotations || []).map((a: any) => ({ id: a.id || genId('ANN'), author: a.author || '', authorRole: '', date: a.date || '', text: a.text || '', color: a.color || '#dcfce7', isParaph: false })),
  status: l.status === 'inprogress' ? 'pending-approval' as const : l.status === 'referred' ? 'referred' as const : (l.status || 'draft') as LetterStatus,
  versions: [],
  currentVersion: 1,
  createdAt: l.createdAt || l.date || '',
  updatedAt: l.updatedAt || l.date || '',
  createdBy: l.senderName || l.sender || '',
  slaHours: l.slaHours || 48,
  registryYear: l.registryYear || 1403,
  starred: l.starred || false,
  unread: l.unread || false,
  tags: [],
  qrHash: genId('QR'),
  ...l.dispatchRecord && { dispatchRecord: l.dispatchRecord },
  ...l.archiveLocation && { archiveLocation: l.archiveLocation },
});

const initialLetters: Letter[] = [
  // داده‌های نمونه فقط در حالت دمو (VITE_USE_MOCKS=true) seed می‌شوند — BUG-PERSIST-001
  ...seedFromMock(LETTERS).map(mapLegacyLetter),
];

// ── نگاشت ردیف سرور به قرارداد فرانت (Letter) ───────────────────────────────
// بک‌اند (Prisma) مقادیر enum را با حروف بزرگ و نام برخی فیلدها را متفاوت
// (senderName/senderOrgName و recipients[].orgName) برمی‌گرداند؛ این نگاشت‌ها
// ردیف سرور را با قرارداد فرانت — که فیلترها و badgeهای UI روی آن حساب شده‌اند —
// هم‌راستا می‌کنند.

const asRecord = (value: unknown): Record<string, unknown> =>
  (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asNumber = (value: unknown, fallback: number): number =>
  (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

const asBool = (value: unknown): boolean => value === true;

const asStringArray = (value: unknown): string[] =>
  (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

const DIRECTION_TO_UI: Record<string, Letter['direction']> = {
  INCOMING: 'incoming', OUTGOING: 'outgoing', INTERNAL: 'internal',
};

const TYPE_TO_UI: Record<string, Letter['type']> = {
  OFFICIAL: 'official', MEMO: 'memo', CIRCULAR: 'circular', REPORT: 'report',
  INSTRUCTION: 'instruction', REQUEST: 'request', RESPONSE: 'response',
  NOTIFICATION: 'circular', INVITATION: 'circular', WARNING: 'circular',
  CONTRACT: 'official', CERTIFICATE: 'official',
};

const CLASSIFICATION_TO_UI: Record<string, Letter['classification']> = {
  UNCLASSIFIED: 'unclassified', CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted', SECRET: 'secret',
};

const PRIORITY_TO_UI: Record<string, Letter['priority']> = {
  LOW: 'low', NORMAL: 'normal', URGENT: 'urgent', INSTANT: 'instant',
};

// CANCELLED در فرانت معادل ندارد؛ مانند نامه آرشیوشده رفتار می‌کند تا در صندوق
// ورودی/پیش‌نویس‌ها نمایش داده نشود.
const STATUS_TO_UI: Record<string, LetterStatus> = {
  DRAFT: 'draft', PENDING_APPROVAL: 'pending-approval', IN_APPROVAL: 'pending-approval',
  APPROVED: 'approved', SIGNED: 'approved', SENT: 'sent', DISPATCHED: 'dispatched',
  RECEIVED: 'sent', ARCHIVED: 'archived', RETURNED: 'returned', REFERRED: 'referred',
  CANCELLED: 'archived',
};

const RECIPIENT_ACTION_TO_API: Record<Letter['recipients'][number]['action'], 'ACTION' | 'INFO' | 'CC'> = {
  action: 'ACTION', info: 'INFO', reference: 'CC',
};

// روش‌های ارسال فرانت ⇒ methods پذیرفته‌شده در DispatchLetterDto بک‌اند
const DISPATCH_METHOD_TO_API: Record<LetterDispatchRecord['method'], 'EMAIL' | 'SMS' | 'PHYSICAL' | 'PORTAL'> = {
  email: 'EMAIL', hand: 'PHYSICAL', post: 'PHYSICAL', courier: 'PHYSICAL', fax: 'PHYSICAL',
};

/** ردیف خام نامه از سرور ⇒ Letter طبق قرارداد فرانت. */
const mapServerLetter = (raw: unknown): Letter => {
  const r = asRecord(raw);
  const dispatchRecord = r.dispatchRecord;
  const archiveLocation = r.archiveLocation;
  return {
    id: asString(r.id) || genId('LTR'),
    registryNumber: asString(r.registryNumber),
    direction: DIRECTION_TO_UI[asString(r.direction).toUpperCase()] ?? 'internal',
    type: TYPE_TO_UI[asString(r.type).toUpperCase()] ?? 'official',
    classification: CLASSIFICATION_TO_UI[asString(r.classification).toUpperCase()] ?? 'unclassified',
    priority: PRIORITY_TO_UI[asString(r.priority).toUpperCase()] ?? 'normal',
    subject: asString(r.subject),
    body: asString(r.body),
    closing: asString(r.closing),
    referenceLetterId: typeof r.referenceLetterId === 'string' ? r.referenceLetterId : undefined,
    referenceLetterNumber: typeof r.referenceLetterNumber === 'string' ? r.referenceLetterNumber : undefined,
    sender: asString(r.senderName),
    senderOrg: asString(r.senderOrgName),
    senderRole: asString(r.senderRole),
    recipients: (Array.isArray(r.recipients) ? r.recipients : []).map((item) => {
      const recipient = asRecord(item);
      const action = asString(recipient.action).toUpperCase();
      return {
        name: asString(recipient.name),
        org: asString(recipient.orgName),
        action: action === 'INFO' ? 'info' as const : action === 'CC' ? 'reference' as const : 'action' as const,
      };
    }),
    cc: asStringArray(r.cc),
    attachments: [],
    enclosuresCount: asNumber(r.enclosuresCount, 0),
    signatory: asString(r.signatory),
    signatoryRole: asString(r.signatoryRole),
    approvalChain: [],
    annotations: [],
    status: STATUS_TO_UI[asString(r.status).toUpperCase()] ?? 'draft',
    versions: [],
    currentVersion: asNumber(r.currentVersion, 1),
    createdAt: asString(r.createdAt),
    updatedAt: asString(r.updatedAt),
    createdBy: asString(r.createdBy),
    responseDeadline: typeof r.responseDeadline === 'string' ? r.responseDeadline : undefined,
    slaHours: asNumber(r.slaHours, 48),
    registryYear: asNumber(r.registryYear, 1403),
    starred: asBool(r.starred),
    unread: asBool(r.unread),
    tags: asStringArray(r.tags),
    qrHash: asString(r.qrHash) || genId('QR'),
    ...(typeof dispatchRecord === 'object' && dispatchRecord !== null
      ? { dispatchRecord: dispatchRecord as Letter['dispatchRecord'] }
      : {}),
    ...(typeof archiveLocation === 'object' && archiveLocation !== null
      ? { archiveLocation: archiveLocation as Letter['archiveLocation'] }
      : {}),
  };
};

/**
 * GET /letters ممکن است هم آرایه خام و هم envelope {data:[...],nextCursor}
 * برگرداند؛ هر دو شکل پشتیبانی می‌شود.
 */
const extractLetterRows = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  const envelope = asRecord(raw).data;
  return Array.isArray(envelope) ? envelope : [];
};

// ── نگاشت به DTOهای بک‌اند (ValidationPipe فیلدهای اضافی را رد می‌کند) ─────────

const toCreateLetterDto = (letter: Letter) => ({
  zoneId: useAuthStore.getState().user?.zoneId,
  direction: letter.direction.toUpperCase(),
  type: letter.type.toUpperCase(),
  classification: letter.classification.toUpperCase(),
  priority: letter.priority.toUpperCase(),
  subject: letter.subject,
  body: letter.body,
  closing: letter.closing,
  enclosuresCount: letter.enclosuresCount,
  senderName: letter.sender,
  senderOrgName: letter.senderOrg,
  senderRole: letter.senderRole,
  recipients: letter.recipients.map((recipient) => ({
    name: recipient.name,
    orgName: recipient.org,
    action: RECIPIENT_ACTION_TO_API[recipient.action],
  })),
  cc: letter.cc,
  referenceLetterNumber: letter.referenceLetterNumber,
  referenceLetterId: letter.referenceLetterId,
  topic: letter.topic,
  slaHours: letter.slaHours,
  signatory: letter.signatory,
  signatoryRole: letter.signatoryRole,
  starred: letter.starred,
  tags: letter.tags,
});

/** فقط فیلدهای قابل‌به‌روزرسانی نامه ارسال می‌شوند. */
const toUpdateLetterDto = (updates: Partial<Letter>): Record<string, unknown> => ({
  subject: updates.subject,
  body: updates.body,
  closing: updates.closing,
  classification: updates.classification?.toUpperCase(),
  priority: updates.priority?.toUpperCase(),
  signatory: updates.signatory,
  signatoryRole: updates.signatoryRole,
  enclosuresCount: updates.enclosuresCount,
  topic: updates.topic,
  slaHours: updates.slaHours,
  starred: updates.starred,
  tags: updates.tags,
  recipients: updates.recipients?.map((recipient) => ({
    name: recipient.name,
    orgName: recipient.org,
    action: RECIPIENT_ACTION_TO_API[recipient.action],
  })),
  cc: updates.cc,
});

// ── Optimistic Update Helper ─────────────────────────────────────────────────

function optimisticUpdate<T>(
  items: T[],
  id: string,
  updates: Partial<T>,
  idKey: keyof T = 'id' as keyof T
): T[] {
  return items.map(item =>
    (item[idKey] as any) === id ? { ...item, ...updates } : item
  );
}

function optimisticRemove<T>(
  items: T[],
  id: string,
  idKey: keyof T = 'id' as keyof T
): T[] {
  return items.filter(item => (item[idKey] as any) !== id);
}

function optimisticAdd<T>(
  items: T[],
  item: T
): T[] {
  return [item, ...items];
}

// ── Store Implementation ─────────────────────────────────────────────────────

export const useCorrespondenceStore = create<LetterStore>((set, get) => ({
  // Initial State
  letters: initialLetters,
  selectedLetter: null,
  loading: false,
  error: null,
  filters: { query: '' },
  savedFilters: [],
  activeCategory: 'inbox',
  view: 'list',
  composeMode: 'new',

  // ── Letter Actions ───────────────────────────────────────────────────────

  fetchLetters: async () => {
    set({ loading: true, error: null });
    // BUG-PERSIST-001: واکشی واقعی از بک‌اند؛ در موفقیت collection REPLACE
    // می‌شود (لیست خالی سرور ⇒ فروشگاه خالی) و در شکست toast فارسی نمایش داده
    // می‌شود و داده قبلی دست‌نخورده می‌ماند.
    const loaded = await loadCollection<Letter>(
      async () => {
        const raw = await api.get<unknown>('/letters');
        return extractLetterRows(raw).map(mapServerLetter);
      },
      (rows) => set({ letters: rows }),
      PERSISTENCE_MESSAGES.loadFailed,
    );
    set({ loading: false, error: loaded ? null : PERSISTENCE_MESSAGES.loadFailed });
  },

  selectLetter: (id) => {
    if (!id) {
      set({ selectedLetter: null, view: 'list' });
      return;
    }
    const letter = get().letters.find(l => l.id === id);
    if (letter) {
      // Mark as read optimistically
      set(state => ({
        selectedLetter: letter,
        view: 'detail',
        letters: optimisticUpdate(state.letters, id, { unread: false }),
      }));
    }
  },

  createLetter: async (partial) => {
    const newLetter: Letter = {
      id: genId('LTR'),
      registryNumber: `KVH-${new Date().getFullYear()}/${partial.type === 'official' ? 'O' : 'M'}/${String(get().letters.length + 1).padStart(4, '0')}`,
      direction: partial.direction || 'outgoing',
      type: partial.type || 'official',
      classification: partial.classification || 'unclassified',
      priority: partial.priority || 'normal',
      subject: partial.subject || '',
      body: partial.body || '',
      closing: partial.closing || 'با احترام',
      sender: partial.sender || 'کاربر جاری',
      senderOrg: partial.senderOrg || 'مدیریت شهرک',
      senderRole: partial.senderRole || '',
      recipients: partial.recipients || [],
      cc: partial.cc || [],
      attachments: partial.attachments || [],
      enclosuresCount: partial.enclosuresCount || 0,
      signatory: partial.signatory || '',
      signatoryRole: partial.signatoryRole || '',
      approvalChain: partial.approvalChain || [],
      annotations: [],
      status: 'draft',
      versions: [],
      currentVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'کاربر جاری',
      slaHours: partial.slaHours || 48,
      registryYear: new Date().getFullYear() === 2024 ? 1403 : 1403,
      starred: false,
      unread: false,
      tags: [],
      qrHash: genId('QR'),
      ...partial,
    };

    // فاز ۱ (خوش‌بینانه) بیرون از persistMutation اعمال می‌شود تا entity محلی
    // همزمان برگردد و در حالت دمو (skip) هم رفتار قبلی حفظ شود.
    set(state => ({
      letters: optimisticAdd(state.letters, newLetter),
      view: 'detail' as const,
      selectedLetter: newLetter,
    }));

    const created = await persistMutation<Letter>({
      optimistic: () => undefined,
      request: () => api.post<Letter>('/letters', toCreateLetterDto(newLetter)),
      rollback: () => set(state => ({
        letters: optimisticRemove(state.letters, newLetter.id),
        selectedLetter: state.selectedLetter?.id === newLetter.id ? null : state.selectedLetter,
        view: state.selectedLetter?.id === newLetter.id ? ('list' as const) : state.view,
      })),
      // شناسه سرور جایگزین شناسه محلی می‌شود تا اعمال بعدی به ردیف واقعی بخورند
      reconcile: (server) => {
        const normalized = mapServerLetter(server);
        set(state => ({
          letters: reconcileEntity(state.letters, newLetter.id, normalized),
          selectedLetter: state.selectedLetter?.id === newLetter.id ? normalized : state.selectedLetter,
        }));
      },
      messageFa: PERSISTENCE_MESSAGES.createFailed,
      skip: USE_MOCKS,
    });

    return created ?? newLetter;
  },

  updateLetter: async (id, updates) => {
    const prev = get().letters;
    const prevSelected = get().selectedLetter;
    const updatedAt = new Date().toISOString();
    // فاز ۱ (خوش‌بینانه)
    set(state => ({
      letters: optimisticUpdate(state.letters, id, { ...updates, updatedAt }),
      selectedLetter: state.selectedLetter?.id === id
        ? { ...state.selectedLetter, ...updates, updatedAt }
        : state.selectedLetter,
    }));

    // TODO(BACKEND): PATCH /letters/:id هنوز در کنترلر نامه پیاده‌سازی نشده است؛
    // درخواست ارسال می‌شود و خطای 404 با rollback و toast فارسی گزارش می‌شود.
    await persistMutation<Letter>({
      optimistic: () => undefined,
      request: () => api.patch<Letter>(`/letters/${id}`, toUpdateLetterDto(updates)),
      rollback: () => set({ letters: prev, selectedLetter: prevSelected }),
      reconcile: (server) => {
        const normalized = mapServerLetter(server);
        set(state => ({
          letters: reconcileEntity(state.letters, id, normalized),
          selectedLetter: state.selectedLetter?.id === id ? normalized : state.selectedLetter,
        }));
      },
      messageFa: PERSISTENCE_MESSAGES.updateFailed,
      skip: USE_MOCKS,
    });
  },

  deleteLetter: async (id) => {
    const prev = get().letters;
    const prevSelected = get().selectedLetter;
    const prevView = get().view;
    set(state => ({
      letters: optimisticRemove(state.letters, id),
      selectedLetter: state.selectedLetter?.id === id ? null : state.selectedLetter,
      view: state.selectedLetter?.id === id ? 'list' as const : state.view,
    }));

    // TODO(BACKEND): DELETE /letters/:id هنوز در کنترلر نامه پیاده‌سازی نشده است؛
    // درخواست ارسال می‌شود و خطای 404 با rollback و toast فارسی گزارش می‌شود.
    await persistMutation<Letter>({
      optimistic: () => undefined,
      request: async () => {
        await api.delete(`/letters/${id}`);
      },
      rollback: () => set({ letters: prev, selectedLetter: prevSelected, view: prevView }),
      messageFa: PERSISTENCE_MESSAGES.deleteFailed,
      skip: USE_MOCKS,
    });
  },

  archiveLetter: async (id) => {
    const prev = get().letters;
    const prevSelected = get().selectedLetter;
    set(state => ({
      letters: optimisticUpdate(state.letters, id, { status: 'archived' }),
      selectedLetter: state.selectedLetter?.id === id
        ? { ...state.selectedLetter, status: 'archived' }
        : state.selectedLetter,
    }));

    // POST /letters/:id/archive وجود دارد؛ پاسخ سرور با حفظ ساختار فرانت نگه
    // داشته می‌شود (شکل پاسخ این endpoint با نامه کامل یکسان نیست).
    await persistMutation<Letter>({
      optimistic: () => undefined,
      request: async () => {
        await api.post(`/letters/${id}/archive`);
      },
      rollback: () => set({ letters: prev, selectedLetter: prevSelected }),
      messageFa: 'خطا در آرشیو نامه؛ نامه آرشیو نشد',
      skip: USE_MOCKS,
    });
  },

  dispatchLetter: async (id, method, trackingNumber) => {
    const prev = get().letters;
    const prevSelected = get().selectedLetter;
    // method در قرارداد store رشته است؛ به یکی از مقادیر معتبر فرانت محدود می‌شود
    const knownMethod: LetterDispatchRecord['method'] =
      method === 'email' || method === 'hand' || method === 'post' || method === 'courier' || method === 'fax'
        ? method
        : 'courier';
    const dispatchRecord: LetterDispatchRecord = {
      method: knownMethod,
      trackingNumber,
      dispatcher: 'دبیرخانه',
      timestamp: new Date().toISOString(),
    };
    set(state => ({
      letters: optimisticUpdate(state.letters, id, { status: 'dispatched', dispatchRecord }),
      selectedLetter: state.selectedLetter?.id === id
        ? { ...state.selectedLetter, status: 'dispatched', dispatchRecord }
        : state.selectedLetter,
    }));

    // DispatchLetterDto بک‌اند methods آرایه‌ای می‌خواهد؛ روش‌های فرانت نگاشت می‌شوند
    await persistMutation<Letter>({
      optimistic: () => undefined,
      request: async () => {
        await api.post(`/letters/${id}/dispatch`, {
          methods: [DISPATCH_METHOD_TO_API[knownMethod]],
          physicalTrackingNumber: trackingNumber,
          notes: 'ارسال از سامانه مکاتبات',
        });
      },
      rollback: () => set({ letters: prev, selectedLetter: prevSelected }),
      messageFa: 'خطا در ارسال نامه؛ نامه ارسال نشد',
      skip: USE_MOCKS,
    });
  },

  addAnnotation: async (letterId, text, color, isParaph) => {
    const annotation: LetterAnnotation = {
      id: genId('ANN'),
      author: 'کاربر جاری',
      authorRole: '',
      date: new Date().toISOString(),
      text,
      color,
      isParaph,
    };

    const letter = get().letters.find(l => l.id === letterId);
    if (!letter) return;

    const prev = get().letters;
    set(state => ({
      letters: optimisticUpdate(state.letters, letterId, { annotations: [...letter.annotations, annotation] }),
    }));

    // POST /letters/:id/annotations وجود دارد؛ isParaph فرانت ⇒ isPrivate بک‌اند
    await persistMutation<Letter>({
      optimistic: () => undefined,
      request: async () => {
        await api.post(`/letters/${letterId}/annotations`, {
          content: text,
          color,
          isPrivate: isParaph,
        });
      },
      rollback: () => set({ letters: prev }),
      messageFa: 'خطا در ثبت یادداشت؛ یادداشت ذخیره نشد',
      skip: USE_MOCKS,
    });
  },

  toggleStarred: (id) => {
    const letter = get().letters.find(l => l.id === id);
    if (letter) {
      set(state => ({
        letters: optimisticUpdate(state.letters, id, { starred: !letter.starred }),
      }));
    }
  },

  markAsRead: (id) => {
    set(state => ({
      letters: optimisticUpdate(state.letters, id, { unread: false }),
    }));
  },

  // ── Filter Actions ───────────────────────────────────────────────────────

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({ filters: { query: '' } });
  },

  saveFilter: (name) => {
    const filter: SavedFilter = {
      id: genId('FILTER'),
      name,
      filters: { ...get().filters },
      createdBy: 'کاربر جاری',
      isPublic: false,
    };
    set(state => ({
      savedFilters: [...state.savedFilters, filter],
    }));
  },

  deleteFilter: (id) => {
    set(state => ({
      savedFilters: state.savedFilters.filter(f => f.id !== id),
    }));
  },

  setCategory: (category) => {
    set({ activeCategory: category, filters: { query: '' } });
  },

  // ── UI Actions ───────────────────────────────────────────────────────────

  setView: (view) => set({ view }),

  setComposeMode: (mode, replyToId) => set({ composeMode: mode, replyToId, view: 'compose' }),

  // ── Computed ─────────────────────────────────────────────────────────────

  filteredLetters: () => {
    const { letters, filters, activeCategory } = get();
    let result = [...letters];

    // Category filter
    switch (activeCategory) {
      case 'inbox':
        result = result.filter(l => l.direction === 'incoming' && l.status !== 'archived' && l.status !== 'draft');
        break;
      case 'outbox':
        result = result.filter(l => l.direction === 'outgoing' && l.status !== 'archived' && l.status !== 'draft');
        break;
      case 'draft':
        result = result.filter(l => l.status === 'draft');
        break;
      case 'pending':
        result = result.filter(l => l.status === 'pending-approval' || l.status === 'referred');
        break;
      case 'archive':
        result = result.filter(l => l.status === 'archived');
        break;
      case 'all':
        break;
    }

    // Search filters
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(l =>
        l.subject.toLowerCase().includes(q) ||
        l.registryNumber.toLowerCase().includes(q) ||
        l.sender.toLowerCase().includes(q) ||
        l.body.toLowerCase().includes(q)
      );
    }

    if (filters.direction) result = result.filter(l => l.direction === filters.direction);
    if (filters.type) result = result.filter(l => l.type === filters.type);
    if (filters.priority) result = result.filter(l => l.priority === filters.priority);
    if (filters.status) result = result.filter(l => l.status === filters.status);
    if (filters.classification) result = result.filter(l => l.classification === filters.classification);

    // Sort by priority then date
    const priorityOrder: Record<string, number> = { instant: 0, urgent: 1, normal: 2, low: 3 };
    result.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  },

  getLetterById: (id) => {
    return get().letters.find(l => l.id === id);
  },

  getLetterStats: () => {
    const letters = get().letters;
    const now = new Date();
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    letters.forEach(l => {
      byType[l.type] = (byType[l.type] || 0) + 1;
      byPriority[l.priority] = (byPriority[l.priority] || 0) + 1;
    });

    return {
      total: letters.length,
      inbox: letters.filter(l => l.direction === 'incoming' && l.status !== 'archived').length,
      pending: letters.filter(l => l.status === 'pending-approval').length,
      overdue: letters.filter(l => {
        if (!l.responseDeadline) return false;
        return new Date(l.responseDeadline) < now && l.status !== 'archived';
      }).length,
      draft: letters.filter(l => l.status === 'draft').length,
      archived: letters.filter(l => l.status === 'archived').length,
      byType,
      byPriority,
    };
  },
}));

// ── سازگاری با useModuleBootstrap ────────────────────────────────────────────
// «import { fetchLetters } from '@/modules/correspondence/store» — action فروشگاه
// هم به‌صورت named export در دسترس است تا واکشی نامه‌ها در bootstrap انجام شود.
export async function fetchLetters(): Promise<void> {
  await useCorrespondenceStore.getState().fetchLetters();
}
