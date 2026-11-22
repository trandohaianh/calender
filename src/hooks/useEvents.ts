import { useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthUserId, hasFirebaseSession } from '@/store/authStore';
import { isFirebaseConfigured } from '@/firebase/env';
import { ensureFirebaseInitialized } from '@/firebase/init';
import { formToEventInput, formToEventPatch, eventToForm } from '@/lib/eventAdapters';
import { useOfflineStore } from '@/store/offlineStore';
import { useFirebaseStore } from '@/store/firebaseStore';
import { cancelEventRemindersInSW } from '@/lib/swMessaging';
import { toastSuccess } from '@/store/toastStore';
import type { CalendarEvent, CreateCalendarEventInput, EventFormValues } from '@/types';

function createSeedEvents(): CalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const ev1Start = new Date(year, month, day, 9, 0);
  const ev1End = new Date(year, month, day, 10, 30);

  const ev2Start = new Date(year, month, day, 15, 0);
  const ev2End = new Date(year, month, day, 16, 30);

  const ev3Start = new Date(year, month, day + 1, 7, 0);
  const ev3End = new Date(year, month, day + 1, 8, 30);

  const ev4Start = new Date(year, month, day + 2, 18, 30);
  const ev4End = new Date(year, month, day + 2, 21, 0);

  const ev5Start = new Date(year, month, day + 4, 8, 30);
  const ev5End = new Date(year, month, day + 4, 11, 30);

  return [
    {
      id: 'demo-ev-1',
      title: '💼 Họp kế hoạch sản phẩm & Đánh giá AI',
      description: 'Thảo luận lộ trình phát triển trợ lý thời tiết thông minh và cải tiến trải nghiệm người dùng.',
      location: 'Văn phòng Tầng 12 - Tòa nhà Tech Center',
      startDate: Timestamp.fromDate(ev1Start),
      endDate: Timestamp.fromDate(ev1End),
      isAllDay: false,
      color: '#1a73e8',
      calendarId: 'cal-work',
      reminder: 15,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-ev-2',
      title: '☕ Gặp gỡ đối tác ngoại thành (Nhớ mang ô ☔)',
      description: 'Ký kết thỏa thuận hợp tác. Buổi chiều dự báo có mưa dông, cần chuẩn bị ô và xuất phát sớm 15 phút.',
      location: 'The Coffee House - 18 Huỳnh Thúc Kháng',
      startDate: Timestamp.fromDate(ev2Start),
      endDate: Timestamp.fromDate(ev2End),
      isAllDay: false,
      color: '#9334e6',
      calendarId: 'cal-outing',
      reminder: 30,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-ev-3',
      title: '🏃 Chạy bộ công viên & Rèn luyện thể thao',
      description: 'Chạy 5km buổi sáng sớm, hít thở không khí trong lành.',
      location: 'Công viên Thống Nhất',
      startDate: Timestamp.fromDate(ev3Start),
      endDate: Timestamp.fromDate(ev3End),
      isAllDay: false,
      color: '#34a853',
      calendarId: 'cal-personal',
      reminder: 15,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-ev-4',
      title: '🎉 Tiệc sinh nhật ngoài trời & Hẹn hò tối',
      description: 'Ăn tối cùng bạn bè tại không gian mở sân thượng rooftop.',
      location: 'Sky Bar & Rooftop Garden',
      startDate: Timestamp.fromDate(ev4Start),
      endDate: Timestamp.fromDate(ev4End),
      isAllDay: false,
      color: '#ea4335',
      calendarId: 'cal-family',
      reminder: 60,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: 'demo-ev-5',
      title: '🏕️ Dã ngoại cắm trại ngoại ô cuối tuần',
      description: 'Chuẩn bị lều trại, đồ nướng BBQ, bình giữ nhiệt và đồ bảo hộ.',
      location: 'Khu du lịch sinh thái Đồng Mô',
      startDate: Timestamp.fromDate(ev5Start),
      endDate: Timestamp.fromDate(ev5End),
      isAllDay: false,
      color: '#f9ab00',
      calendarId: 'cal-outing',
      reminder: 1440,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];
}

function getLocalEvents(userId: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(`mycalendar_events_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e: any) => ({
          ...e,
          startDate: new Timestamp(e.startDate?.seconds || 0, e.startDate?.nanoseconds || 0),
          endDate: new Timestamp(e.endDate?.seconds || 0, e.endDate?.nanoseconds || 0),
          createdAt: new Timestamp(e.createdAt?.seconds || 0, e.createdAt?.nanoseconds || 0),
          updatedAt: new Timestamp(e.updatedAt?.seconds || 0, e.updatedAt?.nanoseconds || 0),
          recurrence: e.recurrence
            ? {
                ...e.recurrence,
                endDate: e.recurrence.endDate
                  ? new Timestamp(e.recurrence.endDate.seconds, e.recurrence.endDate.nanoseconds)
                  : undefined,
              }
            : undefined,
        }));
      }
    }
  } catch {
    // fallback
  }
  const seed = createSeedEvents();
  saveLocalEvents(userId, seed);
  return seed;
}

function saveLocalEvents(userId: string, events: CalendarEvent[]) {
  try {
    const plain = events.map((e) => ({
      ...e,
      startDate: { seconds: e.startDate.seconds, nanoseconds: e.startDate.nanoseconds },
      endDate: { seconds: e.endDate.seconds, nanoseconds: e.endDate.nanoseconds },
      createdAt: { seconds: e.createdAt.seconds, nanoseconds: e.createdAt.nanoseconds },
      updatedAt: { seconds: e.updatedAt.seconds, nanoseconds: e.updatedAt.nanoseconds },
      recurrence: e.recurrence
        ? {
            ...e.recurrence,
            endDate: e.recurrence.endDate
              ? {
                  seconds: e.recurrence.endDate.seconds,
                  nanoseconds: e.recurrence.endDate.nanoseconds,
                }
              : undefined,
          }
        : undefined,
    }));
    localStorage.setItem(`mycalendar_events_${userId}`, JSON.stringify(plain));
  } catch {
    // ignore
  }
}

/** CRUD sự kiện — Firestore + Local Storage */
export function useEvents() {
  const userId = useAuthUserId() || 'guest-user';
  const events = useCalendarStore((s) => s.events);
  const setEvents = useCalendarStore((s) => s.setEvents);
  const setLoading = useCalendarStore((s) => s.setLoading);
  const queueWrite = useOfflineStore((s) => s.queueWrite);
  const setUnavailable = useFirebaseStore((s) => s.setUnavailable);
  const setAvailable = useFirebaseStore((s) => s.setAvailable);

  useEffect(() => {
    // Load local events for immediate fast display
    const local = getLocalEvents(userId);
    setEvents(local);
    setLoading(false);

    if (!userId || !isFirebaseConfigured()) {
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    void ensureFirebaseInitialized()
      .then(() => import('@/firebase/firestore'))
      .then(({ subscribeToEvents }) => {
        if (cancelled) return;
        unsub = subscribeToEvents(
          userId,
          (data) => {
            if (data.length > 0) {
              setEvents(data);
              saveLocalEvents(userId, data);
            }
            setLoading(false);
            setAvailable();
          },
          (err) => {
            console.warn('[useEvents] Firebase subscribe notice:', err.message);
            setLoading(false);
            setUnavailable(err.message);
          }
        );
      })
      .catch((err) => {
        console.warn('[useEvents] Local storage active:', err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [userId, setEvents, setLoading, setAvailable, setUnavailable]);

  const addEvent = useCallback(
    async (form: EventFormValues) => {
      const input = formToEventInput(form);
      const newEvent: CalendarEvent = {
        ...input,
        id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const updated = [newEvent, ...events];
      setEvents(updated);
      saveLocalEvents(userId, updated);
      toastSuccess('Đã tạo sự kiện mới!');

      if (!hasFirebaseSession()) return;
      if (queueWrite(userId, { type: 'createEvent', form })) return;

      // Đồng bộ Firestore chạy nền — KHÔNG await ở đây, để lời gọi addEvent()
      // luôn resolve ngay sau khi lưu local xong. Nếu Firestore chậm/rules
      // chưa deploy/mất mạng, việc đó không được phép treo UI đang chờ addEvent.
      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { createEvent } = await import('@/firebase/firestore');
          await createEvent(userId, input);
          void import('@/firebase/analytics').then((m) => m.AnalyticsEvents.eventCreated());
        } catch (e) {
          console.warn('Firebase sync delayed (stored locally):', e);
        }
      })();
    },
    [userId, events, setEvents, queueWrite]
  );

  const editEvent = useCallback(
    async (eventId: string, form: Partial<EventFormValues>) => {
      const patch = formToEventPatch(form);
      const updated = events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          ...patch,
          updatedAt: Timestamp.now(),
        } as CalendarEvent;
      });

      setEvents(updated);
      saveLocalEvents(userId, updated);
      void cancelEventRemindersInSW(eventId);
      toastSuccess('Đã cập nhật sự kiện');

      if (!hasFirebaseSession()) return;
      if (queueWrite(userId, { type: 'updateEvent', eventId, form })) return;

      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { updateEvent } = await import('@/firebase/firestore');
          await updateEvent(userId, eventId, patch);
          void import('@/firebase/analytics').then((m) => m.AnalyticsEvents.eventUpdated());
        } catch (e) {
          console.warn('Firebase updateEvent error (saved locally):', e);
        }
      })();
    },
    [userId, events, setEvents, queueWrite]
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      const updated = events.filter((e) => e.id !== eventId);
      setEvents(updated);
      saveLocalEvents(userId, updated);
      void cancelEventRemindersInSW(eventId);
      toastSuccess('Đã xóa sự kiện');

      if (!hasFirebaseSession()) return;
      if (queueWrite(userId, { type: 'deleteEvent', eventId })) return;

      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { deleteEvent } = await import('@/firebase/firestore');
          await deleteEvent(userId, eventId);
          void import('@/firebase/analytics').then((m) => m.AnalyticsEvents.eventDeleted());
        } catch (e) {
          console.warn('Firebase deleteEvent error (removed locally):', e);
        }
      })();
    },
    [userId, events, setEvents, queueWrite]
  );

  /** Thêm nhiều sự kiện một lúc (nhập file .ics) — trả về số sự kiện đã thêm */
  const importEvents = useCallback(
    async (inputs: CreateCalendarEventInput[]): Promise<number> => {
      if (inputs.length === 0) return 0;
      const now = Timestamp.now();
      const created: CalendarEvent[] = inputs.map((input, i) => ({
        ...input,
        id: `ev-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }));
      const updated = [...created, ...events];
      setEvents(updated);
      saveLocalEvents(userId, updated);

      if (!hasFirebaseSession()) return created.length;

      const toSync = created.filter(
        (ev) => !queueWrite(userId, { type: 'createEvent', form: eventToForm(ev) })
      );
      if (toSync.length === 0) return created.length;

      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { createEvent } = await import('@/firebase/firestore');
          for (const ev of toSync) {
            const { id: _id, createdAt: _c, updatedAt: _u, ...input } = ev;
            await createEvent(userId, input);
          }
        } catch (e) {
          console.warn('Firebase import sync delayed (stored locally):', e);
        }
      })();
      return created.length;
    },
    [userId, events, setEvents, queueWrite]
  );

  const fetchEventsInRange = useCallback(
    async (start: Date, end: Date): Promise<CalendarEvent[]> => {
      if (hasFirebaseSession()) {
        try {
          await ensureFirebaseInitialized();
          const { getEvents } = await import('@/firebase/firestore');
          return await getEvents(userId, start, end);
        } catch {
          // fallback
        }
      }
      return events.filter((ev) => {
        const s = ev.startDate.toDate();
        return s >= start && s <= end;
      });
    },
    [userId, events]
  );

  const getEventById = useCallback(
    (id: string): CalendarEvent | undefined => events.find((e) => e.id === id),
    [events]
  );

  return {
    events,
    addEvent,
    editEvent,
    removeEvent,
    importEvents,
    getEventById,
    fetchEventsInRange,
  };
}
