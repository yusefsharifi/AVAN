import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ── Types ─────────────────────────────────────────────────────────────────────
export type NotificationModule =
  | 'correspondence'
  | 'hse'
  | 'finance'
  | 'permits'
  | 'b2b'
  | 'archive'
  | 'lifecycle'
  | 'general';

export type NotificationChannel = 'in-app' | 'email' | 'sms' | 'web-push' | 'webhook';
export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface HubNotification {
  id: string;
  module: NotificationModule;
  title: string;
  titleFa: string;
  body?: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: string;
  linkedEntityId?: string;
  linkedEntityType?: string;
  navigateTo?: string;   // route to open on click
  icon: string;          // lucide icon name
  actor?: string;
}

interface NotificationHubState {
  notifications: HubNotification[];
  // Derived
  unreadCount: number;
  unreadByModule: Record<NotificationModule, number>;

  // Actions
  push: (notification: Omit<HubNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: (module?: NotificationModule) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const genId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function computeUnreadByModule(notifications: HubNotification[]): Record<NotificationModule, number> {
  const result = {} as Record<NotificationModule, number>;
  for (const n of notifications) {
    if (!n.read) result[n.module] = (result[n.module] ?? 0) + 1;
  }
  return result;
}

// ── Seed notifications ────────────────────────────────────────────────────────
const SEED: HubNotification[] = [
  {
    id: 'seed-n1',
    module: 'correspondence',
    title: 'New letter created',
    titleFa: 'نامه جدید ایجاد شد',
    body: 'درخواست مجوز شرکت پلاستیک ایران در سیستم ثبت شد.',
    priority: 'normal',
    channels: ['in-app'],
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'Mail',
    actor: 'سیستم خودکار',
  },
  {
    id: 'seed-n2',
    module: 'hse',
    title: 'Incident reported',
    titleFa: 'حادثه HSE گزارش شد',
    body: 'حادثه در بلوک B واحد ۳ گزارش گردید.',
    priority: 'high',
    channels: ['in-app', 'email'],
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    linkedEntityType: 'incident',
    navigateTo: '/dashboard',
    icon: 'AlertTriangle',
    actor: 'احمد رضایی',
  },
  {
    id: 'seed-n3',
    module: 'permits',
    title: 'Permit expiring',
    titleFa: 'مجوز در حال انقضا',
    body: 'مجوز فعالیت شرکت فولاد البرز ۳۰ روز دیگر منقضی می‌شود.',
    priority: 'high',
    channels: ['in-app', 'sms'],
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    linkedEntityType: 'permit',
    icon: 'FileText',
    actor: 'سیستم خودکار',
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────
export const useNotificationHub = create<NotificationHubState>()(
  immer((set) => ({
    notifications: SEED,
    unreadCount: SEED.filter(n => !n.read).length,
    unreadByModule: computeUnreadByModule(SEED),

    push: (notification) => {
      const full: HubNotification = {
        ...notification,
        id: genId(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      set(draft => {
        draft.notifications.unshift(full);
        draft.unreadCount++;
        draft.unreadByModule[full.module] = (draft.unreadByModule[full.module] ?? 0) + 1;
      });
    },

    markRead: (id) => {
      set(draft => {
        const n = draft.notifications.find(n => n.id === id);
        if (n && !n.read) {
          n.read = true;
          draft.unreadCount = Math.max(0, draft.unreadCount - 1);
          draft.unreadByModule[n.module] = Math.max(0, (draft.unreadByModule[n.module] ?? 1) - 1);
        }
      });
    },

    markAllRead: (module) => {
      set(draft => {
        draft.notifications.forEach(n => {
          if (!module || n.module === module) n.read = true;
        });
        draft.unreadCount = module
          ? draft.notifications.filter(n => !n.read).length
          : 0;
        if (module) {
          draft.unreadByModule[module] = 0;
        } else {
          draft.unreadByModule = {} as Record<NotificationModule, number>;
        }
      });
    },

    dismiss: (id) => {
      set(draft => {
        const idx = draft.notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
          const n = draft.notifications[idx];
          if (!n.read) {
            draft.unreadCount = Math.max(0, draft.unreadCount - 1);
            draft.unreadByModule[n.module] = Math.max(0, (draft.unreadByModule[n.module] ?? 1) - 1);
          }
          draft.notifications.splice(idx, 1);
        }
      });
    },

    clearAll: () => {
      set(draft => {
        draft.notifications = [];
        draft.unreadCount = 0;
        draft.unreadByModule = {} as Record<NotificationModule, number>;
      });
    },
  }))
);

// ── Convenience event emitters (called from other modules) ────────────────────
export function notifyLetterCreated(subject: string, actor: string) {
  useNotificationHub.getState().push({
    module: 'correspondence',
    title: 'Letter auto-created',
    titleFa: `نامه جدید: ${subject}`,
    body: `نامه توسط ${actor} به صورت خودکار ایجاد شد.`,
    priority: 'normal',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'Mail',
    actor,
  });
}

export function notifyLetterApproved(subject: string, managerName: string) {
  useNotificationHub.getState().push({
    module: 'correspondence',
    title: 'Letter approved',
    titleFa: `نامه تأیید شد: ${subject}`,
    body: `توسط ${managerName} تأیید گردید.`,
    priority: 'normal',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'CheckCircle2',
    actor: managerName,
  });
}

export function notifyLetterRejected(subject: string, managerName: string) {
  useNotificationHub.getState().push({
    module: 'correspondence',
    title: 'Letter rejected',
    titleFa: `نامه رد شد: ${subject}`,
    body: `توسط ${managerName} رد گردید.`,
    priority: 'high',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'XCircle',
    actor: managerName,
  });
}

export function notifyQRVerificationAttempt(registryNumber: string, verifierIp?: string) {
  useNotificationHub.getState().push({
    module: 'correspondence',
    title: 'QR verification attempt',
    titleFa: `تلاش اعتبارسنجی QR: ${registryNumber}`,
    body: verifierIp ? `از IP: ${verifierIp}` : undefined,
    priority: 'low',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'QrCode',
    actor: 'عموم',
  });
}

export function notifyTimelineMilestone(companyName: string, milestone: string) {
  useNotificationHub.getState().push({
    module: 'lifecycle',
    title: 'Timeline milestone',
    titleFa: `نقطه عطف: ${companyName}`,
    body: milestone,
    priority: 'low',
    channels: ['in-app'],
    linkedEntityType: 'company',
    navigateTo: '/dashboard',
    icon: 'Star',
    actor: 'سیستم',
  });
}

export function notifyTemplateFired(templateName: string, companyName: string) {
  useNotificationHub.getState().push({
    module: 'correspondence',
    title: 'Template auto-trigger fired',
    titleFa: `قالب خودکار: ${templateName}`,
    body: `برای شرکت ${companyName} فعال شد.`,
    priority: 'normal',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'LayoutTemplate',
    actor: 'سیستم خودکار',
  });
}

export function notifyPhysicalLetterReceived(barcode: string, shelfId: string) {
  useNotificationHub.getState().push({
    module: 'archive',
    title: 'Physical letter received',
    titleFa: `نامه فیزیکی دریافت شد: ${barcode}`,
    body: `در جایگاه ${shelfId} بایگانی شد.`,
    priority: 'low',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'Archive',
    actor: 'نگهبان آرشیو',
  });
}

export function notifyPhysicalLetterOverdue(barcode: string) {
  useNotificationHub.getState().push({
    module: 'archive',
    title: 'Physical letter overdue return',
    titleFa: `نامه فیزیکی معوق: ${barcode}`,
    body: 'نامه باید بازگردانده می‌شد اما هنوز در آرشیو نیست.',
    priority: 'high',
    channels: ['in-app'],
    linkedEntityType: 'letter',
    navigateTo: '/correspondence',
    icon: 'AlertTriangle',
    actor: 'سیستم',
  });
}
