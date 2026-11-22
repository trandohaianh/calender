import { WifiOff, Cloud, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineStore } from '@/store/offlineStore';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/utils';

/** Toast offline + banner cài đặt PWA */
export function PwaOverlays() {
  const {
    showOfflineToast,
    pendingCount,
    syncing,
    syncMessage,
    dismissOfflineToast,
    syncQueue,
    isOnline,
  } = useOfflineStore();

  const { showBanner, install, dismiss, canInstall } = useInstallPrompt();

  return (
    <>
      {/* Offline toast */}
      {showOfflineToast && !isOnline && (
        <div
          role="alert"
          className={cn(
            'fixed left-4 right-4 z-[100] flex items-start gap-3 rounded-xl border border-amber-500/40',
            'bg-amber-50 px-4 py-3 shadow-lg dark:bg-amber-950/90 dark:border-amber-600/50',
            'bottom-24 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-md animate-slide-in'
          )}
        >
          <WifiOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Đang offline
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5">
              Dữ liệu sẽ sync khi có mạng
              {pendingCount > 0 ? ` · ${pendingCount} thao tác đang chờ` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissOfflineToast}
            className="shrink-0 rounded p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sync success toast */}
      {syncMessage && isOnline && (
        <div
          className={cn(
            'fixed left-4 right-4 z-[100] flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg',
            'bg-emerald-50 border-emerald-500/30 dark:bg-emerald-950/80',
            'bottom-24 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm'
          )}
        >
          <Cloud className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {syncing ? 'Đang đồng bộ...' : syncMessage}
          </span>
        </div>
      )}

      {/* Pending sync khi online */}
      {isOnline && pendingCount > 0 && !syncMessage && (
        <div className="fixed bottom-24 right-4 z-[90] lg:bottom-6">
          <Button size="sm" variant="secondary" onClick={() => void syncQueue()}>
            <Cloud className="h-4 w-4 mr-2" />
            Đồng bộ {pendingCount} thay đổi
          </Button>
        </div>
      )}

      {/* Install banner */}
      {showBanner && canInstall && (
        <div
          className={cn(
            'fixed left-4 right-4 z-[95] rounded-xl border bg-card p-4 shadow-xl',
            'bottom-40 lg:bottom-6 lg:left-6 lg:right-auto lg:max-w-sm',
            'animate-slide-in'
          )}
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Cài đặt ứng dụng</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thêm MyCalendar vào màn hình chính — dùng offline, mở nhanh hơn.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => void install()}>
                  Cài đặt
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Để sau
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
