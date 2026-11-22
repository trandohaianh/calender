/**
 * Lưu kỷ niệm (ghi chú + ảnh) trong IndexedDB của thiết bị.
 * Ảnh được nén (tối đa 1600px) và có bản thu nhỏ 400px để hiển thị nhanh.
 */

export interface Memory {
  /** `${eventId}__${date}` cho kỷ niệm gắn sự kiện, `day__${date}__${rand}` cho kỷ niệm tự do */
  id: string;
  eventId?: string;
  /** yyyy-MM-dd — ngày của lần diễn ra sự kiện */
  date: string;
  title: string;
  color: string;
  note: string;
  mood?: string;
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryPhoto {
  id: string;
  memoryId: string;
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  createdAt: number;
}

const DB_NAME = 'mycalendar-memories';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('memoryId', 'memoryId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function run<T>(
  store: 'memories' | 'photos',
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req ? (req.result as T) : (undefined as T));
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const memoryDb = {
  getAllMemories: () => run<Memory[]>('memories', 'readonly', (s) => s.getAll()),
  putMemory: (m: Memory) => run('memories', 'readwrite', (s) => s.put(m)),
  deleteMemory: (id: string) => run('memories', 'readwrite', (s) => s.delete(id)),
  getPhoto: (id: string) => run<MemoryPhoto | undefined>('photos', 'readonly', (s) => s.get(id)),
  putPhoto: (p: MemoryPhoto) => run('photos', 'readwrite', (s) => s.put(p)),
  deletePhoto: (id: string) => run('photos', 'readwrite', (s) => s.delete(id)),
};

export function memoryIdFor(eventId: string, date: string) {
  return `${eventId}__${date}`;
}

/* ------------------------------ Ảnh ------------------------------ */

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fallback bên dưới
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resize(
  src: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const w0 = src.width;
  const h0 = src.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const width = Math.max(1, Math.round(w0 * scale));
  const height = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas không khả dụng'));
  ctx.drawImage(src, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve({ blob: b, width, height }) : reject(new Error('Không nén được ảnh'))),
      'image/jpeg',
      quality
    )
  );
}

/** Nén ảnh người dùng chọn → bản đầy đủ (1600px) + thu nhỏ (400px) */
export async function processPhoto(file: File, memoryId: string): Promise<MemoryPhoto> {
  const bmp = await loadBitmap(file);
  const full = await resize(bmp, 1600, 0.82);
  const thumb = await resize(bmp, 400, 0.75);
  if ('close' in bmp) bmp.close();
  return {
    id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    memoryId,
    full: full.blob,
    thumb: thumb.blob,
    width: full.width,
    height: full.height,
    createdAt: Date.now(),
  };
}

/** Xin trình duyệt giữ dữ liệu lâu dài (tránh bị tự xoá khi máy đầy bộ nhớ) */
export function requestPersistentStorage() {
  try {
    void navigator.storage?.persist?.();
  } catch {
    // ignore
  }
}
