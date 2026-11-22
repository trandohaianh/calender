import { AlertCircle } from 'lucide-react';
import { useFirebaseStore } from '@/store/firebaseStore';
import { Button } from '@/components/ui/button';

export function FirebaseStatusBanner() {
  const isAvailable = useFirebaseStore((s) => s.isAvailable);
  const errorMessage = useFirebaseStore((s) => s.errorMessage);
  const setAvailable = useFirebaseStore((s) => s.setAvailable);

  if (isAvailable) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber-500/40 bg-amber-50 px-4 py-2 dark:bg-amber-950/50"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <p className="flex-1 text-sm text-amber-900 dark:text-amber-100">
        {errorMessage ?? 'Firebase tạm thời không khả dụng. Bạn vẫn có thể xem dữ liệu đã tải.'}
      </p>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAvailable()}>
        Đã hiểu
      </Button>
    </div>
  );
}
