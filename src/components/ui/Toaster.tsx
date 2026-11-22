import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100',
  error: 'border-destructive/30 bg-destructive/10 text-destructive dark:text-red-300',
  info: 'border-primary/30 bg-primary/5 text-foreground',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[110] flex max-w-sm flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => {
        const Icon = icons[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-in',
              styles[t.variant]
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="text-xs opacity-90 mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
