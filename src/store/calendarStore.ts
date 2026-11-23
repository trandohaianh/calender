import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Calendar, CalendarEvent, ViewMode } from '@/types';

interface CalendarState {
  events: CalendarEvent[];
  calendars: Calendar[];
  currentDate: Date;
  currentView: ViewMode;
  searchQuery: string;
  isEventModalOpen: boolean;
  editingEventId: string | null;
  modalDefaultDate: Date | null;
  isDarkMode: boolean;
  isLoading: boolean;
  sidebarOpen: boolean;
  showLunar: boolean;
  showHolidays: boolean;
  showSocial: boolean;

  setEvents: (events: CalendarEvent[]) => void;
  setCalendars: (calendars: Calendar[]) => void;
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  openEventModal: (eventId?: string | null, defaultDate?: Date | null) => void;
  closeEventModal: () => void;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  setLoading: (loading: boolean) => void;
  navigate: (direction: -1 | 1) => void;
  goToday: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setShowLunar: (v: boolean) => void;
  setShowHolidays: (v: boolean) => void;
  setShowSocial: (v: boolean) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      calendars: [],
      currentDate: new Date(),
      currentView: 'month',
      searchQuery: '',
      isEventModalOpen: false,
      editingEventId: null,
      modalDefaultDate: null,
      isDarkMode: false,
      isLoading: false,
      sidebarOpen: false,
      showLunar: true,
      showHolidays: true,
      showSocial: true,

      setEvents: (events) => set({ events }),
      setCalendars: (calendars) => set({ calendars }),
      setCurrentDate: (date) => set({ currentDate: date }),
      setCurrentView: (view) => set({ currentView: view }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      openEventModal: (eventId = null, defaultDate = null) =>
        set({
          isEventModalOpen: true,
          editingEventId: eventId,
          modalDefaultDate: defaultDate,
        }),

      closeEventModal: () =>
        set({
          isEventModalOpen: false,
          editingEventId: null,
          modalDefaultDate: null,
        }),

      setDarkMode: (dark) => {
        document.documentElement.classList.toggle('dark', dark);
        set({ isDarkMode: dark });
      },

      toggleDarkMode: () => {
        const next = !get().isDarkMode;
        document.documentElement.classList.toggle('dark', next);
        set({ isDarkMode: next });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      navigate: (direction) => {
        const { currentDate, currentView } = get();
        const d = new Date(currentDate);
        if (currentView === 'year') {
          d.setFullYear(d.getFullYear() + direction);
        } else if (currentView === 'month') {
          d.setMonth(d.getMonth() + direction);
        } else if (currentView === 'week' || currentView === 'agenda') {
          d.setDate(d.getDate() + direction * 7);
        } else {
          d.setDate(d.getDate() + direction);
        }
        set({ currentDate: d });
      },

      goToday: () => set({ currentDate: new Date() }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setShowLunar: (v) => set({ showLunar: v }),
      setShowHolidays: (v) => set({ showHolidays: v }),
      setShowSocial: (v) => set({ showSocial: v }),
    }),
    {
      name: 'mycalendar-ui',
      partialize: (s) => ({
        currentView: s.currentView,
        isDarkMode: s.isDarkMode,
        showLunar: s.showLunar,
        showHolidays: s.showHolidays,
        showSocial: s.showSocial,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
