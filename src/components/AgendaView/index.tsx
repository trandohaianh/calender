import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAllEvents } from '@/social/socialEvents';
import { openVirtualEvent } from '@/social/openVirtualEvent';
import { addDays, startOfDay, isToday, isBefore } from 'date-fns';
import { CalendarDays, Plus } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';
import { getOccurrencesInRange } from '@/lib/eventUtils';
import { toDateKey } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VirtualAgendaList, type AgendaRow } from './VirtualAgendaList';
import { AgendaSimpleList } from './AgendaSimpleList';

const INITIAL_DAYS = 30;
const LOAD_MORE_DAYS = 30;
const VIRTUALIZE_THRESHOLD = 40;

export function AgendaView() {
  const events = useAllEvents();
  const calendars = useCalendarStore((s) => s.calendars);
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);

  const [daysAhead, setDaysAhead] = useState(INITIAL_DAYS);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());
  const rangeEnd = addDays(today, daysAhead);

  const occs = useMemo(
    () =>
      getOccurrencesInRange(events, calendars, today, rangeEnd).filter(
        (o) => !isBefore(startOfDay(o.start), today)
      ),
    [events, calendars, today, rangeEnd]
  );

  const rows = useMemo(() => {
    const map: Record<string, typeof occs> = {};
    for (const occ of occs) {
      const key = toDateKey(occ.start);
      if (!map[key]) map[key] = [];
      map[key].push(occ);
    }
    const out: AgendaRow[] = [];
    for (const key of Object.keys(map).sort()) {
      const day = new Date(key + 'T12:00:00');
      out.push({ type: 'header', key: `h-${key}`, day, isToday: isToday(day) });
      for (const occ of map[key]) {
        out.push({
          type: 'event',
          key: `${occ.eventId}-${occ.start.getTime()}`,
          occ,
          day,
        });
      }
    }
    return out;
  }, [occs]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    requestAnimationFrame(() => {
      setDaysAhead((d) => d + LOAD_MORE_DAYS);
      setLoadingMore(false);
    });
  }, [loadingMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || rows.length < VIRTUALIZE_THRESHOLD) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollRef.current, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, rows.length]);

  const handleEventClick = useCallback(
    (eventId: string, day: Date) => {
      if (openVirtualEvent(eventId)) return;
      setCurrentDate(day);
      openEventModal(eventId, day);
    },
    [setCurrentDate, openEventModal]
  );

  if (rows.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in"
        role="status"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-10 w-10" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Không có sự kiện sắp tới</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Lịch trống từ hôm nay trở đi. Tạo sự kiện mới để bắt đầu lên kế hoạch.
          </p>
        </div>
        <Button onClick={() => openEventModal(null, today)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Tạo sự kiện
        </Button>
      </div>
    );
  }

  const useVirtual = rows.length >= VIRTUALIZE_THRESHOLD;

  return (
    <div
      ref={scrollRef}
      className="flex h-full flex-col animate-fade-in"
      role="feed"
      aria-label="Danh sách sự kiện sắp tới"
    >
      {useVirtual ? (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
          <VirtualAgendaList rows={rows} onEventClick={handleEventClick} />
          <div ref={sentinelRef} className="flex justify-center py-4 shrink-0">
            {loadingMore ? (
              <span className="text-sm text-muted-foreground">Đang tải thêm...</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={loadMore}>
                Tải thêm sự kiện
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <AgendaSimpleList rows={rows} onEventClick={handleEventClick} />
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore ? (
              <span className="text-sm text-muted-foreground">Đang tải thêm...</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={loadMore}>
                Tải thêm sự kiện
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
