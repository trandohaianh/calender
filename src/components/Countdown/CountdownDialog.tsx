import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toastError, toastSuccess } from '@/store/toastStore';
import { cn } from '@/lib/utils';
import {
  COUNTDOWN_EMOJIS,
  COUNTDOWN_PRESETS,
  COUNTDOWN_THEMES,
  MAX_COUNTDOWNS,
  MAX_TASKS,
  countdownTheme,
  daysLeft,
  newId,
  toKey,
  useCountdownStore,
  type Countdown,
} from '@/store/countdownStore';
import { countdownLabel } from './CountdownStrip';

function blank(): Countdown {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return { id: newId(), title: '', emoji: '📚', date: toKey(d), theme: 'candy', createdOn: toKey(new Date()), tasks: [] };
}

export function CountdownDialog() {
  const editing = useCountdownStore((s) => s.editing);
  const items = useCountdownStore((s) => s.items);
  const save = useCountdownStore((s) => s.save);
  const remove = useCountdownStore((s) => s.remove);
  const close = useCountdownStore((s) => s.close);

  const existing = editing && editing !== 'new' ? items.find((x) => x.id === editing) : undefined;
  const [draft, setDraft] = useState<Countdown>(blank);
  const [taskText, setTaskText] = useState('');

  useEffect(() => {
    if (!editing) return;
    setDraft(existing ? { ...existing, tasks: [...existing.tasks] } : blank());
    setTaskText('');
    // chỉ nạp lại khi mở hộp khác
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) return null;
  const isNew = !existing;
  const set = (p: Partial<Countdown>) => setDraft((d) => ({ ...d, ...p }));
  const theme = countdownTheme(draft.theme);
  const n = daysLeft(draft);
  const label = countdownLabel(n);

  const addTask = () => {
    const text = taskText.trim().slice(0, 60);
    if (!text) return;
    if (draft.tasks.length >= MAX_TASKS) return toastError(`Tối đa ${MAX_TASKS} mục tiêu nhỏ`);
    set({ tasks: [...draft.tasks, { id: newId(), text, done: false }] });
    setTaskText('');
  };

  const onSave = () => {
    const title = draft.title.trim().slice(0, 50);
    if (!title) return toastError('Đặt tên cho đếm ngược nhé', 'Ví dụ: Thi cuối kỳ Toán');
    if (!draft.date) return toastError('Chọn ngày đích');
    if (isNew && items.length >= MAX_COUNTDOWNS) return toastError(`Tối đa ${MAX_COUNTDOWNS} đếm ngược`);
    // ngày tạo không được sau ngày đích (để thanh tiến độ đúng)
    const createdOn = draft.createdOn > draft.date ? draft.date : draft.createdOn;
    save({ ...draft, title, createdOn });
    toastSuccess(isNew ? `Đã thêm "${title}" ⏳` : 'Đã lưu');
    close();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md gap-3 p-0 sm:p-0" aria-describedby={undefined}>
        {/* Xem trước */}
        <div className="gloss relative p-5 text-white" style={{ background: theme.bg }}>
          <DialogTitle className="sr-only">{isNew ? 'Thêm đếm ngược' : 'Sửa đếm ngược'}</DialogTitle>
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 z-10 rounded-full bg-white/25 p-1.5 hover:bg-white/40"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-4xl drop-shadow">{draft.emoji}</span>
          <p className="mt-1 truncate text-sm font-bold opacity-95">{draft.title || 'Tên mục tiêu…'}</p>
          <p className="font-fun text-4xl font-extrabold leading-tight drop-shadow-sm">{label.big}</p>
          <p className="text-xs font-semibold opacity-90">{label.small}</p>
        </div>

        <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
          {isNew && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {COUNTDOWN_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => set({ title: p.title, emoji: p.emoji, theme: p.theme })}
                  className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold transition hover:bg-primary/15 active:scale-95"
                >
                  {p.emoji} {p.title}
                </button>
              ))}
            </div>
          )}

          <Input
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Đếm ngược tới… (vd: Thi cuối kỳ Toán)"
            maxLength={50}
            aria-label="Tên đếm ngược"
          />

          <label className="flex items-center gap-2 text-sm font-bold">
            📅 Ngày đích
            <input
              type="date"
              value={draft.date}
              onChange={(e) => e.target.value && set({ date: e.target.value })}
              className="ml-auto rounded-xl border bg-background px-3 py-1.5 text-sm"
              aria-label="Ngày đích"
            />
          </label>

          <div className="flex flex-wrap gap-1">
            {COUNTDOWN_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set({ emoji: e })}
                aria-label={`Biểu tượng ${e}`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:scale-110',
                  draft.emoji === e ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-muted'
                )}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {COUNTDOWN_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ theme: t.id })}
                aria-label={`Màu ${t.id}`}
                className={cn(
                  'h-8 flex-1 rounded-full shadow transition hover:scale-105',
                  draft.theme === t.id && 'ring-4 ring-primary/40 ring-offset-2 ring-offset-background'
                )}
                style={{ background: t.bg }}
              />
            ))}
          </div>

          {/* Mục tiêu nhỏ */}
          <div className="clay-sm rounded-2xl p-3">
            <p className="mb-2 text-sm font-extrabold">
              🎯 Mục tiêu nhỏ{' '}
              <span className="text-xs font-semibold text-muted-foreground">
                {draft.tasks.length
                  ? `${draft.tasks.filter((t) => t.done).length}/${draft.tasks.length} xong`
                  : '(không bắt buộc)'}
              </span>
            </p>
            <ul className="space-y-1">
              {draft.tasks.map((t) => (
                <li key={t.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.done}
                    onClick={() =>
                      set({ tasks: draft.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })
                    }
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] transition',
                      t.done ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'
                    )}
                  >
                    {t.done && '✓'}
                  </button>
                  <span className={cn('min-w-0 flex-1 truncate text-sm', t.done && 'text-muted-foreground line-through')}>
                    {t.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => set({ tasks: draft.tasks.filter((x) => x.id !== t.id) })}
                    className="rounded p-0.5 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
                    aria-label={`Xoá ${t.text}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1.5">
              <Input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTask();
                  }
                }}
                placeholder="vd: Ôn xong chương 1"
                className="h-8 text-sm"
                aria-label="Thêm mục tiêu nhỏ"
              />
              <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addTask}>
                Thêm
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!isNew && (
              <Button
                type="button"
                variant="ghost"
                className="gap-1 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (!window.confirm(`Xoá đếm ngược "${existing.title}"?`)) return;
                  remove(existing.id);
                  close();
                }}
              >
                <Trash2 className="h-4 w-4" /> Xoá
              </Button>
            )}
            <Button type="button" className="ml-auto px-6" onClick={onSave}>
              {isNew ? 'Bắt đầu đếm ⏳' : 'Lưu'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
