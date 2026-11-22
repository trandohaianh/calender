import { useMemo } from 'react';
import { useWeatherStore } from '@/store/weatherStore';
import { toDateKey } from '@/lib/utils';

interface DayWeatherBadgeProps {
  date: Date;
  compact?: boolean;
}

export function DayWeatherBadge({ date, compact = false }: DayWeatherBadgeProps) {
  const weatherReport = useWeatherStore((s) => s.weatherReport);
  const openModal = useWeatherStore((s) => s.openModal);

  const forecast = useMemo(() => {
    if (!weatherReport?.daily) return null;
    const targetStr = toDateKey(date);
    return weatherReport.daily.find((d) => d.date === targetStr) || null;
  }, [weatherReport, date]);

  if (!forecast) {
    // If not within 7 days, don't show or show subtle icon for today
    return null;
  }

  const isRain = forecast.condition.isRain || forecast.precipitationProbMax >= 40;

  if (compact) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          openModal('overview');
        }}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold transition-transform hover:scale-110"
        title={`${forecast.condition.label} (${forecast.tempMax}°C / ${forecast.tempMin}°C - Mưa: ${forecast.precipitationProbMax}%)`}
      >
        <span>{forecast.condition.emoji}</span>
        <span className={isRain ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-muted-foreground'}>
          {forecast.tempMax}°
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openModal('overview');
      }}
      className="group flex items-center gap-1 rounded-md bg-secondary/50 px-1.5 py-0.5 text-[11px] font-medium text-foreground transition-all hover:bg-secondary hover:shadow-xs"
      title={`Dự báo: ${forecast.condition.label} • Tối đa ${forecast.tempMax}°C, tối thiểu ${forecast.tempMin}°C • Khả năng mưa ${forecast.precipitationProbMax}%`}
    >
      <span className="text-xs transition-transform group-hover:scale-125">
        {forecast.condition.emoji}
      </span>
      <span className="font-semibold">{forecast.tempMax}°C</span>
      {isRain && (
        <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold">
          {forecast.precipitationProbMax}%
        </span>
      )}
    </button>
  );
}
