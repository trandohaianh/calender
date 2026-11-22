import type { EventFormValues } from '@/types';
import type { CreateCalendarInput, UpdateCalendarInput } from '@/types';

const QUEUE_KEY = 'mycalendar-offline-queue';

export type QueueOpType =
  | 'createEvent'
  | 'updateEvent'
  | 'deleteEvent'
  | 'createCalendar'
  | 'updateCalendar';

export type QueuePayload =
  | { type: 'createEvent'; form: EventFormValues }
  | { type: 'updateEvent'; eventId: string; form: Partial<EventFormValues> }
  | { type: 'deleteEvent'; eventId: string }
  | { type: 'createCalendar'; data: CreateCalendarInput }
  | { type: 'updateCalendar'; calendarId: string; data: UpdateCalendarInput };

export interface QueueOperation {
  id: string;
  userId: string;
  payload: QueuePayload;
  createdAt: number;
}

function load(): QueueOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueOperation[]) : [];
  } catch {
    return [];
  }
}

function save(queue: QueueOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): QueueOperation[] {
  return load();
}

export function getOfflineQueueCount(): number {
  return load().length;
}

export function enqueueOperation(
  userId: string,
  payload: QueuePayload
): QueueOperation {
  const op: QueueOperation = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    payload,
    createdAt: Date.now(),
  };
  const queue = load();
  queue.push(op);
  save(queue);
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  return op;
}

export function clearOfflineQueue() {
  save([]);
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
}

export function removeFromQueue(opId: string) {
  save(load().filter((o) => o.id !== opId));
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
}
