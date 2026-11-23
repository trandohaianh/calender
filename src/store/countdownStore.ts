import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Đếm ngược tới ngày thi / mục tiêu / chuyến đi… (lưu trên thiết bị) */
export interface CountdownTask {
  id: string;
  text: string;
  done: boolean;
}

export interface Countdown {
  id: string;
  title: string;
  emoji: string;
  /** yyyy-MM-dd — ngày đích */
  date: string;
  /** id trong COUNTDOWN_THEMES */
  theme: string;
  /** yyyy-MM-dd — ngày tạo, để tính thanh tiến độ thời gian */
  createdOn: string;
  tasks: CountdownTask[];
}

export const COUNTDOWN_THEMES = [
  { id: 'candy', bg: 'linear-gradient(135deg,#ff7ab6,#e14eca 55%,#8b5cf6)', color: '#e14eca' },
  { id: 'ocean', bg: 'linear-gradient(135deg,#38bdf8,#6366f1)', color: '#6366f1' },
  { id: 'mint', bg: 'linear-gradient(135deg,#34d399,#0ea5e9)', color: '#10b981' },
  { id: 'sunset', bg: 'linear-gradient(135deg,#fbbf24,#fb7185 60%,#e11d48)', color: '#f97316' },
  { id: 'grape', bg: 'linear-gradient(135deg,#a78bfa,#7c3aed 60%,#4c1d95)', color: '#7c3aed' },
  { id: 'peach', bg: 'linear-gradient(135deg,#fdba74,#f472b6)', color: '#fb7185' },
] as const;

export function countdownTheme(id?: string) {
  return COUNTDOWN_THEMES.find((t) => t.id === id) ?? COUNTDOWN_THEMES[0];
}

export const COUNTDOWN_PRESETS = [
  { emoji: '📚', title: 'Thi học kỳ', theme: 'ocean' },
  { emoji: '🎓', title: 'Thi tốt nghiệp THPT', theme: 'grape' },
  { emoji: '📝', title: 'Thi IELTS', theme: 'mint' },
  { emoji: '✈️', title: 'Chuyến đi chơi', theme: 'sunset' },
  { emoji: '💪', title: 'Giảm 3kg', theme: 'peach' },
  { emoji: '💰', title: 'Tiết kiệm mua đồ', theme: 'candy' },
] as const;

export const COUNTDOWN_EMOJIS = ['📚', '🎓', '📝', '🧠', '✈️', '🏖️', '💪', '🏃', '💰', '🎂', '💖', '🎮', '🎤', '🎸', '🚀', '⭐', '🏆', '🎄'];

export const MAX_COUNTDOWNS = 12;
export const MAX_TASKS = 15;

export function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseKey(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Số ngày từ `from` (00:00) tới ngày đích; âm nếu đã qua */
export function daysLeft(c: Pick<Countdown, 'date'>, from = new Date()): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  return Math.round((parseKey(c.date).getTime() - a.getTime()) / 86400000);
}

/** Tỉ lệ thời gian đã trôi (0..1) từ lúc tạo tới ngày đích */
export function timeProgress(c: Pick<Countdown, 'date' | 'createdOn'>, from = new Date()): number {
  const start = parseKey(c.createdOn).getTime();
  const end = parseKey(c.date).getTime();
  if (end <= start) return 1;
  const now = new Date(from);
  now.setHours(0, 0, 0, 0);
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

export function taskProgress(c: Pick<Countdown, 'tasks'>): number | null {
  if (!c.tasks.length) return null;
  return c.tasks.filter((t) => t.done).length / c.tasks.length;
}

/** Sắp theo: sắp tới gần nhất trước, đã qua xuống cuối */
export function sortCountdowns(list: Countdown[], from = new Date()): Countdown[] {
  return [...list].sort((a, b) => {
    const da = daysLeft(a, from);
    const db = daysLeft(b, from);
    if (da < 0 !== db < 0) return da < 0 ? 1 : -1;
    return da < 0 ? db - da : da - db;
  });
}

export const newId = () => Math.random().toString(36).slice(2, 10);

interface CountdownState {
  items: Countdown[];
  /** id đang sửa; 'new' = tạo mới; null = đóng */
  editing: string | null;
  collapsed: boolean;
  save: (c: Countdown) => void;
  remove: (id: string) => void;
  toggleTask: (id: string, taskId: string) => void;
  open: (id: string | 'new') => void;
  close: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useCountdownStore = create<CountdownState>()(
  persist(
    (set) => ({
      items: [],
      editing: null,
      collapsed: false,
      save: (c) =>
        set((s) => {
          const exists = s.items.some((x) => x.id === c.id);
          return { items: exists ? s.items.map((x) => (x.id === c.id ? c : x)) : [...s.items, c] };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      toggleTask: (id, taskId) =>
        set((s) => ({
          items: s.items.map((x) =>
            x.id === id
              ? { ...x, tasks: x.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
              : x
          ),
        })),
      open: (id) => set({ editing: id }),
      close: () => set({ editing: null }),
      setCollapsed: (v) => set({ collapsed: v }),
    }),
    {
      name: 'mycal_countdowns',
      partialize: (s) => ({ items: s.items, collapsed: s.collapsed }),
    }
  )
);
