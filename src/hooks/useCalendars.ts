import { useEffect, useCallback } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthUserId, hasFirebaseSession } from '@/store/authStore';
import { ensureFirebaseInitialized } from '@/firebase/init';
import { useOfflineStore } from '@/store/offlineStore';
import type { Calendar, CreateCalendarInput, UpdateCalendarInput } from '@/types';

export const DEFAULT_CALENDARS: Calendar[] = [
  { id: 'cal-personal', name: 'Cá nhân', color: '#1a73e8', isVisible: true, isDefault: true },
  { id: 'cal-work', name: 'Công việc', color: '#34a853', isVisible: true, isDefault: false },
  { id: 'cal-outing', name: 'Dã ngoại & Ra ngoài', color: '#9334e6', isVisible: true, isDefault: false },
  { id: 'cal-family', name: 'Gia đình', color: '#f9ab00', isVisible: true, isDefault: false },
];

function getLocalCalendars(userId: string): Calendar[] {
  try {
    const raw = localStorage.getItem(`mycalendar_calendars_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CALENDARS;
}

function saveLocalCalendars(userId: string, calendars: Calendar[]) {
  try {
    localStorage.setItem(`mycalendar_calendars_${userId}`, JSON.stringify(calendars));
  } catch {
    // ignore
  }
}

/** Quản lý danh mục lịch trên Firestore & Local Storage */
export function useCalendars() {
  const userId = useAuthUserId() || 'guest-user';
  const calendars = useCalendarStore((s) => s.calendars);
  const setCalendars = useCalendarStore((s) => s.setCalendars);
  const queueWrite = useOfflineStore((s) => s.queueWrite);

  useEffect(() => {
    // Always load local calendars first for instant UI
    const local = getLocalCalendars(userId);
    if (calendars.length === 0) {
      setCalendars(local);
    }

    if (!userId || !hasFirebaseSession()) return;

    let unsub: (() => void) | undefined;
    let cancelled = false;
    let seeding = false; // tránh gọi seed chồng chéo khi snapshot bắn lại nhiều lần lúc đang seed
    let repaired = false; // chỉ tự sửa dữ liệu cũ (trùng lặp/thiếu lịch mặc định) một lần

    void ensureFirebaseInitialized()
      .then(() => import('@/firebase/firestore'))
      .then(({ subscribeToCalendars, seedDefaultCalendars, deleteCalendar }) => {
        if (cancelled) return;
        unsub = subscribeToCalendars(
          userId,
          (data) => {
            if (data.length === 0) {
              if (seeding) return;
              seeding = true;
              // seedDefaultCalendars dùng setDoc với id cố định (idempotent) —
              // an toàn dù effect này chạy 2 lần (React StrictMode) hoặc
              // snapshot bắn lại nhiều lần trong lúc đang seed.
              seedDefaultCalendars(userId, DEFAULT_CALENDARS)
                .catch((err) => console.warn('[useCalendars] Seed defaults skipped:', err))
                .finally(() => {
                  seeding = false;
                });
              return;
            }

            setCalendars(data);
            saveLocalCalendars(userId, data);

            // Tự sửa hậu quả của lỗi seed cũ (addDoc id ngẫu nhiên bị treo
            // giữa chừng): xóa các lịch mặc định bị trùng tên, seed lại
            // lịch mặc định nào đang thiếu hẳn. Chạy đúng 1 lần mỗi phiên.
            if (!repaired) {
              repaired = true;
              const byName = new Map<string, Calendar[]>();
              for (const c of data) {
                if (!DEFAULT_CALENDARS.some((d) => d.name === c.name)) continue;
                byName.set(c.name, [...(byName.get(c.name) ?? []), c]);
              }
              const toDelete: string[] = [];
              for (const group of byName.values()) {
                if (group.length <= 1) continue;
                const def = DEFAULT_CALENDARS.find((d) => d.name === group[0].name);
                const keep = (def && group.find((g) => g.id === def.id)) || group[0];
                for (const g of group) {
                  if (g.id !== keep.id) toDelete.push(g.id);
                }
              }
              if (toDelete.length > 0) {
                void Promise.all(
                  toDelete.map((id) => deleteCalendar(userId, id).catch(() => {}))
                ).then(() => console.warn('[useCalendars] Đã dọn lịch mặc định trùng lặp:', toDelete));
              }

              const missing = DEFAULT_CALENDARS.filter(
                (d) => !data.some((c) => c.name === d.name)
              );
              if (missing.length > 0) {
                void seedDefaultCalendars(userId, missing).catch((err) =>
                  console.warn('[useCalendars] Khôi phục lịch mặc định thiếu bị lỗi:', err)
                );
              }
            }
          },
          (err) => console.warn('[useCalendars] Firebase notice:', err.message)
        );
      })
      .catch((err) => console.warn('[useCalendars] Local fallback used:', err.message));

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [userId, setCalendars]);

  const toggleVisibility = useCallback(
    async (calendarId: string, isVisible: boolean) => {
      const updated = calendars.map((c) => (c.id === calendarId ? { ...c, isVisible } : c));
      setCalendars(updated);
      saveLocalCalendars(userId, updated);

      if (!userId || !hasFirebaseSession()) return;
      const data: UpdateCalendarInput = { isVisible };
      if (queueWrite(userId, { type: 'updateCalendar', calendarId, data })) return;
      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { updateCalendar } = await import('@/firebase/firestore');
          await updateCalendar(userId, calendarId, data);
        } catch (e) {
          console.warn('Firebase updateCalendar skipped:', e);
        }
      })();
    },
    [userId, calendars, setCalendars, queueWrite]
  );

  const addCalendar = useCallback(
    async (name: string, color: string) => {
      const newCal: Calendar = {
        id: `cal-${Date.now()}`,
        name: name.trim(),
        color,
        isVisible: true,
        isDefault: false,
      };
      const updated = [...calendars, newCal];
      setCalendars(updated);
      saveLocalCalendars(userId, updated);

      if (!userId || !hasFirebaseSession()) return;
      const data: CreateCalendarInput = {
        name: newCal.name,
        color: newCal.color,
        isVisible: true,
        isDefault: false,
      };
      if (queueWrite(userId, { type: 'createCalendar', data })) return;
      void (async () => {
        try {
          await ensureFirebaseInitialized();
          const { createCalendar } = await import('@/firebase/firestore');
          await createCalendar(userId, data);
        } catch (e) {
          console.warn('Firebase createCalendar skipped:', e);
        }
      })();
    },
    [userId, calendars, setCalendars, queueWrite]
  );

  const visibleCalendars = calendars.filter((c) => c.isVisible !== false);

  return { calendars, visibleCalendars, toggleVisibility, addCalendar };
}
