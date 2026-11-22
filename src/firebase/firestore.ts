import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/firebase/init';
import { mapEventDoc } from '@/lib/eventAdapters';
import { withRetry } from '@/lib/retry';
import { useFirebaseStore } from '@/store/firebaseStore';
import type {
  Calendar,
  CalendarEvent,
  CreateCalendarEventInput,
  CreateCalendarInput,
  UpdateCalendarEventInput,
  UpdateCalendarInput,
} from '@/types';

// ─── Collection paths ───────────────────────────────────────────────
// users/{userId}/events/{eventId}
// users/{userId}/calendars/{calendarId}

function eventsCol(userId: string) {
  return collection(getFirestoreDb(), 'users', userId, 'events');
}

function calendarsCol(userId: string) {
  return collection(getFirestoreDb(), 'users', userId, 'calendars');
}

function eventDoc(userId: string, eventId: string) {
  return doc(getFirestoreDb(), 'users', userId, 'events', eventId);
}

function calendarDoc(userId: string, calendarId: string) {
  return doc(getFirestoreDb(), 'users', userId, 'calendars', calendarId);
}

// ─── Events CRUD ───────────────────────────────────────────────────

/**
 * Lấy sự kiện trong khoảng thời gian (overlap query).
 * Cần composite index: startDate ASC, endDate ASC
 */
export async function getEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  try {
    const startTs = Timestamp.fromDate(startDate);
    const endTs = Timestamp.fromDate(endDate);

    const q = query(
      eventsCol(userId),
      where('startDate', '<=', endTs),
      where('endDate', '>=', startTs),
      orderBy('startDate', 'asc')
    );

    const snap = await withRetry(() => getDocs(q));
    useFirebaseStore.getState().setAvailable();
    return snap.docs.map((d) => mapEventDoc(d.id, d.data() as DocumentData));
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể tải sự kiện');
    throw e;
  }
}

/** Tạo sự kiện mới */
export async function createEvent(
  userId: string,
  eventData: CreateCalendarEventInput
): Promise<string> {
  try {
    const ref = await withRetry(() =>
      addDoc(eventsCol(userId), {
        ...stripUndefined(eventData),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    useFirebaseStore.getState().setAvailable();
    return ref.id;
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể tạo sự kiện');
    throw e;
  }
}

/** Cập nhật sự kiện */
export async function updateEvent(
  userId: string,
  eventId: string,
  eventData: UpdateCalendarEventInput
): Promise<void> {
  try {
    await withRetry(() =>
      updateDoc(eventDoc(userId, eventId), {
        ...stripUndefined(eventData),
        updatedAt: serverTimestamp(),
      })
    );
    useFirebaseStore.getState().setAvailable();
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể cập nhật sự kiện');
    throw e;
  }
}

/** Xóa sự kiện */
export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  try {
    await withRetry(() => deleteDoc(eventDoc(userId, eventId)));
    useFirebaseStore.getState().setAvailable();
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể xóa sự kiện');
    throw e;
  }
}

/** Realtime listener — toàn bộ sự kiện của user */
export function subscribeToEvents(
  userId: string,
  callback: (events: CalendarEvent[]) => void,
  onError?: (error: Error) => void,
  range?: { startDate: Date; endDate: Date }
): Unsubscribe {
  try {
    let q = query(eventsCol(userId), orderBy('startDate', 'asc'));

    if (range) {
      const startTs = Timestamp.fromDate(range.startDate);
      const endTs = Timestamp.fromDate(range.endDate);
      q = query(
        eventsCol(userId),
        where('startDate', '<=', endTs),
        where('endDate', '>=', startTs),
        orderBy('startDate', 'asc')
      );
    }

    return onSnapshot(
      q,
      (snap) => {
        const events = snap.docs.map((d) =>
          mapEventDoc(d.id, d.data() as DocumentData)
        );
        useFirebaseStore.getState().setAvailable();
        callback(events);
      },
      (err) => {
        const e = err as Error;
        useFirebaseStore.getState().setUnavailable(e.message);
        onError?.(e);
      }
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Không thể subscribe events');
    useFirebaseStore.getState().setUnavailable(err.message);
    onError?.(err);
    return () => {};
  }
}

// ─── Calendars CRUD ──────────────────────────────────────────────────

export async function getCalendars(userId: string): Promise<Calendar[]> {
  try {
    const q = query(calendarsCol(userId), orderBy('name', 'asc'));
    const snap = await withRetry(() => getDocs(q));
    useFirebaseStore.getState().setAvailable();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Calendar);
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể tải danh mục lịch');
    throw e;
  }
}

export async function createCalendar(
  userId: string,
  data: CreateCalendarInput
): Promise<string> {
  try {
    const ref = await withRetry(() =>
      addDoc(calendarsCol(userId), stripUndefined(data))
    );
    useFirebaseStore.getState().setAvailable();
    return ref.id;
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể tạo lịch');
    throw e;
  }
}

/**
 * Ghi các lịch mặc định (id cố định, vd 'cal-personal') bằng setDoc thay vì
 * addDoc — idempotent, gọi lại nhiều lần (StrictMode double-effect, snapshot
 * bắn lại nhiều lần khi đang seed,...) chỉ ghi đè cùng document, không tạo
 * bản sao với id ngẫu nhiên mới như addDoc.
 */
export async function seedDefaultCalendars(
  userId: string,
  defaults: Calendar[]
): Promise<void> {
  try {
    await withRetry(() =>
      Promise.all(
        defaults.map(({ id, ...data }) =>
          setDoc(calendarDoc(userId, id), stripUndefined(data), { merge: true })
        )
      )
    );
    useFirebaseStore.getState().setAvailable();
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể tạo lịch mặc định');
    throw e;
  }
}

export async function updateCalendar(
  userId: string,
  calendarId: string,
  data: UpdateCalendarInput
): Promise<void> {
  try {
    await withRetry(() =>
      updateDoc(calendarDoc(userId, calendarId), stripUndefined(data))
    );
    useFirebaseStore.getState().setAvailable();
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể cập nhật lịch');
    throw e;
  }
}

export async function deleteCalendar(
  userId: string,
  calendarId: string
): Promise<void> {
  try {
    await withRetry(() => deleteDoc(calendarDoc(userId, calendarId)));
    useFirebaseStore.getState().setAvailable();
  } catch (e) {
    useFirebaseStore
      .getState()
      .setUnavailable(e instanceof Error ? e.message : 'Không thể xóa lịch');
    throw e;
  }
}

export function subscribeToCalendars(
  userId: string,
  callback: (calendars: Calendar[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(calendarsCol(userId), orderBy('name', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        useFirebaseStore.getState().setAvailable();
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Calendar));
      },
      (err) => {
        const e = err as Error;
        useFirebaseStore.getState().setUnavailable(e.message);
        onError?.(e);
      }
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Không thể subscribe calendars');
    useFirebaseStore.getState().setUnavailable(err.message);
    onError?.(err);
    return () => {};
  }
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}
