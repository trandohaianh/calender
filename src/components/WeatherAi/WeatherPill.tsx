import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useWeatherStore } from '@/store/weatherStore';
import { cn } from '@/lib/utils';

export function WeatherPill() {
  const weatherReport = useWeatherStore((s) => s.weatherReport);
  const currentLocation = useWeatherStore((s) => s.currentLocation);
  const isLoading = useWeatherStore((s) => s.isLoading);
  const fetchWeather = useWeatherStore((s) => s.fetchWeather);
  const openModal = useWeatherStore((s) => s.openModal);

  useEffect(() => {
    if (!weatherReport) {
      void fetchWeather();
    }
  }, [weatherReport, fetchWeather]);

  // Open-Meteo cập nhật "current" mỗi ~15 phút — tự làm mới định kỳ để
  // tránh hiện điều kiện thời tiết cũ khi người dùng mở app cả buổi.
  useEffect(() => {
    const id = setInterval(() => void fetchWeather(), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  const hasWarning =
    weatherReport?.condition.isRain ||
    (weatherReport?.precipitationProb ?? 0) >= 40 ||
    (weatherReport?.uvIndex ?? 0) >= 7.5;

  return (
    <button
      type="button"
      onClick={() => openModal('overview')}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs transition-all duration-200 hover:scale-105 hover:shadow-md sm:px-3 sm:py-1.5',
        hasWarning
          ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 text-amber-900 dark:text-amber-200'
          : 'border-border/80 bg-secondary/70 text-foreground hover:bg-secondary'
      )}
      title="Xem Dự báo Thời tiết & AI Trợ lý Ra ngoài"
      aria-label="Thời tiết và Trợ lý AI"
    >
      {/* Icon */}
      <span className="text-sm transition-transform group-hover:scale-110">
        {weatherReport?.condition.emoji || '🌤️'}
      </span>

      {/* Temperature & Location */}
      <span className="font-bold">
        {isLoading ? '...' : `${weatherReport?.temperature ?? 28}°C`}
      </span>

      <span className="hidden max-w-[80px] truncate text-muted-foreground xl:inline">
        {currentLocation.name}
      </span>

      {/* AI Sparkle */}
      <div className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20">
        <Sparkles className="h-2.5 w-2.5 text-amber-400" />
        <span>AI</span>
      </div>

      {/* Warning indicator dot */}
      {hasWarning && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      )}
    </button>
  );
}
