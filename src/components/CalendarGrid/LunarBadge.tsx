import { memo } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { solarToLunar, lunarShortLabel, lunarLongLabel, canChiDay } from '@/lib/lunar';
import { getHolidays } from '@/lib/holidays';
import { cn } from '@/lib/utils';

interface Props {
  date: Date;
  variant: 'cell' | 'header' | 'day';
  className?: string;
}

/** Hiển thị ngày âm lịch + ngày lễ Việt Nam (bật/tắt trong thanh bên) */
export const LunarBadge = memo(function LunarBadge({ date, variant, className }: Props) {
  const showLunar = useCalendarStore((s) => s.showLunar);
  const showHolidays = useCalendarStore((s) => s.showHolidays);
  if (!showLunar && !showHolidays) return null;

  const lunar = solarToLunar(date);
  const holidays = showHolidays ? getHolidays(date) : [];
  const isDayOff = holidays.some((h) => h.isDayOff);
  const isSpecialLunar = lunar.day === 1 || lunar.day === 15;

  if (variant === 'day') {
    return (
      <div className={cn('space-y-1', className)}>
        {showLunar && (
          <p className="text-xs text-muted-foreground">
            Âm lịch: {lunarLongLabel(lunar)} · Ngày {canChiDay(date)}
          </p>
        )}
        {holidays.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {holidays.map((h) => (
              <span
                key={h.name}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.7rem] font-semibold',
                  h.isDayOff
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                )}
              >
                {h.name}
                {h.isDayOff && ' · nghỉ lễ'}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={cn('mt-0.5 leading-tight', className)}>
        {showLunar && (
          <div
            className={cn(
              'text-[0.6rem] text-muted-foreground',
              isSpecialLunar && 'font-semibold text-red-500'
            )}
          >
            {lunar.day}/{lunar.month}
          </div>
        )}
        {holidays[0] && (
          <div
            className={cn(
              'mx-auto max-w-full truncate px-1 text-[0.6rem] font-medium',
              isDayOff ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'
            )}
            title={holidays.map((h) => h.name).join(', ')}
          >
            {holidays[0].name}
          </div>
        )}
      </div>
    );
  }

  // cell — trên điện thoại chỉ tô màu số âm lịch thay cho tên ngày lễ
  return (
    <div className={cn('flex min-w-0 flex-col items-end leading-tight', className)}>
      {showLunar && (
        <span
          className={cn(
            'text-[0.6rem] text-muted-foreground',
            isSpecialLunar && 'font-semibold text-red-500',
            holidays[0] && (isDayOff ? 'max-sm:font-bold max-sm:text-red-500' : 'max-sm:font-semibold max-sm:text-amber-600')
          )}
          title={lunarLongLabel(lunar)}
        >
          {lunarShortLabel(lunar)}
        </span>
      )}
      {holidays[0] && (
        <span
          className={cn(
            'hidden max-w-[5.5rem] truncate text-[0.58rem] font-medium sm:block',
            isDayOff ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'
          )}
          title={holidays.map((h) => h.name).join(', ')}
        >
          {holidays[0].name}
        </span>
      )}
    </div>
  );
});
