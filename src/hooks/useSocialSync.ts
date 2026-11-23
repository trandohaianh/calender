import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useSocialStore } from '@/store/socialStore';
import { toastInfo } from '@/store/toastStore';
import { daysUntil, nextBirthday } from '@/social/socialEvents';
import { canUseSocial } from '@/social/eligibility';

/** Bật đồng bộ bạn thân khi có tài khoản Firebase thật; nhắc sinh nhật hôm nay */
export function useSocialSync() {
  const user = useAuthStore((s) => s.user);
  const eligible = canUseSocial(user);
  const uid = eligible ? user!.uid : null;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? null;

  useEffect(() => {
    if (!uid) {
      useSocialStore.getState().stop();
      return;
    }
    void useSocialStore.getState().start(uid, displayName);
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Link mời ?invite=CODE → mở mục Bạn thân với mã điền sẵn
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('invite');
    if (!code) return;
    useSocialStore.getState().setPendingInvite(code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
    useCalendarStore.getState().setCurrentView('friends');
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // "Hôm nay sinh nhật X" — 1 lần mỗi ngày
  const profiles = useSocialStore((s) => s.profiles);
  useEffect(() => {
    const today = Object.values(profiles).filter((p) => {
      const d = nextBirthday(p);
      return d && daysUntil(d) === 0;
    });
    if (today.length === 0) return;
    const key = `mycalendar_bday_toast_${new Date().toDateString()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      // ignore
    }
    toastInfo(
      `🎂 Hôm nay sinh nhật ${today.map((p) => `${p.displayName} ${p.avatar}`).join(', ')}!`,
      'Gửi lời chúc hoặc tạo kỷ niệm chung nhé 💌'
    );
  }, [profiles]);
}
