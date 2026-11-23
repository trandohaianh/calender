import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  countdownTheme,
  daysLeft,
  sortCountdowns,
  taskProgress,
  timeProgress,
  useCountdownStore,
  type Countdown,
} from '@/store/countdownStore';

export function countdownLabel(n: number) {
  if (n === 0) return { big: 'Hôm nay!', small: 'cố lên nha 🔥' };
  if (n === 1) return { big: 'Ngày mai', small: 'sắp rồi đó 😳' };
  if (n > 0) return { big: `D-${n}`, small: `còn ${n} ngày` };
  return { big: 'Xong rồi', small: `${-n} ngày trước` };
}

function CountdownCard({ c }: { c: Countdown }) {
  const open = useCountdownStore((s) => s.open);
  const n = daysLeft(c);
  const label = countdownLabel(n);
  const theme = countdownTheme(c.theme);
  const tp = taskProgress(c);
  const progress = tp ?? timeProgress(c);
  const urgent = n >= 0 && n <= 7;

  return (
    <button
      type="button"
      onClick={() => open(c.id)}
      className={cn(
        'tilt gloss relative flex w-40 shrink-0 flex-col rounded-3xl p-3 text-left text-white',
        n < 0 && 'opacity-60 saturate-50'
      )}
      style={{ background: theme.bg, boxShadow: `0 10px 22px -12px ${theme.color}, inset 0 2px 0 rgb(255 255 255 / .35)` }}
      aria-label={`${c.title}: ${label.small}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn('text-2xl drop-shadow', urgent && 'animate-bounce')}>{c.emoji}</span>
        {urgent && (
          <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-500">
            gấp
          </span>
        )}
      </div>
      <span className="mt-0.5 truncate text-xs font-bold opacity-95">{c.title}</span>
      <span className="font-fun text-2xl font-extrabold leading-tight drop-shadow-sm">{label.big}</span>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <span className="mt-1 text-[10px] font-semibold opacity-90">
        {tp !== null
          ? `✅ ${c.tasks.filter((t) => t.done).length}/${c.tasks.length} mục tiêu`
          : label.small}
      </span>
    </button>
  );
}

/** Dải đếm ngược phía trên lịch */
export function CountdownStrip() {
  const items = useCountdownStore((s) => s.items);
  const collapsed = useCountdownStore((s) => s.collapsed);
  const setCollapsed = useCountdownStore((s) => s.setCollapsed);
  const open = useCountdownStore((s) => s.open);
  const sorted = sortCountdowns(items);
  const next = sorted.find((c) => daysLeft(c) >= 0);

  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={() => open('new')}
        className="clay-sm mx-2 flex items-center gap-2 rounded-full px-4 py-2 text-left text-xs font-bold text-muted-foreground transition hover:text-primary lg:mx-0"
      >
        <span className="text-lg">⏳</span>
        <span className="min-w-0 flex-1 truncate">Đếm ngược ngày thi, chuyến đi, mục tiêu…</span>
        <span className="candy-btn rounded-full px-2.5 py-1 text-[11px]">+ Thêm</span>
      </button>
    );
  }

  return (
    <section className="mx-2 lg:mx-0" aria-label="Đếm ngược">
      <div className="mb-1 flex items-center gap-2 px-1">
        <h2 className="font-fun text-sm font-extrabold">⏳ Đếm ngược</h2>
        {collapsed && next && (
          <span className="min-w-0 truncate text-xs font-bold text-primary">
            {next.emoji} {next.title} · {countdownLabel(daysLeft(next)).big}
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label={collapsed ? 'Mở rộng đếm ngược' : 'Thu gọn đếm ngược'}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      {!collapsed && (
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none]">
          {sorted.map((c) => (
            <CountdownCard key={c.id} c={c} />
          ))}
          <button
            type="button"
            onClick={() => open('new')}
            className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-primary/40 text-xs font-bold text-primary transition hover:bg-primary/5"
          >
            <Plus className="h-5 w-5" /> Thêm
          </button>
        </div>
      )}
    </section>
  );
}
