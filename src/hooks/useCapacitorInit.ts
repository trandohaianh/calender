import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { useCalendarStore } from '@/store/calendarStore';
import { useOfflineStore } from '@/store/offlineStore';
import { isNative } from '@/capacitor/platform';
import { requestNotificationPermission } from '@/capacitor/notifications';

/** App tràn viền (Android 15+): nền thanh trạng thái là nền trang, chỉ cần chọn màu chữ */
async function syncSystemBars() {
  const dark = document.documentElement.classList.contains('dark');
  await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
}

/**
 * Khởi tạo plugin Capacitor: status bar, splash, network, hardware back.
 */
export function useCapacitorInit() {
  useEffect(() => {
    if (!isNative()) return;

    void (async () => {
      try {
        await SplashScreen.hide();
        await syncSystemBars();
        await requestNotificationPermission();

        const status = await Network.getStatus();
        useOfflineStore.getState().setOnline(status.connected);
      } catch (e) {
        console.warn('[CapacitorInit]', e);
      }
    })();

    // Đổi chữ/biểu tượng thanh trạng thái theo chế độ sáng/tối của app
    const themeObserver = new MutationObserver(() => void syncSystemBars());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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
      themeObserver.disconnect();
      void netListener.then((l) => l.remove());
      void backListener.then((l) => l.remove());
    };
  }, []);
}
