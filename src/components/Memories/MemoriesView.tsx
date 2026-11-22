import { useMemo, useState } from 'react';
import { Images, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMemoryStore, memoriesOnThisDay } from '@/store/memoryStore';
import { formatDateInput } from '@/lib/eventAdapters';
import { formatVi } from '@/lib/i18n';
import type { Memory } from '@/lib/memoryDb';
import { PhotoThumb } from './PhotoThumb';
import { BackupPanel } from './BackupPanel';

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function MemoryCard({ m, onOpen, yearsAgo }: { m: Memory; onOpen: () => void; yearsAgo?: number }) {
  const cover = m.photoIds[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {cover ? (
        <div className="relative">
          <PhotoThumb photoId={cover} className="aspect-[4/3] w-full" />
          {m.photoIds.length > 1 && (
            <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Images className="h-3 w-3" /> {m.photoIds.length}
            </span>
          )}
          {yearsAgo !== undefined && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {yearsAgo} năm trước
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex aspect-[4/3] w-full items-center justify-center text-4xl"
          style={{ background: `${m.color}22` }}
        >
          {m.mood ?? '📝'}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />
          <span className="truncate text-sm font-semibold">{m.title}</span>
          {m.mood && cover && <span className="ml-auto">{m.mood}</span>}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatVi(parseDate(m.date), 'EEEEEE, dd/MM/yyyy')}
        </span>
        {m.note.trim() && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.note}</p>
        )}
      </div>
    </button>
  );
}

/** Màn "Kỷ niệm": Ngày này năm xưa + dòng thời gian album */
export function MemoriesView() {
  const memories = useMemoryStore((s) => s.memories);
  const openDialog = useMemoryStore((s) => s.openDialog);
  const [q, setQ] = useState('');

  const open = (m: Memory) =>
    openDialog({ id: m.id, eventId: m.eventId, date: m.date, title: m.title, color: m.color });

  const createStandalone = () => {
    const date = formatDateInput(new Date());
    openDialog({
      id: `day__${date}__${Math.random().toString(36).slice(2, 8)}`,
      date,
      title: 'Kỷ niệm',
      color: '#e67c73',
    });
  };

  const onThisDay = useMemo(() => memoriesOnThisDay(memories), [memories]);
  const thisYear = new Date().getFullYear();

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = Object.values(memories)
      .filter((m) => !needle || m.title.toLowerCase().includes(needle) || m.note.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
    const map = new Map<string, Memory[]>();
    for (const m of list) {
      const key = m.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [memories, q]);

  const total = Object.keys(memories).length;
  const photoTotal = Object.values(memories).reduce((n, m) => n + m.photoIds.length, 0);

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-5 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-bold">Kỷ niệm của bạn</h2>
            <p className="text-xs text-muted-foreground">
              {total} kỷ niệm · {photoTotal} ảnh · lưu trên thiết bị này
            </p>
          </div>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kỷ niệm…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button onClick={createStandalone} className="gap-1.5">
            <Plus className="h-4 w-4" /> Kỷ niệm mới
          </Button>
        </div>

        <BackupPanel />

        {onThisDay.length > 0 && !q && (
          <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-pink-500/5 p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-amber-500" /> Ngày này năm xưa
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {onThisDay.map((m) => (
                <MemoryCard
                  key={m.id}
                  m={m}
                  onOpen={() => open(m)}
                  yearsAgo={thisYear - Number(m.date.slice(0, 4))}
                />
              ))}
            </div>
          </section>
        )}

        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <div className="text-5xl">📸</div>
            <p className="font-semibold">Chưa có kỷ niệm nào</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Mở một sự kiện đã diễn ra → tab <b>📸 Kỷ niệm</b> để thêm ảnh và ghi chú. Hoặc tạo kỷ niệm
              tự do cho một ngày đáng nhớ.
            </p>
            <Button variant="outline" onClick={createStandalone} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tạo kỷ niệm đầu tiên
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy kỷ niệm phù hợp.</p>
        ) : (
          groups.map(([month, list]) => (
            <section key={month}>
              <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1 text-sm font-bold capitalize backdrop-blur">
                {formatVi(parseDate(`${month}-01`), 'MMMM yyyy')}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((m) => (
                  <MemoryCard key={m.id} m={m} onOpen={() => open(m)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
