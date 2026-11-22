import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { isFirebaseConfigured } from '@/firebase/env';
import { useLocalAuthStore, type LocalUser } from './localAuthStore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  isLocal?: boolean;
  role?: string;
  bio?: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  authMode: 'firebase' | 'local';

  initAuthListener: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AppUser | null) => void;
}

let unsubscribeAuth: (() => void) | null = null;

function mapFirebaseUser(user: FirebaseUser): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
    isLocal: false,
  };
}

function mapLocalUser(user: LocalUser | null): AppUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.uid.startsWith('guest-'),
    isLocal: true,
    bio: user.bio,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: mapLocalUser(useLocalAuthStore.getState().currentUser),
  loading: false,
  error: null,
  initialized: true,
  authMode: isFirebaseConfigured() ? 'firebase' : 'local',

  initAuthListener: () => {
    if (unsubscribeAuth) return unsubscribeAuth;

    // Listen to local auth store changes
    const unsubLocal = useLocalAuthStore.subscribe((localState) => {
      if (get().authMode === 'local' || !get().user || get().user?.isLocal) {
        set({ user: mapLocalUser(localState.currentUser) });
      }
    });

    if (!isFirebaseConfigured()) {
      const currentLocal = useLocalAuthStore.getState().currentUser;
      set({
        loading: false,
        initialized: true,
        authMode: 'local',
        user: mapLocalUser(currentLocal),
      });
      return () => {
        unsubLocal();
      };
    }

    set({ loading: true, authMode: 'firebase' });
    let cancelled = false;

    void import('@/firebase/auth').then(async ({ onAuthStateChange }) => {
      if (cancelled) return;
      const unsub = await onAuthStateChange(
        (user) => {
          if (user) {
            set({
              user: mapFirebaseUser(user),
              loading: false,
              initialized: true,
              error: null,
              authMode: 'firebase',
            });
          } else {
            // Fallback to local user if not signed in to Firebase
            const localUser = useLocalAuthStore.getState().currentUser;
            set({
              user: mapLocalUser(localUser),
              loading: false,
              initialized: true,
              error: null,
            });
          }
        },
        (err) => {
          console.warn('[authStore] Firebase Auth notice:', err.message);
          const localUser = useLocalAuthStore.getState().currentUser;
          set({
            loading: false,
            initialized: true,
            user: mapLocalUser(localUser),
            authMode: 'local',
          });
        }
      );
      if (cancelled) {
        unsub();
        return;
      }
      unsubscribeAuth = () => {
        unsub();
        unsubLocal();
      };
    });

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
      unsubscribeAuth = null;
    };
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      if (isFirebaseConfigured()) {
        const { signInWithGoogle } = await import('@/firebase/auth');
        const cred = await signInWithGoogle();
        set({
          user: mapFirebaseUser(cred.user),
          loading: false,
          authMode: 'firebase',
        });
      } else {
        // Mock Google login in local mode
        const localUser = await useLocalAuthStore.getState().register(
          `google.user.${Date.now()}@gmail.com`,
          '123',
          'Google Account User'
        );
        set({
          user: mapLocalUser(localUser),
          loading: false,
          authMode: 'local',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng nhập Google thất bại';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true, error: null });
    try {
      if (isFirebaseConfigured()) {
        const { signInWithEmail } = await import('@/firebase/auth');
        const cred = await signInWithEmail(email, password);
        set({
          user: mapFirebaseUser(cred.user),
          loading: false,
          authMode: 'firebase',
        });
      } else {
        const localUser = await useLocalAuthStore.getState().login(email, password);
        set({
          user: mapLocalUser(localUser),
          loading: false,
          authMode: 'local',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng nhập thất bại';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  signUpWithEmail: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      if (isFirebaseConfigured()) {
        const { signUpWithEmail } = await import('@/firebase/auth');
        const cred = await signUpWithEmail(email, password, displayName);
        set({
          user: mapFirebaseUser(cred.user),
          loading: false,
          authMode: 'firebase',
        });
      } else {
        const localUser = await useLocalAuthStore
          .getState()
          .register(email, password, displayName);
        set({
          user: mapLocalUser(localUser),
          loading: false,
          authMode: 'local',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng ký thất bại';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  signInAnonymously: async () => {
    set({ loading: true, error: null });
    try {
      if (isFirebaseConfigured()) {
        const { signInAnonymous } = await import('@/firebase/auth');
        const cred = await signInAnonymous();
        set({
          user: mapFirebaseUser(cred.user),
          loading: false,
          authMode: 'firebase',
        });
      } else {
        const guestUser = await useLocalAuthStore.getState().guestLogin();
        set({
          user: mapLocalUser(guestUser),
          loading: false,
          authMode: 'local',
        });
      }
    } catch (e) {
      const guestUser = await useLocalAuthStore.getState().guestLogin();
      set({
        user: mapLocalUser(guestUser),
        loading: false,
        authMode: 'local',
      });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      if (isFirebaseConfigured()) {
        try {
          const { signOut: firebaseSignOut } = await import('@/firebase/auth');
          await firebaseSignOut();
        } catch {
          // ignore
        }
      }
      useLocalAuthStore.getState().logout();
      set({ user: null, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đăng xuất thất bại';
      set({ error: msg, loading: false });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user }),
}));

export function useAuthUserId(): string | null {
  return useAuthStore((s) => s.user?.uid ?? null);
}

/**
 * True chỉ khi đang có phiên Firebase Auth THẬT (kể cả ẩn danh) — tức
 * `request.auth` tồn tại nên Firestore rules (isOwner) mới cho ghi.
 * `authMode` không đủ tin cậy: nó có thể vẫn là 'firebase' (giá trị khởi
 * tạo khi có .env) trong lúc user thực tế đang là tài khoản demo cục bộ.
 * Dùng hàm này trước khi gọi bất kỳ thao tác ghi Firestore nào — bỏ qua
 * sẽ khiến promise treo vô thời hạn thay vì báo lỗi (permission-denied
 * không được Firestore SDK reject nhanh trong trường hợp này).
 */
export function hasFirebaseSession(): boolean {
  const user = useAuthStore.getState().user;
  return !!user && user.isLocal === false;
}
