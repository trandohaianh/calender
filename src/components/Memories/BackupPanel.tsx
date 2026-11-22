import { useMemo, useRef, useState } from 'react';
import { DatabaseBackup, Download, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemoryStore } from '@/store/memoryStore';
import { toastError, toastSuccess } from '@/store/toastStore';
import { formatVi } from '@/lib/i18n';

/** Sao lưu / khôi phục kỷ niệm + nhắc khi có dữ liệu chưa sao lưu */
export function BackupPanel() {
  const memories = useMemoryStore((s) => s.memories);
  const reload = useMemoryStore((s) => s.reload);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | { label: string; done: number; total: number }>(null);
  const [lastBackup, setLastBackup] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem('mycalendar_memories_last_backup');
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });

  const list = useMemo(() => Object.values(memories), [memories]);
  const unsaved = useMemo(
    () => list.filter((m) => !lastBackup || m.updatedAt > lastBackup).length,
    [list, lastBackup]
  );

  const doExport = async () => {
    if (list.length === 0) return;
    setBusy({ label: 'Đang đóng gói', done: 0, total: 0 });
    try {
      const { buildBackup, downloadBlob, markBackedUp } = await import('@/lib/memoryBackup');
      const res = await buildBackup(list, (done, total) =>
        setBusy({ label: 'Đang đóng gói ảnh', done, total })
      );
      downloadBlob(res.blob, res.filename);
      markBackedUp();
      setLastBackup(Date.now());
      const mb = (res.blob.size / 1024 / 1024).toFixed(1);
      toastSuccess(
        `Đã sao lưu ${res.memories} kỷ niệm, ${res.photos} ảnh (${mb} MB)`,
        'Hãy cất file vào Google Drive / máy tính để giữ an toàn'
      );
    } catch (e) {
      console.error(e);
      toastError('Sao lưu thất bại', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file: File) => {
    setBusy({ label: 'Đang khôi phục', done: 0, total: 0 });
    try {
      const { restoreBackup } = await import('@/lib/memoryBackup');
      const res = await restoreBackup(file, useMemoryStore.getState().memories, (done, total) =>
        setBusy({ label: 'Đang khôi phục ảnh', done, total })
      );
      await reload();
      toastSuccess(
        `Khôi phục xong: ${res.added} kỷ niệm mới, ${res.merged} đã gộp`,
        `${res.photosAdded} ảnh được thêm${res.skipped ? ` · bỏ qua ${res.skipped} mục lỗi` : ''}`
      );
    } catch (e) {
      console.error(e);
      toastError('Không khôi phục được', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <DatabaseBackup className="h-4 w-4 text-primary" />
        <span className="font-semibold">Sao lưu</span>
        <span className="text-xs text-muted-foreground">
          {lastBackup
            ? `lần cuối ${formatVi(new Date(lastBackup), "HH:mm 'ngày' dd/MM/yyyy")}`
            : 'chưa sao lưu lần nào'}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Khôi phục
          </Button>
          <Button
            size="sm"
            className="gap-1 text-xs"
            disabled={!!busy || list.length === 0}
            onClick={() => void doExport()}
          >
            <Download className="h-3.5 w-3.5" /> Sao lưu ngay
          </Button>
        </div>
      </div>

      {busy && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {busy.label}
          {busy.total > 0 && ` ${busy.done}/${busy.total}`}…
          {busy.total > 0 && (
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(busy.done / busy.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {!busy && unsaved > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {unsaved} kỷ niệm chưa được sao lưu. Kỷ niệm chỉ nằm trên thiết bị này — đổi máy hoặc xoá dữ liệu
          trình duyệt sẽ mất.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void doImport(f);
        }}
      />
    </div>
  );
}
