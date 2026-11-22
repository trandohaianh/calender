import { useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCalendarStore } from '@/store/calendarStore';
import { expandEvent } from '@/lib/eventUtils';
import {
  syncRemindersToSW,
  cancelEventRemindersInSW,
  showNotificationViaSW,
} from '@/lib/swMessaging';

const SW_ICON = '/icons/icon-192.png';

function buildReminderTag(eventId: string, startMs: number): string {
  return `reminder-${eventId}-${startMs}`;
}

/**
 * Nhắc nhở qua Service Worker (showNotification) + đồng bộ lịch vào SW.
 */
export function useNotifications() {
  const events = useCalendarStore((s) => s.events);
  const calendars = useCalendarStore((s) => s.calendars);
  const prevEventIdsRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      return (await Notification.requestPermission()) === 'granted';
    }
    return false;
  }, []);

  /** Tính toàn bộ reminder sắp tới (48h) và gửi vào SW */
  const scheduleRemindersInSW = useCallback(async () => {
    const now = Date.now();
    const rangeStart = new Date(now - 60_000);
    const rangeEnd = new Date(now + 48 * 60 * 60 * 1000);
    const reminders: Array<{
      tag: string;
      title: string;
      body: string;
      icon: string;
      fireAt: number;
    }> = [];

    events.forEach((ev) => {
      if (!ev.reminder) return;
      expandEvent(ev, calendars, rangeStart, rangeEnd).forEach((occ) => {
        const fireAt = occ.start.getTime() - (ev.reminder ?? 0) * 60_000;
        if (fireAt <= now) return;
        const timeLabel = occ.allDay
          ? 'cả ngày'
          : format(occ.start, 'HH:mm', { locale: vi });
        reminders.push({
          tag: buildReminderTag(ev.id, occ.start.getTime()),
          title: 'Nhắc nhở — MyCalendar',
          body: `${occ.title} — bắt đầu lúc ${timeLabel}`,
          icon: SW_ICON,
          fireAt,
        });
      });
    });

    await syncRemindersToSW(reminders);
  }, [events, calendars]);

  /** Kiểm tra nhắc nhở gần realtime (tab đang mở) — fallback qua SW */
  const checkRemindersNow = useCallback(async () => {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const rangeStart = new Date(now.getTime() - 86_400_000);
    const rangeEnd = new Date(now.getTime() + 61_000);

    for (const ev of events) {
      if (!ev.reminder) continue;
      expandEvent(ev, calendars, rangeStart, rangeEnd).forEach((occ) => {
        const remindAt = new Date(occ.start.getTime() - (ev.reminder ?? 0) * 60_000);
        const tag = buildReminderTag(ev.id, occ.start.getTime());
        if (now >= remindAt && now < occ.start) {
          const timeLabel = occ.allDay
            ? 'cả ngày'
            : format(occ.start, 'HH:mm', { locale: vi });
          void showNotificationViaSW('Nhắc nhở — MyCalendar', {
            body: `${occ.title} — bắt đầu lúc ${timeLabel}`,
            icon: SW_ICON,
            tag,
            badge: SW_ICON,
          });
        }
      });
    }
  }, [events, calendars]);

  /** Hủy notification khi event bị xóa */
  useEffect(() => {
    const currentIds = new Set(events.map((e) => e.id));
    prevEventIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        void cancelEventRemindersInSW(id);
      }
    });
    prevEventIdsRef.current = currentIds;
  }, [events]);

  useEffect(() => {
    void requestPermission().then((granted) => {
      if (granted) {
        void scheduleRemindersInSW();
        void checkRemindersNow();
      }
    });

    const interval = setInterval(() => {
      void scheduleRemindersInSW();
      void checkRemindersNow();
    }, 60_000);

    return () => clearInterval(interval);
  }, [requestPermission, scheduleRemindersInSW, checkRemindersNow]);

  /** Khi sửa event — refresh lịch nhắc trong SW */
  useEffect(() => {
    if (Notification.permission === 'granted') {
      void scheduleRemindersInSW();
    }
  }, [events, scheduleRemindersInSW]);

  return {
    requestPermission,
    scheduleRemindersInSW,
    checkRemindersNow,
    cancelEventReminders: cancelEventRemindersInSW,
  };
}
