import { memoryDb, type Memory, type MemoryPhoto } from '@/lib/memoryDb';

/**
 * Sao lưu kỷ niệm ra 1 file JSON (ảnh nhúng dạng base64) và khôi phục lại.
 * Khôi phục là GỘP: không xoá gì đang có; trùng kỷ niệm thì giữ ghi chú mới hơn
 * và hợp nhất danh sách ảnh.
 */

const KIND = 'mycalendar-memories-backup';
const VERSION = 1;
const LAST_BACKUP_KEY = 'mycalendar_memories_last_backup';

interface BackupPhoto {
  id: string;
  memoryId: string;
  width: number;
  height: number;
  createdAt: number;
  full: string; // data URL
  thumb: string; // data URL
}

interface BackupFile {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  memories: Memory[];
  photos: BackupPhoto[];
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const comma = url.indexOf(',');
  const mime = url.slice(5, url.indexOf(';')) || 'image/jpeg';
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  memories: number;
  photos: number;
  missingPhotos: number;
}

/** Tạo file sao lưu. Ghép Blob theo từng phần để không tạo 1 chuỗi khổng lồ. */
export async function buildBackup(
  memories: Memory[],
  onProgress?: (done: number, total: number) => void
): Promise<ExportResult> {
  const photoIds = memories.flatMap((m) => m.photoIds);
  const parts: BlobPart[] = [];
  const head = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    memories,
  };
  // Mở JSON, chèn mảng photos thủ công
  parts.push(JSON.stringify(head).slice(0, -1) + ',"photos":[');

  let written = 0;
  let missing = 0;
  for (let i = 0; i < photoIds.length; i++) {
    const p = await memoryDb.getPhoto(photoIds[i]);
    onProgress?.(i + 1, photoIds.length);
    if (!p) {
      missing++;
      continue;
    }
    const item: BackupPhoto = {
      id: p.id,
      memoryId: p.memoryId,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      full: await blobToDataUrl(p.full),
      thumb: await blobToDataUrl(p.thumb),
    };
    parts.push((written > 0 ? ',' : '') + JSON.stringify(item));
    written++;
  }
  parts.push(']}');

  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return {
    blob: new Blob(parts, { type: 'application/json' }),
    filename: `mycalendar-ky-niem-${stamp}.json`,
    memories: memories.length,
    photos: written,
    missingPhotos: missing,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function markBackedUp() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function getLastBackupAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function isMemory(x: unknown): x is Memory {
  const m = x as Memory;
  return (
    !!m &&
    typeof m.id === 'string' &&
    typeof m.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(m.date) &&
    typeof m.title === 'string' &&
    Array.isArray(m.photoIds)
  );
}

export interface ImportResult {
  added: number;
  merged: number;
  photosAdded: number;
  skipped: number;
}

/** Đọc file sao lưu và gộp vào dữ liệu hiện có */
export async function restoreBackup(
  file: File,
  current: Record<string, Memory>,
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  let data: BackupFile;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('File không phải JSON hợp lệ');
  }
  if (data?.kind !== KIND || !Array.isArray(data.memories) || !Array.isArray(data.photos)) {
    throw new Error('Đây không phải file sao lưu kỷ niệm của MyCalendar');
  }
  if (data.version > VERSION) {
    throw new Error('File sao lưu được tạo bởi phiên bản app mới hơn');
  }

  // 1. Ảnh — chỉ thêm ảnh chưa có
  const restoredPhotoIds = new Set<string>();
  let photosAdded = 0;
  for (let i = 0; i < data.photos.length; i++) {
    const bp = data.photos[i];
    onProgress?.(i + 1, data.photos.length);
    if (!bp?.id || !bp.full?.startsWith('data:image/')) continue;
    const existing = await memoryDb.getPhoto(bp.id);
    if (!existing) {
      const photo: MemoryPhoto = {
        id: bp.id,
        memoryId: bp.memoryId,
        width: bp.width,
        height: bp.height,
        createdAt: bp.createdAt,
        full: await dataUrlToBlob(bp.full),
        thumb: await dataUrlToBlob(bp.thumb?.startsWith('data:image/') ? bp.thumb : bp.full),
      };
      await memoryDb.putPhoto(photo);
      photosAdded++;
    }
    restoredPhotoIds.add(bp.id);
  }

  // 2. Kỷ niệm — gộp
  let added = 0;
  let merged = 0;
  let skipped = 0;
  for (const raw of data.memories) {
    if (!isMemory(raw)) {
      skipped++;
      continue;
    }
    const incoming: Memory = {
      ...raw,
      note: typeof raw.note === 'string' ? raw.note : '',
      color: typeof raw.color === 'string' ? raw.color : '#e67c73',
      // bỏ ảnh không có trong file lẫn máy
      photoIds: raw.photoIds.filter((id) => restoredPhotoIds.has(id)),
    };
    const local = current[incoming.id];
    if (!local) {
      await memoryDb.putMemory(incoming);
      added++;
      continue;
    }
    const newer = incoming.updatedAt > local.updatedAt ? incoming : local;
    const mergedMem: Memory = {
      ...newer,
      photoIds: Array.from(new Set([...local.photoIds, ...incoming.photoIds])),
      createdAt: Math.min(local.createdAt, incoming.createdAt),
      updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
    };
    await memoryDb.putMemory(mergedMem);
    merged++;
  }

  return { added, merged, photosAdded, skipped };
}
