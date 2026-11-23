import type { AppUser } from '@/store/authStore';

/**
 * Chỉ tài khoản thật (email / Google) mới dùng được Bạn thân.
 * Riêng khi chạy dev server, có thể bật cho tài khoản Khách để test 2 người:
 *   localStorage.setItem('mycal_dev_social_guest', '1')
 * Bản build production luôn bỏ qua cờ này.
 */
export function canUseSocial(user: AppUser | null | undefined): boolean {
  if (!user || user.isLocal) return false;
  if (!user.isAnonymous) return true;
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('mycal_dev_social_guest') === '1';
  } catch {
    return false;
  }
}
