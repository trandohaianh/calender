import { create } from 'zustand';
import { getMissingFirebaseEnv, isFirebaseConfigured } from '@/firebase/env';

interface FirebaseState {
  isAvailable: boolean;
  errorMessage: string | null;
  setUnavailable: (message?: string) => void;
  setAvailable: () => void;
}

export const useFirebaseStore = create<FirebaseState>((set) => ({
  isAvailable: isFirebaseConfigured(),
  errorMessage: isFirebaseConfigured()
    ? null
    : `Thiếu cấu hình Firebase (${getMissingFirebaseEnv().join(', ')}). App vẫn chạy UI nhưng không đồng bộ được.`,
  setUnavailable: (message) =>
    set({
      isAvailable: false,
      errorMessage: message ?? 'Không thể kết nối Firebase. Dữ liệu có thể không cập nhật.',
    }),
  setAvailable: () => set({ isAvailable: true, errorMessage: null }),
}));
