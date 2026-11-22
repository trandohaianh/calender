import { useEffect } from 'react';
import { useOfflineStore } from '@/store/offlineStore';

/**
 * Khởi tạo listeners online/offline + đồng bộ hàng đợi.
 * Gọi một lần ở App root.
 */
export function useOfflineSync() {
  const setOnline = useOfflineStore((s) => s.setOnline);
  const syncQueue = useOfflineStore((s) => s.syncQueue);
  const refreshPending = useOfflineStore((s) => s.refreshPending);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      useOfflineStore.setState({ showOfflineToast: false });
      void syncQueue();
    };
    const onOffline = () => {
      setOnline(false);
      useOfflineStore.setState({ showOfflineToast: true });
    };
    const onQueueChange = () => refreshPending();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offline-queue-changed', onQueueChange);

    setOnline(navigator.onLine);
    if (!navigator.onLine) {
      useOfflineStore.setState({ showOfflineToast: true });
    }
    refreshPending();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offline-queue-changed', onQueueChange);
    };
  }, [setOnline, syncQueue, refreshPending]);

  return useOfflineStore();
}
