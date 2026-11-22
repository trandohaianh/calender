import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useCalendarStore } from '@/store/calendarStore';
import { isNative } from '@/capacitor/platform';

/**
 * Xử lý deeplink: mycalendar://event/{id} hoặc https://app.mycalendar.local/event/{id}
 */
export function useDeepLinks() {
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);

  useEffect(() => {
    if (!isNative()) return;

    const handleUrl = (url: string) => {
      try {
        const parsed = new URL(url.replace('mycalendar://', 'https://mycalendar.local/'));
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts[0] === 'event' && parts[1]) {
          openEventModal(parts[1]);
          setCurrentDate(new Date());
        }
      } catch (e) {
        console.warn('[DeepLink] Invalid URL', url, e);
      }
    };

    void App.getLaunchUrl().then((res) => {
      if (res?.url) handleUrl(res.url);
    });

    const listener = App.addListener('appUrlOpen', (event) => {
      handleUrl(event.url);
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, [openEventModal, setCurrentDate]);
}
