import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useMemoryStore, memoriesOnThisDay } from '@/store/memoryStore';
import { PhotoThumb } from './PhotoThumb';

/** Thẻ "Ngày này năm xưa" ở thanh bên — chỉ hiện khi có kỷ niệm */
export function OnThisDayCard() {
  const memories = useMemoryStore((s) => s.memories);
  const openDialog = useMemoryStore((s) => s.openDialog);
  const list = useMemo(() => memoriesOnThisDay(memories), [memories]);
  if (list.length === 0) return null;
  const year = new Date().getFullYear();

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-pink-500/5 p-2.5">
      <p className="mb-2 flex items-center gap-1 text-xs font-bold">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Ngày này năm xưa
      </p>
      <div className="space-y-1.5">
        {list.slice(0, 3).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() =>
              openDialog({ id: m.id, eventId: m.eventId, date: m.date, title: m.title, color: m.color })
            }
            className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-background/60"
          >
            {m.photoIds[0] ? (
              <PhotoThumb photoId={m.photoIds[0]} className="h-10 w-10 shrink-0 rounded-md" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
                {m.mood ?? '📝'}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{m.title}</span>
              <span className="block text-[11px] text-muted-foreground">
                {year - Number(m.date.slice(0, 4))} năm trước · {m.photoIds.length} ảnh
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
