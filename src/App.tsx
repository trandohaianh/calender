import { lazy, Suspense, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { CalendarGrid } from '@/components/CalendarGrid';
import { PwaOverlays } from '@/components/PwaOverlays';
import { Toaster } from '@/components/ui/Toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FirebaseStatusBanner } from '@/components/FirebaseStatusBanner';
import { SeoStructuredData } from '@/components/SeoStructuredData';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/store/calendarStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useCapacitorInit } from '@/hooks/useCapacitorInit';
import { useNativeReminders } from '@/hooks/useNativeReminders';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { AuthModal } from '@/components/Auth';
import { WeatherAiModal } from '@/components/WeatherAi/WeatherAiModal';
import { MemoryDialog } from '@/components/Memories/MemoryDialog';
import { useSocialSync } from '@/hooks/useSocialSync';

const SharedNoteDialog = lazy(() =>
  import('@/components/Friends/SharedNoteDialog').then((m) => ({ default: m.SharedNoteDialog }))
);
import { useMemoryStore, memoriesOnThisDay } from '@/store/memoryStore';
import { toastInfo } from '@/store/toastStore';

const EventModal = lazy(() =>
  import('@/components/EventModal').then((m) => ({ default: m.EventModal }))
);
const FirebaseBootstrap = lazy(() => import('@/components/FirebaseBootstrap'));

function App() {
  useNotifications();
  useOfflineSync();
  useNativeReminders();
  useCapacitorInit();
  useDeepLinks();
  useSocialSync();

  const openEventModal = useCalendarStore((s) => s.openEventModal);

  useEffect(() => {
    useCalendarStore.getState().setLoading(false);
  }, []);

  // Tải kỷ niệm + nhắc "Ngày này năm xưa" (tối đa 1 lần/ngày)
  useEffect(() => {
    void useMemoryStore
      .getState()
      .load()
      .then(() => {
        const list = memoriesOnThisDay(useMemoryStore.getState().memories);
        if (list.length === 0) return;
        const key = 'mycalendar_onthisday_shown';
        const today = new Date().toDateString();
        try {
          if (localStorage.getItem(key) === today) return;
          localStorage.setItem(key, today);
        } catch {
          // ignore
        }
        toastInfo(
          `📸 Ngày này năm xưa: ${list.length} kỷ niệm`,
          `"${list[0].title}" — mở mục Kỷ niệm để xem lại`
        );
      });
  }, []);

  return (
    <>
      <SeoStructuredData />
      <Suspense fallback={null}>
        <FirebaseBootstrap />
      </Suspense>
      <div className="candy-bg flex h-screen gap-2 overflow-hidden lg:p-2">
        <ErrorBoundary section="Thanh bên">
          <Sidebar />
        </ErrorBoundary>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ErrorBoundary section="Tiêu đề">
            <Header />
          </ErrorBoundary>
          <FirebaseStatusBanner />
          <main
            id="main-calendar"
            className="relative mx-2 mb-2 flex-1 overflow-hidden rounded-3xl glass lg:mx-0 lg:mb-0"
            tabIndex={-1}
          >
            <CalendarGrid />
          </main>
        </div>
        <Suspense fallback={null}>
          <EventModal />
        </Suspense>
        <PwaOverlays />
        <AuthModal />
        <WeatherAiModal />
        <MemoryDialog />
        <Suspense fallback={null}>
          <SharedNoteDialog />
        </Suspense>
        <Toaster />
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-30 h-16 w-16 rounded-full lg:hidden"
          onClick={() => openEventModal()}
          aria-label="Tạo sự kiện mới"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      </div>
    </>
  );
}

export default App;
