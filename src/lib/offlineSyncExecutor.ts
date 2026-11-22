import {
  createEvent,
  updateEvent,
  deleteEvent,
  createCalendar,
  updateCalendar,
} from '@/firebase/firestore';
import { formToEventInput, formToEventPatch } from '@/lib/eventAdapters';
import {
  getOfflineQueue,
  removeFromQueue,
  type QueueOperation,
} from '@/lib/offlineQueue';

/** Thực thi một thao tác trong hàng đợi offline */
export async function executeQueueOperation(op: QueueOperation): Promise<void> {
  const { userId, payload } = op;

  switch (payload.type) {
    case 'createEvent':
      await createEvent(userId, formToEventInput(payload.form));
      break;
    case 'updateEvent':
      await updateEvent(userId, payload.eventId, formToEventPatch(payload.form));
      break;
    case 'deleteEvent':
      await deleteEvent(userId, payload.eventId);
      break;
    case 'createCalendar':
      await createCalendar(userId, payload.data);
      break;
    case 'updateCalendar':
      await updateCalendar(userId, payload.calendarId, payload.data);
      break;
  }
}

/** Đồng bộ toàn bộ hàng đợi lên Firestore */
export async function flushOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const queue = getOfflineQueue();
  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      await executeQueueOperation(op);
      removeFromQueue(op.id);
      synced++;
    } catch (e) {
      console.error('[offlineSync] Failed op', op.id, e);
      failed++;
    }
  }

  return { synced, failed };
}
