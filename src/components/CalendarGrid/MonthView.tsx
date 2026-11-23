import { useMemo } from 'react';
import { useAllEvents } from '@/social/socialEvents';
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

/** Mỗi thứ một màu kẹo */
const WEEKDAY_COLORS = [
  'linear-gradient(135deg,#60a5fa,#818cf8)',
  'linear-gradient(135deg,#34d399,#2dd4bf)',
  'linear-gradient(135deg,#fbbf24,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#c084fc)',
  'linear-gradient(135deg,#22d3ee,#38bdf8)',
  'linear-gradient(135deg,#f472b6,#fb7185)',
  'linear-gradient(135deg,#f43f5e,#ec4899)',
];

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
  const events = useAllEvents();
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
        <div className="grid grid-cols-7 gap-1.5 px-1.5 pt-1.5 sm:gap-2 sm:px-2 sm:pt-2" role="row">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              role="columnheader"
              className="gloss rounded-xl py-1.5 text-center font-fun text-xs font-extrabold text-white shadow-[0_3px_0_rgb(0_0_0/0.12)]"
              style={{ background: WEEKDAY_COLORS[i] }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5 overflow-y-auto p-1.5 sm:gap-2 sm:p-2"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(100px, 1fr))` }}
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
