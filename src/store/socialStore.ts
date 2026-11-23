import { create } from 'zustand';
import type { Unsubscribe } from 'firebase/firestore';
import type { FriendLink, FriendRequest, SharedMemory, SocialProfile } from '@/social/types';

export type SocialStatus = 'off' | 'loading' | 'ready' | 'error';

interface SocialState {
  status: SocialStatus;
  error: string | null;
  uid: string | null;
  me: SocialProfile | null;
  friends: FriendLink[];
  profiles: Record<string, SocialProfile>;
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  shared: SharedMemory[];
  /** Kỷ niệm chung đang mở trong trình trang trí */
  openSharedId: string | null;
  /** Mã mời lấy từ link ?invite= */
  pendingInvite: string | null;

  start: (uid: string, displayName: string | null) => Promise<void>;
  stop: () => void;
  openShared: (id: string | null) => void;
  setPendingInvite: (code: string | null) => void;
}

let unsubs: Unsubscribe[] = [];
const profileUnsubs = new Map<string, Unsubscribe>();

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/permission|insufficient/i.test(msg)) {
    return 'Firestore từ chối truy cập — cần deploy file firestore.rules mới (xem hướng dẫn).';
  }
  if (/offline|network|unavailable/i.test(msg)) return 'Mất kết nối mạng — sẽ tự đồng bộ lại khi có mạng.';
  return msg;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  status: 'off',
  error: null,
  uid: null,
  me: null,
  friends: [],
  profiles: {},
  incoming: [],
  outgoing: [],
  shared: [],
  openSharedId: null,
  pendingInvite: null,

  start: async (uid, displayName) => {
    if (get().uid === uid && get().status !== 'error') return;
    get().stop();
    set({ status: 'loading', uid, error: null });
    const onError = (e: Error) => set({ status: 'error', error: friendlyError(e) });
    try {
      const api = await import('@/social/socialApi');
      await api.ensureProfile(uid, displayName);
      if (get().uid !== uid) return;

      unsubs.push(
        api.subscribeProfile(
          uid,
          (p) => set({ me: p, status: 'ready' }),
          onError
        ),
        api.subscribeFriends(
          uid,
          (list) => {
            set({ friends: list });
            // Theo dõi hồ sơ từng bạn; bỏ theo dõi người đã huỷ
            const want = new Set(list.map((f) => f.uid));
            for (const [fid, un] of profileUnsubs) {
              if (!want.has(fid)) {
                un();
                profileUnsubs.delete(fid);
                set((s) => {
                  const { [fid]: _gone, ...rest } = s.profiles;
                  return { profiles: rest };
                });
              }
            }
            for (const fid of want) {
              if (profileUnsubs.has(fid)) continue;
              profileUnsubs.set(
                fid,
                api.subscribeProfile(
                  fid,
                  (p) =>
                    set((s) => {
                      if (!p) {
                        const { [fid]: _gone, ...rest } = s.profiles;
                        return { profiles: rest };
                      }
                      return { profiles: { ...s.profiles, [fid]: p } };
                    }),
                  // Bạn vừa huỷ kết bạn → mất quyền đọc: bỏ qua lặng lẽ
                  () => undefined
                )
              );
            }
          },
          onError
        ),
        api.subscribeRequests(uid, 'incoming', (list) => set({ incoming: list }), onError),
        api.subscribeRequests(uid, 'outgoing', (list) => set({ outgoing: list }), onError),
        api.subscribeSharedList(uid, (list) => set({ shared: list }), onError)
      );
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)));
    }
  },

  stop: () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    profileUnsubs.forEach((u) => u());
    profileUnsubs.clear();
    set({
      status: 'off',
      uid: null,
      me: null,
      friends: [],
      profiles: {},
      incoming: [],
      outgoing: [],
      shared: [],
      openSharedId: null,
      error: null,
    });
  },

  openShared: (id) => set({ openSharedId: id }),
  setPendingInvite: (code) => set({ pendingInvite: code }),
}));

/** Tên hiển thị của 1 người (mình hoặc bạn) */
export function nameOf(uid: string): string {
  const s = useSocialStore.getState();
  if (uid === s.uid) return s.me?.displayName ?? 'Bạn';
  return s.profiles[uid]?.displayName ?? 'Bạn thân';
}
