import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { memoryDb } from '@/lib/memoryDb';
import { cn } from '@/lib/utils';

/** Tải ảnh từ IndexedDB → object URL (tự giải phóng khi unmount) */
export function usePhotoUrl(photoId: string | undefined, size: 'thumb' | 'full' = 'thumb') {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void memoryDb.getPhoto(photoId).then((p) => {
      if (cancelled || !p) return;
      objectUrl = URL.createObjectURL(size === 'full' ? p.full : p.thumb);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, size]);
  return url;
}

export function PhotoThumb({
  photoId,
  className,
  onClick,
  alt = 'Ảnh kỷ niệm',
}: {
  photoId: string;
  className?: string;
  onClick?: () => void;
  alt?: string;
}) {
  const url = usePhotoUrl(photoId, 'thumb');
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('relative overflow-hidden bg-muted', className)}
    >
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </Tag>
  );
}

/** Xem ảnh toàn màn hình, vuốt trái/phải bằng nút hoặc phím mũi tên */
export function PhotoLightbox({
  photoIds,
  index,
  onIndex,
  onClose,
  onDelete,
}: {
  photoIds: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}) {
  const id = photoIds[index];
  const url = usePhotoUrl(id, 'full');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key === 'ArrowRight' && index < photoIds.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, photoIds.length, onClose, onIndex]);

  if (!id) return null;

  return createPortal(
    <div
      data-memory-lightbox
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
      style={{ pointerEvents: 'auto' }}
      onClick={onClose}
      role="dialog"
      aria-label="Xem ảnh"
    >
      {url && (
        <img
          src={url}
          alt="Ảnh kỷ niệm"
          className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="absolute right-3 top-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {onDelete && (
          <button
            type="button"
            className="rounded-full bg-white/10 p-2 text-white hover:bg-red-500/80"
            onClick={() => onDelete(id)}
            aria-label="Xoá ảnh"
            title="Xoá ảnh"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {index > 0 && (
        <button
          type="button"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index - 1);
          }}
          aria-label="Ảnh trước"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {index < photoIds.length - 1 && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index + 1);
          }}
          aria-label="Ảnh sau"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <div className="absolute bottom-4 text-sm text-white/70">
        {index + 1} / {photoIds.length}
      </div>
    </div>,
    document.body
  );
}

/** Dùng cho onPointerDownOutside / onInteractOutside của Radix Dialog */
export function keepDialogOpenForLightbox(e: { target: EventTarget | null; preventDefault: () => void }) {
  if ((e.target as HTMLElement | null)?.closest?.('[data-memory-lightbox]')) e.preventDefault();
}
