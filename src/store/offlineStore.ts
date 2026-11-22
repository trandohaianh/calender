import { create } from 'zustand';
import {
  enqueueOperation,
  getOfflineQueueCount,
  type QueuePayload,
} from '@/lib/offlineQueue';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  showOfflineToast: boolean;
  syncing: boolean;
  syncMessage: string | null;

  setOnline: (online: boolean) => void;
  refreshPending: () => void;
  queueWrite: (userId: string, payload: QueuePayload) => boolean;
  syncQueue: () => Promise<void>;
  dismissOfflineToast: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: getOfflineQueueCount(),
  showOfflineToast: false,
  syncing: false,
  syncMessage: null,

  setOnline: (online) =>
    set({
      isOnline: online,
      showOfflineToast: !online ? true : get().showOfflineToast,
    }),

  refreshPending: () => set({ pendingCount: getOfflineQueueCount() }),

  queueWrite: (userId, payload) => {
    if (get().isOnline) return false;
    enqueueOperation(userId, payload);
    set({
      pendingCount: getOfflineQueueCount(),
      showOfflineToast: true,
    });
    return true;
  },

  syncQueue: async () => {
    if (!get().isOnline || getOfflineQueueCount() === 0) return;
    set({ syncing: true });
    try {
      const { flushOfflineQueue } = await import('@/lib/offlineSyncExecutor');
      const { synced, failed } = await flushOfflineQueue();
      set({ pendingCount: getOfflineQueueCount() });
      if (synced > 0) {
        set({ syncMessage: `Đã đồng bộ ${synced} thay đổi` });
        setTimeout(() => set({ syncMessage: null }), 4000);
      }
      if (failed > 0) {
        set({ syncMessage: `${failed} thao tác chưa đồng bộ` });
      }
    } finally {
      set({ syncing: false });
    }
  },

  dismissOfflineToast: () => set({ showOfflineToast: false }),
}));
