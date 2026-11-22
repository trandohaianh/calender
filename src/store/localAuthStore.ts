import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  password?: string;
  isLocal: boolean;
  avatarBg?: string;
  bio?: string;
  createdAt: string;
}

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export const DEMO_ACCOUNTS: LocalUser[] = [
  {
    uid: 'local-user-admin',
    email: 'admin@mycalendar.vn',
    displayName: 'Nguyễn Hải Anh (VIP)',
    photoURL: AVATAR_PRESETS[0],
    password: '123',
    isLocal: true,
    avatarBg: '#4f46e5',
    bio: 'Productivity enthusiast & Tech lead',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    uid: 'local-user-alex',
    email: 'alex.nguyen@work.io',
    displayName: 'Alex Nguyễn (Creative)',
    photoURL: AVATAR_PRESETS[1],
    password: '123',
    isLocal: true,
    avatarBg: '#059669',
    bio: 'Designer & Traveler',
    createdAt: '2025-01-10T00:00:00.000Z',
  },
];

interface LocalAuthState {
  currentUser: LocalUser | null;
  accounts: LocalUser[];
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'demo';

  openAuthModal: (tab?: 'login' | 'register' | 'demo') => void;
  closeAuthModal: () => void;
  login: (email: string, password?: string) => Promise<LocalUser>;
  register: (email: string, password: string, displayName: string, photoURL?: string) => Promise<LocalUser>;
  quickLoginDemo: (uid: string) => Promise<LocalUser>;
  guestLogin: () => Promise<LocalUser>;
  logout: () => void;
  updateProfile: (patch: Partial<LocalUser>) => void;
  switchAccount: (uid: string) => void;
}

export const useLocalAuthStore = create<LocalAuthState>()(
  persist(
    (set, get) => ({
      currentUser: DEMO_ACCOUNTS[0],
      accounts: DEMO_ACCOUNTS,
      isAuthModalOpen: false,
      authModalTab: 'login',

      openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),

      login: async (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const found = get().accounts.find(
          (a) => a.email.toLowerCase() === cleanEmail
        );

        if (!found) {
          // If not found, automatically create and log in for frictionless UX
          const newUser: LocalUser = {
            uid: `local-${Date.now()}`,
            email: cleanEmail,
            displayName: cleanEmail.split('@')[0] || 'Người dùng',
            photoURL: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
            password: password || '123',
            isLocal: true,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            accounts: [...state.accounts, newUser],
            currentUser: newUser,
            isAuthModalOpen: false,
          }));
          return newUser;
        }

        if (password && found.password && found.password !== password) {
          throw new Error('Mật khẩu không chính xác');
        }

        set({ currentUser: found, isAuthModalOpen: false });
        return found;
      },

      register: async (email, password, displayName, photoURL) => {
        const cleanEmail = email.trim().toLowerCase();
        const existing = get().accounts.find(
          (a) => a.email.toLowerCase() === cleanEmail
        );

        if (existing) {
          throw new Error('Email này đã được đăng ký trên thiết bị này');
        }

        const newUser: LocalUser = {
          uid: `local-${Date.now()}`,
          email: cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0],
          photoURL: photoURL || AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
          password,
          isLocal: true,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          accounts: [...state.accounts, newUser],
          currentUser: newUser,
          isAuthModalOpen: false,
        }));

        return newUser;
      },

      quickLoginDemo: async (uid) => {
        const target = get().accounts.find((a) => a.uid === uid) || DEMO_ACCOUNTS[0];
        set({ currentUser: target, isAuthModalOpen: false });
        return target;
      },

      guestLogin: async () => {
        const guestUser: LocalUser = {
          uid: `guest-${Date.now()}`,
          email: 'guest@mycalendar.vn',
          displayName: 'Khách (Guest)',
          photoURL: AVATAR_PRESETS[2],
          isLocal: true,
          createdAt: new Date().toISOString(),
        };

        set({
          currentUser: guestUser,
          isAuthModalOpen: false,
        });

        return guestUser;
      },

      logout: () => {
        set({ currentUser: null });
      },

      updateProfile: (patch) => {
        const current = get().currentUser;
        if (!current) return;
        const updated = { ...current, ...patch };
        set((state) => ({
          currentUser: updated,
          accounts: state.accounts.map((a) => (a.uid === current.uid ? updated : a)),
        }));
      },

      switchAccount: (uid) => {
        const target = get().accounts.find((a) => a.uid === uid);
        if (target) {
          set({ currentUser: target });
        }
      },
    }),
    {
      name: 'mycalendar-local-auth',
    }
  )
);
