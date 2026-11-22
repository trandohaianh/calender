import { useEffect } from 'react';
import { initAnalytics, AnalyticsEvents, setAnalyticsUserId } from '@/firebase/analytics';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthUserId } from '@/store/authStore';

/** Khởi tạo Analytics + track view / page */
export function useAnalytics() {
  const currentView = useCalendarStore((s) => s.currentView);
  const userId = useAuthUserId();

  useEffect(() => {
    void initAnalytics();
  }, []);

  useEffect(() => {
    void setAnalyticsUserId(userId);
  }, [userId]);

  useEffect(() => {
    void AnalyticsEvents.pageView(currentView);
    void AnalyticsEvents.viewChanged(currentView);
  }, [currentView]);
}
