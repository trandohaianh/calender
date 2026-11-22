/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

/** Nhắc nhở đã lên lịch trong SW */
interface ScheduledReminder {
  tag: string;
  title: string;
  body: string;
  icon: string;
  fireAt: number;
}

let scheduledReminders: ScheduledReminder[] = [];
let reminderTimer: ReturnType<typeof setInterval> | null = null;
const firedReminderTags = new Set<string>();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// ─── Navigation: Network → index.html precache → offline.html ───
const navigationHandler = new NetworkFirst({
  cacheName: 'pages-navigation',
  networkTimeoutSeconds: 4,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    {
      handlerDidError: async () => {
        const index = await matchPrecache('/index.html');
        if (index) return index;
        const offline = await matchPrecache('/offline.html');
        if (offline) return offline;
        return (await caches.match('/offline.html')) ?? Response.error();
      },
    },
  ],
});

registerRoute(new NavigationRoute(navigationHandler));

// ─── Static assets: CacheFirst ───
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// ─── Google Fonts ───
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-css',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-files',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Firestore REST / googleapis: NetworkFirst ───
registerRoute(
  ({ url }) =>
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebaseapp.com'),
  new NetworkFirst({
    cacheName: 'firebase-api',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
);

// ─── Reminder notifications ───
function startReminderChecker() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(() => void checkReminders(), 20_000);
}

async function checkReminders() {
  const now = Date.now();
  for (const r of scheduledReminders) {
    if (firedReminderTags.has(r.tag)) continue;
    if (now >= r.fireAt && now < r.fireAt + 90_000) {
      firedReminderTags.add(r.tag);
      try {
        await self.registration.showNotification(r.title, {
          body: r.body,
          icon: r.icon,
          tag: r.tag,
          badge: r.icon,
          data: { tag: r.tag },
        });
      } catch (e) {
        console.warn('[SW] showNotification failed', e);
      }
    }
  }
}

async function cancelNotificationByTag(tag: string) {
  firedReminderTags.delete(tag);
  const notifications = await self.registration.getNotifications({ tag });
  notifications.forEach((n) => n.close());
}

async function cancelNotificationsByPrefix(prefix: string) {
  const all = await self.registration.getNotifications();
  for (const n of all) {
    if (n.tag?.startsWith(prefix)) {
      n.close();
      if (n.tag) firedReminderTags.delete(n.tag);
    }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; payload?: unknown } | null;
  if (!data?.type) return;

  switch (data.type) {
    case 'SYNC_REMINDERS': {
      const reminders = (data.payload as { reminders: ScheduledReminder[] })?.reminders ?? [];
      scheduledReminders = reminders;
      firedReminderTags.clear();
      startReminderChecker();
      break;
    }
    case 'SHOW_NOTIFICATION': {
      const p = data.payload as {
        title: string;
        options: NotificationOptions;
      };
      void self.registration.showNotification(p.title, p.options);
      break;
    }
    case 'CANCEL_REMINDER': {
      const tag = (data.payload as { tag: string })?.tag;
      if (tag) void cancelNotificationByTag(tag);
      break;
    }
    case 'CANCEL_EVENT_REMINDERS': {
      const eventId = (data.payload as { eventId: string })?.eventId;
      if (eventId) {
        scheduledReminders = scheduledReminders.filter((r) => !r.tag.includes(eventId));
        void cancelNotificationsByPrefix(`reminder-${eventId}-`);
      }
      break;
    }
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
