import { lazy, Suspense, useRef, useCallback } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useEvents } from '@/hooks/useEvents';
import { formatDateInput } from '@/lib/eventAdapters';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CalendarViewSkeleton } from './CalendarViewSkeleton';
import { useCalendarKeyboard } from '@/hooks/useCalendarKeyboard';

const MonthView = lazy(() =>
  import('./MonthView').then((m) => ({ default: m.MonthView }))
);
const WeekView = lazy(() =>
  import('./WeekView').then((m) => ({ default: m.WeekView }))
);
const DayView = lazy(() =>
  import('./DayView').then((m) => ({ default: m.DayView }))
);
const YearView = lazy(() =>
  import('./YearView').then((m) => ({ default: m.YearView }))
);
const MemoriesView = lazy(() =>
  import('@/components/Memories/MemoriesView').then((m) => ({ default: m.MemoriesView }))
);
const AgendaView = lazy(() =>
  import('@/components/AgendaView').then((m) => ({ default: m.AgendaView }))
);

export function CalendarGrid() {
  const calendarRef = useRef<HTMLElement>(null);
  const currentView = useCalendarStore((s) => s.currentView);
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const { editEvent, getEventById } = useEvents();

  useCalendarKeyboard(calendarRef);

  const handleEventMove = useCallback(
    async (eventId: string, newDate: Date) => {
      const ev = getEventById(eventId);
      if (!ev) return;
      const dateStr = formatDateInput(newDate);
      await editEvent(eventId, {
        startDate: dateStr,
        endDate: dateStr,
      });
    },
    [editEvent, getEventById]
  );

  const handleDayClick = useCallback(
    (date: Date) => openEventModal(null, date),
    [openEventModal]
  );

  const handleSlotClick = useCallback(
    (date: Date, hour: number) => {
      const d = new Date(date);
      d.setHours(hour, 0, 0, 0);
      openEventModal(null, d);
    },
    [openEventModal]
  );

  const onEventClick = useCallback(
    (id: string, occurrenceStart?: Date) => openEventModal(id, occurrenceStart ?? null),
    [openEventModal]
  );

  const viewLabel =
    currentView === 'memories'
      ? 'Kỷ niệm'
      : currentView === 'year'
      ? 'Năm'
      : currentView === 'month'
      ? 'Tháng'
      : currentView === 'week'
        ? 'Tuần'
        : currentView === 'day'
          ? 'Ngày'
          : 'Agenda';

  return (
    <section
      ref={calendarRef}
      className="h-full outline-none"
      tabIndex={-1}
      aria-label={`Lịch — chế độ ${viewLabel}. Phím mũi tên điều hướng, T = hôm nay, Esc đóng hộp thoại.`}
    >
      <ErrorBoundary section="Lịch">
        <Suspense fallback={<CalendarViewSkeleton />}>
          {currentView === 'year' && <YearView />}
          {currentView === 'memories' && <MemoriesView />}
          {currentView === 'agenda' && <AgendaView />}
          {currentView === 'week' && (
            <WeekView onEventClick={onEventClick} onSlotClick={handleSlotClick} />
          )}
          {currentView === 'day' && (
            <DayView onEventClick={onEventClick} onSlotClick={handleSlotClick} />
          )}
          {currentView === 'month' && (
            <MonthView
              onEventClick={onEventClick}
              onDayClick={handleDayClick}
              onEventMove={handleEventMove}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
