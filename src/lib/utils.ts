import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * "YYYY-MM-DD" theo ngày LOCAL của thiết bị — dùng thay cho
 * `date.toISOString().slice(0, 10)`, vốn quy đổi sang UTC trước rồi mới
 * cắt chuỗi nên lùi mất một ngày ở mọi múi giờ dương (vd UTC+7: nửa đêm
 * local vẫn là 17h hôm trước theo UTC).
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
