import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { useCalendarStore } from '@/store/calendarStore';
import { useOfflineStore } from '@/store/offlineStore';
import { isAndroid, isNative } from '@/capacitor/platform';
import { requestNotificationPermission } from '@/capacitor/notifications';

/**
 * Khởi tạo plugin Capacitor: status bar, splash, network, hardware back.
 */
export function useCapacitorInit() {
  useEffect(() => {
    if (!isNative()) return;

    void (async () => {
      try {
        await SplashScreen.hide();
        if (isAndroid()) {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#1a73e8' });
        }
        await requestNotificationPermission();

        const status = await Network.getStatus();
        useOfflineStore.getState().setOnline(status.connected);
      } catch (e) {
        console.warn('[CapacitorInit]', e);
      }
    })();

    const netListener = Network.addListener('networkStatusChange', (s) => {
      useOfflineStore.getState().setOnline(s.connected);
      if (s.connected) {
        void useOfflineStore.getState().syncQueue();
      } else {
        useOfflineStore.setState({ showOfflineToast: true });
      }
    });

    const backListener = CapApp.addListener('backButton', () => {
      const state = useCalendarStore.getState();

      if (state.isEventModalOpen) {
        state.closeEventModal();
        return;
      }
      if (state.sidebarOpen) {
        state.setSidebarOpen(false);
        return;
      }

      void CapApp.exitApp();
    });

    return () => {
      void netListener.then((l) => l.remove());
      void backListener.then((l) => l.remove());
    };
  }, []);
}
