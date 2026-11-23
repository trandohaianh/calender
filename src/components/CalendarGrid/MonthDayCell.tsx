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
            'clay-sm group relative flex min-h-[96px] flex-col overflow-hidden rounded-2xl p-1.5 max-sm:rounded-xl max-sm:p-1',
            'cursor-pointer transition-all duration-200',
            'hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !inMonth && 'opacity-55 saturate-50',
            today && 'ring-2 ring-pink-400 bg-gradient-to-br from-pink-50 to-violet-50 dark:from-pink-500/15 dark:to-violet-500/15',
            snapshot.isDraggingOver && 'ring-2 ring-violet-400 bg-violet-50 dark:bg-violet-500/15'
          )}
        >
          <div className="mb-1 flex items-start justify-between max-sm:flex-col max-sm:items-center max-sm:gap-0.5">
            <span
              className={cn(
                'inline-flex h-7 w-7 max-sm:h-6 max-sm:w-6 max-sm:text-xs shrink-0 items-center justify-center rounded-xl font-fun text-sm font-bold transition-all',
                today
                  ? 'candy-btn animate-pop-in !shadow-[0_3px_0_rgb(190_24_120)]'
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
            <div className="flex min-w-0 flex-1 items-start justify-end gap-1 overflow-hidden max-sm:w-full max-sm:justify-center">
              <LunarBadge date={day} variant="cell" className="max-sm:items-center" />
              <div className="hidden xl:block">
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
                      'truncate rounded-lg px-1.5 py-[3px] text-[0.68rem] font-bold leading-tight text-foreground max-sm:text-clip max-sm:px-1 max-sm:text-[0.62rem]',
                      'cursor-grab active:cursor-grabbing',
                      'transition-transform duration-150 hover:z-10 hover:-translate-y-px hover:scale-[1.03]',
                      snap.isDragging && 'dragging z-50 shadow-lg opacity-95',
                      isEventOngoing(occ) && 'ring-2 ring-pink-400'
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${hexToRgba(occ.color, 0.32)}, ${hexToRgba(occ.color, 0.16)})`,
                      boxShadow: `inset 0 -2px 0 ${hexToRgba(occ.color, 0.45)}, inset 0 1px 0 rgb(255 255 255 / 0.5)`,
                      ...drag.draggableProps.style,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(occ.eventId, occ.start);
                    }}
                  >
                    {!occ.allDay && (
                      <span className="font-mono opacity-80 max-sm:hidden">
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
