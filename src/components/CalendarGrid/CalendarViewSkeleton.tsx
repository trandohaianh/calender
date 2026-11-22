export function CalendarViewSkeleton() {
  return (
    <div
      className="flex h-full flex-col animate-pulse p-4"
      role="status"
      aria-label="Đang tải lịch"
    >
      <div className="mb-4 h-8 w-48 rounded bg-muted" />
      <div className="grid flex-1 grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[80px] rounded bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
