import { isToday, startOfDay } from 'date-fns';
import type { EventOccurrence } from '@/types';
import { cn, hexToRgba } from '@/lib/utils';

interface AllDayRowProps {
  days: Date[];
  occurrences: EventOccurrence[];
  onEventClick: (eventId: string, occurrenceStart?: Date) => void;
}

export function AllDayRow({ days, occurrences, onEventClick }: AllDayRowProps) {
  const allDay = occurrences.filter((o) => o.allDay);
  if (allDay.length === 0) return null;

  return (
    <div className="flex shrink-0 border-b border-border bg-muted/30 dark:bg-muted/15">
      <div className="flex w-14 shrink-0 items-center justify-end pr-2 text-[0.65rem] text-muted-foreground">
        Cả ngày
      </div>
      <div className="flex flex-1">
        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayEvents = allDay.filter(
            (o) => dayStart >= startOfDay(o.start) && dayStart <= startOfDay(o.end)
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex min-h-[28px] flex-1 flex-col gap-0.5 border-l border-border p-0.5',
                isToday(day) && 'bg-primary/5'
              )}
            >
              {dayEvents.map((occ) => (
                <button
                  key={`${occ.eventId}-${occ.start.getTime()}`}
                  type="button"
                  className="truncate rounded px-1.5 py-0.5 text-left text-[0.65rem] font-medium transition-shadow hover:shadow-sm"
                  style={{
                    background: hexToRgba(occ.color, 0.25),
                    color: occ.color,
                  }}
                  onClick={() => onEventClick(occ.eventId, occ.start)}
                >
                  {occ.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
