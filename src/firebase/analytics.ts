import type { Analytics } from 'firebase/analytics';
import { isFirebaseConfigured } from '@/firebase/env';
import { ensureFirebaseInitialized, getFirebaseApp } from '@/firebase/init';

let analytics: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

export async function initAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (initPromise) return initPromise;
  if (!isFirebaseConfigured() || !import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    return null;
  }

  initPromise = (async () => {
    const { isSupported, getAnalytics } = await import('firebase/analytics');
    if (!(await isSupported())) return null;
    try {
      await ensureFirebaseInitialized();
      analytics = getAnalytics(getFirebaseApp());
      return analytics;
    } catch {
      return null;
    }
  })();

  return initPromise;
}

export async function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  const a = await initAnalytics();
  if (!a) return;
  const { logEvent } = await import('firebase/analytics');
  logEvent(a, name, params);
}

export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  const a = await initAnalytics();
  if (!a) return;
  const { setUserId } = await import('firebase/analytics');
  if (userId) setUserId(a, userId);
}

export const AnalyticsEvents = {
  pageView: (view: string) => trackEvent('page_view', { page_title: view, page_location: view }),
  viewChanged: (view: string) => trackEvent('view_changed', { view_mode: view }),
  eventCreated: () => trackEvent('event_created'),
  eventDeleted: () => trackEvent('event_deleted'),
  eventUpdated: () => trackEvent('event_updated'),
  featureUsed: (feature: string) => trackEvent('feature_used', { feature_name: feature }),
  searchUsed: () => trackEvent('feature_used', { feature_name: 'search' }),
  darkModeToggled: (enabled: boolean) =>
    trackEvent('feature_used', { feature_name: 'dark_mode', enabled: String(enabled) }),
} as const;
