import { memo, useMemo } from 'react';
import { useAllEvents } from '@/social/socialEvents';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { useCalendarStore } from '@/store/calendarStore';
import { getOccurrencesInRange } from '@/lib/eventUtils';
import { getHolidays } from '@/lib/holidays';
import { solarToLunar, canChiYear } from '@/lib/lunar';
import { formatVi } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { WEEK_STARTS_ON, WEEKDAY_LABELS } from './constants';

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface MiniMonthProps {
  month: Date;
  counts: Map<string, number>;
  selected: Date;
  showHolidays: boolean;
  onDay: (d: Date) => void;
  onMonth: (d: Date) => void;
}

const MiniMonth = memo(function MiniMonth({
  month,
  counts,
  selected,
  showHolidays,
  onDay,
  onMonth,
}: MiniMonthProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
    const n = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return Array.from({ length: n }, (_, i) => addDays(start, i));
  }, [month]);

  const monthTotal = days
    .filter((d) => isSameMonth(d, month))
    .reduce((sum, d) => sum + (counts.get(dayKey(d)) ?? 0), 0);

  return (
    <div className="clay tilt rounded-3xl p-3">
      <button
        type="button"
        onClick={() => onMonth(month)}
        className="mb-2 flex w-full items-baseline justify-between text-left hover:text-primary"
      >
        <span className="text-sm font-bold capitalize">{formatVi(month, 'MMMM')}</span>
        {monthTotal > 0 && (
          <span className="text-[0.65rem] text-muted-foreground">{monthTotal} sự kiện</span>
        )}
      </button>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.6rem] font-semibold text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          if (!inMonth) return <div key={d.toISOString()} className="aspect-square" />;
          const count = counts.get(dayKey(d)) ?? 0;
          const holiday = showHolidays ? getHolidays(d) : [];
          const dayOff = holiday.some((h) => h.isDayOff);
          const lunar = solarToLunar(d);
          const title = [
            format(d, 'dd/MM/yyyy'),
            `Âm: ${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''}`,
            ...holiday.map((h) => h.name),
            count ? `${count} sự kiện` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <button
              key={d.toISOString()}
              type="button"
              title={title}
              onClick={() => onDay(d)}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-md text-[0.7rem] transition-colors hover:bg-muted',
                count === 1 && 'bg-primary/10',
                count === 2 && 'bg-primary/20',
                count >= 3 && 'bg-primary/35',
                dayOff && 'font-bold text-red-500',
                !dayOff && holiday.length > 0 && 'text-amber-600 dark:text-amber-400',
                isSameDay(d, selected) && !isToday(d) && 'ring-1 ring-primary',
                isToday(d) && 'bg-primary font-bold text-primary-foreground hover:bg-primary/90'
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export function YearView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const events = useAllEvents();
  const calendars = useCalendarStore((s) => s.calendars);
  const showHolidays = useCalendarStore((s) => s.showHolidays);
  const showLunar = useCalendarStore((s) => s.showLunar);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const setCurrentView = useCalendarStore((s) => s.setCurrentView);

  const year = currentDate.getFullYear();

  const counts = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(start);
    const map = new Map<string, number>();
    for (const occ of getOccurrencesInRange(events, calendars, start, end)) {
      // Sự kiện nhiều ngày: tính cho từng ngày nó phủ (tối đa 62 ngày)
      let d = new Date(Math.max(occ.start.getTime(), start.getTime()));
      d.setHours(0, 0, 0, 0);
      for (let i = 0; i < 62 && (i === 0 || d < occ.end) && d <= end; i++) {
        const k = dayKey(d);
        map.set(k, (map.get(k) ?? 0) + 1);
        d = addDays(d, 1);
      }
    }
    return map;
  }, [events, calendars, year]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  const totalEvents = useMemo(
    () => Array.from(counts.values()).reduce((a, b) => a + b, 0),
    [counts]
  );

  const onDay = (d: Date) => {
    setCurrentDate(d);
    setCurrentView('day');
  };
  const onMonth = (d: Date) => {
    setCurrentDate(d);
    setCurrentView('month');
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 animate-fade-in" aria-label={`Lịch năm ${year}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold">{year}</h2>
        {showLunar && (
          <span className="text-sm text-muted-foreground">Năm {canChiYear(year)} (âm lịch)</span>
        )}
        <span className="ml-auto flex items-center gap-3 text-[0.7rem] text-muted-foreground">
          <span>{totalEvents} lượt sự kiện</span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/10" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/35" />
            mật độ
          </span>
          {showHolidays && <span className="font-bold text-red-500">Ngày nghỉ lễ</span>}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {months.map((m) => (
          <MiniMonth
            key={m.getMonth()}
            month={m}
            counts={counts}
            selected={currentDate}
            showHolidays={showHolidays}
            onDay={onDay}
            onMonth={onMonth}
          />
        ))}
      </div>
    </div>
  );
}
