import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useSocialStore } from '@/store/socialStore';
import { toastError } from '@/store/toastStore';
import {
  MAX_SHARED_PHOTOS,
  NOTE_THEMES,
  STICKERS,
  type SharedMemory,
  type SharedPhoto,
  type Sticker,
} from '@/social/types';
import { cn } from '@/lib/utils';

type Api = typeof import('@/social/socialApi');
let apiPromise: Promise<Api> | null = null;
const api = () => (apiPromise ??= import('@/social/socialApi'));

/** Trang note chung — 2 người cùng viết, dán sticker, thêm ảnh theo thời gian thực */
export function SharedNoteDialog() {
  const id = useSocialStore((s) => s.openSharedId);
  const close = () => useSocialStore.getState().openShared(null);
  if (!id) return null;
  return <SharedNoteEditor key={id} id={id} onClose={close} />;
}

function SharedNoteEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const myUid = useSocialStore((s) => s.uid)!;
  const me = useSocialStore((s) => s.me);
  const profiles = useSocialStore((s) => s.profiles);

  const [mem, setMem] = useState<SharedMemory | null | undefined>(undefined);
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<Sticker | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<SharedPhoto | null>(null);
  const noteFocused = useRef(false);
  const titleFocused = useRef(false);
  const noteTimer = useRef<number>();
  const pageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Đồng bộ thời gian thực
  useEffect(() => {
    let un1: (() => void) | undefined;
    let un2: (() => void) | undefined;
    void api().then((a) => {
      un1 = a.subscribeShared(
        id,
        (m) => {
          setMem(m);
          if (m && !noteFocused.current) setNote(m.note);
          if (m && !titleFocused.current) setTitle(m.title);
        },
        (e) => {
          toastError('Không mở được kỷ niệm chung', e.message);
          setMem(null);
        }
      );
      un2 = a.subscribeSharedPhotos(id, setPhotos, () => undefined);
    });
    return () => {
      un1?.();
      un2?.();
      window.clearTimeout(noteTimer.current);
    };
  }, [id]);

  const save = useCallback(
    (patch: Parameters<Api['updateShared']>[2]) =>
      void api()
        .then((a) => a.updateShared(id, myUid, patch))
        .catch((e) => toastError('Chưa lưu được', e.message)),
    [id, myUid]
  );

  if (mem === undefined) {
    return (
      <Shell onClose={onClose}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      </Shell>
    );
  }
  if (mem === null) {
    return (
      <Shell onClose={onClose}>
        <p className="p-10 text-center text-sm text-muted-foreground">Kỷ niệm này không còn tồn tại.</p>
      </Shell>
    );
  }

  const theme = NOTE_THEMES.find((t) => t.id === mem.theme) ?? NOTE_THEMES[0];
  const friendUid = mem.members.find((u) => u !== myUid) ?? '';
  const friend = profiles[friendUid];
  const stickers = Object.values(mem.stickers ?? {});
  const editedByFriend = mem.updatedBy && mem.updatedBy !== myUid;

  /* ── Sticker ── */
  const addSticker = (emoji: string) => {
    if (stickers.length >= 60) return toastError('Trang đã đầy sticker 😅');
    const s: Sticker = {
      id: Math.random().toString(36).slice(2, 9),
      emoji,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 60,
      rot: Math.round(Math.random() * 40 - 20),
      scale: 1,
      by: myUid,
    };
    setSelected(s.id);
    void api().then((a) => a.putSticker(id, myUid, s)).catch((e) => toastError('Không dán được', e.message));
  };

  const pointToPct = (clientX: number, clientY: number) => {
    const r = pageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(95, Math.max(3, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(95, Math.max(3, ((clientY - r.top) / r.height) * 100)),
    };
  };

  const onStickerDown = (e: React.PointerEvent, s: Sticker) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(s.id);
    setDrag(s);
  };
  const onStickerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, ...pointToPct(e.clientX, e.clientY) });
  };
  const onStickerUp = () => {
    if (!drag) return;
    const s = drag;
    setDrag(null);
    void api().then((a) => a.putSticker(id, myUid, s));
  };
  const patchSelected = (p: Partial<Sticker>) => {
    const s = stickers.find((x) => x.id === selected);
    if (!s) return;
    void api().then((a) => a.putSticker(id, myUid, { ...s, ...p }));
  };

  /* ── Ảnh ── */
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_SHARED_PHOTOS - mem.photoCount;
    if (room <= 0) return toastError(`Tối đa ${MAX_SHARED_PHOTOS} ảnh mỗi kỷ niệm chung`);
    setUploading(true);
    try {
      const { compressForShare } = await import('@/social/photo');
      const a = await api();
      for (const f of Array.from(files).slice(0, room)) {
        if (!f.type.startsWith('image/')) continue;
        await a.addSharedPhoto(id, myUid, await compressForShare(f));
      }
    } catch (e) {
      toastError('Không thêm được ảnh', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sel = stickers.find((s) => s.id === selected);

  return (
    <Shell onClose={onClose}>
      {/* Thanh trên */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex -space-x-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-xl ring-2 ring-background">{me?.avatar}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xl ring-2 ring-background">{friend?.avatar ?? '💗'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-fun text-lg font-extrabold leading-tight">
            Bạn & {friend?.displayName ?? 'bạn thân'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {editedByFriend ? `✏️ ${friend?.displayName ?? 'Bạn ấy'} vừa chỉnh sửa` : 'Cả hai cùng sửa được · tự lưu'}
          </p>
        </div>
        <input
          type="date"
          value={mem.date}
          onChange={(e) => e.target.value && save({ date: e.target.value })}
          className="rounded-lg border bg-background px-2 py-1 text-xs"
          aria-label="Ngày kỷ niệm"
        />
        <DialogPrimitive.Close className="rounded-full p-2 hover:bg-muted" aria-label="Đóng">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {/* Trang note */}
        <div
          ref={pageRef}
          className="relative min-h-[380px] touch-none select-none overflow-hidden rounded-3xl p-5 shadow-inner"
          style={{ background: theme.bg, color: theme.ink }}
          onPointerMove={onStickerMove}
          onPointerUp={onStickerUp}
          onPointerDown={() => setSelected(null)}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => (titleFocused.current = true)}
            onBlur={() => {
              titleFocused.current = false;
              if (title.trim() && title !== mem.title) save({ title: title.trim().slice(0, 80) });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="relative z-10 w-full bg-transparent font-fun text-2xl font-extrabold outline-none placeholder:opacity-50"
            placeholder="Tên kỷ niệm"
            style={{ color: theme.ink }}
            aria-label="Tên kỷ niệm"
          />
          <textarea
            value={note}
            onChange={(e) => {
              const v = e.target.value.slice(0, 5000);
              setNote(v);
              window.clearTimeout(noteTimer.current);
              noteTimer.current = window.setTimeout(() => save({ note: v }), 700);
            }}
            onFocus={() => (noteFocused.current = true)}
            onBlur={() => {
              noteFocused.current = false;
              window.clearTimeout(noteTimer.current);
              if (note !== mem.note) save({ note });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Viết gì đó cho nhau đi… 💌"
            className="relative z-10 mt-2 min-h-[160px] w-full resize-none bg-transparent font-hand text-xl leading-7 outline-none placeholder:opacity-50"
            style={{ color: theme.ink }}
            aria-label="Nội dung kỷ niệm"
          />

          {/* Ảnh kiểu polaroid */}
          {photos.length > 0 && (
            <div className="relative z-10 mt-2 flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setViewPhoto(p)}
                  className="w-28 bg-white p-1.5 pb-5 shadow-lg transition-transform hover:z-20 hover:scale-105 sm:w-32"
                  style={{ transform: `rotate(${((i * 37) % 13) - 6}deg)` }}
                >
                  <img src={p.data} alt="Ảnh kỷ niệm chung" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Sticker */}
          {stickers.map((s0) => {
            const s = drag?.id === s0.id ? drag : s0;
            return (
              <span
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`Sticker ${s.emoji}`}
                onPointerDown={(e) => onStickerDown(e, s)}
                className={cn(
                  'absolute z-20 cursor-grab touch-none text-4xl drop-shadow-md transition-transform active:cursor-grabbing',
                  drag?.id === s.id ? 'duration-0' : 'duration-150',
                  selected === s.id && 'rounded-xl outline-dashed outline-2 outline-offset-4 outline-pink-400'
                )}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%,-50%) rotate(${s.rot}deg) scale(${s.scale})`,
                }}
              >
                {s.emoji}
              </span>
            );
          })}
        </div>

        {/* Điều khiển sticker đang chọn */}
        {sel && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-muted/60 p-2 text-xs animate-pop-in">
            <span className="text-2xl">{sel.emoji}</span>
            <button type="button" className="rounded-full bg-background px-3 py-1 font-bold" onClick={() => patchSelected({ rot: sel.rot - 15 })}>↺ Xoay</button>
            <button type="button" className="rounded-full bg-background px-3 py-1 font-bold" onClick={() => patchSelected({ rot: sel.rot + 15 })}>↻ Xoay</button>
            <button type="button" className="rounded-full bg-background px-3 py-1 font-bold" onClick={() => patchSelected({ scale: Math.max(0.5, +(sel.scale - 0.25).toFixed(2)) })}>➖ Nhỏ</button>
            <button type="button" className="rounded-full bg-background px-3 py-1 font-bold" onClick={() => patchSelected({ scale: Math.min(3, +(sel.scale + 0.25).toFixed(2)) })}>➕ To</button>
            <button
              type="button"
              className="rounded-full bg-destructive/10 px-3 py-1 font-bold text-destructive"
              onClick={() => {
                setSelected(null);
                void api().then((a) => a.removeSticker(id, myUid, sel.id));
              }}
            >
              Gỡ
            </button>
          </div>
        )}

        {/* Sticker */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-muted-foreground">Dán sticker (kéo để di chuyển)</p>
          <div className="flex flex-wrap gap-1">
            {STICKERS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => addSticker(e)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-2xl transition-transform hover:-translate-y-0.5 hover:scale-110 active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Nền */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-muted-foreground">Giấy note</p>
          <div className="flex flex-wrap gap-2">
            {NOTE_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.label}
                onClick={() => save({ theme: t.id })}
                className={cn('h-10 w-14 rounded-xl shadow-sm transition-transform hover:scale-105', mem.theme === t.id && 'ring-2 ring-pink-500 ring-offset-2')}
                style={{ background: t.bg }}
                aria-label={`Nền ${t.label}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={uploading || mem.photoCount >= MAX_SHARED_PHOTOS}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Thêm ảnh ({mem.photoCount}/{MAX_SHARED_PHOTOS})
          </button>
          <button
            type="button"
            className="ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
            onClick={async () => {
              if (!window.confirm('Xoá kỷ niệm chung này cho CẢ HAI người? Không thể hoàn tác.')) return;
              try {
                await (await api()).deleteSharedMemory(id);
                onClose();
              } catch (e) {
                toastError('Không xoá được', e instanceof Error ? e.message : undefined);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Xoá kỷ niệm
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        </div>
      </div>

      {viewPhoto && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
          onClick={() => setViewPhoto(null)}
        >
          <img src={viewPhoto.data} alt="Ảnh kỷ niệm chung" className="max-h-[75%] max-w-full rounded-lg shadow-2xl" />
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs text-white">
              {viewPhoto.by === myUid ? 'Bạn đã thêm' : `${friend?.displayName ?? 'Bạn ấy'} đã thêm`}
            </span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-red-500/80 px-3 py-1.5 text-xs font-bold text-white"
              onClick={async () => {
                if (!window.confirm('Xoá ảnh này cho cả hai?')) return;
                await (await api()).deleteSharedPhoto(id, myUid, viewPhoto.id).catch((e) => toastError('Không xoá được', e.message));
                setViewPhoto(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá ảnh
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94vh] flex-col overflow-hidden rounded-t-3xl border bg-background shadow-2xl animate-slide-in sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <DialogPrimitive.Title className="sr-only">Kỷ niệm chung</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
