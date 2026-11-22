import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '@/capacitor/platform';

export interface ScheduleNotificationInput {
  /** ID duy nhất (số nguyên) */
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
  extra?: Record<string, unknown>;
}

/**
 * Wrapper Local Notifications — dùng trên Android/iOS native.
 * Trên web: fallback no-op (SW xử lý trong useNotifications).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      return (await Notification.requestPermission()) === 'granted';
    }
    return false;
  }

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'granted') return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === 'granted';
}

export async function scheduleNotification(
  input: ScheduleNotificationInput
): Promise<void> {
  if (!isNative()) return;

  const at = input.scheduleAt.getTime();
  if (at <= Date.now()) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: input.id,
        title: input.title,
        body: input.body,
        schedule: { at: new Date(at) },
        extra: input.extra,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#1a73e8',
      },
    ],
  });
}

export async function cancelNotification(id: number): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

export async function cancelNotifications(ids: number[]): Promise<void> {
  if (!isNative() || !ids.length) return;
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}

/** Chuyển eventId + timestamp thành id số ổn định cho LocalNotifications */
export function reminderIdFromKey(eventId: string, startMs: number): number {
  let hash = 0;
  const str = `${eventId}_${startMs}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483646 || 1;
}
