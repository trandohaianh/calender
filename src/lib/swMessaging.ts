/** Gửi message tới service worker đang active */
export async function postToServiceWorker(
  message: Record<string, unknown>
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sw = reg.active ?? reg.waiting ?? reg.installing;
  sw?.postMessage(message);
}

export async function syncRemindersToSW(
  reminders: Array<{
    tag: string;
    title: string;
    body: string;
    icon: string;
    fireAt: number;
  }>
): Promise<void> {
  await postToServiceWorker({ type: 'SYNC_REMINDERS', payload: { reminders } });
}

export async function cancelEventRemindersInSW(eventId: string): Promise<void> {
  await postToServiceWorker({ type: 'CANCEL_EVENT_REMINDERS', payload: { eventId } });
}

export async function showNotificationViaSW(
  title: string,
  options: NotificationOptions
): Promise<void> {
  await postToServiceWorker({ type: 'SHOW_NOTIFICATION', payload: { title, options } });
}
