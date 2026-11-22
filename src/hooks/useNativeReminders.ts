import { useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCalendarStore } from '@/store/calendarStore';
import { expandEvent } from '@/lib/eventUtils';
import { isNative } from '@/capacitor/platform';
import {
  scheduleNotification,
  cancelAllNotifications,
  reminderIdFromKey,
  requestNotificationPermission,
} from '@/capacitor/notifications';

/** Đồng bộ reminders lên Local Notifications (Android/iOS) */
export function useNativeReminders() {
  const events = useCalendarStore((s) => s.events);
  const calendars = useCalendarStore((s) => s.calendars);

  useEffect(() => {
    if (!isNative()) return;

    void (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      await cancelAllNotifications();

      const now = Date.now();
      const rangeStart = new Date(now);
      const rangeEnd = new Date(now + 48 * 60 * 60 * 1000);

      for (const ev of events) {
        if (!ev.reminder) continue;
        expandEvent(ev, calendars, rangeStart, rangeEnd).forEach((occ) => {
          const fireAt = new Date(occ.start.getTime() - (ev.reminder ?? 0) * 60_000);
          if (fireAt.getTime() <= now) return;

          const timeLabel = occ.allDay
            ? 'cả ngày'
            : format(occ.start, 'HH:mm', { locale: vi });

          void scheduleNotification({
            id: reminderIdFromKey(ev.id, occ.start.getTime()),
            title: 'Nhắc nhở — MyCalendar',
            body: `${occ.title} — bắt đầu lúc ${timeLabel}`,
            scheduleAt: fireAt,
            extra: { eventId: ev.id },
          });
        });
      }
    })();
  }, [events, calendars]);
}
