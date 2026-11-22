import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Khởi tạo auth listener. Trả về actions từ authStore.
 *
 * Không tự động đăng nhập ẩn danh khi user === null: authStore đã tự
 * fallback sang tài khoản local demo khi thiếu cấu hình Firebase, và khi
 * user chủ động bấm "Đăng xuất" thì user phải thực sự về trạng thái đăng
 * xuất (không bị âm thầm đăng nhập ẩn danh lại) để có thể đăng nhập/đăng ký
 * tài khoản khác. Đăng nhập khách vẫn khả dụng qua nút "Khách (Guest)".
 */
export function useAuth() {
  const initAuthListener = useAuthStore((s) => s.initAuthListener);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const signInAnonymously = useAuthStore((s) => s.signInAnonymously);
  const signOut = useAuthStore((s) => s.signOut);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const clearError = useAuthStore((s) => s.clearError);

  useEffect(() => {
    const cleanup = initAuthListener();
    return cleanup;
  }, [initAuthListener]);

  return {
    user,
    loading,
    error,
    signOut,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAnonymously,
    clearError,
  };
}
