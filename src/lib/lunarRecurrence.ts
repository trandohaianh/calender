import { addDays } from 'date-fns';
import { lunarToSolar, solarToLunar } from '@/lib/lunar';

export type LunarRecurrenceType = 'lunarMonthly' | 'lunarYearly';

interface LunarMonthRef {
  year: number;
  month: number;
  leap: boolean;
}

/**
 * Ngày dương của (ngày, tháng, năm âm). Nếu tháng thiếu (chỉ 29 ngày) mà cần ngày 30
 * thì lấy ngày 29 — đúng tục lệ làm giỗ "ngày cuối tháng".
 */
export function resolveLunarDay(day: number, ref: LunarMonthRef): Date | null {
  const d = lunarToSolar(day, ref.month, ref.year, ref.leap);
  if (d) {
    const back = solarToLunar(d);
    if (back.day === day && back.month === ref.month && back.leap === ref.leap) return d;
  }
  if (day === 30) return lunarToSolar(29, ref.month, ref.year, ref.leap);
  return null;
}

/** Tháng âm kế tiếp (có tính tháng nhuận) */
function nextLunarMonth(ref: LunarMonthRef): LunarMonthRef {
  if (!ref.leap && lunarToSolar(1, ref.month, ref.year, true)) {
    return { ...ref, leap: true };
  }
  if (ref.month === 12) return { year: ref.year + 1, month: 1, leap: false };
  return { year: ref.year, month: ref.month + 1, leap: false };
}

function withTimeOf(day: Date, base: Date): Date {
  const d = new Date(day);
  d.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
  return d;
}

/**
 * Các thời điểm bắt đầu (tăng dần) của chuỗi lặp âm lịch, nằm trong [from, to].
 * Lần đầu tiên luôn là chính baseStart.
 * - lunarYearly: cùng ngày/tháng âm mỗi năm. Nếu gốc rơi vào tháng nhuận thì các năm sau dùng tháng thường.
 * - lunarMonthly: cùng ngày âm mỗi tháng âm, kể cả tháng nhuận.
 */
export function lunarOccurrenceStarts(
  baseStart: Date,
  type: LunarRecurrenceType,
  interval: number,
  from: Date,
  to: Date
): Date[] {
  const out: Date[] = [];
  if (to < baseStart) return out;
  if (baseStart >= from) out.push(new Date(baseStart));

  const base = solarToLunar(baseStart);
  const step = Math.max(1, interval);

  if (type === 'lunarYearly') {
    const firstYear = Math.max(base.year + 1, solarToLunar(from).year - 1);
    const lastYear = solarToLunar(to).year + 1;
    for (let y = firstYear; y <= lastYear; y++) {
      if ((y - base.year) % step !== 0) continue;
      const d = resolveLunarDay(base.day, { year: y, month: base.month, leap: false });
      if (!d) continue;
      const s = withTimeOf(d, baseStart);
      if (s > baseStart && s >= from && s <= to) out.push(s);
    }
    return out;
  }

  // lunarMonthly — bắt đầu gần `from` để không phải duyệt từ gốc
  const startAt = new Date(Math.max(baseStart.getTime(), addDays(from, -40).getTime()));
  const l = solarToLunar(startAt);
  let cur: LunarMonthRef = { year: l.year, month: l.month, leap: l.leap };
  for (let i = 0; i < 400; i++) {
    const d = resolveLunarDay(base.day, cur);
    if (d) {
      const s = withTimeOf(d, baseStart);
      if (s > to) break;
      if (s > baseStart && s >= from) out.push(s);
    }
    cur = nextLunarMonth(cur);
  }
  return out;
}

/** Thời điểm của lần lặp thứ n (n ≥ 1) — dùng cho "kết thúc sau n lần" */
export function lunarNthOccurrence(
  baseStart: Date,
  type: LunarRecurrenceType,
  interval: number,
  n: number
): Date {
  if (n <= 1) return new Date(baseStart);
  const daysPer = type === 'lunarYearly' ? 390 * Math.max(1, interval) : 31;
  const to = addDays(baseStart, daysPer * n + 60);
  const list = lunarOccurrenceStarts(baseStart, type, interval, baseStart, to);
  return list[n - 1] ?? list[list.length - 1] ?? new Date(baseStart);
}

/** Mô tả ngắn: "ngày 12/3 âm lịch hằng năm" */
export function describeLunarRecurrence(start: Date, type: LunarRecurrenceType): string {
  const l = solarToLunar(start);
  const dayLabel = l.day === 1 ? 'mùng 1' : l.day === 15 ? 'rằm (15)' : `ngày ${l.day}`;
  if (type === 'lunarMonthly') return `${dayLabel} âm lịch hằng tháng`;
  return `${dayLabel} tháng ${l.month}${l.leap ? ' (nhuận → các năm sau dùng tháng thường)' : ''} âm lịch hằng năm`;
}

/** Ngày dương gần nhất (từ `after` trở đi) ứng với ngày/tháng âm cho trước */
export function nextSolarForLunar(
  day: number,
  month: number | null,
  after: Date = new Date()
): Date | null {
  const today = new Date(after);
  today.setHours(0, 0, 0, 0);
  const l = solarToLunar(today);
  if (month == null) {
    let cur: LunarMonthRef = { year: l.year, month: l.month, leap: l.leap };
    for (let i = 0; i < 3; i++) {
      const d = resolveLunarDay(day, cur);
      if (d && d >= today) return d;
      cur = nextLunarMonth(cur);
    }
    return null;
  }
  for (let y = l.year; y <= l.year + 2; y++) {
    const d = resolveLunarDay(day, { year: y, month, leap: false });
    if (d && d >= today) return d;
  }
  return null;
}
