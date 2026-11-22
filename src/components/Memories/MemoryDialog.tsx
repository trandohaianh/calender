import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMemoryStore } from '@/store/memoryStore';
import { useCalendarStore } from '@/store/calendarStore';
import { formatVi } from '@/lib/i18n';
import { MemoryPanel } from './MemoryPanel';
import { keepDialogOpenForLightbox } from './PhotoThumb';

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Hộp thoại xem / sửa một kỷ niệm (mở từ màn Kỷ niệm, thanh bên, ô lịch) */
export function MemoryDialog() {
  const target = useMemoryStore((s) => s.dialogTarget);
  const close = useMemoryStore((s) => s.closeDialog);
  const memory = useMemoryStore((s) => (target ? s.memories[target.id] : undefined));
  const upsert = useMemoryStore((s) => s.upsert);
  const remove = useMemoryStore((s) => s.remove);
  const events = useCalendarStore((s) => s.events);
  const openEventModal = useCalendarStore((s) => s.openEventModal);

  const [title, setTitle] = useState('');
  useEffect(() => {
    setTitle(memory?.title ?? target?.title ?? '');
  }, [target?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;
  const date = parseDate(target.date);
  const linkedEvent = target.eventId ? events.find((e) => e.id === target.eventId) : undefined;
  const isStandalone = !target.eventId;

  const saveTitle = () => {
    const t = title.trim() || 'Kỷ niệm';
    if (t !== (memory?.title ?? target.title)) void upsert({ ...target, title: t }, { title: t });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && (saveTitle(), close())}>
      <DialogContent
        className="max-w-lg"
        aria-describedby={undefined}
        onPointerDownOutside={keepDialogOpenForLightbox}
        onInteractOutside={keepDialogOpenForLightbox}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: target.color }} />
            {isStandalone ? 'Kỷ niệm' : target.title}
          </DialogTitle>
          <p className="text-xs capitalize text-muted-foreground">
            {formatVi(date, 'EEEE, d MMMM yyyy')}
          </p>
        </DialogHeader>

        {isStandalone && (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            placeholder="Tên kỷ niệm (vd: Chuyến đi Đà Lạt)"
            aria-label="Tên kỷ niệm"
          />
        )}

        <MemoryPanel target={{ ...target, title: isStandalone ? title.trim() || 'Kỷ niệm' : target.title }} />

        <div className="flex items-center justify-between gap-2 pt-1">
          {memory ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (!window.confirm('Xoá toàn bộ kỷ niệm này (cả ảnh)? Không thể hoàn tác.')) return;
                void remove(target.id);
                close();
              }}
            >
              <Trash2 className="h-4 w-4" /> Xoá kỷ niệm
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {linkedEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  close();
                  openEventModal(linkedEvent.id, date);
                }}
              >
                Mở sự kiện
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                saveTitle();
                close();
              }}
            >
              Xong
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
