import { useMemo, useState, useEffect, useRef } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { formatVi } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, Moon, Sun, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarStore } from '@/store/calendarStore';
import { useDebounce } from '@/hooks/useDebounce';
import type { ViewMode } from '@/types';
import { cn } from '@/lib/utils';
import { getEventDateRange, formatDateInput } from '@/lib/eventAdapters';
import { WEEK_STARTS_ON } from '@/components/CalendarGrid/constants';
import { SidebarMenuButton } from '@/components/Sidebar';
import { WeatherPill } from '@/components/WeatherAi/WeatherPill';
import { UserProfileDropdown } from '@/components/Auth/UserProfileDropdown';

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'year', label: 'Năm' },
  { id: 'month', label: 'Tháng' },
  { id: 'week', label: 'Tuần' },
  { id: 'day', label: 'Ngày' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'memories', label: '📸 Kỷ niệm' },
  { id: 'friends', label: '💞 Bạn thân' },
];

export function Header() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const currentView = useCalendarStore((s) => s.currentView);
  const events = useCalendarStore((s) => s.events);
  const isDarkMode = useCalendarStore((s) => s.isDarkMode);
  const setCurrentView = useCalendarStore((s) => s.setCurrentView);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const navigate = useCalendarStore((s) => s.navigate);
  const goToday = useCalendarStore((s) => s.goToday);
  const toggleDarkMode = useCalendarStore((s) => s.toggleDarkMode);
  const openEventModal = useCalendarStore((s) => s.openEventModal);

  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchInput, 300);

  const periodTitle = useMemo(() => {
    if (currentView === 'year') {
      return `Năm ${currentDate.getFullYear()}`;
    }
    if (currentView === 'memories') {
      return 'Kỷ niệm';
    }
    if (currentView === 'friends') {
      return 'Bạn thân';
    }
    if (currentView === 'month') {
      return formatVi(currentDate, 'MMMM yyyy');
    }
    if (currentView === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      const we = endOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      return `${formatVi(ws, 'd')} – ${formatVi(we, 'd MMMM yyyy')}`;
    }
    if (currentView === 'day') {
      return formatVi(currentDate, 'EEEE, d MMMM yyyy');
    }
    return 'Sự kiện sắp tới';
  }, [currentDate, currentView]);

  /** Tiêu đề gọn cho thanh điện thoại (không bị cắt chữ) */
  const shortTitle = useMemo(() => {
    if (currentView === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      const we = endOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
      return ws.getMonth() === we.getMonth()
        ? `${formatVi(ws, 'd')}–${formatVi(we, 'd/M')}`
        : `${formatVi(ws, 'd/M')}–${formatVi(we, 'd/M')}`;
    }
    if (currentView === 'day') {
      const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][currentDate.getDay()];
      return `${wd} ${formatVi(currentDate, 'd/M')}`;
    }
    if (currentView === 'year') return String(currentDate.getFullYear());
    if (currentView === 'month') return formatVi(currentDate, "'T'M/yyyy");
    if (currentView === 'agenda') return 'Sắp tới';
    return periodTitle;
  }, [currentDate, currentView, periodTitle]);

  const handleViewChange = (view: ViewMode) => setCurrentView(view);

  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const q = debouncedSearch.toLowerCase();
    return events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 8);
  }, [debouncedSearch, events]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setSearchOpen(!!debouncedSearch.trim() && searchResults.length > 0);
  }, [debouncedSearch, searchResults.length]);

  return (
    <header
      className="glass relative z-30 mx-2 mt-2 flex shrink-0 flex-col rounded-3xl md:h-16 lg:mx-0 lg:mt-0"
      role="banner"
      aria-label="Thanh điều hướng lịch"
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:h-auto md:flex-1 lg:px-5">
        <SidebarMenuButton />

        {/* Search */}
        <div ref={searchRef} className="relative min-w-[72px] flex-1 max-w-sm md:max-w-md xl:min-w-[160px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="clay-sm h-9 rounded-full border-0 pl-9 text-xs sm:text-sm sm:h-10 transition-all focus:ring-2 focus:ring-pink-300"
            placeholder="Tìm sự kiện..."
            aria-label="Tìm kiếm sự kiện"
            aria-expanded={searchOpen}
            aria-controls="search-results"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value.trim()) {
                void import('@/firebase/analytics').then((m) => m.AnalyticsEvents.searchUsed());
              }
            }}
            onFocus={() => debouncedSearch && setSearchOpen(true)}
          />
          {searchOpen && searchResults.length > 0 && (
            <div
              id="search-results"
              role="listbox"
              className="clay absolute left-0 top-full z-50 mt-2 w-[min(24rem,90vw)] overflow-hidden rounded-2xl animate-pop-in"
            >
              {searchResults.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    setCurrentDate(getEventDateRange(ev).start);
                    setSearchInput('');
                    setSearchOpen(false);
                    openEventModal(ev.id);
                  }}
                >
                  <div className="truncate font-medium">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateInput(getEventDateRange(ev).start)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav + title — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="outline" size="sm" onClick={goToday} aria-label="Đi tới hôm nay">
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(-1)}
            aria-label="Kỳ trước"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(1)}
            aria-label="Kỳ sau"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <span
            className="candy-text min-w-[120px] text-center font-fun text-base font-extrabold capitalize xl:min-w-[180px]"
            aria-live="polite"
          >
            {periodTitle}
          </span>
        </div>

        {/* View switcher */}
        <select
          className="clay-sm hidden shrink-0 rounded-full border-0 px-3 py-1.5 text-xs font-bold md:block 2xl:hidden"
          value={currentView}
          onChange={(e) => handleViewChange(e.target.value as ViewMode)}
          aria-label="Chế độ xem lịch"
        >
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <div
          className="clay-sm hidden shrink-0 gap-0.5 overflow-hidden rounded-full p-1 2xl:flex"
          role="tablist"
          aria-label="Chế độ xem lịch"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={currentView === v.id}
              onClick={() => handleViewChange(v.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-all',
                currentView === v.id
                  ? 'candy-btn !shadow-[0_3px_0_rgb(190_24_120)]'
                  : 'text-muted-foreground hover:bg-pink-100 hover:text-foreground dark:hover:bg-pink-500/20'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Right Section: Weather Pill + Dark Mode + User Profile */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Weather & AI Outing Pill */}
          <WeatherPill />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => {
              toggleDarkMode();
              void import('@/firebase/analytics').then((m) =>
                m.AnalyticsEvents.darkModeToggled(!isDarkMode)
              );
            }}
            aria-label={isDarkMode ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" aria-hidden />
            )}
          </Button>

          {/* User Profile & Account Dropdown */}
          <UserProfileDropdown />
        </div>
      </div>

      {/* Mobile: period + nav row */}
      <div className="flex items-center justify-between gap-2 border-t border-white/50 px-3 py-1.5 md:hidden dark:border-white/5">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold" onClick={goToday}>
            Hôm nay
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="candy-text min-w-0 truncate font-fun text-base font-extrabold" title={periodTitle}>
          {shortTitle}
        </span>
        <select
          className="clay-sm w-[6.75rem] shrink-0 rounded-full border-0 px-2 py-1.5 text-xs font-bold"
          value={currentView}
          onChange={(e) => handleViewChange(e.target.value as ViewMode)}
          aria-label="Chế độ xem lịch"
        >
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
