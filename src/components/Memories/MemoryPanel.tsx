import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { useMemoryStore, type MemoryTarget } from '@/store/memoryStore';
import type { MemorySticker } from '@/lib/memoryDb';
import { toastError, toastSuccess } from '@/store/toastStore';
import { cn } from '@/lib/utils';
import { PhotoLightbox, PhotoThumb } from './PhotoThumb';
import {
  NOTE_FONTS,
  NOTE_MAX,
  PAPERS,
  QUICK_LINES,
  STICKER_PACKS,
  noteFont,
  paperOf,
  wordColor,
} from './memoryStyles';

export const MOODS = [
  { emoji: '🥰', label: 'Hạnh phúc' },
  { emoji: '😆', label: 'Vui xỉu' },
  { emoji: '😌', label: 'Chill' },
  { emoji: '🥳', label: 'Quẩy' },
  { emoji: '🙏', label: 'Biết ơn' },
  { emoji: '🥺', label: 'Xúc động' },
  { emoji: '😭', label: 'Buồn' },
  { emoji: '😴', label: 'Mệt' },
];

const MAX_STICKERS = 40;
type Tool = 'sticker' | 'font' | 'paper';

/** Hiển thị một sticker (emoji hoặc chữ) — dùng chung cho trang & thẻ xem trước */
export function StickerFace({ s, className }: { s: Pick<MemorySticker, 'emoji' | 'kind'>; className?: string }) {
  if (s.kind === 'text') {
    return (
      <span
        className={cn(
          'inline-block whitespace-nowrap rounded-full border-2 border-white px-2.5 py-0.5 font-sign text-sm text-white shadow-md',
          className
        )}
        style={{ background: wordColor(s.emoji), textShadow: '0 1px 0 rgb(0 0 0 / .2)' }}
      >
        {s.emoji}
      </span>
    );
  }
  return <span className={cn('text-4xl drop-shadow-md', className)}>{s.emoji}</span>;
}

interface Props {
  target: MemoryTarget;
  /** Hiện nút chụp ảnh trực tiếp (điện thoại) */
  showCamera?: boolean;
}

/** Trang scrapbook: cảm xúc + note ngắn nhiều kiểu chữ + sticker kéo thả + ảnh polaroid */
export function MemoryPanel({ target, showCamera = true }: Props) {
  const memory = useMemoryStore((s) => s.memories[target.id]);
  const upsert = useMemoryStore((s) => s.upsert);
  const addPhotos = useMemoryStore((s) => s.addPhotos);
  const removePhoto = useMemoryStore((s) => s.removePhoto);

  const [note, setNote] = useState(memory?.note ?? '');
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>('sticker');
  const [pack, setPack] = useState(STICKER_PACKS[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<MemorySticker | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number>();

  // Đồng bộ khi đổi sang kỷ niệm khác
  useEffect(() => {
    setNote(useMemoryStore.getState().memories[target.id]?.note ?? '');
    setSelected(null);
  }, [target.id]);

  const scheduleNote = (v: string) => {
    setNote(v);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void upsert(target, { note: v }), 600);
  };
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const flushNote = () => {
    window.clearTimeout(saveTimer.current);
    if ((memory?.note ?? '') !== note) void upsert(target, { note });
  };

  const font = noteFont(memory?.font);
  const paper = paperOf(memory?.paper);
  const stickers = memory?.stickers ?? [];
  const photos = memory?.photoIds ?? [];

  /* ── Sticker ── */
  const saveStickers = (next: MemorySticker[]) => {
    window.clearTimeout(saveTimer.current);
    void upsert(target, { stickers: next, note });
  };

  const addSticker = (emoji: string, text?: boolean) => {
    if (stickers.length >= MAX_STICKERS) {
      toastError('Trang đầy sticker rồi 😅', 'Xoá bớt vài cái nhé');
      return;
    }
    const s: MemorySticker = {
      id: Math.random().toString(36).slice(2, 9),
      emoji,
      ...(text ? { kind: 'text' as const } : {}),
      x: 12 + Math.random() * 76,
      y: 45 + Math.random() * 45,
      rot: Math.round(Math.random() * 36 - 18),
      scale: 1,
    };
    setSelected(s.id);
    saveStickers([...stickers, s]);
  };

  const pointToPct = (clientX: number, clientY: number) => {
    const r = boardRef.current!.getBoundingClientRect();
    return {
      x: Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(96, Math.max(4, ((clientY - r.top) / r.height) * 100)),
    };
  };
  const onStickerDown = (e: React.PointerEvent, s: MemorySticker) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(s.id);
    setDrag(s);
  };
  const onStickerMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, ...pointToPct(e.clientX, e.clientY) });
  };
  const onStickerUp = () => {
    if (!drag) return;
    const moved = drag;
    setDrag(null);
    saveStickers(stickers.map((s) => (s.id === moved.id ? moved : s)));
  };
  const sel = stickers.find((s) => s.id === selected);
  const patchSelected = (p: Partial<MemorySticker>) => {
    if (!sel) return;
    saveStickers(stickers.map((s) => (s.id === sel.id ? { ...s, ...p } : s)));
  };

  /* ── Ảnh ── */
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      flushNote();
      const n = await addPhotos(target, Array.from(files));
      if (n) toastSuccess(`Đã dán ${n} ảnh lên trang 📸`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const addLine = (line: string) => {
    const v = (note.trim() ? `${note.trim()} ${line}` : line).slice(0, NOTE_MAX);
    scheduleNote(v);
  };

  return (
    <div className="space-y-3">
      {/* Cảm xúc */}
      <div>
        <p className="mb-1.5 font-fun text-sm font-extrabold">Hôm nay thấy sao? 👇</p>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1 [scrollbar-width:none]"
          role="radiogroup"
          aria-label="Cảm xúc"
        >
          {MOODS.map((m) => {
            const active = memory?.mood === m.emoji;
            return (
              <button
                key={m.emoji}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={m.label}
                onClick={() => void upsert(target, { mood: active ? undefined : m.emoji, note })}
                className={cn(
                  'flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all',
                  active ? 'clay-sm scale-105 ring-2 ring-primary' : 'opacity-80 hover:scale-110 hover:opacity-100'
                )}
              >
                <span className={cn('text-[1.7rem] leading-none', active && 'animate-bounce')}>{m.emoji}</span>
                <span className="text-[10px] font-bold text-muted-foreground">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trang scrapbook */}
      <div
        ref={boardRef}
        className="relative min-h-[300px] touch-none select-none overflow-hidden rounded-3xl p-4 shadow-[inset_0_2px_10px_rgb(0_0_0/0.08)]"
        style={{ background: paper.bg, color: paper.ink }}
        onPointerMove={onStickerMove}
        onPointerUp={onStickerUp}
        onPointerDown={() => setSelected(null)}
      >
        {/* băng dính trang trí */}
        <span
          aria-hidden
          className="absolute -top-1 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-2 rounded-sm bg-white/60 shadow-sm"
        />

        <div className="relative z-10 pr-12">
          <textarea
            value={note}
            maxLength={NOTE_MAX}
            rows={2}
            onChange={(e) => scheduleNote(e.target.value)}
            onBlur={flushNote}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Một dòng thôi cũng được ✍️"
            className={cn(
              'block w-full resize-none bg-transparent outline-none placeholder:opacity-45',
              font.className
            )}
            style={{ color: paper.ink }}
            aria-label="Ghi chú kỷ niệm"
          />
          <span className="text-[10px] font-bold opacity-50">
            {note.length}/{NOTE_MAX}
          </span>
        </div>

        {memory?.mood && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-3 z-10 rotate-12 text-5xl drop-shadow-lg"
          >
            {memory.mood}
          </span>
        )}

        {/* Ảnh polaroid */}
        <div className="relative z-10 mt-3 flex flex-wrap gap-3">
          {photos.map((pid, i) => (
            <button
              key={pid}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setViewer(i)}
              className="w-24 bg-white p-1.5 pb-4 shadow-lg transition-transform hover:z-20 hover:scale-105 sm:w-28"
              style={{ transform: `rotate(${((i * 37) % 13) - 6}deg)` }}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <PhotoThumb photoId={pid} className="pointer-events-none aspect-square w-full" />
            </button>
          ))}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-24 rotate-3 flex-col items-center justify-center gap-1 border-2 border-dashed border-current bg-white/40 p-1.5 text-[11px] font-bold opacity-70 transition hover:opacity-100 disabled:opacity-50 sm:w-28"
            style={{ aspectRatio: '0.86' }}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {uploading ? 'Đang nén…' : 'Dán ảnh'}
          </button>
        </div>

        {stickers.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-bold opacity-50">
            Chạm sticker bên dưới để dán lên đây ✨
          </p>
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
                'absolute z-20 cursor-grab touch-none transition-transform active:cursor-grabbing',
                drag?.id === s.id ? 'duration-0' : 'duration-150',
                selected === s.id && 'rounded-xl outline-dashed outline-2 outline-offset-4 outline-pink-400'
              )}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%,-50%) rotate(${s.rot}deg) scale(${s.scale})`,
              }}
            >
              <StickerFace s={s} />
            </span>
          );
        })}
      </div>

      {/* Chỉnh sticker đang chọn */}
      {sel && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-muted/70 p-2 text-xs animate-pop-in">
          <StickerFace s={sel} className={sel.kind === 'text' ? 'mr-1 text-xs' : 'mr-1 text-2xl'} />
          {[
            ['↺', { rot: sel.rot - 15 }],
            ['↻', { rot: sel.rot + 15 }],
            ['➖', { scale: Math.max(0.5, +(sel.scale - 0.25).toFixed(2)) }],
            ['➕', { scale: Math.min(3, +(sel.scale + 0.25).toFixed(2)) }],
          ].map(([label, p]) => (
            <button
              key={label as string}
              type="button"
              className="clay-sm h-8 w-8 rounded-full font-bold"
              onClick={() => patchSelected(p as Partial<MemorySticker>)}
            >
              {label as string}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full bg-red-500 px-3 py-1.5 font-bold text-white"
            onClick={() => {
              saveStickers(stickers.filter((s) => s.id !== sel.id));
              setSelected(null);
            }}
          >
            🗑 Bỏ
          </button>
        </div>
      )}

      {/* Câu chèn nhanh */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {QUICK_LINES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => addLine(l)}
            className="shrink-0 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/15 active:scale-95"
          >
            + {l}
          </button>
        ))}
      </div>

      {/* Hộp công cụ */}
      <div className="clay rounded-3xl p-2.5">
        <div className="mb-2 flex gap-1 rounded-full bg-muted p-1" role="tablist">
          {(
            [
              ['sticker', '🦄 Sticker'],
              ['font', 'Aa Kiểu chữ'],
              ['paper', '🎨 Giấy'],
            ] as [Tool, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tool === id}
              onClick={() => setTool(id)}
              className={cn(
                'flex-1 rounded-full py-1.5 text-xs font-extrabold transition',
                tool === id ? 'bg-background text-primary shadow' : 'text-muted-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tool === 'sticker' && (
          <>
            <div className="mb-2 flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {STICKER_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPack(p.id)}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                    pack === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {(() => {
              const p = STICKER_PACKS.find((x) => x.id === pack) ?? STICKER_PACKS[0];
              return (
                <div className={cn('flex flex-wrap gap-1.5', !p.text && 'justify-between')}>
                  {p.items.map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => addSticker(it, p.text)}
                      aria-label={`Dán ${it}`}
                      className={cn(
                        'rounded-xl transition hover:scale-125 active:scale-90',
                        p.text ? 'p-0.5' : 'flex h-10 w-10 items-center justify-center text-2xl hover:bg-muted'
                      )}
                    >
                      {p.text ? <StickerFace s={{ emoji: it, kind: 'text' }} className="text-xs" /> : it}
                    </button>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {tool === 'font' && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {NOTE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => void upsert(target, { font: f.id, note })}
                className={cn(
                  'truncate rounded-2xl border-2 px-2 py-1.5 transition',
                  f.className,
                  '!text-lg !leading-7',
                  font.id === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted/60'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tool === 'paper' && (
          <div className="flex flex-wrap justify-center gap-2">
            {PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={`Giấy ${p.label}`}
                onClick={() => void upsert(target, { paper: p.id, note })}
                className={cn(
                  'h-11 w-11 rounded-2xl shadow-md transition hover:scale-110',
                  paper.id === p.id && 'ring-4 ring-primary ring-offset-2 ring-offset-background'
                )}
                style={{ background: p.bg }}
              />
            ))}
          </div>
        )}
      </div>

      {showCamera && (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="clay-sm flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-bold md:hidden"
        >
          <Camera className="h-4 w-4" /> Chụp ảnh ngay
        </button>
      )}

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
