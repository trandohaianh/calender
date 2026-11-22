import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useMemoryStore, type MemoryTarget } from '@/store/memoryStore';
import { toastSuccess } from '@/store/toastStore';
import { cn } from '@/lib/utils';
import { PhotoLightbox, PhotoThumb } from './PhotoThumb';

export const MOODS = [
  { emoji: '🥰', label: 'Hạnh phúc' },
  { emoji: '😄', label: 'Vui' },
  { emoji: '😌', label: 'Bình yên' },
  { emoji: '🎉', label: 'Phấn khích' },
  { emoji: '🙏', label: 'Biết ơn' },
  { emoji: '😢', label: 'Buồn' },
  { emoji: '😴', label: 'Mệt' },
];

interface Props {
  target: MemoryTarget;
  /** Hiện nút chụp ảnh trực tiếp (điện thoại) */
  showCamera?: boolean;
}

/** Ghi chú + cảm xúc + album ảnh cho một ngày / một lần diễn ra sự kiện */
export function MemoryPanel({ target, showCamera = true }: Props) {
  const memory = useMemoryStore((s) => s.memories[target.id]);
  const upsert = useMemoryStore((s) => s.upsert);
  const addPhotos = useMemoryStore((s) => s.addPhotos);
  const removePhoto = useMemoryStore((s) => s.removePhoto);

  const [note, setNote] = useState(memory?.note ?? '');
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number>();

  // Đồng bộ khi đổi sang kỷ niệm khác
  useEffect(() => {
    setNote(useMemoryStore.getState().memories[target.id]?.note ?? '');
  }, [target.id]);

  // Tự lưu ghi chú sau khi ngừng gõ 600ms
  const onNoteChange = (v: string) => {
    setNote(v);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void upsert(target, { note: v }), 600);
  };
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const flushNote = () => {
    window.clearTimeout(saveTimer.current);
    if ((memory?.note ?? '') !== note) void upsert(target, { note });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      flushNote();
      const n = await addPhotos(target, Array.from(files));
      if (n) toastSuccess(`Đã thêm ${n} ảnh kỷ niệm`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const photos = memory?.photoIds ?? [];

  return (
    <div className="space-y-3">
      {/* Cảm xúc */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cảm xúc">
        {MOODS.map((m) => {
          const active = memory?.mood === m.emoji;
          return (
            <button
              key={m.emoji}
              type="button"
              role="radio"
              aria-checked={active}
              title={m.label}
              onClick={() => void upsert(target, { mood: active ? undefined : m.emoji, note })}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-all',
                active
                  ? 'scale-110 border-primary bg-primary/10 shadow-sm'
                  : 'border-transparent bg-muted/60 opacity-70 hover:opacity-100'
              )}
            >
              {m.emoji}
            </button>
          );
        })}
      </div>

      {/* Ghi chú */}
      <Textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        onBlur={flushNote}
        placeholder="Hôm đó thế nào? Ai đã ở bên bạn, điều gì đáng nhớ…"
        className="min-h-[90px] text-sm"
        aria-label="Ghi chú kỷ niệm"
      />

      {/* Album */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {photos.map((pid, i) => (
          <PhotoThumb
            key={pid}
            photoId={pid}
            className="aspect-square rounded-lg"
            onClick={() => setViewer(i)}
          />
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          {uploading ? 'Đang nén…' : 'Thêm ảnh'}
        </button>
        {showCamera && (
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60 md:hidden"
          >
            <Camera className="h-5 w-5" />
            Chụp ảnh
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />

      {viewer !== null && photos.length > 0 && (
        <PhotoLightbox
          photoIds={photos}
          index={Math.min(viewer, photos.length - 1)}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          onDelete={(pid) => {
            if (!window.confirm('Xoá ảnh này khỏi kỷ niệm?')) return;
            void removePhoto(target.id, pid);
            if (photos.length <= 1) setViewer(null);
          }}
        />
      )}
    </div>
  );
}
