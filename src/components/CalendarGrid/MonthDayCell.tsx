import { memo, useMemo } from 'react';
import { format, isSameMonth, isToday } from 'date-fns';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { getOccurrencesInRange, isEventOngoing } from '@/lib/eventUtils';
import { cn, hexToRgba } from '@/lib/utils';
import type { Calendar, CalendarEvent } from '@/types';
import { MAX_MONTH_EVENTS } from './constants';
import { startOfDay, endOfDay } from 'date-fns';
import { DayWeatherBadge } from '@/components/WeatherAi/DayWeatherBadge';
import { LunarBadge } from './LunarBadge';
import { useMemoryStore } from '@/store/memoryStore';
import { memoryIdFor } from '@/lib/memoryDb';
import { toDateKey } from '@/lib/utils';
import { isVirtualEventId } from '@/social/socialEvents';

export interface MonthCellData {
  day: Date;
  idx: number;
  inMonth: boolean;
  today: boolean;
  visible: ReturnType<typeof getOccurrencesInRange>;
  moreCount: number;
}

interface MonthDayCellProps {
  cell: MonthCellData;
  onDayClick: (date: Date) => void;
  onEventClick: (eventId: string, occurrenceStart?: Date) => void;
}

function dragId(eventId: string, startMs: number) {
  return `${eventId}__${startMs}`;
}

export const MonthDayCell = memo(function MonthDayCell({
  cell,
  onDayClick,
  onEventClick,
}: MonthDayCellProps) {
  const { day, idx, inMonth, today, visible, moreCount } = cell;
  const droppableId = `day-${idx}`;
  const memories = useMemoryStore((s) => s.memories);
  const openMemory = useMemoryStore((s) => s.openDialog);
  const dateKey = toDateKey(day);
  const dayMemories = useMemo(
    () => Object.values(memories).filter((m) => !m.eventId && m.date === dateKey),
    [memories, dateKey]
  );

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          role="gridcell"
          tabIndex={0}
          aria-label={format(day, 'd MMMM yyyy')}
          aria-selected={today}
          onClick={() => onDayClick(day)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDayClick(day);
            }
          }}
          className={cn(
            'group relative flex min-h-[108px] flex-col border-b border-r border-border p-1.5',
            'cursor-pointer transition-all duration-200',
            'hover:bg-accent/40 dark:hover:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !inMonth && 'bg-muted/25 dark:bg-muted/10',
            today && 'bg-primary/5 dark:bg-primary/10',
            snapshot.isDraggingOver &&
              'bg-primary/10 ring-2 ring-inset ring-primary/40 dark:bg-primary/15'
          )}
        >
          <div className="mb-1 flex items-start justify-between">
            <span
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                today
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background shadow-sm'
                  : 'text-foreground group-hover:bg-muted'
              )}
            >
              {format(day, 'd')}
            </span>
            {dayMemories.length > 0 && (
              <button
                type="button"
                className="ml-0.5 mr-auto rounded-full bg-pink-500/15 px-1.5 text-[0.6rem] font-semibold text-pink-600 hover:bg-pink-500/25 dark:text-pink-400"
                title={dayMemories.map((m) => m.title).join(', ')}
                onClick={(e) => {
                  e.stopPropagation();
                  const m = dayMemories[0];
                  openMemory({ id: m.id, date: m.date, title: m.title, color: m.color });
                }}
              >
                📸{dayMemories.length > 1 ? dayMemories.length : ''}
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-start justify-end gap-1 overflow-hidden">
              <LunarBadge date={day} variant="cell" />
              <div className="hidden sm:block">
                <DayWeatherBadge date={day} compact />
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
            {visible.map((occ, i) => (
              <Draggable
                key={dragId(occ.eventId, occ.start.getTime())}
                draggableId={dragId(occ.eventId, occ.start.getTime())}
                index={i}
                isDragDisabled={isVirtualEventId(occ.eventId)}
              >
                {(drag, snap) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    {...drag.dragHandleProps}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[0.65rem] leading-tight truncate',
                      'border-l-[3px] cursor-grab active:cursor-grabbing',
                      'transition-shadow duration-150 hover:shadow-md hover:z-10',
                      snap.isDragging && 'dragging z-50 shadow-lg opacity-95',
                      isEventOngoing(occ) && 'ring-1 ring-primary'
                    )}
                    style={{
                      background: hexToRgba(occ.color, 0.22),
                      borderLeftColor: occ.color,
                      color: occ.color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(occ.eventId, occ.start);
                    }}
                  >
                    {!occ.allDay && (
                      <span className="font-mono opacity-80">
                        {format(occ.start, 'HH:mm')}{' '}
                      </span>
                    )}
                    {(() => {
                      const mem = memories[memoryIdFor(occ.eventId, toDateKey(occ.start))];
                      if (!mem) return null;
                      return (
                        <span title="Có kỷ niệm">{mem.photoIds.length ? '📷 ' : '📝 '}</span>
                      );
                    })()}
                    {occ.title}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {moreCount > 0 && (
              <button
                type="button"
                className="mt-0.5 px-1.5 text-left text-[0.65rem] font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDayClick(day);
                }}
              >
                +{moreCount} sự kiện
              </button>
            )}
          </div>
        </div>
      )}
    </Droppable>
  );
});

/** Tính dữ liệu ô lưới tháng — memo hóa ở MonthView */
export function buildMonthCells(
  cells: Date[],
  events: CalendarEvent[],
  calendars: Calendar[],
  currentDate: Date
): MonthCellData[] {
  return cells.map((day, idx) => {
    const allOccs = getOccurrencesInRange(
      events,
      calendars,
      startOfDay(day),
      endOfDay(day)
    );
    const visible = allOccs.slice(0, MAX_MONTH_EVENTS);
    return {
      day,
      idx,
      inMonth: isSameMonth(day, currentDate),
      today: isToday(day),
      visible,
      moreCount: allOccs.length - MAX_MONTH_EVENTS,
    };
  });
}
