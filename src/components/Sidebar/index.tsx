import { useState } from 'react';
import { useAllEvents } from '@/social/socialEvents';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { LazyAvatar } from '@/components/LazyAvatar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Menu,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendars } from '@/hooks/useCalendars';
import { useAuthStore } from '@/store/authStore';
import { useLocalAuthStore } from '@/store/localAuthStore';
import { getOccurrencesInRange } from '@/lib/eventUtils';
import { cn } from '@/lib/utils';
import { WEEK_STARTS_ON } from '@/components/CalendarGrid/constants';
import { CalendarTools } from './CalendarTools';
import { OnThisDayCard } from '@/components/Memories/OnThisDayCard';

const CAL_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#ea4335', '#9334e6', '#e67c73', '#0b8043', '#3f51b5'];

function SidebarContent({ collapsed }: { collapsed?: boolean }) {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const events = useAllEvents();
  const calendars = useCalendarStore((s) => s.calendars);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const openEventModal = useCalendarStore((s) => s.openEventModal);
  const { toggleVisibility, addCalendar } = useCalendars();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const openAuthModal = useLocalAuthStore((s) => s.openAuthModal);

  const [miniMonth, setMiniMonth] = useState(currentDate);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CAL_COLORS[0]);
  const [showAdd, setShowAdd] = useState(false);

  const monthStart = startOfMonth(miniMonth);
  const monthEnd = endOfMonth(miniMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Khách';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Logo */}
      <div className={cn('flex shrink-0 items-center gap-2', collapsed && 'justify-center')}>
        <div className="gloss flex h-11 w-11 animate-floaty items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-fuchsia-400 to-violet-500 text-2xl shadow-[0_6px_0_rgb(162_28_175),0_12px_20px_-6px_rgb(217_70_239/0.6)]">
          🗓️
        </div>
        {!collapsed && (
          <div className="leading-none">
            <span className="candy-text font-fun text-2xl font-extrabold">MyCalendar</span>
            <span className="block text-[11px] font-semibold text-muted-foreground">lịch xinh của bạn ✨</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <Button
          className="w-full rounded-2xl font-fun text-lg"
          size="lg"
          onClick={() => openEventModal()}
        >
          <Plus className="h-5 w-5 mr-2" />
          Tạo sự kiện
        </Button>
      )}


      {collapsed ? (
        <Button
          size="icon"
          className="mx-auto h-12 w-12 rounded-full"
          onClick={() => openEventModal()}
          title="Tạo sự kiện"
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : (
        <>
          {/* Mini calendar */}
          <div className="clay rounded-3xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setMiniMonth(addMonths(miniMonth, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-fun text-sm font-extrabold capitalize text-foreground">
                {format(miniMonth, 'MMMM yyyy', { locale: vi })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setMiniMonth(addMonths(miniMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.6rem] font-bold text-muted-foreground">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const hasEv =
                  getOccurrencesInRange(events, calendars, startOfDay(day), endOfDay(day))
                    .length > 0;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setCurrentDate(day)}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition-all',
                      !isSameMonth(day, miniMonth) && 'text-muted-foreground/40',
                      isToday(day) &&
                        'candy-btn font-extrabold !shadow-[0_3px_0_rgb(190_24_120)]',
                      isSameDay(day, currentDate) &&
                        !isToday(day) &&
                        'bg-accent font-bold text-accent-foreground ring-2 ring-pink-300',
                      !isToday(day) &&
                        !isSameDay(day, currentDate) &&
                        'hover:scale-110 hover:bg-pink-100 dark:hover:bg-pink-500/20'
                    )}
                  >
                    {format(day, 'd')}
                    {hasEv && !isToday(day) && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <OnThisDayCard />

          {/* Calendars */}
          <div className="clay rounded-3xl p-3">
            <h3 className="mb-2 font-fun text-sm font-extrabold text-foreground">
              🎨 Lịch của tôi
            </h3>
            <div className="space-y-0.5">
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all hover:translate-x-0.5 hover:bg-muted/70"
                >
                  <Checkbox
                    id={`sb-${cal.id}`}
                    checked={cal.isVisible !== false}
                    onCheckedChange={(v) => toggleVisibility(cal.id, !!v)}
                  />
                  <span
                    className="gloss h-4 w-4 shrink-0 rounded-md shadow-[0_2px_0_rgb(0_0_0/0.15)]"
                    style={{ background: cal.color }}
                  />
                  <Label
                    htmlFor={`sb-${cal.id}`}
                    className="flex-1 cursor-pointer text-xs font-medium"
                  >
                    {cal.name}
                  </Label>
                </div>
              ))}
            </div>

            {showAdd ? (
              <div className="mt-2 space-y-2 rounded-xl border bg-card p-3 shadow-sm animate-in fade-in-0">
                <Input
                  placeholder="Tên lịch mới"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1.5">
                  {CAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-transform',
                        newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setShowAdd(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs font-semibold"
                    onClick={async () => {
                      if (newName.trim()) {
                        await addCalendar(newName.trim(), newColor);
                        setNewName('');
                        setShowAdd(false);
                      }
                    }}
                  >
                    Lưu
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Tạo lịch mới
              </button>
            )}
          </div>

          <CalendarTools />
        </>
      )}

      {/* Profile Card */}
      <div
        className={cn(
          'mt-auto border-t pt-3',
          collapsed && 'flex flex-col items-center gap-2'
        )}
      >
        <div
          onClick={() => openAuthModal('demo')}
          className={cn(
            'flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted/80',
            collapsed && 'flex-col'
          )}
          title="Bấm để đổi tài khoản"
        >
          <LazyAvatar
            src={user?.photoURL ?? undefined}
            alt={displayName}
            fallback={initial}
            size="md"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-bold">{displayName}</p>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? 'Tài khoản khách'}
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2 flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-[11px] font-semibold"
              onClick={() => openAuthModal('login')}
            >
              <UserCheck className="h-3.5 w-3.5" /> Chuyển TK
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-destructive hover:bg-destructive/10"
              onClick={() => void signOut()}
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const sidebarOpen = useCalendarStore((s) => s.sidebarOpen);
  const setSidebarOpen = useCalendarStore((s) => s.setSidebarOpen);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'glass hidden lg:flex shrink-0 flex-col gap-4 rounded-3xl overflow-y-auto transition-all duration-300',
          collapsed ? 'w-[72px] px-2 py-4' : 'w-[280px] p-4'
        )}
      >
        <div className={cn('flex', collapsed ? 'justify-center' : 'justify-end')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'candy-bg fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-4 overflow-y-auto rounded-r-3xl p-4 shadow-2xl transition-transform duration-300 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

/** Nút mở sidebar trên mobile — dùng trong Header */
export function SidebarMenuButton() {
  const toggleSidebar = useCalendarStore((s) => s.toggleSidebar);
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}
