import { useEffect, useMemo, useState } from 'react';
import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { solarToLunar } from '@/lib/lunar';
import {
  describeLunarRecurrence,
  lunarOccurrenceStarts,
  nextSolarForLunar,
  type LunarRecurrenceType,
} from '@/lib/lunarRecurrence';
import { formatDateInput } from '@/lib/eventAdapters';
import { formatVi } from '@/lib/i18n';

interface Props {
  type: LunarRecurrenceType;
  /** yyyy-MM-dd */
  startDate: string;
  onPickDate: (dateStr: string) => void;
}

function parseDate(s: string): Date | null {
  const [y, m, d] = (s ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Gợi ý & chọn ngày theo âm lịch cho sự kiện lặp âm lịch */
export function LunarRecurrenceHelper({ type, startDate, onPickDate }: Props) {
  const start = parseDate(startDate);
  const lunar = start ? solarToLunar(start) : null;

  const [day, setDay] = useState<number>(lunar?.day ?? 1);
  const [month, setMonth] = useState<number>(lunar?.month ?? 1);

  useEffect(() => {
    if (lunar) {
      setDay(lunar.day);
      setMonth(lunar.month);
    }
  }, [startDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = useMemo(() => {
    if (!start) return [];
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setFullYear(to.getFullYear() + (type === 'lunarYearly' ? 4 : 1));
    return lunarOccurrenceStarts(start, type, 1, start > from ? start : from, to).slice(0, 4);
  }, [startDate, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    const d = nextSolarForLunar(day, type === 'lunarYearly' ? month : null);
    if (d) onPickDate(formatDateInput(d));
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
      {start && (
        <p className="flex items-start gap-1.5 font-medium">
          <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>Lặp vào {describeLunarRecurrence(start, type)}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">Chọn theo ngày âm:</span>
        <select
          aria-label="Ngày âm lịch"
          className="rounded-md border bg-background px-1.5 py-1"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d === 1 ? 'Mùng 1' : d === 15 ? 'Rằm (15)' : `Ngày ${d}`}
            </option>
          ))}
        </select>
        {type === 'lunarYearly' && (
          <select
            aria-label="Tháng âm lịch"
            className="rounded-md border bg-background px-1.5 py-1"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m === 1 ? 'Tháng Giêng' : m === 12 ? 'Tháng Chạp' : `Tháng ${m}`}
              </option>
            ))}
          </select>
        )}
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={apply}>
          Áp dụng
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className="text-muted-foreground">
          Các lần tới:{' '}
          {upcoming.map((d, i) => (
            <span key={d.getTime()}>
              {i > 0 && ' · '}
              <span className="font-medium text-foreground">{formatVi(d, 'EEEEEE dd/MM/yyyy')}</span>
            </span>
          ))}
        </div>
      )}
      {lunar?.day === 30 && (
        <p className="text-muted-foreground">
          Tháng âm nào chỉ có 29 ngày sẽ tự chuyển sang ngày 29.
        </p>
      )}
    </div>
  );
}
