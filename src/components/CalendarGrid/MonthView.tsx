import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { DragDropContext, type DropResult } from 'react-beautiful-dnd';
import { useCalendarStore } from '@/store/calendarStore';
import { WEEK_STARTS_ON, WEEKDAY_LABELS } from './constants';
import { MonthDayCell, buildMonthCells } from './MonthDayCell';

interface MonthViewProps {
  onEventClick: (eventId: string, occurrenceStart?: Date) => void;
  onDayClick: (date: Date) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
}

function parseDragId(id: string) {
  return id.split('__')[0];
}

export function MonthView({ onEventClick, onDayClick, onEventMove }: MonthViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const events = useCalendarStore((s) => s.events);
  const calendars = useCalendarStore((s) => s.calendars);

  const { cells, rowCount } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    const rowCount = Math.ceil(totalDays / 7);
    const dayCells = Array.from({ length: rowCount * 7 }, (_, i) => addDays(gridStart, i));
    return { cells: dayCells, rowCount };
  }, [currentDate]);

  const monthCellData = useMemo(
    () => buildMonthCells(cells, events, calendars, currentDate),
    [cells, events, calendars, currentDate]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onEventMove) return;
    const dayIndex = parseInt(result.destination.droppableId.replace('day-', ''), 10);
    if (isNaN(dayIndex) || !cells[dayIndex]) return;
    onEventMove(parseDragId(result.draggableId), cells[dayIndex]);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex h-full flex-col animate-fade-in"
        role="grid"
        aria-label="Lịch tháng"
      >
        <div
          className="grid grid-cols-7 border-b border-border bg-muted/40 dark:bg-muted/20"
          role="row"
        >
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className="grid flex-1 auto-rows-fr grid-cols-7 min-h-0"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(108px, 1fr))` }}
          role="rowgroup"
        >
          {monthCellData.map((cell) => (
            <MonthDayCell
              key={`day-${cell.idx}`}
              cell={cell}
              onDayClick={onDayClick}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
