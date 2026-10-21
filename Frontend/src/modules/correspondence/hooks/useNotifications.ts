import { useState, useCallback, useEffect } from 'react';
import { api } from '@/shared/api';
import type { Notification } from '../types';

const genId = () => `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'N-001', type: 'assignment', channel: 'in-app', title: 'New Letter Assignment', titleFa: 'تخصیص نامه جدید', body: 'شما یک نامه جدید برای بررسی دارید', bodyFa: 'شما یک نامه جدید برای بررسی دارید', letterId: 'LV2-1', letterNumber: 'KVH-1403/O/0001', recipientId: 'U001', read: false, createdAt: '۱۴۰۳/۰۴/۱۶ ۱۴:۳۰' },
  { id: 'N-002', type: 'sla-warning', channel: 'in-app', title: 'SLA Warning', titleFa: 'هشدار SLA', body: 'مهلت پاسخ نامه KVH-1403/O/0004 رو به اتمام است', bodyFa: 'مهلت پاسخ نامه KVH-1403/O/0004 رو به اتمام است', letterId: 'LV2-4', letterNumber: 'KVH-1403/O/0004', recipientId: 'U001', read: false, createdAt: '۱۴۰۳/۰۴/۱۶ ۱۲:۰۰' },
  { id: 'N-003', type: 'status-change', channel: 'in-app', title: 'Letter Approved', titleFa: 'نامه تأیید شد', body: 'نامه KVH-1403/M/0003 تأیید نهایی شد', bodyFa: 'نامه KVH-1403/M/0003 تأیید نهایی شد', letterId: 'LV2-3', letterNumber: 'KVH-1403/M/0003', recipientId: 'U001', read: true, createdAt: '۱۴۰۳/۰۴/۱۶ ۱۰:۰۰' },
  { id: 'N-004', type: 'comment', channel: 'in-app', title: 'New Comment', titleFa: 'نظر جدید', body: 'مریم رضایی روی نامه KVH-1403/O/0001 نظر ثبت کرد', bodyFa: 'مریم رضایی روی نامه KVH-1403/O/0001 نظر ثبت کرد', letterId: 'LV2-1', letterNumber: 'KVH-1403/O/0001', recipientId: 'U001', read: false, createdAt: '۱۴۰۳/۰۴/۱۶ ۱۴:۲۰' },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  // COMP-004: Try to load from backend API on mount
  useEffect(() => {
    api.get('/correspondence/notifications').then(res => {
      if (res.data?.length) setNotifications(res.data);
    }).catch(() => {}); // Graceful fallback to mock data
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((notif: Omit<Notification, 'id'>) => {
    setNotifications(prev => [{ ...notif, id: genId() }, ...prev]);
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getByLetter = useCallback((letterId: string) => {
    return notifications.filter(n => n.letterId === letterId);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    deleteNotification,
    getByLetter,
  };
}
