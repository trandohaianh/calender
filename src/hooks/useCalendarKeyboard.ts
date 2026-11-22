import { useEffect, type RefObject } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { useCalendarStore } from '@/store/calendarStore';

/**
 * Điều hướng lịch bằng bàn phím (khi focus trong vùng lịch):
 * ←/→ ngày/tuần/tháng, ↑/↓ tuần, T = hôm nay, Esc = đóng modal
 */
export function useCalendarKeyboard(calendarRegionRef: RefObject<HTMLElement | null>) {
  const currentView = useCalendarStore((s) => s.currentView);
  const isEventModalOpen = useCalendarStore((s) => s.isEventModalOpen);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const goToday = useCalendarStore((s) => s.goToday);
  const closeEventModal = useCalendarStore((s) => s.closeEventModal);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const region = calendarRegionRef.current;
      const active = document.activeElement;
      const inCalendar =
        region &&
        (region.contains(active) || region === active || region.matches(':focus-within'));

      if (e.key === 'Escape' && isEventModalOpen) {
        e.preventDefault();
        closeEventModal();
        return;
      }

      if (!inCalendar) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const date = useCalendarStore.getState().currentDate;

      switch (e.key) {
        case 't':
        case 'T':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            goToday();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentView === 'year') setCurrentDate(subMonths(date, 12));
          else if (currentView === 'month') setCurrentDate(subMonths(date, 1));
          else if (currentView === 'week' || currentView === 'agenda')
            setCurrentDate(subWeeks(date, 1));
          else setCurrentDate(subDays(date, 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentView === 'year') setCurrentDate(addMonths(date, 12));
          else if (currentView === 'month') setCurrentDate(addMonths(date, 1));
          else if (currentView === 'week' || currentView === 'agenda')
            setCurrentDate(addWeeks(date, 1));
          else setCurrentDate(addDays(date, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentView === 'month') setCurrentDate(subWeeks(date, 1));
          else setCurrentDate(subDays(date, 7));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentView === 'month') setCurrentDate(addWeeks(date, 1));
          else setCurrentDate(addDays(date, 7));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    calendarRegionRef,
    currentView,
    isEventModalOpen,
    setCurrentDate,
    goToday,
    closeEventModal,
  ]);
}
