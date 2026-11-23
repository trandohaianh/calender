import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCalendarStore } from '@/store/calendarStore';
import { useEvents } from '@/hooks/useEvents';
import { toastError, toastInfo, toastSuccess } from '@/store/toastStore';
import { formatDateInput } from '@/lib/eventAdapters';

/** Thanh bên: bật/tắt âm lịch, ngày lễ; nhập / xuất file .ics */
export function CalendarTools() {
  const showLunar = useCalendarStore((s) => s.showLunar);
  const showHolidays = useCalendarStore((s) => s.showHolidays);
  const setShowLunar = useCalendarStore((s) => s.setShowLunar);
  const setShowHolidays = useCalendarStore((s) => s.setShowHolidays);
  const showSocial = useCalendarStore((s) => s.showSocial);
  const setShowSocial = useCalendarStore((s) => s.setShowSocial);
  const calendars = useCalendarStore((s) => s.calendars);
  const { events, importEvents } = useEvents();

  const fileRef = useRef<HTMLInputElement>(null);
  const [targetCal, setTargetCal] = useState('');
  const [busy, setBusy] = useState(false);

  const defaultCal = calendars.find((c) => c.isDefault) ?? calendars[0];
  const selectedCal = calendars.find((c) => c.id === targetCal) ?? defaultCal;

  const handleExport = async () => {
    const visibleIds = new Set(calendars.filter((c) => c.isVisible !== false).map((c) => c.id));
    const list = events.filter((e) => visibleIds.size === 0 || visibleIds.has(e.calendarId));
    if (list.length === 0) {
      toastInfo('Không có sự kiện để xuất');
      return;
    }
    const { eventsToICS, downloadICS } = await import('@/lib/ical');
    downloadICS(eventsToICS(list), `mycalendar-${formatDateInput(new Date())}.ics`);
    toastSuccess(`Đã xuất ${list.length} sự kiện`, 'Mở file .ics bằng Google Calendar, Outlook…');
  };

  const handleFile = async (file: File) => {
    if (!selectedCal) {
      toastError('Chưa có lịch nào để nhập vào');
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const { parseICS } = await import('@/lib/ical');
      const { events: parsed, skipped } = parseICS(text, selectedCal.id, selectedCal.color);
      if (parsed.length === 0) {
        toastError('Không tìm thấy sự kiện hợp lệ trong file');
        return;
      }
      const n = await importEvents(parsed);
      toastSuccess(
        `Đã nhập ${n} sự kiện vào "${selectedCal.name}"`,
        skipped ? `Bỏ qua ${skipped} mục không đọc được` : undefined
      );
    } catch (e) {
      console.warn('[ICS import]', e);
      toastError('Không đọc được file .ics');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Tiện ích
      </h3>
      <div className="space-y-2 px-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="tool-lunar" className="cursor-pointer text-xs font-medium">
            Hiện âm lịch
          </Label>
          <Switch id="tool-lunar" checked={showLunar} onCheckedChange={setShowLunar} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="tool-holidays" className="cursor-pointer text-xs font-medium">
            Ngày lễ Việt Nam
          </Label>
          <Switch id="tool-holidays" checked={showHolidays} onCheckedChange={setShowHolidays} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="tool-social" className="cursor-pointer text-xs font-medium">
            Sinh nhật bạn thân
          </Label>
          <Switch id="tool-social" checked={showSocial} onCheckedChange={setShowSocial} />
        </div>

        <div className="pt-1">
          <label className="mb-1 block text-[0.7rem] text-muted-foreground" htmlFor="tool-import-cal">
            Nhập file .ics vào lịch
          </label>
          <select
            id="tool-import-cal"
            className="mb-2 w-full rounded-md border bg-background px-2 py-1 text-xs"
            value={selectedCal?.id ?? ''}
            onChange={(e) => setTargetCal(e.target.value)}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-[11px] font-semibold"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> {busy ? 'Đang nhập…' : 'Nhập .ics'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-[11px] font-semibold"
              onClick={() => void handleExport()}
            >
              <Download className="h-3.5 w-3.5" /> Xuất .ics
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      </div>
    </div>
  );
}
