import { addDays, addMonths } from 'date-fns';
import { getEventDateRange } from '@/lib/eventAdapters';
import { lunarOccurrenceStarts } from '@/lib/lunarRecurrence';
import { isLunarRecurrence } from '@/types';
import type { Calendar, CalendarEvent, EventOccurrence } from '@/types';

export function getEventColor(ev: CalendarEvent, calendars: Calendar[]): string {
  if (ev.color) return ev.color;
  const cal = calendars.find((c) => c.id === ev.calendarId);
  return cal?.color ?? '#1a73e8';
}

export function expandEvent(
  ev: CalendarEvent,
  calendars: Calendar[],
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  const cal = calendars.find((c) => c.id === ev.calendarId);
  if (cal && cal.isVisible === false) return [];

  const color = getEventColor(ev, calendars);
  const { start: baseStart, end: baseEnd } = getEventDateRange(ev);
  const results: EventOccurrence[] = [];
  const maxIter = 500;

  const build = (s: Date, e: Date): EventOccurrence => ({
    eventId: ev.id,
    title: ev.title,
    start: s,
    end: e,
    allDay: ev.isAllDay,
    color,
    location: ev.location ?? '',
    description: ev.description ?? '',
    calendarId: ev.calendarId,
    reminder: (ev.reminder ?? 0) as EventOccurrence['reminder'],
  });

  const pushIfInRange = (s: Date, e: Date) => {
    if (e < rangeStart || s > rangeEnd) return;
    // Sự kiện kết thúc đúng 00:00 không tính là thuộc ngày hôm sau
    if (e.getTime() === rangeStart.getTime() && e > s) return;
    results.push(build(s, e));
  };

  const recurrenceType = ev.recurrence?.type;

  if (!recurrenceType) {
    pushIfInRange(baseStart, baseEnd);
    return results;
  }

  if (isLunarRecurrence(recurrenceType)) {
    const duration = baseEnd.getTime() - baseStart.getTime();
    const limit = ev.recurrence?.endDate?.toDate();
    const from = new Date(rangeStart.getTime() - duration);
    const starts = lunarOccurrenceStarts(
      baseStart,
      recurrenceType,
      ev.recurrence?.interval ?? 1,
      from,
      rangeEnd
    );
    for (const s of starts) {
      if (limit && s > limit) break;
      pushIfInRange(s, new Date(s.getTime() + duration));
    }
    return results;
  }

  let curStart = new Date(baseStart);
  let curEnd = new Date(baseEnd);
  const duration = curEnd.getTime() - curStart.getTime();
  let iter = 0;
  const interval = ev.recurrence?.interval ?? 1;

  while (curStart <= rangeEnd && iter < maxIter) {
    if (ev.recurrence?.endDate) {
      const recurEnd = ev.recurrence.endDate.toDate();
      if (curStart > recurEnd) break;
    }
    pushIfInRange(curStart, curEnd);
    iter++;

    if (recurrenceType === 'daily') {
      curStart = addDays(curStart, interval);
    } else if (recurrenceType === 'weekly') {
      curStart = addDays(curStart, 7 * interval);
    } else if (recurrenceType === 'monthly') {
      curStart = addMonths(curStart, interval);
    } else if (recurrenceType === 'yearly') {
      curStart = addMonths(curStart, 12 * interval);
    } else break;

    curEnd = new Date(curStart.getTime() + duration);
  }

  return results;
}

export function getOccurrencesInRange(
  events: CalendarEvent[],
  calendars: Calendar[],
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  return events
    .flatMap((ev) => expandEvent(ev, calendars, rangeStart, rangeEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function isEventOngoing(occ: EventOccurrence): boolean {
  const now = new Date();
  return now >= occ.start && now <= occ.end;
}

export { formatDateInput, formatTimeInput } from '@/lib/eventAdapters';
