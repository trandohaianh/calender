import { useEffect, useRef } from 'react';
import { useAllEvents } from '@/social/socialEvents';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MapPin } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';
import { getOccurrencesInRange, isEventOngoing } from '@/lib/eventUtils';
import { layoutDayEvents } from '@/lib/timelineLayout';
import { cn, hexToRgba } from '@/lib/utils';
import { HOUR_HEIGHT, HOURS } from './constants';
import { AllDayRow } from './AllDayRow';
import { DayWeatherBadge } from '@/components/WeatherAi/DayWeatherBadge';
import { LunarBadge } from './LunarBadge';

interface DayViewProps {
  onEventClick: (eventId: string, occurrenceStart?: Date) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export function DayView({ onEventClick, onSlotClick }: DayViewProps) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const events = useAllEvents();
  const calendars = useCalendarStore((s) => s.calendars);
  const scrollRef = useRef<HTMLDivElement>(null);

  const day = startOfDay(currentDate);
  const days = [day];
  const occs = getOccurrencesInRange(events, calendars, day, endOfDay(day));
  const timed = occs.filter((o) => !o.allDay);
  const layouted = layoutDayEvents(timed, HOUR_HEIGHT);

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const showNow = isToday(day);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (now.getHours() - 2) * HOUR_HEIGHT);
  }, [currentDate]);

  return (
    <div className="flex h-full flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3 dark:bg-muted/20">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {format(day, 'EEEE', { locale: vi })}
          </p>
          <p
            className={cn(
              'font-mono text-3xl font-bold',
              showNow && 'text-primary'
            )}
          >
            {format(day, 'd MMMM yyyy', { locale: vi })}
          </p>
          <LunarBadge date={day} variant="day" className="mt-1" />
        </div>
        <DayWeatherBadge date={day} />
      </div>

      <AllDayRow days={days} occurrences={occs} onEventClick={onEventClick} />

      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        <div className="w-16 shrink-0">
          {HOURS.map((h) => (
            <div
              key={h}
              className="relative text-right pr-3 font-mono text-xs text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2.5 right-2">
                {`${String(h).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        <div
          className={cn(
            'relative flex-1 border-l border-border',
            showNow && 'bg-primary/[0.03]'
          )}
          style={{ minHeight: HOUR_HEIGHT * 24 }}
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/30 transition-colors hover:bg-accent/30"
              style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              onClick={() => onSlotClick(day, h)}
            />
          ))}

          {layouted.map(({ occ, top, height, leftPct, widthPct }) => (
            <button
              key={`${occ.eventId}-${occ.start.getTime()}`}
              type="button"
              className={cn(
                'absolute z-10 overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left',
                'transition-all hover:z-20 hover:shadow-lg',
                isEventOngoing(occ) && 'ring-2 ring-primary'
              )}
              style={{
                top,
                height: Math.max(height, 48),
                left: `calc(${leftPct}% + 8px)`,
                width: `calc(${widthPct}% - 16px)`,
                background: hexToRgba(occ.color, 0.2),
                borderLeftColor: occ.color,
              }}
              onClick={() => onEventClick(occ.eventId, occ.start)}
            >
              <div className="truncate text-sm font-semibold">{occ.title}</div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                {format(occ.start, 'HH:mm')} – {format(occ.end, 'HH:mm')}
              </div>
              {occ.location && (
                <div className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {occ.location}
                </div>
              )}
              {occ.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">
                  {occ.description}
                </p>
              )}
            </button>
          ))}

          {showNow && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 h-0.5 bg-red-500"
              style={{ top: nowTop }}
            >
              <span className="absolute -left-2 -top-2 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-background" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
