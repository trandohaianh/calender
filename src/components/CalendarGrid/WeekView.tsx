import { useEffect, useRef } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { useCalendarStore } from '@/store/calendarStore';
import { getOccurrencesInRange, isEventOngoing } from '@/lib/eventUtils';
import { layoutDayEvents } from '@/lib/timelineLayout';
import { cn, hexToRgba } from '@/lib/utils';
import { HOUR_HEIGHT, HOURS, WEEK_STARTS_ON } from './constants';
import { AllDayRow } from './AllDayRow';
import { DayWeatherBadge } from '@/components/WeatherAi/DayWeatherBadge';
import { LunarBadge } from './LunarBadge';

interface WeekViewProps {
  onEventClick: (eventId: string, occurrenceStart?: Date) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export function WeekView({ onEventClick, onSlotClick }: WeekViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const events = useCalendarStore((s) => s.events);
  const calendars = useCalendarStore((s) => s.calendars);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeStart = startOfDay(days[0]);
  const rangeEnd = endOfDay(days[6]);
  const occs = getOccurrencesInRange(events, calendars, rangeStart, rangeEnd);

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const todayIndex = days.findIndex((d) => isToday(d));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (now.getHours() - 2) * HOUR_HEIGHT);
  }, [currentDate]);

  return (
    <div className="flex h-full flex-col overflow-hidden animate-fade-in">
      {/* Header 7 cột */}
      <div className="flex shrink-0 border-b border-border bg-muted/40 dark:bg-muted/20">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'flex-1 border-l border-border py-2 text-center',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div className="text-[0.65rem] font-semibold uppercase text-muted-foreground">
              {format(day, 'EEE', { locale: vi })}
            </div>
            <div
              className={cn(
                'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full font-mono text-base font-semibold',
                isToday(day) && 'bg-primary text-primary-foreground ring-2 ring-primary/30'
              )}
            >
              {format(day, 'd')}
            </div>
            <LunarBadge date={day} variant="header" />
            <div className="mt-0.5 flex justify-center">
              <DayWeatherBadge date={day} compact />
            </div>
          </div>
        ))}
      </div>

      <AllDayRow days={days} occurrences={occs} onEventClick={onEventClick} />

      {/* Timeline body */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-14 shrink-0 bg-background">
          {HOURS.map((h) => (
            <div
              key={h}
              className="relative border-t border-border/40 text-right pr-2 font-mono text-[0.65rem] text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 right-2 bg-background px-0.5">
                {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex flex-1">
          {days.map((day, dayIdx) => {
            const timed = occs.filter((o) => !o.allDay && isSameDay(o.start, day));
            const layouted = layoutDayEvents(timed, HOUR_HEIGHT);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative flex-1 border-l border-border',
                  isToday(day) && 'bg-primary/[0.03]'
                )}
                style={{ minHeight: HOUR_HEIGHT * 24 }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/30 transition-colors hover:bg-accent/30 dark:hover:bg-accent/15"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}

                {layouted.map(({ occ, top, height, leftPct, widthPct }) => (
                  <button
                    key={`${occ.eventId}-${occ.start.getTime()}`}
                    type="button"
                    className={cn(
                      'absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 text-left text-xs',
                      'transition-shadow hover:z-20 hover:shadow-md',
                      isEventOngoing(occ) && 'ring-2 ring-primary/60'
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: hexToRgba(occ.color, 0.28),
                      borderLeftColor: occ.color,
                    }}
                    onClick={() => onEventClick(occ.eventId, occ.start)}
                  >
                    <div className="truncate font-semibold">{occ.title}</div>
                    <div className="truncate font-mono text-[0.6rem] opacity-80">
                      {format(occ.start, 'HH:mm')} – {format(occ.end, 'HH:mm')}
                    </div>
                  </button>
                ))}

                {dayIdx === todayIndex && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30 h-0.5 bg-red-500 shadow-sm"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
