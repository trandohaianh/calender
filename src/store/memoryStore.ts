import { create } from 'zustand';
import {
  memoryDb,
  processPhoto,
  requestPersistentStorage,
  type Memory,
} from '@/lib/memoryDb';
import { toastError } from '@/store/toastStore';

/** Kỷ niệm đang mở trong hộp thoại riêng (từ màn Kỷ niệm / thanh bên) */
export interface MemoryTarget {
  id: string;
  eventId?: string;
  date: string;
  title: string;
  color: string;
}

interface MemoryState {
  memories: Record<string, Memory>;
  loaded: boolean;
  dialogTarget: MemoryTarget | null;

  load: () => Promise<void>;
  /** Đọc lại toàn bộ từ IndexedDB (sau khi khôi phục) */
  reload: () => Promise<void>;
  /** Tạo hoặc cập nhật (gộp các trường) */
  upsert: (target: MemoryTarget, patch: Partial<Pick<Memory, 'note' | 'mood' | 'title' | 'stickers' | 'font' | 'paper'>>) => Promise<Memory>;
  addPhotos: (target: MemoryTarget, files: File[]) => Promise<number>;
  removePhoto: (memoryId: string, photoId: string) => Promise<void>;
  remove: (memoryId: string) => Promise<void>;
  openDialog: (target: MemoryTarget) => void;
  closeDialog: () => void;
}

function isEmpty(m: Memory) {
  return !m.note.trim() && !m.mood && m.photoIds.length === 0 && !m.stickers?.length;
}

function blank(target: MemoryTarget): Memory {
  const now = Date.now();
  return {
    id: target.id,
    eventId: target.eventId,
    date: target.date,
    title: target.title,
    color: target.color,
    note: '',
    photoIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: {},
  loaded: false,
  dialogTarget: null,

  load: async () => {
    if (get().loaded) return;
    try {
      const list = await memoryDb.getAllMemories();
      const map: Record<string, Memory> = {};
      for (const m of list) map[m.id] = m;
      set({ memories: map, loaded: true });
    } catch (e) {
      console.warn('[memories] IndexedDB không khả dụng', e);
      set({ loaded: true });
    }
  },

  reload: async () => {
    set({ loaded: false });
    await get().load();
  },

  upsert: async (target, patch) => {
    const prev = get().memories[target.id] ?? blank(target);
    const next: Memory = {
      ...prev,
      ...patch,
      // giữ tiêu đề/màu mới nhất của sự kiện
      title: patch.title ?? target.title ?? prev.title,
      color: target.color || prev.color,
      updatedAt: Date.now(),
    };
    if (isEmpty(next) && !get().memories[target.id]) return next;
    set((s) => ({ memories: { ...s.memories, [next.id]: next } }));
    try {
      if (isEmpty(next) && next.eventId) {
        await memoryDb.deleteMemory(next.id);
        set((s) => {
          const { [next.id]: _removed, ...rest } = s.memories;
          return { memories: rest };
        });
      } else {
        await memoryDb.putMemory(next);
        requestPersistentStorage();
      }
    } catch (e) {
      console.error(e);
      toastError('Không lưu được kỷ niệm');
    }
    return next;
  },

  addPhotos: async (target, files) => {
    const prev = get().memories[target.id] ?? blank(target);
    const ids: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const photo = await processPhoto(f, target.id);
        await memoryDb.putPhoto(photo);
        ids.push(photo.id);
      } catch (e) {
        console.warn('[memories] lỗi ảnh', e);
      }
    }
    if (ids.length === 0) {
      toastError('Không thêm được ảnh', 'Hãy thử ảnh định dạng JPG/PNG');
      return 0;
    }
    const latest = get().memories[target.id] ?? prev;
    const next: Memory = {
      ...latest,
      title: target.title || latest.title,
      color: target.color || latest.color,
      photoIds: [...latest.photoIds, ...ids],
      updatedAt: Date.now(),
    };
    set((s) => ({ memories: { ...s.memories, [next.id]: next } }));
    await memoryDb.putMemory(next);
    requestPersistentStorage();
    return ids.length;
  },

  removePhoto: async (memoryId, photoId) => {
    const m = get().memories[memoryId];
    if (!m) return;
    const next = { ...m, photoIds: m.photoIds.filter((p) => p !== photoId), updatedAt: Date.now() };
    set((s) => ({ memories: { ...s.memories, [memoryId]: next } }));
    await memoryDb.deletePhoto(photoId);
    await memoryDb.putMemory(next);
  },

  remove: async (memoryId) => {
    const m = get().memories[memoryId];
    if (!m) return;
    set((s) => {
      const { [memoryId]: _removed, ...rest } = s.memories;
      return { memories: rest };
    });
    await Promise.all(m.photoIds.map((p) => memoryDb.deletePhoto(p)));
    await memoryDb.deleteMemory(memoryId);
  },

  openDialog: (target) => set({ dialogTarget: target }),
  closeDialog: () => set({ dialogTarget: null }),
}));

/** Kỷ niệm có cùng ngày/tháng với `today` ở các năm trước — "Ngày này năm xưa" */
export function memoriesOnThisDay(memories: Record<string, Memory>, today = new Date()): Memory[] {
  const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = today.getFullYear();
  return Object.values(memories)
    .filter((m) => m.date.slice(5) === md && Number(m.date.slice(0, 4)) < y)
    .sort((a, b) => b.date.localeCompare(a.date));
}
